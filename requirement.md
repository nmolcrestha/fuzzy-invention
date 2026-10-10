# Site Builder — Requirements & Plan

> Working name: **Side Quest Builder** (rename anytime)
> Status: Draft v0.2 · Last updated: 2026-10-09

---

## 1. Vision

A modern, section-based website builder for **non-coders**. A user signs up, picks a starting template (SaaS, company, restaurant…), edits text and images in a simple dashboard, and publishes a live website **within minutes**.

The dashboard manages the website's frontend: users create **pages**, build **sections** (hero, features, pricing, menu, contact…), and arrange those sections on their pages. The UI is simple, and it always tells the user what their actions will do and what state their site is in.

### Core principles

1. **Speed to live site.** A first-time user should go from sign-up to a published site in **under 10 minutes**.
2. **Structured, not freeform.** Users compose pre-designed, responsive sections. They don't drag pixels around. Every site looks good by default and works on mobile.
3. **No surprises.** Every action has visible feedback. Destructive or public actions explain their consequences before they happen. Most actions can be undone.
4. **Plain language.** Say "Publish", "Page", "Section", "Draft". Avoid words like "component", "schema", "slug" or "deploy" in the UI.

---

## 2. Reference products & what we borrow

| Product                           | What we borrow                                                                                                                                     | What we avoid                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Storyblok**                     | Component/block-based content model; schema-driven fields; live visual preview next to the editing form; nested blocks; global/reusable components | Developer-first setup; requires a separate frontend; too technical for non-coders |
| **YOOtheme Pro**                  | Section → Row → Column → Element layout mental model; layout library (save/reuse sections); style presets; responsive previews                     | Overwhelming option panels; too many style knobs per element                      |
| **Framer / Webflow** (secondary)  | Polished templates, instant publish, subdomain hosting                                                                                             | Freeform canvas complexity                                                        |
| **Squarespace / Wix** (secondary) | Onboarding by business type, template-first start                                                                                                  | Locked-in, heavy editor                                                           |

**Our position:** Storyblok's clean content model + YOOtheme's section library, with a much smaller and friendlier set of options.

---

## 3. Target users (personas)

| Persona                                  | Need                                                            | Success looks like                                             |
| ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| **SaaS founder** (non-technical or busy) | Landing page with hero, features, pricing, FAQ, waitlist/CTA    | Live landing page the same day, edits copy without a developer |
| **Small company / agency owner**         | Company site: About, Services, Team, Contact                    | 4–6 page site that looks professional                          |
| **Restaurant owner**                     | Menu, opening hours, location/map, gallery, reservation/contact | Updates menu and hours from a phone or laptop in seconds       |
| **Freelancer / agency (later)**          | Builds sites for clients                                        | Manages several sites from one account                         |

---

## 4. Scope

### 4.1 In scope (MVP)

- Account sign-up/login (Better Auth)
- Create and manage **multiple sites** per user
- Start from a **template** or a blank site
- Page management (create, rename, reorder, set homepage, delete, duplicate)
- **Section library** with pre-built section types and layout variants
- **Visual editor:** section list + live preview + settings panel
- Shared **site theme** (colors, fonts, corner style, button style)
- Global **header & footer / navigation**
- **Page-by-page** Draft → Publish workflow with version history & rollback
- Media library (image upload, alt text)
- Basic SEO per page (title, description, social image)
- Hosted on a free **subdomain** (`mysite.builder.app`)
- Contact form section with submissions inbox

### 4.2 Later (post-MVP)

- Custom domains with automatic SSL
- Team members & roles per site
- Blog / collections (menu items, team members, testimonials as reusable lists)
- AI help: "write my hero copy", "generate a site from a description"
- Analytics (page views)
- Multi-language sites
- Integrations (Google Analytics, Mailchimp, Calendly, reservation tools)
- Billing / plans

### 4.3 Out of scope (for now)

- E-commerce / payments on user sites
- Freeform (absolute-position) design canvas
- Custom code injection by users (except possibly a restricted "embed" section later)
- Exporting code

---

## 5. Tech stack

