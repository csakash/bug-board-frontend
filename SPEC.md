# SPEC — Marketing landing page for logged-out visitors

**Slug:** `landing-page`
**Branch:** `feat/landing-page`
**Spans:** `frontend/` only
**Dev port:** frontend :5473
**Status:** ready to implement

---

## Context

A logged-out visitor hitting any URL is redirected straight to the login card
([App.tsx:23-30](src/App.tsx) → `Navigate to="/login"`). They get a bare auth form
with zero explanation of what Bug Board is. We need a real landing page at `/` for
logged-out users that sells the product — AI-assisted issue tracking that turns rough
reports (text, screenshots, video, PDF) into clean, structured issue cards — and routes
to the existing login on demand. Logged-in users are unaffected (`/` stays `ProjectsPage`).

## Current State (verified 2026-07-01)

- [App.tsx:22-33](src/App.tsx): when `!user`, routes are `/login` → `LoginPage`,
  `/invite/:token` → `InvitePage`, `*` → redirect `/login`. No landing surface exists.
- [LoginPage.tsx](src/pages/LoginPage.tsx): centered card on `bg-canvas`, login/register
  toggle via local `mode` state (defaults `'login'`), rust "B" logomark + `font-display`
  wordmark. Does **not** read any query param.
- Theme tokens in [tailwind.config.js](tailwind.config.js): `canvas #f3f1ea`,
  `surface #faf9f5`, `ink #2b2925`, `muted #8a857c`, `line #e4e0d6`, `rust #c0552d`,
  `rust-dark #a8481f`; `font-display` (Georgia serif), Inter sans; `ease-premium` /
  `ease-soft`; animations `fade-in` / `fade-up` / `slide-up-soft`.
- Issue vocabulary ([types.ts](src/types.ts)): types `bug | feature | improvement | task |
  regression | investigation | design | documentation | support | question`; statuses
  `open | in_progress | resolved`; severity `low | medium | high | critical`.
- `lucide-react` is already a dependency (icons available, no new package).

## Proposed Change

### Routing ([App.tsx](src/App.tsx), logged-out branch only)

| Path | Element | Note |
|---|---|---|
| `/` | new `LandingPage` | was → `/login` |
| `/login` | `LoginPage` | component unchanged except deep-link param below |
| `/invite/:token` | `InvitePage` | unchanged |
| `*` | `Navigate to="/"` | was `Navigate to="/login"` |

The logged-in branch is untouched.

### New file `src/pages/LandingPage.tsx`

Single scrollable page. Every section is centered (`max-w-6xl`, generous vertical
rhythm) and built **only** from existing theme tokens + animation classes. No external
images, no new colors, no new npm packages.

1. **Sticky nav** — translucent `bg-surface/80 backdrop-blur` with `border-b border-line`.
   Left: rust "B" mark + "Bug Board" wordmark (reuse the LoginPage logomark markup).
   Right: a text "Log in" link → `/login` and a filled rust "Get started" button →
   `/login?mode=register`.
2. **Hero** — `font-display` headline (e.g. "Turn messy bug reports into clean issues."),
   muted subcopy naming the input types (text, screenshots, video, PDF), and a dual CTA:
   "Get started free" (rust) → `/login?mode=register` and "Log in" (ghost) → `/login`.
   Alongside/below the copy: a **CSS-drawn product mockup** — a rounded "app window"
   (`bg-surface border border-line shadow`) showing 3 issue cards with type badges
   (Bug / Feature / Improvement) + status dots, plus a small AI chat panel with a user
   bubble and an AI reply forming a card. Uses `animate-fade-up` / `slide-up-soft` with
   staggered delays.
3. **Features** — 4 cards (lucide icons):
   - **AI-assisted intake** — paste text or drop a screenshot, video, or PDF; the always-on
     AI chat turns it into a clean, structured issue card.
   - **Rich issue types** — bug, feature, improvement, task, regression and more, with
     severity and status.
   - **Project context** — give each project context so the AI writes issues in your
     product's language.
   - **Team collaboration** — invite teammates to a project by email and work the board
     together.
4. **How it works** — 3 numbered steps: ① Create a project & give it context → ② Drop in
   a rough report (text / screenshot / video / PDF) → ③ AI turns it into a structured
   issue card on your board.
5. **Closing CTA band** — rust-tinted panel, short headline + single "Get started free"
   button → `/login?mode=register`.
6. **Footer** — logomark, one-line tagline, copyright. Minimal.

### Login deep-link ([LoginPage.tsx](src/pages/LoginPage.tsx))

Initialize `mode` from a `mode` query param via `useSearchParams`: `?mode=register` starts
on the register view; no param or any other value defaults to `'login'`. Existing toggle
behavior unchanged.

### Responsive & accessibility

- Mobile-first. Nav collapses to logo + "Get started" (no hamburger needed). Hero stacks
  (mockup below copy) under `md`.
- Semantic landmarks (`<header><main><footer>`), exactly one `<h1>`, all CTAs are
  keyboard-focusable and carry the existing `premium-focus` treatment.
- Respects `prefers-reduced-motion` (already handled globally in [index.css](src/index.css)).

## Acceptance Criteria

1. Visiting `/` while logged out renders the landing page (not the login card).
2. Nav "Log in" → `/login` (login view); "Get started" / hero / CTA-band "Get started free"
   → `/login?mode=register`, which renders the **register** view.
3. `/login` with no query param (or any value other than `register`) renders the **login**
   view — no regression.
4. An unknown logged-out path (e.g. `/pricing`) redirects to `/` (landing).
5. Logged-in users see no change: `/` is `ProjectsPage`; the landing page is never shown
   to them.
6. `/invite/:token` still renders `InvitePage` while logged out.
7. Landing uses only theme tokens (no new colors) and existing animations; visually
   consistent with the login card.
8. Layout holds at 375px (mobile), 768px (tablet), 1280px (desktop) with no horizontal
   scroll.
9. `npm run build` (`tsc -b && vite build`) passes clean.

## Testing Plan

| Layer | What | Count |
|---|---|---|
| Build | `tsc -b && vite build` clean | 1 |
| Manual / QA (preview :5473) | logged-out `/` shows landing; CTA routing to login vs register; `*` redirect; 375/768/1280 responsive; reduced-motion | 6 checks |
| Regression | `/login` default view; logged-in `/` = projects; invite link still works | 3 checks |

## Files Reference

| File | Change |
|---|---|
| `src/pages/LandingPage.tsx` | **New** — full landing page |
| `src/App.tsx:22-33` | Logged-out routes: add `/` → Landing, change `*` → `/` |
| `src/pages/LoginPage.tsx` | Read `mode` from `useSearchParams` to initialize `mode` state |

## Out of Scope

- Backend changes or any new API. Frontend-only.
- Real screenshots / marketing photography, analytics, SEO/meta beyond existing `index.html`.
- Pricing page, blog, or other new marketing routes (unknown paths just redirect to `/`).
- Redesign of the login card itself (only the deep-link param is added).
- Dark mode.

## Effort Estimate

~15 min CC: LandingPage component incl. mockup + sections ~10 min, routing + login param
~2 min, responsive/QA pass ~3 min.

## Rollback

Revert the PR. Purely additive — one new file plus two small edits; no data or shared
state touched.
