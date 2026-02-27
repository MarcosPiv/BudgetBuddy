# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js development server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

**BudgetBuddy** is an AI-powered expense tracker built with Next.js App Router. It is currently a client-side-only SPA — no backend, no real auth, no database (state is lost on refresh).

### Navigation & State

`app/page.tsx` wraps the entire app in `AppProvider` and renders one of five views based on `currentView` state:

- `landing` → `components/landing-page.tsx`
- `auth` → `components/auth-page.tsx`
- `dashboard` → `components/dashboard-page.tsx` (main feature, ~1072 lines)
- `settings` → `components/settings-page.tsx`
- `profile` → `components/profile-page.tsx`

All global state lives in `lib/app-context.tsx` (React Context). Key state fields:
- `currentView` — controls which page renders
- `transactions` — array of expense/income records (in-memory only)
- `userData` — user name, monthly budget, profile mode (`standard` | `expenses_only`)
- `apiKey` — for future AI integration (Anthropic/OpenAI)
- `usdRate` — ARS-to-USD conversion rate
- `timeFilter` — `week | month | custom`

### Core Data Model

```typescript
Transaction {
  id: string
  description: string
  amount: number           // in ARS by default
  type: "income" | "expense"
  icon: string             // lucide-react icon name
  category: string
  date: Date
  observation?: string
  currency: "ARS" | "USD"
  amountUsd?: number
}
```

### UI Stack

- **shadcn/ui** ("new-york" style) — 57 components in `components/ui/`
- **Tailwind CSS v4** with CSS custom properties for theming (oklch color format)
- **Radix UI** primitives underneath shadcn
- **Framer Motion** for animations
- **Recharts** for expense charts
- **Lucide React** for icons
- Dark mode via `next-themes`

### Key Config Notes

- `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` — TypeScript errors do not fail the build
- `next.config.mjs` has `images: { unoptimized: true }` — Next.js image optimization disabled
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`)
- The UI and sample data are in **Spanish** (Argentine Spanish, ARS currency context)