| Concern       | Choice                                            | Notes                                                                                                                                                   |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | **Next.js (App Router)**                          | One app serves the dashboard, the editor and published sites                                                                                            |
| Language      | TypeScript (strict)                               |                                                                                                                                                         |
| Auth          | **Better Auth**                                   | Email/password + Google OAuth, email verification, password reset. `organization` plugin later for teams                                                |
| Database      | **PostgreSQL**                                    | Neon / Supabase / self-hosted                                                                                                                           |
| ORM           | **Drizzle ORM** + drizzle-kit migrations          |                                                                                                                                                         |
| Validation    | **Zod**                                           | Single source of truth for section field schemas (editor forms + server validation)                                                                     |
| UI            | Tailwind CSS + shadcn/ui (Radix)                  | Dashboard UI and section rendering                                                                                                                      |
| Forms         | react-hook-form + Zod resolver                    | Settings panel forms are generated from section schemas                                                                                                 |
| Drag & drop   | dnd-kit                                           | Reordering sections and pages                                                                                                                           |
| Client state  | Zustand (editor state, undo/redo history)         | Server state via Server Actions / TanStack Query                                                                                                        |
| Rich text     | **Tiptap**                                        | Restricted extension set (headings, bold, italic, links, lists). Content stored as Tiptap JSON and rendered server-side to HTML, never as raw user HTML |
| Media storage | **Vercel Blob**                                   | Client uploads via `@vercel/blob/client` `upload()` + a `handleUpload` route that checks auth, size and type. Image resizing via `next/image`           |
| Email         | Resend (or similar)                               | Auth emails, form-submission notifications                                                                                                              |
| Hosting       | Vercel (wildcard subdomains + custom domains API) | Alternatively any Node host + reverse proxy                                                                                                             |
| Testing       | Vitest (unit), Playwright (E2E)                   |                                                                                                                                                         |

---

## 6. Core concepts (domain model)

```
User ──owns──▶ Site ──has──▶ Pages ──contain (ordered)──▶ Sections
                 │                                         ▲
                 ├── Theme (colors, fonts, style)          │
                 ├── Navigation (header / footer menus)    │
                 ├── Media library                         │
                 └── Saved sections (library) ─────────────┘
```

- **Site:** one website. It has a name, subdomain, theme, navigation and pages.
- **Page:** a URL on the site (`/`, `/about`, `/menu`). It holds an ordered list of sections.
- **Section type:** a pre-built block defined in code (for example `hero`, `pricing`). Each one has a Zod schema for its content fields, one or more **layout variants**, and a React render component.
- **Section (instance):** one use of a section type with the user's content.
  - **Local section:** belongs to one page only (the default).
  - **Shared section:** saved to the site's library and **linked** to several pages. Editing it updates every page that uses it, and the UI says so clearly ("Used on 3 pages").
- **Theme:** design tokens applied to every section (primary color, fonts, radius, spacing density, button style).
- **Draft vs Published:** users always edit the draft. **Publishing is page by page.** Publishing a page creates an immutable snapshot of that page, which is what visitors see.
- **Site-wide settings** (theme, navigation, header/footer, logo) affect every page, so they're published as their own item, "Site design & navigation", next to the pages.

---

## 7. Functional requirements

Priority: **P0** = MVP must-have · **P1** = MVP should-have · **P2** = later

### 7.1 Authentication & account (Better Auth)

| ID     | Requirement                                                                                  | P   |
| ------ | -------------------------------------------------------------------------------------------- | --- |
| AUTH-1 | Sign up / log in with email + password                                                       | P0  |
| AUTH-2 | Google OAuth login                                                                           | P1  |
| AUTH-3 | Email verification and password reset                                                        | P0  |
| AUTH-4 | Session management, log out from all devices                                                 | P1  |
| AUTH-5 | Profile settings (name, avatar, email change, delete account with clear warning)             | P1  |
| AUTH-6 | Teams/organizations with roles (Owner, Editor, Viewer) via Better Auth `organization` plugin | P2  |

### 7.2 Onboarding

| ID    | Requirement                                                                                              | P   |
| ----- | -------------------------------------------------------------------------------------------------------- | --- |
| ONB-1 | After sign-up, ask: "What are you building?" → SaaS / Company / Restaurant / Other                       | P0  |
| ONB-2 | Ask business name (+ optional tagline). These are pre-filled into the template                           | P0  |
| ONB-3 | Show 2–3 matching templates with live previews; "Start blank" option                                     | P0  |
| ONB-4 | Pick a theme preset (color + font pairing) with a live preview                                           | P1  |
| ONB-5 | Land in the editor with a **getting-started checklist** (edit hero, add logo, set contact info, publish) | P1  |

### 7.3 Site management (Dashboard)

| ID     | Requirement                                                                                                    | P   |
| ------ | -------------------------------------------------------------------------------------------------------------- | --- |
| SITE-1 | List of the user's sites as cards: thumbnail, name, URL, status (Draft / Live / Live with unpublished changes) | P0  |
| SITE-2 | Create site (via onboarding flow)                                                                              | P0  |
| SITE-3 | Site settings: name, subdomain, favicon, logo, default social image, contact info                              | P0  |
| SITE-4 | Duplicate site                                                                                                 | P1  |
| SITE-5 | Unpublish site (take offline) with confirmation                                                                | P1  |
| SITE-6 | Delete site: type the site name to confirm; 30-day soft delete with restore                                    | P0  |
| SITE-7 | Custom domain connection with DNS instructions and live verification status                                    | P2  |

### 7.4 Pages

