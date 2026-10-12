# Side Quest — Website Builder

A section-based website builder for non-coders. See [`requirement.md`](./requirement.md) for the full requirements and delivery plan.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · Better Auth · Drizzle ORM · PostgreSQL · Vercel Blob · Vitest · Playwright

## Getting started

```bash
pnpm install
cp .env.example .env           # then fill in the values (see below)
pnpm db:migrate                # create the tables
pnpm db:seed                   # demo login: demo@example.com / demo12345
pnpm dev                       # http://localhost:3000
```

### Environment

| Variable                                    | Required | Notes                                                                                                                         |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | ✅       | Any Postgres. Run `docker compose up -d` for a local one on port **5433**                                                     |
| `BETTER_AUTH_SECRET`                        | ✅       | `openssl rand -base64 32`                                                                                                     |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`   | ✅       | `http://localhost:3000` locally                                                                                               |
| `NEXT_PUBLIC_ROOT_DOMAIN`                   | ✅       | Sites live at `<subdomain>.<root domain>`. `localhost:3000` locally                                                           |
| `RESEND_API_KEY`                            | –        | Without it, verification and reset emails are **printed to the dev server console**                                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | –        | Shows "Continue with Google" when both are set                                                                                |
| `BLOB_READ_WRITE_TOKEN`                     | –        | Vercel Blob (images up to 10 MB, videos up to 50 MB). Without it, uploads are saved to `.data/uploads` and served at `/media` |

## Scripts

| Script                                         | What it does                                      |
| ---------------------------------------------- | ------------------------------------------------- |
| `pnpm dev` / `build` / `start`                 | Next.js                                           |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Code quality                                      |
| `pnpm test`                                    | Unit tests (Vitest)                               |
| `pnpm test:e2e`                                | End-to-end tests (Playwright), see below          |
| `pnpm db:generate`                             | Create a migration after changing `src/db/schema` |
| `pnpm db:migrate`                              | Apply migrations                                  |
| `pnpm db:seed`                                 | Create/reset the local demo account (verified)    |
| `pnpm db:studio`                               | Browse the database                               |

## Project structure

```
src/
├── app/
│   ├── (auth)/            # login, signup, forgot/reset password
│   ├── dashboard/         # protected dashboard: sites list, new site
│   │   └── sites/[siteId]/  # pages, design, menu, media, inbox (messages), history, settings, activity
│   ├── editor/[siteId]/[pageId]/ # full-screen visual editor
│   ├── preview/[pageId]/  # draft render (editor iframe & "Preview" tab)
│   ├── preview/version/[versionId]/ # an earlier published version of a page
│   ├── %5Fsites/[subdomain]/ # published sites (URL /_sites/…, reached only via proxy rewrite)
│   │   └── %5Fform/       # contact form posts (<subdomain>.<root>/_form)
│   ├── api/auth/[...all]/ # Better Auth handler
│   ├── api/media/upload/  # Vercel Blob client-upload tokens (handleUpload)
│   ├── api/media/local/   # development uploads (no Blob token)
│   ├── media/[...key]/    # serves development uploads
│   └── page.tsx           # marketing home (placeholder)
├── components/
│   ├── auth/              # auth forms
│   ├── dashboard/         # sidebar, user menu
│   ├── editor/            # visual editor: store, autosave, outline, inspector, preview bridge,
│   │                      #   background picker, "Build your own" dialog, layout editor (drag & drop)
│   ├── forms/             # messages inbox
│   ├── media/             # media library, uploads, image picker
│   ├── pages/             # page manager, page settings dialog (name, address, search & social)
│   ├── versions/          # version history list
│   ├── sites/             # site forms, status badges, web-address field
│   ├── confirm-dialog.tsx # consequence-aware confirmation (requirement §8.2)
│   ├── button-link.tsx    # link styled as a button (keeps link semantics)
│   ├── empty-state.tsx
│   └── ui/                # shadcn/ui (generated, don't hand-edit)
├── db/                    # Drizzle client + schema
├── lib/
│   ├── auth.ts            # Better Auth server config
│   ├── auth-client.ts     # Better Auth React client
│   ├── session.ts         # Data Access Layer: getSession / requireUser
│   ├── email.ts           # Resend (or console in dev)
│   ├── media-rules.ts     # upload limits, file sniffing, storage keys (unit tested)
│   └── slug.ts            # web address & page URL rules (unit tested)
├── sections/              # section system (shared by editor preview & published sites)
│   ├── fields.ts          # field DSL → editor form + Zod schema + defaults
│   ├── defs.ts, defs-more.ts # section types (schemas only, no React)
│   ├── registry.ts        # lookup, normalize/validate blocks, header/footer defaults
│   ├── components*.tsx    # section React components (no hooks: render anywhere)
│   ├── parts.tsx          # shared building blocks for section components
│   ├── rich-text*.ts(x)   # Tiptap JSON allow-list + safe renderer
│   ├── theme.ts           # theme presets, fonts, CSS variables, contrast checks
│   ├── navigation.ts      # extra menu links & social profiles
│   ├── form*.ts(x)        # contact form section + submission validation
│   ├── backdrop*.ts(x)    # section backgrounds: gradient, image, video, overlay, readability
│   ├── custom*.ts(x)      # "Build your own" section type and its renderer
│   ├── layout.ts          # built sections: rows → columns → items, splits, limits, schema
│   ├── layout-ops.ts      # pure layout edits (move, split, duplicate, reset; unit tested)
│   ├── items.ts           # item kinds (heading, text, buttons, image, video, logos, slider…)
│   ├── presets.ts         # goals and starting designs for "Build your own"
│   ├── image-slider.tsx, logo-marquee.tsx # accessible slider and logo carousel (client)
│   ├── seo.ts             # search titles/descriptions, SEO checks
│   ├── media-refs.ts      # find/remove an image inside stored content
│   ├── snapshot.ts        # what a publish freezes (page & site-design versions)
│   ├── checks.ts          # pre-publish checks
│   └── site.css           # --sq-* theme tokens and website styles
├── templates/             # starter sites (definitions + materialize into validated blocks)
├── server/
│   ├── publish/           # publish summary, publishChanges, unpublishPage
│   ├── live/              # cached loaders for published sites ('use cache' + tags)
│   ├── live-cache.ts      # cache tags + invalidateLiveSite()
│   ├── editor/            # load editor data, saveDraft (revision-checked autosave)
│   ├── sites/             # access checks, queries, server actions, shared Zod schemas
│   ├── pages/             # page server actions
│   ├── media/             # uploads (Blob or local), usage checks, delete
│   ├── forms/             # form submissions (spam checks, rate limit), inbox actions
│   ├── library/           # saved (shared) sections
│   ├── redirects/         # forwarded addresses
│   ├── versions/          # version history, restore, discard changes
│   ├── activity.ts        # activity log writer
│   └── action-result.ts   # { ok, data } | { ok: false, error } with plain-language errors
├── env.ts                 # validated environment variables
└── proxy.ts               # optimistic redirect for /dashboard (Next 16 "proxy" = middleware)
```

