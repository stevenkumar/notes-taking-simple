# Everyday – All-in-One Productivity Application

> A modular productivity platform bringing everyday tools — calculations, tasks, notes, planning and expenses — into a single, unified experience.

**Status:** Phase 0–1 (Foundation) + 6 interactive calculators complete · **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4

---

## What's built so far

| Area | Status |
|------|--------|
| Design system (light/dark themes, design tokens) | ✅ |
| Theme provider with system-preference detection + no-flash init | ✅ |
| App shell — desktop sidebar + mobile bottom navigation | ✅ |
| Reusable UI components (Button, Input, Card, Badge) | ✅ |
| Dashboard home with module grid and quick access | ✅ |
| Calculator hub — search, categories, tool directory | ✅ |
| Calculator registry (18 tools, 7 categories, synonym search) | ✅ |
| Dynamic calculator routes with per-tool metadata | ✅ |
| PWA manifest + icons | ✅ |
| Placeholder pages for Tasks, Notes, Planner, Expenses, Settings | ✅ |
| Calculation engines — pure functions on decimal.js, no `eval` | ✅ |
| Calculators — Discount, GST, EMI, Percentage, Basic, Interest (6 tools) | ✅ |
| Shared result panel (copy / share / save / clear) + local save history | ✅ |
| Unit tests — 233 tests across 7 vitest suites | ✅ |
| Scientific, Age, Date/Time, Unit, Currency calculators | ⏳ Phase 3 & 5–6 |
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
│   └── greeting.tsx            # Client-side time-based greeting
├── context/theme-context.tsx   # ThemeProvider + useTheme
├── modules/calculator/
│   ├── types/index.ts          # Calculation contracts (Phase 0)
│   ├── registry/               # Tool metadata + search (synonyms)
│   ├── engine/                 # Pure decimal.js engines + vitest suites
│   │   └── discount/ gst/ emi/ percentage/ basic/ interest/
│   └── components/             # One folder per calculator (types, compute, forms, UI)
│       └── shared/             # ResultPanel + ComputeState contract
├── hooks/
├── utils/                      # cn, format (INR + en-IN grouping), history, storage helpers
└── public/                     # manifest.json, PWA icons
```

## Getting started

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm test           # 233 unit tests (vitest)
npm run build      # production build (29 static pages)
```

## Architecture decisions

- **Next.js App Router** instead of Vite + React Router — chosen for the existing scaffold, built-in routing, metadata API and future full-stack capability.
- **Local-first storage** — calculations, history and preferences use `localStorage` (no backend required for math, per PRD principle).
- **Registry-driven tools** — every calculator is declared once in `calculator-registry.ts` with id, category, keywords/synonyms and route; the hub, search and routing all derive from it.
- **Calculation contracts** — shared types in `modules/calculator/types` define the result envelope (`CalculationSuccess | CalculationError`) before any engine code is written.
- **Static pre-rendering** — all calculator routes use `generateStaticParams` so every tool page is a static build.

## Roadmap

See the product specification for the full plan:

- **Phase 2** — Calculator dashboard polish, favourites, recent tools ⏳
- **Phase 3** — Basic ✅, GST ✅, Percentage ✅ calculators · Scientific ⏳
- **Phase 4** — EMI ✅, Loan/Interest ✅, Discount & Shopping ✅ (complete)
- **Phase 5** — Age, Date & Time, Unit Converter ⏳
- **Phase 6** — Currency with backend rate proxy ⏳
- **Phase 7** — Local save history ✅ for shipped tools · cloud sync, preferences ⏳
- **Phase 8** — Testing, security, accessibility, production release ⏳
- **Phase 9+** — Tasks, Notes, Planner, Expenses, mobile apps ⏳