| ID     | Requirement                                                                        | P   |
| ------ | ---------------------------------------------------------------------------------- | --- |
| PAGE-1 | Create page from blank or from a page template (About, Contact, Menu, Pricing…)    | P0  |
| PAGE-2 | Rename page; URL path auto-generated from the title and editable under "Advanced"  | P0  |
| PAGE-3 | Set homepage                                                                       | P0  |
| PAGE-4 | Reorder pages (drag & drop); choose whether a page shows in navigation             | P0  |
| PAGE-5 | Duplicate page                                                                     | P1  |
| PAGE-6 | Delete page (undo toast + warning if linked in navigation)                         | P0  |
| PAGE-7 | Changing the URL of a published page offers an automatic redirect from the old URL | P1  |
| PAGE-8 | Per-page SEO: title, meta description, social image, hide from search engines      | P1  |
| PAGE-9 | Page status badge: Draft / Published / Changed since publish                       | P0  |

### 7.5 Sections & section library

| ID     | Requirement                                                                                                                                                                                                                     | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| SEC-1  | "Add section" opens a picker grouped by category with visual thumbnails (not just names)                                                                                                                                        | P0  |
| SEC-2  | Insert a section at any position (+ button between sections)                                                                                                                                                                    | P0  |
| SEC-3  | Reorder sections by drag & drop, plus move up/down buttons for accessibility                                                                                                                                                    | P0  |
| SEC-4  | Duplicate, hide/show (without deleting) and delete a section                                                                                                                                                                    | P0  |
| SEC-5  | Switch a section's **layout variant** without losing its content                                                                                                                                                                | P0  |
| SEC-6  | **Save section to library** to reuse it on other pages                                                                                                                                                                          | P1  |
| SEC-7  | When adding from the library, choose **"Link (stays in sync)"** or **"Copy (edit separately)"**                                                                                                                                 | P1  |
| SEC-8  | A shared section shows a "Shared · used on N pages" badge. Editing it shows a notice that changes apply everywhere. Offer "Detach and edit only here"                                                                           | P1  |
| SEC-8a | Because publishing is per page, editing a shared section marks **every page using it** as "Changed". The notice says so: "Publish Home, Pricing and About to show this change live." The publish dialog pre-selects those pages | P1  |
| SEC-9  | Per-section style options kept small: background (none / light / dark / primary / image), spacing (compact / normal / spacious), alignment                                                                                      | P0  |
| SEC-10 | Anchor ID for one-page navigation (`#pricing`)                                                                                                                                                                                  | P1  |

**Starter section types (MVP):**

| Category        | Section types                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Header & footer | Navbar (logo, links, CTA button), Footer (columns, socials, copyright)                             |
| Intro           | Hero (centered / split image / background image), Announcement bar                                 |
| Content         | Text + image, Features grid, Feature list with icons, Stats, Logo cloud, Steps / How it works      |
| Social proof    | Testimonials (grid / carousel), Team members                                                       |
| Conversion      | Call to action, Pricing table (monthly/yearly toggle), FAQ (accordion), Newsletter/waitlist signup |
| Contact         | Contact form, Contact info + map, Opening hours                                                    |
| Restaurant      | Menu (categories → items with price, description, dietary tags), Gallery, Reservation CTA          |
| Media           | Image gallery, Video embed (YouTube/Vimeo)                                                         |

### 7.6 Editor (core experience)

Layout: **3 panels**

```
┌───────────────┬─────────────────────────────────┬──────────────────┐
│ Page outline  │        Live preview             │ Settings panel   │
│ (sections)    │   [Desktop|Tablet|Mobile]       │ (selected        │
│ + Add section │   click a section to select it  │  section fields) │
└───────────────┴─────────────────────────────────┴──────────────────┘
Top bar: Site ▸ Page switcher · Save status · Undo/Redo · Preview · Publish
```

| ID    | Requirement                                                                                                                                                                                                                                          | P   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| ED-1  | Live preview renders the **same React components** as the published site (inside an iframe)                                                                                                                                                          | P0  |
| ED-2  | Clicking a section in the preview selects it and opens its settings. Hover shows an outline and its name                                                                                                                                             | P0  |
| ED-3  | Settings panel is **auto-generated from the section's Zod schema** (text, rich text, image, link, color choice, list/repeater, toggle, select)                                                                                                       | P0  |
| ED-3a | Rich text fields use a **Tiptap** editor with a small, friendly toolbar (bold, italic, link, bullet/numbered list, heading level where allowed). Each field declares which formatting it allows, e.g. a hero subheading allows only bold/italic/link | P0  |
| ED-4  | Preview updates live as the user types (no save needed to see changes)                                                                                                                                                                               | P0  |
| ED-5  | **Autosave** drafts (debounced ~1s) with a visible status: "Saving…" → "Saved" → "Offline — changes kept locally"                                                                                                                                    | P0  |
| ED-6  | **Undo / Redo** (Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z) across the editing session                                                                                                                                                                            | P0  |
| ED-7  | Device toggle: desktop / tablet / mobile preview widths                                                                                                                                                                                              | P0  |
| ED-8  | Inline text editing directly in the preview for headings and paragraphs                                                                                                                                                                              | P2  |
| ED-9  | "Preview" button opens the draft in a new tab via a shareable, expiring preview link                                                                                                                                                                 | P1  |
| ED-10 | Warn before leaving if changes haven't finished saving                                                                                                                                                                                               | P0  |
| ED-11 | Keyboard shortcuts with a `?` cheat sheet                                                                                                                                                                                                            | P2  |

