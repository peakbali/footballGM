import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// `npm run build` -> dist/ (web version, real English pyramid). `npm run build:play` -> dist-play/ (Google Play
// build, fictional world, served from /play/; DESIGN 13.2y). `npm run build:single` -> one self-contained HTML file.
export default defineConfig(({ mode }) => {
  const outDir = mode === 'single' ? 'dist-single' : mode === 'play' ? 'dist-play' : 'dist';
  return {
  base: './',
  define: {
    __REAL_WORLD__: JSON.stringify(mode !== 'play' && process.env.VITE_WORLD !== 'fictional'),
    // Khen's recorded result clips stay out of the Play build until their rights are confirmed (DESIGN 13.5c)
    __CLIPS__: JSON.stringify(mode !== 'play'),
  },
  plugins: [
    preact(),
    ...(mode === 'single' ? [viteSingleFile()] : []),
    {
      // stamp the service worker with this build so each deploy replaces the old cache
      name: 'stamp-sw',
      apply: 'build' as const,
      closeBundle() {
        if (mode === 'single') return;
        const f = join(outDir, 'sw.js');
        try {
          // precache every built asset so the first offline launch works without a second visit
          const assets = readdirSync(join(outDir, 'assets')).filter((n) => !n.endsWith('.woff')).map((n) => `assets/${n}`);
          writeFileSync(f, readFileSync(f, 'utf8').replace('__BUILD__', Date.now().toString(36)).replace('[/*__ASSETS__*/]', JSON.stringify(assets)));
        } catch { /* no sw in this build */ }
      },
    },
  ],
  build: {
    outDir,
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 60000 },
  };
});
