<script lang="ts">
    import { browser } from "$app/environment";
    import type { CoinBreakdown } from "./coin-detail-page.data";

    const { coin }: { coin: CoinBreakdown } = $props();

    // ── helpers ──────────────────────────────────────────────────────────────

    function shortAddress(address: string): string {
        const trimmed = address.trim();
        if (trimmed.length <= 14) return trimmed;
        return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
    }

    function chainMonogram(chain: string): string {
        const cleaned = chain.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (cleaned.length >= 2) return cleaned.slice(0, 2);
        if (cleaned.length === 1) return `${cleaned}*`;
        return "??";
    }

    function hostLabel(url: string): string {
        try {
            const host = new URL(url).hostname.replace(/^www\./, "");
            return host || "Link";
        } catch {
            return "Link";
        }
    }

    function faviconForUrl(url: string): string {
        return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
    }

    function logoForLink(label: string, url: string): string {
        const normalized = label.trim().toLowerCase();
        if (normalized === "x") return "https://x.com/favicon.ico";
        if (normalized === "reddit") return "https://www.reddit.com/favicon.ico";
        if (normalized === "coingecko") return "https://www.coingecko.com/favicon.ico";
        if (normalized === "coinmarketcap") return "https://coinmarketcap.com/favicon.ico";

        try {
            const host = new URL(url).hostname.toLowerCase();
            if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) {
                return "https://x.com/favicon.ico";
            }
            if (host === "reddit.com" || host.endsWith(".reddit.com")) {
                return "https://www.reddit.com/favicon.ico";
            }
        } catch {
            // fallback below
        }

        return faviconForUrl(url);
    }

    function communityLabelForLink(label: string, url: string): string {
        const normalized = label.trim().toLowerCase();
        if (normalized && normalized !== "chat") return label;

        try {
            const host = new URL(url).hostname.toLowerCase();
            if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "m.facebook.com") return "Facebook";
            if (host === "t.me" || host.endsWith(".t.me") || host === "telegram.me" || host.endsWith(".telegram.me")) return "Telegram";
            if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
            if (host === "reddit.com" || host.endsWith(".reddit.com")) return "Reddit";
        } catch {
            // keep fallback below
        }

        return label || "Community";
    }

    // ── copy state ───────────────────────────────────────────────────────────

    let copiedInfoKey = $state<string | null>(null);
    let copiedInfoTimer: ReturnType<typeof setTimeout> | null = null;

    async function copyInfoValue(value: string, key: string): Promise<void> {
        if (!browser) return;
        try {
            await navigator.clipboard.writeText(value);
            copiedInfoKey = key;
            if (copiedInfoTimer) clearTimeout(copiedInfoTimer);
            copiedInfoTimer = setTimeout(() => {
                copiedInfoKey = null;
                copiedInfoTimer = null;
            }, 1800);
        } catch {
            copiedInfoKey = null;
        }
    }

    // ── category state ───────────────────────────────────────────────────────

    let selectedCategory = $state("");

    $effect(() => {
        const categories = coin.categories ?? [];
        if (categories.length === 0) {
            selectedCategory = "";
            return;
        }
        if (!selectedCategory || !categories.includes(selectedCategory)) {
            selectedCategory = categories[0] ?? "";
        }
    });

    // ── derived display values ────────────────────────────────────────────────

    const displayChainBadges = $derived(
        (() => {
            const fromContracts = Array.from(
                new Map(
                    coin.contracts
                        .filter((e) => e.chain.trim().length > 0)
                        .map((e) => [e.chain, { chain: e.chain, logoUrl: e.logoUrl }]),
                ).values(),
            );
            if (fromContracts.length > 0) return fromContracts;
            return (coin.chains ?? [])
                .filter((c) => c.trim().length > 0)
                .map((c) => ({ chain: c, logoUrl: null as string | null }));
        })(),
    );

    const displayWebsites = $derived(
        coin.websites.length > 0
            ? coin.websites
            : coin.homepage
              ? [coin.homepage]
              : [],
    );

    const displayWebsiteLinks = $derived(
        [
            ...displayWebsites.map((url) => ({ label: hostLabel(url), url })),
            ...(coin.whitepaper && !displayWebsites.some((u) => u === coin.whitepaper)
                ? [{ label: "Whitepaper", url: coin.whitepaper }]
                : []),
        ].slice(0, 4),
    );

    const displayExplorers = $derived(
        coin.explorers.length > 0
            ? coin.explorers
            : coin.blockchainSite
              ? [coin.blockchainSite]
              : [],
    );

    const displayCommunity = $derived(
        coin.community.length > 0
            ? coin.community
            : coin.homepage
              ? [{ label: "Site", url: coin.homepage }]
              : [],
    );

    const displayCommunityLinks = $derived(
        displayCommunity.map((link) => ({
            label: communityLabelForLink(link.label, link.url),
            url: link.url,
            logoUrl: logoForLink(communityLabelForLink(link.label, link.url), link.url),
        })),
    );

    const searchBrandLinks = $derived(
        [
            { label: "CoinGecko", url: coin.coingeckoUrl },
            { label: "CoinMarketCap", url: coin.coinmarketcapUrl },
        ].map((link) => ({ ...link, logoUrl: logoForLink(link.label, link.url) })),
    );