### 7.7 Theme / design

| ID    | Requirement                                                                                                          | P   |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --- |
| THM-1 | Theme presets (about 8 curated palettes + font pairings)                                                             | P0  |
| THM-2 | Customize: primary color, accent color, background (light/dark), heading font, body font (curated Google Fonts list) | P0  |
| THM-3 | Style toggles: corner roundness (sharp / soft / round), button style (solid / outline / pill), density               | P1  |
| THM-4 | Contrast checker: warn when text/background contrast fails WCAG AA                                                   | P1  |
| THM-5 | Theme changes preview live across the whole site and need publishing                                                 | P0  |

### 7.8 Navigation

| ID    | Requirement                                                                       | P   |
| ----- | --------------------------------------------------------------------------------- | --- |
| NAV-1 | Header menu: auto-built from pages marked "Show in navigation", manually editable | P0  |
| NAV-2 | Links to pages, page sections (anchors), or external URLs                         | P0  |
| NAV-3 | Footer menu + social links                                                        | P1  |
| NAV-4 | One level of dropdown sub-menus                                                   | P2  |

### 7.9 Publishing & versions

| ID     | Requirement                                                                                                                                                                                                                                                                         | P   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| PUB-1  | **Publish is page by page.** In the editor, "Publish" publishes the current page                                                                                                                                                                                                    | P0  |
| PUB-2  | The Publish dialog lists what will go live: the current page (checked) plus any **other changed items**, unchecked, so they can be published together: other pages, and "Site design & navigation" (theme, header/footer, menus, logo). It also has a "Select all changes" shortcut | P0  |
| PUB-3  | The dialog says what each choice does: "Publishing _Menu_ updates bella.builder.app/menu. Theme changes will apply to **all** pages."                                                                                                                                               | P0  |
| PUB-4  | Each page publish creates an immutable **page version** (the page with its sections fully resolved). Each site-design publish creates a **site version** (theme, navigation, header/footer, settings)                                                                               | P0  |
| PUB-5  | A page that has never been published isn't reachable on the live site (404) and is left out of the live navigation. The navigation editor warns: "_Menu_ isn't published yet, so it won't appear in your menu."                                                                     | P0  |
| PUB-6  | The page manager shows each page's status (Draft / Live / Changed since publish), with bulk "Publish selected"                                                                                                                                                                      | P0  |
| PUB-7  | "Unpublish page" takes one page offline (with confirmation; offers a redirect)                                                                                                                                                                                                      | P1  |
| PUB-8  | Version history **per page** and for site design: who, when, an optional note. "Restore this version" restores it to the draft, and the user then publishes                                                                                                                         | P1  |
| PUB-9  | "Discard unpublished changes" on a page reverts its draft to the last published version, with confirmation                                                                                                                                                                          | P1  |
| PUB-10 | After publishing: success toast with a "View live page" link; the status updates to Live                                                                                                                                                                                            | P0  |
| PUB-11 | Pre-publish checks (non-blocking warnings) for the selected items: missing page title, images without alt text, empty sections, links to unpublished or deleted pages                                                                                                               | P1  |

### 7.10 Media library

| ID    | Requirement                                                                                                                                                                                                                                                                                              | P   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| MED-1 | Upload images (drag & drop, max ~10 MB; jpg/png/webp/svg/gif) with a progress bar. Files go straight from the browser to **Vercel Blob** (client upload); the server route checks the session, site access, file type and size before issuing the upload token, then records the asset in `media_assets` | P0  |
| MED-2 | Pick from the library or upload inline from any image field                                                                                                                                                                                                                                              | P0  |
| MED-3 | Alt text field; prompt for it on upload                                                                                                                                                                                                                                                                  | P1  |
| MED-4 | Basic crop / focal point                                                                                                                                                                                                                                                                                 | P2  |
| MED-5 | Warn when deleting an image that's in use ("Used in 2 sections"). Images referenced by any published version are kept in Blob storage until those versions are pruned, so live pages and rollbacks never break                                                                                           | P1  |
| MED-6 | Free stock photos search (Unsplash API)                                                                                                                                                                                                                                                                  | P2  |

### 7.11 Forms & submissions

| ID    | Requirement                                                                         | P   |
| ----- | ----------------------------------------------------------------------------------- | --- |
| FRM-1 | Contact form section with configurable fields (name, email, phone, message, custom) | P1  |
| FRM-2 | Submissions inbox in the dashboard, with unread count                               | P1  |
| FRM-3 | Email notification on new submission                                                | P1  |
| FRM-4 | Spam protection (honeypot + rate limit; Turnstile optional)                         | P1  |
| FRM-5 | Export submissions to CSV                                                           | P2  |

