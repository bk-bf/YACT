let vercelAdapter = null;

try {
  const mod = await import('@sveltejs/adapter-vercel');
  vercelAdapter = mod.default;
} catch {
  // Keep bootstrap runnable in environments where dependencies are not resolved yet.
  vercelAdapter = null;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    ...(vercelAdapter ? { adapter: vercelAdapter() } : {})
  }
};

export default config;
