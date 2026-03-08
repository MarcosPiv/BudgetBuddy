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

**BudgetBuddy** is an AI-powered expense tracker built with Next.js App Router, targeting the Argentine market (ARS/USD multi-currency). It uses Supabase for auth and persistence, and is deployed on Vercel.

### Navigation & State

`app/page.tsx` wraps the entire app in `AppProvider` and renders one of five views based on `currentView` state:

- `landing` → `components/landing-page.tsx`
- `auth` → `components/auth-page.tsx` (login / register / forgot password)
- `dashboard` → `components/dashboard-page.tsx` (main feature)
- `settings` → `components/settings-page.tsx`
- `profile` → `components/profile-page.tsx`

There is also a standalone Next.js page (outside the SPA view router):
- `/reset-password` → `app/reset-password/page.tsx` — handles the Supabase `PASSWORD_RECOVERY` event after user clicks the reset link in their email

All global state lives in `lib/app-context.tsx` (React Context). Key state fields:
- `currentView` — controls which SPA view renders
- `user` — Supabase `User | null`
- `loadingAuth` — true while Supabase session is resolving on mount
- `transactions` — array persisted in Supabase, loaded on login
- `userName`, `monthlyBudget`, `profileMode` (`standard` | `expenses_only`) — loaded from `profiles` table
- `aiProvider` — `"claude" | "openai" | "gemini"` — which LLM to use
- `apiKeyClaude`, `apiKeyOpenAI`, `apiKeyGemini` — per-provider API keys (stored in `profiles`)
- `apiKey` — **computed** getter, returns the active provider's key; used by dashboard for AI checks
- `usdRate` — active ARS-to-USD conversion rate
- `exchangeRateMode` — `"api" | "manual"` — whether to auto-fetch from DolarAPI
- `isPasswordRecovery` — true when Supabase fires `PASSWORD_RECOVERY` event (used as fallback; primary flow uses `/reset-password` page)
- `timeFilter` — `week | month | year | custom`
- `customRange` — `{ from: Date; to: Date }`

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
  txRate?: number             // ARS rate locked at the moment of the transaction — immutable
  exchangeRateType?: "BLUE" | "TARJETA" | "OFICIAL" | "MEP" | "MANUAL" | null
}
```

`txRate` is immutable once saved — it represents the exact rate used at transaction time, so historical ARS totals don't change if the dollar moves.

### Supabase Backend

Auth and data are fully backed by Supabase (project `budgetbuddy`, region `sa-east-1`).

**Tables:**
- `profiles` — per-user settings: `user_name`, `monthly_budget`, `profile_mode`, `exchange_rate_mode`, `usd_rate`, `ai_provider`, `api_key` (Claude), `api_key_openai`, `api_key_gemini`
- `transactions` — all transaction fields in snake_case, `user_id` FK with RLS

**Auth flows:**
- Email/password signup + login via `supabase.auth.signInWithPassword` / `signUp`
- Email confirmation disabled by default during development (toggle in Supabase Dashboard → Auth → Providers → Email)
- Password reset: `resetPasswordForEmail` with `redirectTo: {origin}/reset-password` → user lands on `/reset-password` page which catches `PASSWORD_RECOVERY` event
- `onAuthStateChange` listener in `AppProvider`: on `PASSWORD_RECOVERY` sets `isPasswordRecovery = true` and navigates to `auth`; on sign-in loads profile + transactions and navigates to `dashboard`

**Stale-closure pattern:** `saveProfile()` accepts an optional `overrides` object. Always pass fresh values directly to avoid reading stale state from React closures:
```typescript
await saveProfile({ userName: newName }) // not: setUserName(newName); saveProfile()
```

**Optimistic updates:** `addTransaction` adds with a temp ID immediately, then replaces with the real Supabase ID on success (or rolls back on error).

**Environment variables** (in `.env.local`, never commit):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Exchange Rate System

- `hooks/use-exchange-rate.ts` — custom hook that fetches from `https://dolarapi.com/v1/dolares`
  - Parses Blue, Oficial, Tarjeta, MEP
  - Auto-refresh every 5 minutes when `enabled: true`
  - Returns `{ rates, loading, error, lastUpdated, refresh }`
- `components/ui/exchange-widget.tsx` — collapsible dashboard panel showing live rates
  - User can tap a rate card to set it as the active `usdRate`
  - Animated price flash on value change (green/red)
  - Header uses `<div role="button">` (not `<button>`) to avoid nested button DOM error
- Magic Bar (bottom input) — when currency is USD, shows a horizontal chip selector:
  - Chips display live rates from DolarAPI inline
  - Selecting "Manual" expands a smooth-height input for a custom rate
  - The chosen rate is stored as `txRate` and `exchangeRateType` on the transaction

### AI Provider System

Three LLM providers are supported. The active provider is selected in Settings:
- **Claude** (Anthropic) — key stored in `api_key` DB column
- **OpenAI** (GPT-4o) — key stored in `api_key_openai` DB column
- **Gemini** (Google) — key stored in `api_key_gemini` DB column

`apiKey` in context is a computed value: `aiProvider === "claude" ? apiKeyClaude : aiProvider === "openai" ? apiKeyOpenAI : apiKeyGemini`. The dashboard checks `apiKey.trim()` before processing Magic Bar input — if empty, shows an error instead of adding a fake transaction.

### UI Stack

- **shadcn/ui** ("new-york" style) — components in `components/ui/`
- **Tailwind CSS v4** with CSS custom properties for theming (oklch color format)
- **Radix UI** primitives underneath shadcn
- **Framer Motion** for all animations (accordion, page transitions, micro-interactions)
- **Recharts** for expense charts
- **Lucide React** for icons
- Dark mode via `next-themes`

### File Structure (key files)

```
app/
  page.tsx                    # Root, AppProvider wrapper, SPA view router
  globals.css                 # Tailwind v4 theme tokens (oklch)
  reset-password/
    page.tsx                  # Standalone page for password recovery flow
components/
  dashboard-page.tsx          # Main view: header, filters, summary, tx list, magic bar, chat
  settings-page.tsx           # AI provider selector, exchange rate config, profile mode
  auth-page.tsx               # Login, register, forgot password flows
  landing-page.tsx
  profile-page.tsx            # Name change, password change
  ui/
    exchange-widget.tsx       # Collapsible live rate panel for dashboard
    ... (shadcn components)
hooks/
  use-exchange-rate.ts        # DolarAPI integration hook
  use-mobile.ts
  use-toast.ts
lib/
  app-context.tsx             # Global React Context, all types, Supabase data loaders
  supabase.ts                 # Supabase client (reads from env vars)
  utils.ts
```

### Key Config Notes

- `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` — TypeScript errors do not fail the build
- `next.config.mjs` has `images: { unoptimized: true }` — Next.js image optimization disabled
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`)
- The UI is in **Spanish** (Argentine Spanish, ARS currency context)
- Deployed on Vercel: `https://finanzas-budget-buddy.vercel.app`
- Supabase Redirect URLs must include `https://finanzas-budget-buddy.vercel.app/**` for email flows to work in production
