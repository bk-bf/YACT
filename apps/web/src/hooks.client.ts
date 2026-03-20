type ClientLogLevel = "log" | "info" | "warn" | "error" | "debug";

type ConsoleMethod = (...args: unknown[]) => void;

const LOG_ENDPOINT = "/api/debug/client-logs";
const MAX_ARGS = 12;
const MAX_BATCH = 25;

const originalConsole: Partial<Record<ClientLogLevel, ConsoleMethod>> = {};
const queue: Array<Record<string, unknown>> = [];

let flushTimer: number | null = null;
let patched = false;

function serializeValue(value: unknown, depth = 0): unknown {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (value === null || value === undefined) {
        return value;
    }

    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") {
        return value;
    }

    if (valueType === "bigint") {
        return value.toString();
    }

    if (valueType === "function") {
        return `[Function ${(value as Function).name || "anonymous"}]`;
    }

    if (depth >= 2) {
        return "[MaxDepth]";
    }

    if (Array.isArray(value)) {
        return value.slice(0, 20).map((item) => serializeValue(item, depth + 1));
    }

    if (valueType === "object") {
        const output: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
            output[key] = serializeValue(item, depth + 1);
        }
        return output;
    }

    return String(value);
}

function scheduleFlush(): void {
    if (flushTimer !== null) {
        return;
    }

    flushTimer = window.setTimeout(() => {
        flushTimer = null;
        void flushLogs();
    }, 400);
}

async function flushLogs(): Promise<void> {
    if (queue.length === 0) {
        return;
    }

    const logs = queue.splice(0, MAX_BATCH);
    const payload = JSON.stringify({ logs });

    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            const accepted = navigator.sendBeacon(LOG_ENDPOINT, blob);
            if (!accepted) {
                throw new Error("sendBeacon rejected payload");
            }
        } else {
            await fetch(LOG_ENDPOINT, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: payload,
                keepalive: true,
                cache: "no-store",
            });
        }
    } catch {
        // Preserve best-effort behavior and avoid recursive logging loops.
    }

    if (queue.length > 0) {
        scheduleFlush();
    }
}

function capture(level: ClientLogLevel, args: unknown[]): void {
    queue.push({
        ts: Date.now(),
        level,
        args: args.slice(0, MAX_ARGS).map((value) => serializeValue(value)),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        source: "browser-console",
    });

    if (queue.length > 200) {
        queue.splice(0, queue.length - 200);
    }

    scheduleFlush();
}

function patchConsole(): void {
    if (patched) {
        return;
    }
    patched = true;

    const levels: ClientLogLevel[] = ["log", "info", "warn", "error", "debug"];
    for (const level of levels) {
        const method = console[level].bind(console);
        originalConsole[level] = method;

        console[level] = (...args: unknown[]) => {
            capture(level, args);
            method(...args);
        };
    }

    window.addEventListener("error", (event) => {
        capture("error", [
            {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
            },
            event.error,
        ]);
    });

    window.addEventListener("unhandledrejection", (event) => {
        capture("error", [{ type: "unhandledrejection", reason: serializeValue(event.reason) }]);
    });

    window.addEventListener("beforeunload", () => {
        if (queue.length === 0) {
            return;
        }
        const payload = JSON.stringify({ logs: queue.splice(0, MAX_BATCH) });
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(LOG_ENDPOINT, blob);
        }
    });
}

patchConsole();