### 7.12 Public site rendering

| ID    | Requirement                                                                                                                                                             | P   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| RND-1 | Resolve the site by hostname (subdomain, or custom domain later) via Next.js middleware                                                                                 | P0  |
| RND-2 | Render **only published versions**: the page's published version combined with the site's published design version. Never draft data                                    | P0  |
| RND-3 | Statically cached. Publishing a page invalidates only that page (`revalidateTag(page:<id>)`); publishing site design invalidates all pages (`revalidateTag(site:<id>)`) | P0  |
| RND-4 | Auto-generated `sitemap.xml`, `robots.txt`, favicon, Open Graph tags                                                                                                    | P1  |
| RND-5 | Friendly 404 page per site; "Site not found" page for unknown subdomains                                                                                                | P0  |
| RND-6 | Lighthouse ≥ 90 on Performance, Accessibility, SEO for template sites                                                                                                   | P1  |

---

## 8. UX requirements — "keep the user aware"

The product must always answer three questions for the user: **What state is my site in? What will this action do? Can I undo it?**

### 8.1 State awareness

- **Persistent save indicator** in the editor top bar: `Saving…` / `All changes saved` / `Couldn't save — retrying` / `Offline`.
- **Publish state per page** (and for site design) shown everywhere it matters: in the page manager, the editor's page switcher and the top bar:
  - 🟢 _Live_: published, no pending changes
  - 🟡 _Changed_: published, but the draft differs
  - ⚪ _Draft_: never published (not visible to visitors)
- The **site card** on the dashboard summarizes: "Live · 2 pages with unpublished changes".
- The **Publish button** reflects the current page ("Publish page") and shows a badge when other items also have changes ("+2 other changes"). It's disabled with a tooltip when there's nothing new.
- A **shared section** always carries a "Shared · used on N pages" label.
- **Activity log** per site ("Anmol published the site · 2h ago", "Deleted page _Old Pricing_").

### 8.2 Action feedback rules

| Action type                                                                       | Pattern                                                                                 | Example                                                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Reversible, low impact (hide section, reorder, delete section)                    | Do it immediately + **toast with Undo** (≈8s)                                           | "Section deleted. **Undo**"                                               |
| Impacts other places                                                              | Inline **notice** before or while editing                                               | "This section is shared. Changes will appear on Home, Pricing and About." |
| Public / irreversible / high impact (publish, unpublish, delete site, change URL) | **Confirmation dialog** that names the consequence; the action button says what it does | Button: "Delete _Bella Cucina_ forever" (not "OK")                        |
| Long-running (upload, publish)                                                    | Progress state + success/failure message                                                | "Publishing… → Your site is live ✓ View site"                             |
| Errors                                                                            | Plain-language message + what to do next; never raw error codes                         | "That web address is taken. Try _bella-cucina-ktm_."                      |

### 8.3 General UI guidelines

- Simple, calm UI: lots of whitespace, one primary action per screen, progressive disclosure ("Advanced" sections collapsed).
- **Empty states always guide**: "This page has no sections yet → _Add your first section_" with suggestions.
- Field-level help text and examples ("Keep it under 60 characters for Google").
- Tooltips on icon-only buttons; no unexplained icons.
- Accessible: keyboard navigable, visible focus, WCAG AA contrast, screen-reader labels, reduced-motion support.
- Responsive dashboard; editor usable on tablet; content editing (text/images/menu/hours) possible on mobile.

---

## 9. Non-functional requirements

| Area            | Requirement                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | Published pages: LCP < 2.5s on 4G; editor preview updates < 100ms after typing                                                                                                                                                                                                      |
| Reliability     | Autosave never loses more than ~2s of work; local fallback (IndexedDB) when offline                                                                                                                                                                                                 |
| Security        | All dashboard queries scoped by `ownerId`/membership (authorization checked in every server action); Zod validation of all section data server-side; sanitize rich text (no raw HTML/script); rate-limit auth & form endpoints; CSRF protection via Better Auth; signed upload URLs |
| Isolation       | Draft data never reachable from public routes; preview links are signed and expire                                                                                                                                                                                                  |
| Scalability     | Multi-tenant single database; indexes on `site_id`, `hostname`; published snapshot read in a single query                                                                                                                                                                           |
| Observability   | Error tracking (Sentry), structured logs, publish/audit events                                                                                                                                                                                                                      |
| Data safety     | Soft deletes for sites/pages; daily DB backups; version snapshots kept (last 50 per site)                                                                                                                                                                                           |
| Browser support | Last 2 versions of Chrome, Edge, Firefox, Safari (desktop & mobile)                                                                                                                                                                                                                 |

---

## 10. Architecture

### 10.1 Single Next.js app, three surfaces

