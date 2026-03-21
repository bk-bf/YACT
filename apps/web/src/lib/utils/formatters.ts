// Number formatters and display utilities shared across markets views.

export const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
});

export const percent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: "always",
});

export const fullUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
});

const largeUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

export const compactNumber = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
});

const fullInteger = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
});

export const signedPercent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: "always",
});

export function formatDetailedUsd(value: number): string {
    return value >= 1000 ? largeUsd.format(value) : fullUsd.format(value);
}

export function formatStableCompactUsd(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "--";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

export function formatTwoDecimals(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "--";
    return value.toFixed(2);
}

export function formatWhole(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "--";
    return fullInteger.format(value);
}

export function displayCoinName(value: string): string {
    return value
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
