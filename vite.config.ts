import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// `npm run build` -> dist/ for Capacitor. `npm run build:single` -> one self-contained HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    preact(),
    ...(mode === 'single' ? [viteSingleFile()] : []),
    {
      // stamp the service worker with this build so each deploy replaces the old cache
      name: 'stamp-sw',
      apply: 'build' as const,
      closeBundle() {
        if (mode === 'single') return;
        const f = join('dist', 'sw.js');
        try {
          // precache every built asset so the first offline launch works without a second visit
          const assets = readdirSync(join('dist', 'assets')).filter((n) => !n.endsWith('.woff')).map((n) => `assets/${n}`);
          writeFileSync(f, readFileSync(f, 'utf8').replace('__BUILD__', Date.now().toString(36)).replace('[/*__ASSETS__*/]', JSON.stringify(assets)));
        } catch { /* no sw in this build */ }
      },
    },
  ],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 60000 },
}));
