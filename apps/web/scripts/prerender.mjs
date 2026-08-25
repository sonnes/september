// Writes the pages a build machine can draw into the built shell.
//
// `vite build` leaves `dist/index.html` with an empty root. This builds the
// same application for Node, renders each path in `PRERENDERED_PATHS`, and
// writes one file per page beside the untouched shell:
//
//   index.html               the landing page, served at `/`
//   help/index.html          Help, served at `/help`
//   help/<slug>/index.html   one guide each
//   app.html                 the untouched shell, served for every app route
//
// One file per page, because one shell cannot be all of them. A deep link to
// an application route that received the landing markup would paint the
// marketing page for as long as the bundle takes to boot, and then hydrate
// against the wrong DOM.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const app = fileURLToPath(new URL('../', import.meta.url));
const ssrDir = `${app}dist-ssr`;
const dist = `${app}dist`;

await build({
  root: app,
  logLevel: 'warn',
  build: { ssr: 'src/entry-server.tsx', outDir: 'dist-ssr', emptyOutDir: true },
  // Bundle everything. The workspace packages ship TypeScript sources, which
  // Node cannot read, and several Radix packages resolve to CommonJS whose
  // named exports Node then cannot see.
  ssr: { noExternal: true },
});

const { PRERENDERED_PATHS, hoistTitle, injectMarkup, prerenderedFile, renderPage } =
  await import(`${ssrDir}/entry-server.js`);

const built = await readFile(`${dist}/index.html`, 'utf8');
// The shell keeps its plain title; each page takes the one it rendered.
await writeFile(`${dist}/app.html`, built);

for (const path of PRERENDERED_PATHS) {
  const page = hoistTitle(built, await renderPage(path));
  const file = `${dist}/${prerenderedFile(path)}`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, injectMarkup(page.shell, page.markup));
}

await rm(ssrDir, { recursive: true, force: true });

console.log(
  `prerendered ${PRERENDERED_PATHS.length} pages into dist, shell kept at dist/app.html`
);
