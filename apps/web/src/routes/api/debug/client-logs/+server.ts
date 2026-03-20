import { json } from "@sveltejs/kit";

import {
    clearClientLogs,
    getClientLogCount,
    getClientLogs,
    pushClientLogs,
    type ClientLogEntry,
    type ClientLogLevel,
} from "$lib/server/client-log-buffer";

interface ClientLogWireEntry {
    ts?: unknown;
    level?: unknown;
    args?: unknown;
    page?: unknown;
    userAgent?: unknown;
    source?: unknown;
}

const ALLOWED_LEVELS: Set<ClientLogLevel> = new Set(["log", "info", "warn", "error", "debug"]);

function normalizeLogEntry(raw: ClientLogWireEntry): Omit<ClientLogEntry, "id"> | null {
    const level = typeof raw.level === "string" && ALLOWED_LEVELS.has(raw.level as ClientLogLevel)
        ? (raw.level as ClientLogLevel)
        : "log";

    const ts = typeof raw.ts === "number" && Number.isFinite(raw.ts)
        ? raw.ts
        : Date.now();

    const args = Array.isArray(raw.args) ? raw.args.slice(0, 30) : [];

    return {
        ts,
        level,
        args,
        page: typeof raw.page === "string" ? raw.page : null,
        userAgent: typeof raw.userAgent === "string" ? raw.userAgent : null,
        source: typeof raw.source === "string" ? raw.source : "browser-console",
    };
}

export async function GET({ url }) {
    const limitParam = Number(url.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitParam) ? limitParam : 100;

    return json({
        count: getClientLogCount(),
        logs: getClientLogs(limit),
    });
}

export async function POST({ request }) {
    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return json({ ok: false, error: "invalid-json" }, { status: 400 });
    }

    const wireEntries = Array.isArray(payload)
        ? payload
        : (
            payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { logs?: unknown }).logs)
        )
            ? (payload as { logs: unknown[] }).logs
            : [payload];

    const normalized = wireEntries
        .map((entry) => normalizeLogEntry((entry ?? {}) as ClientLogWireEntry))
        .filter((entry): entry is Omit<ClientLogEntry, "id"> => entry !== null);

    if (normalized.length === 0) {
        return json({ ok: false, error: "no-valid-entries" }, { status: 400 });
    }

    const count = pushClientLogs(normalized);
    return json({ ok: true, count });
}

export async function DELETE() {
    clearClientLogs();
    return json({ ok: true, count: 0 });
}
