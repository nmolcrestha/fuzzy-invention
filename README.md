# Side Quest — Website Builder

A section-based website builder for non-coders. See [`requirement.md`](./requirement.md) for the full requirements and delivery plan.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · Better Auth · Drizzle ORM · PostgreSQL · Vitest

## Getting started

```bash
pnpm install
cp .env.example .env           # then fill in the values (see below)
pnpm db:migrate                # create the tables
pnpm dev                       # http://localhost:3000
```

### Environment

| Variable                                    | Required | Notes                                                                               |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | ✅       | Any Postgres. Run `docker compose up -d` for a local one on port **5433**           |
| `BETTER_AUTH_SECRET`                        | ✅       | `openssl rand -base64 32`                                                           |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`   | ✅       | `http://localhost:3000` locally                                                     |
| `NEXT_PUBLIC_ROOT_DOMAIN`                   | ✅       | Sites live at `<subdomain>.<root domain>`. `localhost:3000` locally                 |
| `RESEND_API_KEY`                            | –        | Without it, verification and reset emails are **printed to the dev server console** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | –        | Shows "Continue with Google" when both are set                                      |

## Scripts

| Script                                         | What it does                                      |
| ---------------------------------------------- | ------------------------------------------------- |
| `pnpm dev` / `build` / `start`                 | Next.js                                           |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Code quality                                      |
| `pnpm test`                                    | Unit tests (Vitest)                               |
| `pnpm db:generate`                             | Create a migration after changing `src/db/schema` |
| `pnpm db:migrate`                              | Apply migrations                                  |
| `pnpm db:studio`                               | Browse the database                               |

## Project structure

```
src/
├── app/
│   ├── (auth)/            # login, signup, forgot/reset password
│   ├── dashboard/         # protected dashboard: sites list, new site
│   │   └── sites/[siteId]/  # pages, settings, activity
│   ├── editor/[siteId]/[pageId]/ # full-screen visual editor
│   ├── preview/[pageId]/  # draft render (editor iframe & "Preview" tab)
│   ├── %5Fsites/[subdomain]/ # published sites (URL /_sites/…, reached only via proxy rewrite)
│   ├── api/auth/[...all]/ # Better Auth handler
│   └── page.tsx           # marketing home (placeholder)
├── components/
│   ├── auth/              # auth forms
│   ├── dashboard/         # sidebar, user menu
│   ├── editor/            # visual editor: store, autosave, outline, inspector, preview bridge
│   ├── pages/             # page manager, add/edit page dialog
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
│   └── slug.ts            # web address & page URL rules (unit tested)
├── sections/              # section system (shared by editor preview & published sites)
│   ├── fields.ts          # field DSL → editor form + Zod schema + defaults
│   ├── defs.ts            # section types (schemas only, no React)
│   ├── registry.ts        # lookup, normalize/validate blocks, header/footer defaults
│   ├── components.tsx     # section React components (no hooks: render anywhere)
│   ├── rich-text*.ts(x)   # Tiptap JSON allow-list + safe renderer
│   ├── theme.ts           # theme presets, fonts, CSS variables, contrast checks
│   ├── navigation.ts      # extra menu links & social profiles
│   ├── snapshot.ts        # what a publish freezes (page & site-design versions)
│   ├── checks.ts          # pre-publish checks
│   └── site.css           # --sq-* theme tokens and website styles
├── server/
│   ├── publish/           # publish summary, publishChanges, unpublishPage
│   ├── live/              # cached loaders for published sites ('use cache' + tags)
│   ├── live-cache.ts      # cache tags + invalidateLiveSite()
│   ├── editor/            # load editor data, saveDraft (revision-checked autosave)
│   ├── sites/             # access checks, queries, server actions, shared Zod schemas
│   ├── pages/             # page server actions
│   ├── activity.ts        # activity log writer
│   └── action-result.ts   # { ok, data } | { ok: false, error } with plain-language errors
├── env.ts                 # validated environment variables
└── proxy.ts               # optimistic redirect for /dashboard (Next 16 "proxy" = middleware)
```

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
