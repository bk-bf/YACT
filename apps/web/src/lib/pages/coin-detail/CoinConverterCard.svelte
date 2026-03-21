<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";

    const { coin }: { coin: CoinBreakdown } = $props();

    let converterCoinInput = $state("1");
    let converterUsdInput = $state("");
    let converterLastEdited = $state<"coin" | "usd">("coin");

    function normalizeNumericInput(value: string): string {
        const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length <= 1) return cleaned;
        return `${parts[0]}.${parts.slice(1).join("")}`;
    }

    function parseNumericInput(value: string): number | null {
        const normalized = normalizeNumericInput(value);
        if (!normalized || normalized === ".") return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatInputNumber(value: number, decimals: number): string {
        const fixed = value.toFixed(decimals);
        return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    }

    function addThousandsSeparators(value: string): string {
        const normalized = normalizeNumericInput(value);
        if (!normalized) return "";
        const hasTrailingDot = normalized.endsWith(".");
        const [intPartRaw, decimalPart = ""] = normalized.split(".");
        const intPart = intPartRaw.length > 0 ? intPartRaw : "0";
        const groupedInt = intPart
            .replace(/^0+(?=\d)/, "")
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (hasTrailingDot) return `${groupedInt}.`;
        if (decimalPart.length > 0) return `${groupedInt}.${decimalPart}`;
        return groupedInt;
    }

    function formatGroupedInputNumber(value: number, decimals: number): string {
        return addThousandsSeparators(formatInputNumber(value, decimals));
    }

    function handleCoinInput(event: Event): void {
        const target = event.currentTarget as HTMLInputElement;
        converterLastEdited = "coin";
        converterCoinInput = normalizeNumericInput(target.value);
    }

    function handleUsdInput(event: Event): void {
        const target = event.currentTarget as HTMLInputElement;
        converterLastEdited = "usd";
        converterUsdInput = addThousandsSeparators(target.value);
    }

    $effect(() => {
        const price = coin.currentPrice;
        if (!Number.isFinite(price) || price <= 0) return;

        if (converterLastEdited === "coin") {
            const coinValue = parseNumericInput(converterCoinInput);
            converterUsdInput =
                coinValue !== null
                    ? formatGroupedInputNumber(coinValue * price, 2)
                    : "";
            return;
        }

        const usdValue = parseNumericInput(converterUsdInput);
        converterCoinInput =
            usdValue !== null ? formatInputNumber(usdValue / price, 8) : "";
    });
</script>

<article class="coin-rail-card">
    <h3>{coin.symbol.toUpperCase()} to USD converter</h3>
    <div class="coin-converter-box" aria-label="Coin converter">
        <div class="coin-converter-row">
            <span>{coin.symbol.toUpperCase()}</span>
            <input
                class="coin-converter-input"
                type="text"
                inputmode="decimal"
                value={converterCoinInput}
                oninput={handleCoinInput}
                aria-label={`${coin.symbol.toUpperCase()} amount`}
            />
        </div>
        <div class="coin-converter-row">
            <span>USD</span>
            <input
                class="coin-converter-input"
                type="text"
                inputmode="decimal"
                value={converterUsdInput}
                oninput={handleUsdInput}
                aria-label="USD amount"
            />
        </div>
    </div>
</article>
