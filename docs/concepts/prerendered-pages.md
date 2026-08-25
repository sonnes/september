---
title: The public pages are prerendered
description: The build draws the landing page and every Help guide into their own files and keeps the empty shell beside them, so a reader and a crawler both get the words before the bundle arrives.
package: web
---

# The public pages are prerendered

September is a client application: nearly every screen reads IndexedDB, and
none of that can be drawn by a build machine. Two parts are the exception, and
they are the two parts strangers read.

`/` sells the app. It is shared as a link, and it is read by people who have
not decided to use anything yet. It should not ask them to download a bundle
first.

`/help` and its guides are written from pure rules in
`@september/core/rules/help`, and they sit outside the finished-setup guard.
Someone reaches them from a search engine, part-way through a task, often on a
slow line and sometimes with JavaScript off. A guide that needs a 900 kB bundle
before it will say which button to press is a guide that arrives too late.

## What the build writes

`pnpm build` runs `apps/web/scripts/prerender.mjs` after Vite. The script
builds the same application a second time for Node, renders each path in
`PRERENDERED_PATHS`, and writes:

| File | Served at | Holds |
| --- | --- | --- |
| `dist/index.html` | `/` | The landing page, already drawn |
| `dist/help/index.html` | `/help` | Help, with every task listed |
| `dist/help/<slug>/index.html` | `/help/<slug>` | One guide each |
| `dist/app.html` | every application route | The empty shell |

One file per page, because one shell cannot be all of them. If the shell
carried the landing markup, a deep link to `/dashboard` would paint the
marketing page for as long as the bundle took to boot.

`PRERENDERED_PATHS` in `apps/web/src/rules/prerender.ts` is the whole list, and
it derives the guides from `HELP_GUIDES`. A new guide is prerendered by being
written; nothing else has to be told about it.

## Folder indexes, and one canonical path

Each page is written as `<path>/index.html` rather than `<path>.html`. It is
the one shape both hosts answer with from the filesystem, at the slashless path
the app's own `Link`s already use.

That shape has a trap. The Worker's asset server defaults to
`auto-trailing-slash`, which answers `/help` with a 307 to `/help/` — a wasted
round trip on every link a reader or a crawler follows. `wrangler.jsonc` sets
`html_handling` to `drop-trailing-slash` instead, and `vercel.json` sets
`trailingSlash` to `false`. Both hosts now treat the slashless path as
canonical, matching the links.

## Static markup, not hydration

`renderPage` in `src/entry-server.tsx` uses `renderToStaticMarkup`, so the
markup carries no hydration markers. The browser mounts over it with
`createRoot`: the first commit replaces the static page with the same page, now
working.

Hydration would need the router's resolved matches to cross from the build into
the page, which is machinery this app does not have. The static markup already
buys what these pages need — words without JavaScript, and a first paint that
does not wait.

One visible cost. `AppShell` decides its sidebar width from `window.innerWidth`
in an effect, which does not run in a build, so a prerendered Help page is
drawn with the sidebar open. On a narrow screen it collapses to the rail on the
first commit. A reader on a phone sees the sidebar for that moment. The words
of the guide are correct throughout, which is what the page is for.

## The title travels

React puts a `<title>` in the head of a running page, but a build renders
markup for the body and leaves the element where it stands. `hoistTitle` moves
it, so each guide's file carries its own title — `Clone a voice · Help ·
September` — and `dist/app.html` keeps the plain `September` a tab shows before
the bundle mounts.

## The routing has to agree

Both hosts serve what exists from the filesystem and everything else from the
shell. Neither needs a rule per page:

- `apps/web/vercel.json` rewrites every path with no file to `app.html`.
  Vercel checks the filesystem before applying rewrites, so a prerendered page
  answers for itself.
- `apps/server` sets `not_found_handling` to `none`, so a request matching no
  asset reaches the Worker, which serves `app.html`.

A Help slug that was never built is not special. It has no file, so it gets the
shell, and the router sends the unknown slug back to `/help`.

## What a page view may say

Every page the browser app serves carries an Umami tag, the prerendered ones
and the application shell alike. Automatic tracking is off: the script would
read the address and the title of every page the user moves to, and a
September address names the person the user talks to.

The router reports each page instead. A screen that names nobody is reported
by its address — `/dashboard`, `/help/clone-a-voice`. A screen that carries a
name is reported by the shape of its route — `/spaces/$slug/talk`. So a count
says a space was opened without saying whose, and the words stay on the
device with everything else.

The build reads `UMAMI_SCRIPT_URL` and `UMAMI_WEBSITE_ID`. With neither set it
writes nothing at all, and the desktop app never loads a tracker.


## What holds it together

- `apps/web/src/prerender.test.tsx` renders `/`, `/help`, and a guide without a
  browser; checks the markup is static; checks the landing page carries no
  application screen; and holds `PRERENDERED_PATHS` to pages that read no
  browser storage.
- `apps/server/src/index.test.ts` checks that `/`, `/help`, a guide, and an
  application route are answered by four different files, and that Help answers
  with no redirect in front of it.