```
app/
├── (marketing)/              # builder.app — landing, pricing, login, signup
├── (dashboard)/              # builder.app/dashboard/*
│   ├── dashboard/            # sites list
│   └── sites/[siteId]/
│       ├── pages/            # page manager
│       ├── editor/[pageId]/  # visual editor
│       ├── theme/
│       ├── media/            # Vercel Blob-backed library
│       ├── forms/
│       ├── versions/
│       └── settings/
├── preview/[siteId]/[[...path]]/  # draft render (inside editor iframe, auth or signed token)
├── _sites/[host]/[[...path]]/     # published render (reached by middleware rewrite)
├── api/auth/[...all]/             # Better Auth handler
└── api/media/upload/              # Vercel Blob handleUpload (auth + validation + DB record)
middleware.ts                       # hostname → rewrite to /_sites/[host]/...
```

**Request flow for a public site:**
`bella.builder.app/menu` → middleware reads host → rewrite to `/_sites/bella.builder.app/menu` → load the site's published design version (tagged `site:<id>`) and the `/menu` page's published version (tagged `page:<id>`) → render section components. A page with no published version → 404 (or a redirect, if one exists).

### 10.2 Section registry (heart of the system)

Each section type is defined once in code and used by the editor, the server validation and the renderer:

```ts
// sections/hero/index.ts
export const heroSection = defineSection({
  type: "hero",
  name: "Hero",
  category: "intro",
  thumbnail: "/section-thumbs/hero.png",
  variants: ["centered", "split-image", "background-image"],
  schema: z.object({
    eyebrow: z.string().max(40).optional(),
    heading: z.string().min(1).max(120),
    subheading: richTextField({ marks: ["bold", "italic", "link"] }).optional(), // Tiptap JSON
    image: imageField().optional(),
    primaryCta: linkField().optional(),
    secondaryCta: linkField().optional(),
  }),
  fieldMeta: { heading: { label: "Headline", help: "The first thing visitors read" } },
  defaults: { heading: "Your headline here", subheading: "…" },
  component: HeroSection, // React Server Component, themed via CSS variables
});
```

- The **editor form** is generated from `schema` + `fieldMeta`.
- **Server actions** validate with the same `schema` before saving.
- **Versioning section schemas:** each stored section keeps a `schemaVersion`, and migrations upgrade old data when a section type changes.
- **Rich text** fields store Tiptap JSON. `richTextField()` validates the JSON against the allowed nodes and marks, and the renderer converts it to HTML on the server with the same extension set (`@tiptap/html`), so users can't inject markup.
- **Theme** is applied through CSS custom properties (`--color-primary`, `--font-heading`, `--radius`) so sections never hard-code brand styles.

### 10.3 Editor ↔ preview communication

- The editor holds draft state in Zustand, with an undo/redo history stack.
- The preview iframe renders `/preview/...`. The editor sends draft updates via `postMessage` for instant updates, and the iframe sends back section clicks and hovers.
- Autosave persists draft changes to the DB through server actions (debounced, optimistic, retry with backoff).

---

## 11. Data model (Drizzle / Postgres — initial sketch)

> Better Auth manages `user`, `session`, `account` and `verification` tables (generated with the Better Auth CLI for Drizzle).

```ts
sites
  id              uuid pk
  ownerId         text fk → user.id
  name            text
  kind            text                 // saas / company / restaurant / other (picked at creation)
  subdomain       text unique          // "bella" → bella.builder.app
  customDomain    text unique null     // P2
  templateKey     text null
  theme           jsonb                // tokens: colors, fonts, radius, buttonStyle, density
  settings        jsonb                // logo, favicon, contact info, socials, default SEO
  navigation      jsonb                // header & footer menus
  status          enum('draft','live','offline')
  designHasUnpublishedChanges boolean  // theme / navigation / settings differ from published
  publishedVersionId uuid null fk → site_versions.id   // current live site design
  createdAt, updatedAt, deletedAt

pages
  id, siteId fk
  title           text
  path            text                 // "/", "/about" — unique per site
  isHome          boolean
  showInNav       boolean
  position        int
  seo             jsonb                // title, description, ogImage, noindex
  hasUnpublishedChanges boolean        // set on any edit to the page or its sections (incl. shared)
  publishedVersionId uuid null fk → page_versions.id   // null = never published / unpublished
  publishedAt     timestamp null
  createdAt, updatedAt, deletedAt
  unique(siteId, path)

sections
  id, siteId fk
  type            text                 // "hero", "pricing"
  variant         text
  schemaVersion   int
  data            jsonb                // validated by registry schema
  style           jsonb                // background, spacing, alignment, anchorId
  isShared        boolean              // in library & linkable
  libraryName     text null            // name shown in "Saved sections"
  createdAt, updatedAt

page_sections                          // ordering + placement (enables shared sections)
  id, pageId fk, sectionId fk
  position        int (or fractional index text for cheap reordering)
  isHidden        boolean

page_versions                          // immutable per-page publish snapshots
  id, pageId fk, siteId fk
  snapshot        jsonb                // title, path, seo, sections[] fully resolved (shared ones inlined)
  note            text null
  publishedBy     text fk → user.id
  createdAt

site_versions                          // immutable site-design publish snapshots
  id, siteId fk
  snapshot        jsonb                // theme, navigation, header/footer, settings
  note            text null
  publishedBy     text fk → user.id
  createdAt

redirects
  id, siteId fk, fromPath, toPath, createdAt

media_assets
  id, siteId fk
  storageKey, url, mimeType, sizeBytes, width, height, alt   // storageKey = Vercel Blob pathname, url = Blob URL
  uploadedBy, createdAt, deletedAt

form_submissions
  id, siteId fk, pageId fk null, sectionId null
  data            jsonb
  isRead          boolean
  createdAt

activity_log
  id, siteId fk, userId fk
  action          text                 // "page.deleted", "site.published"
  entityType, entityId
  metadata        jsonb
  createdAt
```

