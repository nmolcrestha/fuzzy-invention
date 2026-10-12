# Project memory: Side Quest site builder

Handover notes for the next session. Requirements and the phase plan are in
[`requirement.md`](./requirement.md); setup, project structure and conventions are in
[`README.md`](./README.md). This file only holds what those don't: current state, reasons behind
decisions, and traps already hit.

_Last updated: 2026-10-12._

## 1. Current state

| Phase                                                                         | Commit                  |
| ----------------------------------------------------------------------------- | ----------------------- |
| 0 Foundation · 1 Sites & pages · 2 Sections + editor · 3 Theme + publishing   | `c7ba883` … `b2f0e3b`   |
| 4 Templates, onboarding, more sections                                        | `a003ea8`               |
| 5 Media, SEO + redirects, forms + inbox, saved sections, version history, e2e | `3e620aa`               |
| 6 Section builder: backgrounds + video, "Build your own", customize layout    | **done, not committed** |
| 7 Post-MVP: custom domains, teams, AI copy, analytics, billing                | not started             |

- **Phase 6 is finished and verified but uncommitted** (~59 changed/new files). A commit message
  was drafted in the session; commit only when the user says "git commit".
- **Next step is the user's choice:**
  - MVP gaps (requirement.md, Phase 5 "Still open"): PAGE-1 page templates (P0) first, then
    SITE-4, AUTH-5, ED-9, IndexedDB backup.
  - Phase 6 leftovers: non-coder usability test, Lighthouse + image resizing, SB-13 column image
    backgrounds, P2s.
- The local DB holds the demo account plus a hand-made site **"test"** (subdomain `test`).
  It's the user's: don't delete it.

## 2. Local environment

- Postgres on **5432** (`postgres`/`postgres`, db `side_quest`); URL and a generated
  `BETTER_AUTH_SECRET` are in the git-ignored `.env`.
- `pnpm db:migrate` → `pnpm db:seed` (demo login **demo@example.com / demo12345**) → `pnpm dev`.
- No `RESEND_API_KEY`: all emails are printed in the server console.
- No `BLOB_READ_WRITE_TOKEN`: uploads go to `.data/uploads`, served at `/media/…`. The Vercel Blob
  path has **never run against a real token**.
- Live sites: `http://<subdomain>.localhost:3000` (proxy rewrites to `/_sites/<subdomain>/…`).
- Checks before handing back a phase: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (180 unit), `pnpm build`, `pnpm test:e2e` (9 specs; needs the build + seed).
- Latest migration: `0006` (video columns on `media_assets`).

## 3. Stack notes

Next.js **16.4** (`cacheComponents` + `partialPrefetching`), React 19.3, Tailwind v4, shadcn/ui
**on Base UI (not Radix)**, Better Auth 1.7, Drizzle 0.45 + postgres-js, Zod 4, Tiptap 3,
Zustand 5, dnd-kit, Vitest 5, @vercel/blob 2.8, @playwright/test 1.64, pnpm 11.
Read `node_modules/next/dist/docs/` before writing Next code (AGENTS.md); many APIs changed.

## 4. Decisions and why

- **Sections are code-defined** with one field DSL (`src/sections/fields.ts`): it drives the
  editor form, validation and defaults. Section components use no hooks so they render in the
  editor iframe and as RSC on live sites; interactive parts are small client components.
- **Drafts are validated structurally only**; required fields are checked at publish time, so
  autosave never fails mid-typing.
- **Publishing is page by page** into immutable `page_versions` / `site_versions`; live pages only
  read snapshots (`src/server/live`). Anything visitors see changing → `invalidateLiveSite()`.
  Site design (theme, header/footer, menu, logo, contact) is its own publish item.
- **Concurrency:** `pages.draftRevision`, `sites.designRevision`, `sections.revision` (shared
  sections). Autosave sends `shared: { revision, dirty }`; dirty = data/style/variant identity
  changed (hiding is per page). Anything changing a draft from outside the editor bumps
  `draftRevision`.
- **Shared sections** = one `sections` row placed on many pages; inlined into snapshots.
- **Media:** every upload is in `media_assets`. Delete strips the URL from drafts; the file is kept
  while any version references it. Video posters are captured in the browser from a frame.
- **Forms** validate against the **published** snapshot; honeypot + rate limit by salted IP hash
  (`x-forwarded-for`, trusted on Vercel); notification email via `after()`.
