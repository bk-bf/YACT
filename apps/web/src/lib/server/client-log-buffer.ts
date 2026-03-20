export type ClientLogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface ClientLogEntry {
    id: number;
    ts: number;
    level: ClientLogLevel;
    args: unknown[];
    page: string | null;
    userAgent: string | null;
    source: string;
}

const MAX_LOGS = 2000;

let sequence = 0;
const logs: ClientLogEntry[] = [];

export function pushClientLogs(entries: Omit<ClientLogEntry, "id">[]): number {
    for (const entry of entries) {
        sequence += 1;
        logs.push({
            id: sequence,
            ...entry,
        });
    }

    if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
    }

    return logs.length;
}

export function getClientLogs(limit: number): ClientLogEntry[] {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    return logs.slice(-safeLimit);
}

export function getClientLogCount(): number {
    return logs.length;
}

export function clearClientLogs(): void {
    logs.length = 0;
}