## End-to-end tests

`e2e/` holds Playwright suites (core editor, media, SEO & redirects, forms, saved sections, versions, backgrounds, "Build your own", customize layout). They run against a production build with the demo account:

```bash
pnpm build && pnpm db:seed
pnpm exec playwright install chromium   # once
pnpm test:e2e                           # starts `pnpm start` unless something already runs on :3000
```

Each test creates its own site with an `e2e-…` address; they're deleted (with their uploads) when the run ends. `PW_KEEP_DATA=1` keeps them for debugging, and `PW_SERVER_LOGS=1` shows the server console (for example, notification emails).

## Viewing published sites locally

Published sites are served at `http://<subdomain>.localhost:3000`. Chrome, Edge and Firefox resolve `*.localhost` to your machine, so no hosts-file changes are needed. `proxy.ts` rewrites those hosts to `/_sites/<subdomain>/…`.

## Conventions

- **Authorization lives in the Data Access Layer.** `proxy.ts` only does an optimistic cookie check. Every page, server action and route handler must call `requireUser()`, and every site/page read or write goes through `findOwnedSite` / `findOwnedPage` in `src/server/sites/access.ts`.
- **Cache Components is on.** Anything that reads cookies, headers or search params must sit inside a `<Suspense>` boundary.
- **UI copy is plain language.** Destructive or public actions use `ConfirmDialog` and name the consequence. Reversible ones use an undo toast.
- **Server actions return `ActionResult`** and never throw for expected problems. Every change writes an activity log entry and calls `refresh()`.
- **Adding a section type:** add its fields/variants to `src/sections/defs.ts`, register it in `registry.ts` and add the component to `components.tsx`. The editor form, validation and picker preview follow automatically. Keep section components free of hooks.
- **Editor saves** send the full ordered section list with the page's `draftRevision` (and header/footer with `designRevision`). A stale revision returns a conflict instead of overwriting.
- **Drafts vs live:** the dashboard and editor only touch drafts. Visitors only ever see `page_versions` / `site_versions` snapshots, loaded through `src/server/live`. Anything that changes what visitors see must call `invalidateLiveSite()`.
- **Soft deletes.** Sites and pages have `deletedAt`. Sites can be restored for 30 days. Deleted pages can be undone from the toast.
- **Shared (saved) sections** are one `sections` row placed on several pages. Saves send each shared section's `revision` and whether it was edited; only edited ones are written, and a stale revision returns a conflict. Editing one marks every other page that uses it as changed.
- **Uploads** go through `src/server/media`. Every file is recorded in `media_assets`. Deleting an image removes it from drafts; the file itself is kept while any published version still references it.
- **Built sections** are one section type (`custom`) whose `data.layout` is a validated tree: rows (fixed column splits) → columns → items. Item kinds are defined with the same field DSL as sections. Edit layouts only through `layoutOps`, which keeps limits and never drops content.
- **Backgrounds:** `style.background` is the color tone; `style.backdrop` (gradient, image, video) is drawn on top, and `effectiveTone()` decides the text colors from its overlay. Header and footer only use plain colors.
- **Contact forms** only accept messages for forms on published pages, validated against the published snapshot. Notification emails are sent with `after()`.