- **Redirects** are created at publish (moved pages, opt-out) and by "Take offline"; chains
  collapse.
- **Section builder:** one `custom` section type; `data.layout` = rows (fixed splits) → columns →
  items, item kinds in `items.ts` (same field DSL). Edit layouts only via `layoutOps` (limits, no
  content loss, same object on no-op). Presets name the "slots" the guided dialog asks about.
- **Backgrounds:** `style.background` stays the color tone; `style.backdrop` (gradient / image /
  video) sits on top, chosen to avoid migrating stored content. `effectiveTone()` sets text colors,
  including a `light` tone so light overlays get dark text on dark-mode sites.
- **Authorization** always goes through `src/server/sites/access.ts`; server actions return
  `ActionResult` with plain-language errors, log activity, and call `refresh()`.

## 5. Traps already hit

**Next 16 / Cache Components**

- Middleware is `proxy.ts`; `params`/`searchParams` are Promises; `PageProps`, `LayoutProps`,
  `RouteContext` are global types.
- Cookies/headers/params/`usePathname()` readers must be inside `<Suspense>`.
- Visited routes stay alive (React Activity): returning to an editor revives its old Zustand store.
  `Editor` restarts from fresh props when server revisions are newer and nothing is unsaved.
- `new Date()` during a live-page prerender errors; use the cached `currentYear()`.
- `notFound()` in a layout uses the parent's `not-found.tsx`.
- Live 404s return 200 (+ noindex) and redirects are meta refreshes, because the page streams.
  Planned fix: lookup in the proxy, with custom domains (Phase 7).
- Every export of a `"use server"` file is a public endpoint; keep helpers in `server-only` files.
- Private folders can't start with `_`: use `%5F` (`src/app/%5Fsites`, `%5Fform`).
- Turbopack traces the whole project for dynamic `fs` paths; use `/*turbopackIgnore: true*/`.

**Base UI**

- Use `ButtonLink` for button-styled links (`render={<Link/>}` adds `role="button"`).
- Menus/dialogs stay mounted: scope test locators by name.
- `DropdownMenuRadioItem` needs `closeOnClick`, or the open menu blocks the page.
- A `<Label htmlFor>` on a button replaces its name: give picker buttons an `aria-label`.

**Code**

- `withFreshIds` only renews ids of objects inside arrays; copy one object with
  `withFreshIds([structuredClone(x)])[0]` (`freshCopy` in layout-ops).
- Scaled previews: use CSS `zoom`, not `transform: scale` (zoom shrinks layout height).
- The editor preview iframe is < 768px wide, so it shows video posters like a phone.
- `src/lib/auth.ts` is `server-only`; plain Node scripts can't import it.

**This machine (Windows, Git Bash)**

- Heredocs, and Python inside them, strip backslashes. Write patch scripts to a scratchpad `.py`
  file with the Write tool, or use the Edit tool.
- "LF will be replaced by CRLF" warnings are harmless.

## 6. Testing notes

- Unit tests: `src/**/*.test.ts`. E2E: `e2e/` (core editor, media, SEO/redirects, forms, saved
  sections, versions, backgrounds, builder, layout). Each test makes an `e2e-…` site; the global
  teardown deletes them. Debug with `PW_KEEP_DATA=1` and `PW_SERVER_LOGS=1`.
- Pick files with `chooseFiles` (file chooser + retry); setting inputs before hydration is lost.
- Test videos are recorded in the browser (`webmFile` helper).
- The editor iframe swallows clicks (they select sections): test interactive widgets on
  `/preview/<pageId>` or the live site. Drag tests need a viewport tall enough to show both ends.

## 7. Working with the user

- Draft commit messages; commit only on an explicit "git commit"; never push. Commits end with the
  `Co-Authored-By: Claude …` line.
- Work goes phase by phase. End of a phase: all checks + e2e pass, mark it done in
  `requirement.md`, update this file, remove test data (keep the demo account and "test" site),
  summarize, suggest a commit message.
- Ask before destructive or outward-facing actions. When the user leaves open questions
  unanswered, pick sensible defaults and say which.

## 8. Backlog

- Real 404/redirect HTTP status (proxy lookup).
- Cleanup job for stored files no version references (deleted media, versions pruned past 50).
- Crop/focal point in the media library (MED-4), Unsplash search (MED-6), Turnstile (FRM-4).
- Inline text editing in the preview (ED-8); internal links in the standalone draft preview.
