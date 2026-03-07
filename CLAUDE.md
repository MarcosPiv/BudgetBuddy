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

**BudgetBuddy** is an AI-powered expense tracker built with Next.js App Router. It is currently a client-side-only SPA — no backend, no real auth, no database (state is lost on refresh). Supabase integration is planned for the next phase.

### Navigation & State

`app/page.tsx` wraps the entire app in `AppProvider` and renders one of five views based on `currentView` state:

- `landing` → `components/landing-page.tsx`
- `auth` → `components/auth-page.tsx`
- `dashboard` → `components/dashboard-page.tsx` (main feature)
- `settings` → `components/settings-page.tsx`
- `profile` → `components/profile-page.tsx`

All global state lives in `lib/app-context.tsx` (React Context). Key state fields:
- `currentView` — controls which page renders
- `transactions` — array of expense/income records (in-memory only, static sample data)
- `userData` — user name, monthly budget, profile mode (`standard` | `expenses_only`)
- `apiKey` — for AI integration (Anthropic/OpenAI)
- `usdRate` — active ARS-to-USD conversion rate (set by widget or manually)
- `exchangeRateMode` — `"api" | "manual"` — whether to auto-fetch from DolarAPI
- `timeFilter` — `week | month | year | custom`

### Core Data Model

```typescript
Transaction {
  id: string
  description: string
  amount: number              // face value (USD or ARS)
  type: "income" | "expense"
  icon: string                // lucide-react icon name
  category: string
  date: Date
  observation?: string
  currency: "ARS" | "USD"
  amountUsd?: number
  txRate?: number             // ARS rate locked at the moment of the transaction
  exchangeRateType?: "BLUE" | "TARJETA" | "OFICIAL" | "MEP" | "MANUAL" | null
}
```

`txRate` is immutable once saved — it represents the exact rate used at transaction time, so historical ARS totals don't change if the dollar moves.

### Exchange Rate System

- `hooks/use-exchange-rate.ts` — custom hook that fetches from `https://dolarapi.com/v1/dolares`
  - Parses Blue, Oficial, Tarjeta, MEP
  - Auto-refresh every 5 minutes when `enabled: true`
  - Returns `{ rates, loading, error, lastUpdated, refresh }`
- `components/ui/exchange-widget.tsx` — collapsible dashboard panel showing live rates
  - User can tap a rate card to set it as the active `usdRate`
  - Animated price flash on value change (green/red)
- Magic Bar (bottom input) — when currency is USD, shows a horizontal chip selector:
  - Chips display live rates from DolarAPI inline
  - Selecting "Manual" expands a smooth-height input for a custom rate
  - The chosen rate is stored as `txRate` and `exchangeRateType` on the transaction

### UI Stack

- **shadcn/ui** ("new-york" style) — 57 components in `components/ui/`
- **Tailwind CSS v4** with CSS custom properties for theming (oklch color format)
- **Radix UI** primitives underneath shadcn
- **Framer Motion** for all animations (accordion, page transitions, micro-interactions)
- **Recharts** for expense charts
- **Lucide React** for icons
- Dark mode via `next-themes`

### File Structure (key files)

```
app/
  page.tsx                  # Root, AppProvider wrapper, view router
  globals.css               # Tailwind v4 theme tokens (oklch)
components/
  dashboard-page.tsx        # Main view (~1150 lines): header, filters, summary, tx list, magic bar, chat
  settings-page.tsx         # Profile mode, exchange rate config (API/manual toggle), API key
  landing-page.tsx
  auth-page.tsx
  profile-page.tsx
  ui/
    exchange-widget.tsx     # Collapsible live rate panel for dashboard
    ... (57 shadcn components)
hooks/
  use-exchange-rate.ts      # DolarAPI integration hook
  use-mobile.ts
  use-toast.ts
lib/
  app-context.tsx           # Global React Context + all types
  utils.ts
```

### Key Config Notes

- `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` — TypeScript errors do not fail the build
- `next.config.mjs` has `images: { unoptimized: true }` — Next.js image optimization disabled
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`)
- The UI and sample data are in **Spanish** (Argentine Spanish, ARS currency context)

### Planned: Supabase Backend

The next phase replaces all static/in-memory data with Supabase:
- Auth → Supabase Auth (email/password + magic link)
- Transactions → `transactions` table (per user, RLS enforced)
- User settings → `profiles` table
- Static sample data in `app-context.tsx` will be removed
- `AppProvider` will hydrate from Supabase on mount
