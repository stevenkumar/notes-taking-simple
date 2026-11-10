# Everyday – All-in-One Productivity Application

> A modular productivity platform bringing everyday tools — calculations, tasks, notes, planning and expenses — into a single, unified experience.

**Status:** Phase 0–2 (Foundation + dashboard polish) + Phases 3–6 (offline) complete · 12 interactive calculators · **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4

---

## What's built so far

| Area | Status |
|------|--------|
| Design system (light/dark themes, design tokens) | ✅ |
| Theme provider with system-preference detection + no-flash init | ✅ |
| App shell — desktop sidebar + mobile bottom navigation | ✅ |
| Reusable UI components (Button, Input, Card, Badge) | ✅ |
| Dashboard home — module grid, favourites-first quick access, recent activity | ✅ |
| Calculator hub — search, categories, star-to-favourite, tool directory | ✅ |
| Favourites & recent tools (localStorage, registry-validated ids) | ✅ |
| Calculator registry (18 tools, 7 categories, synonym search) | ✅ |
| Dynamic calculator routes with per-tool metadata | ✅ |
| PWA manifest + icons | ✅ |
| Placeholder pages for Tasks, Notes, Planner, Expenses, Settings | ✅ |
| Calculation engines — pure functions on decimal.js, no `eval` (Scientific gets a hand-written tokenizer + recursive-descent parser) | ✅ |
| Calculators — Discount, GST, EMI, Percentage, Basic, Interest, Scientific, Age, Date & Time, Unit Converter, Currency, Salary (12 tools) | ✅ |
| Shared result panel (copy / share / save / clear) + local save history | ✅ |
| Unit tests — 474 tests across 14 vitest suites | ✅ |
| Currency live-rate backend proxy (offline editable rates already shipped) | ⏳ Later |
| Backend, auth, cloud sync | ⏳ Later |

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout: fonts, theme script, app shell
│   ├── page.tsx                # Dashboard home
│   ├── globals.css             # Design system (tokens, Tailwind 4 theme)
│   ├── calculator/
│   │   ├── page.tsx            # Calculator hub (search + categories + grid)
│   │   └── [slug]/page.tsx     # Individual calculator (pre-rendered)
│   ├── tasks/ notes/ planner/ expenses/ settings/
├── components/
│   ├── layout/                 # AppShell, Sidebar, BottomNav, PageHeader
│   ├── ui/                     # Button, Input, Card, Badge
│   ├── theme/                  # ThemeToggle
│   ├── quick-access.tsx        # Dashboard quick tools (favourites first, client)
│   ├── recent-activity.tsx     # Dashboard recent tools list (client)
│   └── greeting.tsx            # Client-side time-based greeting
├── context/theme-context.tsx   # ThemeProvider + useTheme
├── modules/calculator/
│   ├── types/index.ts          # Calculation contracts (Phase 0)
│   ├── registry/               # Tool metadata + search (synonyms)
│   ├── engine/                 # Pure decimal.js engines + vitest suites
│   │   ├── *-calculator.ts     # 12 engines: discount … salary
│   │   └── __tests__/          # 12 engine suites, 450 tests
│   └── components/             # One folder per calculator (types, compute, forms, UI)
│       └── shared/             # ResultPanel, ToolIcon, FavouriteStar, RecentTracker
├── hooks/
├── utils/                      # cn, format (INR + en-IN grouping), history, storage, tool-prefs (favourites/recents)
└── public/                     # manifest.json, PWA icons
```

## Getting started

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm test           # 474 unit tests (vitest)
npm run build      # production build (29 static pages)
```

## Architecture decisions

- **Next.js App Router** instead of Vite + React Router — chosen for the existing scaffold, built-in routing, metadata API and future full-stack capability.
- **Local-first storage** — calculations, history and preferences use `localStorage` (no backend required for math, per PRD principle).
- **Offline currency rates** — the Currency converter ships an indicative rate snapshot quoted per 1 USD; users can edit any rate (persisted locally) and a freshness badge distinguishes built-in from custom values, so conversion never depends on the network.
- **Registry-driven tools** — every calculator is declared once in `calculator-registry.ts` with id, category, keywords/synonyms and route; the hub, search and routing all derive from it.
- **Favourites & recents are registry-validated** — the storage helpers filter every loaded id against the registry, so stale ids from removed tools never render ghost entries; pure toggle/push logic lives apart from the storage wrappers to stay unit-testable without a browser.
- **Calculation contracts** — shared types in `modules/calculator/types` define the result envelope (`CalculationSuccess | CalculationError`) before any engine code is written.
- **Hand-written expression parser** — the Scientific calculator tokenizes and parses with a recursive-descent grammar instead of `eval` or a library, so precedence, right-associative powers, implicit multiplication and every error path stay unit-testable and safe.
- **Static pre-rendering** — all calculator routes use `generateStaticParams` so every tool page is a static build.

## Roadmap

See the product specification for the full plan:

- **Phase 2** — Dashboard polish ✅ (favourite stars, Favourites row, favourites-first quick access, recent activity) (complete)
- **Phase 3** — Basic ✅, GST ✅, Percentage ✅, Scientific ✅ (complete)
- **Phase 4** — EMI ✅, Loan/Interest ✅, Discount & Shopping ✅ (complete)
- **Phase 5** — Age ✅, Date & Time ✅, Unit Converter ✅ (complete)
- **Phase 6** — Currency ✅ (offline with editable rates + freshness badge) · live backend rate proxy ⏳
- **Phase 7** — Salary Calculator ✅ (CTC → take-home + monthly gross) · Local save history ✅ for shipped tools · cloud sync, preferences ⏳
- **Phase 8** — Testing, security, accessibility, production release ⏳
- **Phase 9+** — Tasks, Notes, Planner, Expenses, mobile apps ⏳
