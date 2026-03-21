// Sparkline path generation and direction utilities.

export const SPARKLINE_WIDTH = 140;
export const SPARKLINE_HEIGHT = 42;

export function sparklinePath(
    points: number[] | null | undefined,
    width = SPARKLINE_WIDTH,
    height = SPARKLINE_HEIGHT,
): string {
    const safePoints = Array.isArray(points)
        ? points.filter((value) => Number.isFinite(value))
        : [];

    if (!safePoints.length) return "";
    if (safePoints.length === 1)
        return `M 0 ${height / 2} L ${width} ${height / 2}`;

    const min = Math.min(...safePoints);
    const max = Math.max(...safePoints);
    const range = max - min || 1;
    const stepX = width / (safePoints.length - 1);

    return safePoints
        .map((value, index) => {
            const x = index * stepX;
            const y = height - ((value - min) / range) * height;
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}

export function chartDirectionClass(
    points: number[] | null | undefined,
): "chart-positive" | "chart-negative" {
    const safePoints = Array.isArray(points)
        ? points.filter((value) => Number.isFinite(value))
        : [];

    if (safePoints.length < 2) return "chart-negative";
    return safePoints[safePoints.length - 1] >= safePoints[0]
        ? "chart-positive"
        : "chart-negative";
}
