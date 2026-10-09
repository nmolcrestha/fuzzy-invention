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
│   ├── api/auth/[...all]/ # Better Auth handler
│   └── page.tsx           # marketing home (placeholder)
├── components/
│   ├── auth/              # auth forms
│   ├── dashboard/         # sidebar, user menu
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
├── server/
│   ├── sites/             # access checks, queries, server actions, shared Zod schemas
│   ├── pages/             # page server actions
│   ├── activity.ts        # activity log writer
│   └── action-result.ts   # { ok, data } | { ok: false, error } with plain-language errors
├── env.ts                 # validated environment variables
└── proxy.ts               # optimistic redirect for /dashboard (Next 16 "proxy" = middleware)
```

## Conventions

- **Authorization lives in the Data Access Layer.** `proxy.ts` only does an optimistic cookie check. Every page, server action and route handler must call `requireUser()`, and every site/page read or write goes through `findOwnedSite` / `findOwnedPage` in `src/server/sites/access.ts`.
- **Cache Components is on.** Anything that reads cookies, headers or search params must sit inside a `<Suspense>` boundary.
- **UI copy is plain language.** Destructive or public actions use `ConfirmDialog` and name the consequence. Reversible ones use an undo toast.
- **Server actions return `ActionResult`** and never throw for expected problems. Every change writes an activity log entry and calls `refresh()`.
- **Soft deletes.** Sites and pages have `deletedAt`. Sites can be restored for 30 days. Deleted pages can be undone from the toast.