</script>

<article class="coin-rail-card">
    <h3>Info</h3>

    <div class="info-chip-row">
        <span class="info-row-label">API ID</span>
        <div class="info-chip-wrap">
            <button
                class="info-pill info-pill-button"
                type="button"
                title={`Copy ${coin.apiId || coin.id}`}
                onclick={() => copyInfoValue(coin.apiId || coin.id, "api-id")}
            >
                <span>{coin.apiId || coin.id}</span>
                <span
                    class="info-copy-icon"
                    aria-label={copiedInfoKey === "api-id" ? "Copied" : "Copy API ID"}
                >
                    {copiedInfoKey === "api-id" ? "✓" : "⧉"}
                </span>
            </button>
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Contract</span>
        <div class="info-chip-wrap">
            {#if coin.contracts.length > 0}
                {#each coin.contracts.slice(0, 4) as entry}
                    <button
                        class="info-pill info-pill-button contract-pill"
                        type="button"
                        title={entry.address}
                        onclick={() => copyInfoValue(entry.address, `contract-${entry.address}`)}
                    >
                        {#if entry.logoUrl}
                            <img
                                class="chain-logo-image"
                                src={entry.logoUrl}
                                alt={entry.chain}
                                loading="lazy"
                            />
                        {:else}
                            <span class="chain-logo" aria-hidden="true" title={entry.chain}>
                                {chainMonogram(entry.chain)}
                            </span>
                        {/if}
                        <span class="contract-address" title={entry.address}>
                            {shortAddress(entry.address)}
                        </span>
                        <span
                            class="info-copy-icon"
                            aria-label={copiedInfoKey === `contract-${entry.address}`
                                ? "Copied"
                                : "Copy contract address"}
                        >
                            {copiedInfoKey === `contract-${entry.address}` ? "✓" : "⧉"}
                        </span>
                    </button>
                {/each}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Chains</span>
        <div class="info-chip-wrap">
            {#if displayChainBadges.length > 0}
                {#each displayChainBadges.slice(0, 8) as chainEntry}
                    <span class="info-pill chain-pill" title={chainEntry.chain}>
                        {#if chainEntry.logoUrl}
                            <img
                                class="chain-logo-image"
                                src={chainEntry.logoUrl}
                                alt={chainEntry.chain}
                                loading="lazy"
                            />
                        {:else}
                            <span class="chain-logo" aria-hidden="true">
                                {chainMonogram(chainEntry.chain)}
                            </span>
                        {/if}
                    </span>
                {/each}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Categories</span>
        <div class="info-chip-wrap">
            {#if coin.categories.length > 0}
                {#if coin.categories.length > 1}
                    <label class="info-select-wrap">
                        <select
                            class="info-pill-select"
                            aria-label="Select category"
                            bind:value={selectedCategory}
                        >
                            {#each coin.categories as category}
                                <option value={category}>{category}</option>
                            {/each}
                        </select>
                    </label>
                {:else}
                    <span class="info-pill">{selectedCategory}</span>
                {/if}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Website</span>
        <div class="info-chip-wrap">
            {#if displayWebsiteLinks.length > 0}
                {#each displayWebsiteLinks as websiteLink}
                    <a
                        class="info-pill info-link-pill"
                        href={websiteLink.url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {websiteLink.label}
                    </a>
                {/each}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Explorers</span>
        <div class="info-chip-wrap">
            {#if displayExplorers.length > 0}
                {#each displayExplorers.slice(0, 4) as explorer}
                    <a
                        class="info-pill info-link-pill"
                        href={explorer}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {hostLabel(explorer)}
                    </a>
                {/each}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Community</span>
        <div class="info-chip-wrap">
            {#if displayCommunityLinks.length > 0}
                {#each displayCommunityLinks as communityLink}
                    <a
                        class="info-pill info-link-pill info-logo-pill"
                        href={communityLink.url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <img
                            class="info-link-logo"
                            src={communityLink.logoUrl}
                            alt={communityLink.label}
                            loading="lazy"
                        />
                        <span>{communityLink.label}</span>
                    </a>
                {/each}
            {:else}
                <span class="muted">--</span>
            {/if}
        </div>
    </div>

    <div class="info-chip-row">
        <span class="info-row-label">Search on</span>
        <div class="info-chip-wrap">
            {#each searchBrandLinks as link}
                <a
                    class="info-pill info-link-pill info-logo-pill"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                >
                    <img
                        class="info-link-logo"
                        src={link.logoUrl}
                        alt={link.label}
                        loading="lazy"
                    />
                    <span>{link.label}</span>
                </a>
            {/each}
        </div>
    </div>
</article>