**Why snapshots on publish?** Public rendering reads two small JSONB rows (site design + page), so it's fast and cacheable. Rollback becomes trivial, and draft edits can never leak to the live site.

**Why split page and site-design versions?** It makes page-by-page publishing possible. Publishing _Menu_ doesn't push half-finished edits on _About_. Theme and navigation changes affect every page, so they're published as one explicit, clearly labelled item.

**Shared sections:** they're inlined into each page's snapshot at publish time. A live page only changes when that page is republished, which is why editing a shared section flags every page that uses it (SEC-8a).

---

## 12. Templates (MVP)

| Template             | Pages                          | Key sections                                                                                              |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **SaaS Launch**      | Home, Pricing, Contact         | Navbar, Hero (split), Logo cloud, Features grid, How it works, Testimonials, Pricing, FAQ, CTA, Footer    |
| **Company / Agency** | Home, About, Services, Contact | Hero, Services grid, Stats, Text + image, Team, Testimonials, Contact info + form                         |
| **Restaurant**       | Home, Menu, Gallery, Contact   | Hero (background image), About text + image, Menu, Opening hours, Gallery, Reservation CTA, Map + contact |

Templates are stored as seed JSON (same shape as a site snapshot) and are **cloned** into a new site. They're never linked.

---

## 13. Delivery plan (phases & milestones)

> Estimates assume one developer, part-time. Adjust as needed.

### Phase 0 — Foundation (≈1 week) ✅ done 2026-10-09

- Next.js + TypeScript + Tailwind + shadcn/ui setup, ESLint/Prettier
- Postgres + Drizzle config, migrations workflow, seed script
- Better Auth: email/password, verification, reset; protected dashboard layout
- Base dashboard shell (sidebar, top bar, toasts, confirm dialog, empty-state components)
- CI: typecheck, lint, test
- **Done when:** a user can sign up, verify email, log in and see an empty dashboard.

### Phase 1 — Sites & pages (≈1–2 weeks) ✅ done 2026-10-09

- `sites`, `pages` schema + server actions with authorization helpers
- Sites list, create site (simple form for now), site settings, soft delete
- Page manager: create / rename / reorder / set home / delete with undo
- Activity log writes
- **Done when:** a user can manage multiple sites and their pages.

### Phase 2 — Section system & editor (≈3–4 weeks) ⭐ core ✅ done 2026-10-09

- `defineSection` registry + field types (text, rich text via Tiptap, image, link, list, select, toggle, icon)
- Tiptap field component with a configurable toolbar + a React renderer for the stored Tiptap JSON (allow-listed nodes, sanitized links, no raw HTML)
- Settings forms generated from field definitions, which also produce the Zod schemas
- Initial sections: Header and Footer (site design, stored on the site), Hero, Features, Text, CTA, FAQ
- Drafts are validated structurally; required fields are flagged in the editor and checked at publish (Phase 3)
- Image fields take a URL until uploads arrive in Phase 5
- Editor 3-panel layout, preview iframe + postMessage bridge, select/hover
- Add / reorder (dnd-kit) / duplicate / hide / delete sections; variant switching
- Autosave + status indicator, undo/redo, unsaved-changes guard
- **Done when:** a user can build a full landing page visually and changes persist.

### Phase 3 — Theme, publishing & public rendering (≈2 weeks) ✅ done 2026-10-09

- Theme tokens → CSS variables; 8 presets; Design tab with live preview and contrast warning
- Menu & social tab (extra menu links, social profiles). Menu order and membership are part of the site design, so they go live when the design is published
- Pre-publish checks (PUB-11) and "Take offline" (PUB-7) pulled forward from later phases
- Known limitation: a missing page shows the site-styled 404 with `noindex`, but the HTTP status is 200 because the response streams (Next.js Cache Components behavior). A real 404 status needs a fast existence check in `proxy.ts` before rendering. Planned with custom domains.
- Page-by-page publish flow: publish dialog with the current page + other changed items, page/site-design version snapshots, per-page status badges, tag-based revalidation
- Proxy hostname routing, `/_sites` renderer, site-styled 404s, sitemap/robots, SEO/OG tags
- **Done when:** `mysite.builder.app` serves published pages, an unpublished page returns 404, and editing a page doesn't affect the live site until that page is republished.

