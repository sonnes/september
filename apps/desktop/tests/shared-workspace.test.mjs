import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../../", import.meta.url);

async function readText(path) {
  return readFile(new URL(path, repositoryRoot), "utf8");
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

test("web and desktop belong to one pnpm workspace", async () => {
  const workspace = await readText("pnpm-workspace.yaml");

  assert.match(workspace, /apps\/\*/);
  assert.match(workspace, /packages\/\*/);
});

test("the workspace declares the three shared boundaries", async () => {
  const packages = await Promise.all(
    ["core", "ui", "app-ui"].map((name) =>
      readJson(`packages/${name}/package.json`),
    ),
  );

  assert.deepEqual(
    packages.map((one) => one.name),
    ["@september/core", "@september/ui", "@september/app-ui"],
  );
  assert.ok(packages.every((one) => one.private === true));
});

test("desktop consumes the common application rules", async () => {
  const { deleteLastWord, spaceSlug } = await import(
    "@september/core/rules/spaces"
  );

  assert.equal(deleteLastWord("hello there"), "hello ");
  assert.equal(spaceSlug("My Family"), "my-family");
});

test("both apps delegate pure rules and autocomplete to core", async () => {
  for (const app of ["web", "desktop"]) {
    assert.match(
      await readText(`apps/${app}/src/rules/spaces.ts`),
      /@september\/core\/rules\/spaces/,
    );
  }

  assert.match(
    await readText("apps/web/src/packages/shared/lib/autocomplete/index.ts"),
    /@september\/core\/autocomplete/,
  );
  assert.match(
    await readText("apps/desktop/src/autocomplete/index.ts"),
    /@september\/core\/autocomplete/,
  );
});

test("neither app keeps a copied autocomplete engine", async () => {
  const webFiles = await readdir(
    new URL("apps/web/src/packages/shared/lib/autocomplete/", repositoryRoot),
  );
  const desktopFiles = await readdir(
    new URL("apps/desktop/src/autocomplete/", repositoryRoot),
  );

  assert.deepEqual(webFiles.sort(), ["README.md", "index.ts"]);
  assert.deepEqual(desktopFiles.sort(), ["index.ts"]);
});

test("the dictionary generator writes only the core package", async () => {
  const generator = await readText(
    "apps/desktop/scripts/build-dictionary.mjs",
  );

  assert.match(
    generator,
    /["']packages["'],[\s\S]*["']core["'],[\s\S]*["']autocomplete["']/,
  );
  assert.doesNotMatch(generator, /apps["']?, ["']web/);
  assert.doesNotMatch(generator, /src["']?, ["']autocomplete/);
});

test("one UI package owns the primitives and design tokens", async () => {
  const manifest = await readJson("packages/ui/package.json");
  const button = await readText("packages/ui/components/button.tsx");
  const theme = await readText("packages/ui/theme.css");

  assert.equal(manifest.exports["./components/*"], "./components/*.tsx");
  assert.equal(manifest.exports["./theme.css"], "./theme.css");
  assert.match(button, /rounded-control/);
  assert.match(theme, /--radius-control: 0\.75rem/);
  assert.match(theme, /--font-sans:/);

  for (const path of [
    "apps/web/src/packages/shared/lib/utils.ts",
    "apps/web/src/packages/shared/hooks/use-mobile.ts",
  ]) {
    assert.match(await readText(path), /@september\/ui/);
  }
});

test("neither app keeps a copied UI package", async () => {
  for (const path of [
    "apps/web/src/packages/ui/",
    "apps/desktop/src/components/ui/",
  ]) {
    await assert.rejects(access(new URL(path, repositoryRoot)), {
      code: "ENOENT",
    });
  }
});

test("one application UI package owns the common screens", async () => {
  const manifest = await readJson("packages/app-ui/package.json");
  const talk = await readText("packages/app-ui/pages/talk.tsx");

  assert.equal(manifest.exports["./pages/*"], "./pages/*.tsx");
  assert.match(talk, /@september\/ui\/components\/button/);
  assert.match(talk, /@september\/core\/rules\/spaces/);
  assert.match(talk, /@platform\/services\/speech/);

  for (const app of ["web", "desktop"]) {
    for (const path of ["blocks/space.tsx", "layouts/app.tsx", "pages/talk.tsx"]) {
      await assert.rejects(
        access(new URL(`apps/${app}/src/${path}`, repositoryRoot)),
        { code: "ENOENT" },
      );
    }
  }
});
