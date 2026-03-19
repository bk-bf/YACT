# Route Entrypoints Map

SvelteKit requires convention filenames (`+page.svelte`, `+page.ts`, `+layout.svelte`).
These files are now thin wrappers that delegate to explicit modules:

- `/+layout.svelte` -> `src/lib/layouts/AppShellLayout.svelte`
- `/+page.ts` -> `src/lib/pages/markets/markets-page.data.ts`
- `/+page.svelte` -> `src/lib/pages/markets/MarketsPageView.svelte`
- `/currencies/[id]/+page.ts` -> `src/lib/pages/coin-detail/coin-detail-page.data.ts`
- `/currencies/[id]/+page.svelte` -> `src/lib/pages/coin-detail/CoinDetailPageView.svelte`

Global style entrypoint:

- `src/app.css` -> `src/styles/application-shell.css`