### Phase 4 — Templates & onboarding (≈2 weeks) ✅ done 2026-10-10

- Added sections: Text and image, Numbers, Logo cloud, How it works, Testimonials, Team, Pricing (CSS-only monthly/yearly switch), Contact & map, Opening hours, Food menu, Gallery, Video (YouTube/Vimeo only)
- Templates: Launch (SaaS), Studio (company), Trattoria (restaurant); validated by tests
- 4-step onboarding wizard with live template and style previews; lands in the homepage editor
- Getting-started checklist (homepage edited, contact details, published) on the Pages tab and in the editor
- Remaining MVP sections (pricing, testimonials, team, stats, logo cloud, menu, hours, gallery, contact info, text + image…)
- 3 templates (SaaS, Company, Restaurant) as seed snapshots
- Onboarding wizard + getting-started checklist
- **Done when:** a new user reaches a published, good-looking site in under 10 minutes.

### Phase 5 — Media, SEO, forms, library (≈2 weeks)

- Media library + Vercel Blob client uploads (`handleUpload` route), alt text, in-use warnings
- Per-page SEO panel, URL change → redirect
- Contact form section, submissions inbox, email notifications, spam protection
- Saved/shared sections (link vs copy, "used on N pages", detach)
- Version history + restore, discard changes, pre-publish checks
- **Done when:** all P0 + P1 requirements are met → **MVP launch** 🚀

### Phase 6 — Post-MVP

- Custom domains, teams & roles, AI copy assistant, analytics, blog/collections, billing

---

## 14. Success metrics

| Metric                                            | Target                           |
| ------------------------------------------------- | -------------------------------- |
| Time from sign-up → first publish                 | Median < 10 min                  |
| Onboarding completion (sign-up → published site)  | > 50%                            |
| Users who return to edit within 7 days            | > 30%                            |
| Support questions about "where did my change go?" | ≈ 0 (validates the awareness UX) |
| Lighthouse scores on template sites               | ≥ 90                             |

---

## 15. Risks & mitigations

| Risk                                                                                                                               | Mitigation                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor complexity grows (YOOtheme-style option overload)                                                                           | Hard limit on style options per section; use variants instead of knobs; usability-test with real non-coders                                                                               |
| Section schema changes break existing sites                                                                                        | `schemaVersion` + migration functions per section type; snapshot tests for rendering                                                                                                      |
| Shared-section edits surprise users                                                                                                | Always-visible "Shared" badge, pre-edit notice, "Detach" option, undo                                                                                                                     |
| Preview ≠ live output                                                                                                              | Same components for preview and live rendering; E2E visual regression on templates                                                                                                        |
| Multi-tenant data leaks                                                                                                            | Central `assertSiteAccess(user, siteId)` helper used in every action; integration tests for authorization                                                                                 |
| Per-page publishing leaves the live site inconsistent (nav links to an unpublished page; a new theme looks wrong on an older page) | Hide unpublished pages from live nav automatically; pre-publish checks flag links to unpublished pages; publish dialog offers "Select all changes"; preview always shows the draft design |
| Vercel Blob costs/orphaned files                                                                                                   | Track every upload in `media_assets`; periodic cleanup job deletes blobs not referenced by drafts or retained versions                                                                    |
| Autosave conflicts (two tabs)                                                                                                      | Optimistic concurrency via `updatedAt`/version column; show "Edited in another tab — reload" notice                                                                                       |

---

## 16. Open questions

1. Product name and root domain for hosted subdomains?
2. Free vs paid plans at launch: limits on sites, pages or custom domains?
3. Should restaurant menus become a reusable "collection" (edit once, show on several pages) in MVP or later?
4. Will agencies building for clients be a target soon? This affects how early teams/roles arrive.

### Decided

| Topic            | Decision                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| Media storage    | **Vercel Blob** (client uploads)                                                |
| Rich text editor | **Tiptap** (JSON storage, server-rendered HTML)                                 |
| Publishing       | **Page by page**, with site design (theme/navigation) published as its own item |

---

## 17. Glossary

| Term           | Meaning                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| Site           | One website owned by a user                                                       |
| Page           | A single URL within a site                                                        |
| Section type   | A pre-built block design defined in code (Hero, Pricing…)                         |
| Section        | A section type filled with the user's content and placed on a page                |
| Variant        | An alternative layout of the same section type                                    |
| Shared section | A section saved to the library and linked to multiple pages                       |
| Draft          | The version being edited; invisible to visitors                                   |
| Publish        | Making a page's current draft (or the site design) live as a new version snapshot |
| Site design    | Site-wide settings published together: theme, navigation, header/footer, logo     |
| Theme          | Site-wide design tokens (colors, fonts, style)                                    |
