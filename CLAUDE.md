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
- `analytics` → `components/analytics-page.tsx` (trend chart, donut chart, recurring transactions)

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
- `navDirection` — `"forward" | "back"` — set before each view transition; used in `app/page.tsx` to skip the enter animation when navigating back (matches native OS gesture feel)

`currentViewRef` (useRef) mirrors `currentView` and is used inside async auth callbacks to avoid stale-closure bugs. The view is also persisted to `sessionStorage` (`bb_view`) so it survives tab-discard/remount.

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
  isRecurring?: boolean       // marks transaction as a monthly fixed expense/income
}
```

`txRate` is immutable once saved — it represents the exact rate used at transaction time, so historical ARS totals don't change if the dollar moves.

### Supabase Backend

Auth and data are fully backed by Supabase (project `budgetbuddy`, region `sa-east-1`).

**Tables:**
- `profiles` — per-user settings: `user_name`, `monthly_budget`, `profile_mode`, `exchange_rate_mode`, `usd_rate`, `ai_provider`, `api_key` (Claude), `api_key_openai`, `api_key_gemini`
- `transactions` — all transaction fields in snake_case, `user_id` FK with RLS; includes `is_recurring boolean DEFAULT false`

**Auth flows:**
- Email/password signup + login via `supabase.auth.signInWithPassword` / `signUp`
- Email confirmation disabled by default during development (toggle in Supabase Dashboard → Auth → Providers → Email)
- Password reset: `resetPasswordForEmail` with `redirectTo: {origin}/reset-password` → user lands on `/reset-password` page which catches `PASSWORD_RECOVERY` event
- `onAuthStateChange` listener in `AppProvider`: on `PASSWORD_RECOVERY` sets `isPasswordRecovery = true` and navigates to `auth`; on sign-in loads profile + transactions and navigates to `dashboard`
- Navigation guard: `AUTHENTICATED_VIEWS` constant + `currentViewRef` prevents redirect-to-dashboard on tab return / token refresh events

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
- Magic Bar (bottom input) — when currency is USD, shows a horizontal chip selector:
  - Chips display live rates from DolarAPI inline
  - Selecting "Manual" expands a smooth-height input for a custom rate
  - The chosen rate is stored as `txRate` and `exchangeRateType` on the transaction

### AI Provider System

Three LLM providers are supported. The active provider is selected in Settings:
- **Claude** (Anthropic) — key stored in `api_key` DB column
- **OpenAI** (GPT-4o) — key stored in `api_key_openai` DB column
- **Gemini** (Google) — key stored in `api_key_gemini` DB column

`apiKey` in context is a computed value: `aiProvider === "claude" ? apiKeyClaude : aiProvider === "openai" ? apiKeyOpenAI : apiKeyGemini`. The dashboard checks `apiKey.trim()` before processing Magic Bar input.

**API key validation:** `lib/ai.ts` defines `KEY_PREFIXES` (`sk-ant-`, `sk-`, `AIza`) and calls `validateKeyFormat()` before every API call — throws immediately with a user-friendly message instead of a network error. Settings page also validates on save and blocks if format is wrong.

### Theme System

- `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `storageKey="bb_theme"`
- Dark theme: defined in `:root` (globals.css) — near-black background, emerald primary, violet accent
- Light theme: `.light` class override — "Sage Morning" palette with mint-tinted background (`oklch(0.95 0.018 155)`), white cards, emerald darkened to `0.52` for contrast
- Theme transition: `.theme-transitioning` class applied briefly via JS (`handleThemeChange` in settings) adds `!important` color transitions to all elements, overriding Tailwind utilities for a uniform 0.45s crossfade
- Toggle: Sun/Moon pill in Settings page

### Offline Queue

`lib/app-context.tsx` handles offline operations transparently:
- **Detection**: `navigator.onLine` checked before every Supabase write; `window` `online`/`offline` events update `isOnline` state in context.
- **Queueing**: when offline, `addTransaction` / `updateTransaction` / `deleteTransaction` skip the Supabase call, keep the optimistic UI update, and push an `OfflineOp` entry to `localStorage` (`bb_offline_queue`).
- **Replay**: a `useEffect` that depends on `[isOnline, user]` fires when connectivity returns, processes the queue in order, resolves `tempId → realId` for chained ops (e.g. add then update while offline), then clears the queue.
- **UI**: dashboard header shows an amber pill "N en cola" when offline, or a spinning "Sincronizando..." when back online and draining the queue.
- Exposed via context: `isOnline: boolean`, `pendingOfflineCount: number`.

### Notifications (PWA)

- `hooks/use-notifications.ts` — `requestPermission()` + `showNotification()` via `ServiceWorkerRegistration.showNotification()` (works when PWA is in background)
- `components/notification-manager.tsx` — renders null, wires up 4 schedulers:
  - **Daily reminder**: `setTimeout` to configured time, checks `bb_notif_last_daily` to avoid double-fire
  - **Budget alert**: fires when monthly expenses ≥ 90% of budget (once per month, keyed by `bb_notif_budget_month`)
  - **Recurring reminder**: fires on the 1st of each month if user has recurring transactions
  - **Weekly summary**: fires every Monday with last week's total expenses and top 3 categories; keyed by ISO week (`bb_notif_weekly_key`)
- Settings toggles: 4 toggles + time picker in Settings page, stored in `localStorage` (`bb_notif_daily`, `bb_notif_daily_time`, `bb_notif_budget`, `bb_notif_recurring`, `bb_notif_weekly`)
- `public/sw.js` handles `push` and `notificationclick` events

### Export (CSV + PDF)

Export lives entirely in `components/analytics-page.tsx` — removed from dashboard.

- **Range selector**: 5 presets — "Este mes", "Mes anterior", "Año YYYY", "Año YYYY-1", "Personalizado".
- **Custom range**: selecting "Personalizado" toggles an inline `<Calendar mode="range">` (same shadcn Calendar used in the filter bar). On "Aplicar rango" it sets `exportApplied: { from, to }`.
- **`exportTxs`**: memoized filter of `transactions` by `exportRange` (derived from the active mode + `exportApplied`).
- **CSV**: BOM-prefixed UTF-8, columns: Fecha, Tipo, Descripción, Categoría, Monto, Moneda, Nota. Filename uses `exportRangeLabel`.
- **PDF**: generates a full HTML document (inline styles) opened in `window.open`, then calls `window.print()` after 400ms. Includes summary cards, category breakdown table, and transaction list (capped at 50). No external dependencies.

### Transaction List UX

- **Pagination**: shows last 6 by default, "Ver N más" button below. Resets on filter/search change. State: `showAllTx` + `TX_PAGE = 6` + `visibleTransactions` slice.
- **Swipe gestures** (mobile): each card is wrapped in `motion.div` with `drag="x"` + `dragSnapToOrigin`. Swiping right >75px triggers edit, left >75px triggers delete. Action hints (Pencil/Trash) are revealed via absolute-positioned background. `dragActiveRef` (useRef) prevents swipe from triggering the card's click/expand handler.
- **Long-press** (mobile): 500ms hold shows edit/delete row below card.
- **Hover buttons** (desktop): Pencil + Trash icons appear on hover.
- **Search**: filters by description, category, observation.
- **Recurring**: `isRecurring` flag on transaction; managed in Analytics page.

### UI Stack

- **shadcn/ui** ("new-york" style) — components in `components/ui/`
- **Tailwind CSS v4** with CSS custom properties for theming (oklch color format)
- **Radix UI** primitives underneath shadcn
- **Framer Motion** for all animations (accordion, page transitions, swipe gestures, micro-interactions)
- **Recharts** for charts (LineChart trend, PieChart category breakdown)
- **Lucide React** for icons
- **next-themes** for dark/light mode
- **Sonner** for toast notifications

### File Structure (key files)

```
app/
  page.tsx                    # Root, AppProvider + NotificationManager, SPA view router
  layout.tsx                  # ThemeProvider, PWA meta, manifest link, PwaRegister, Toaster
  globals.css                 # Tailwind v4 theme tokens (oklch) + .light palette + .theme-transitioning
  reset-password/
    page.tsx                  # Standalone page for password recovery flow
components/
  dashboard-page.tsx          # Orchestrator: all shared state + handlers, compone layout (~889 líneas)
  dashboard/                  # Sub-componentes del dashboard (extraídos del orquestador)
    shared.tsx                # Constantes (iconMap, VALID_CATEGORIES), tipos (ChatMessage, Attachment),
                              # utilidades (formatDate, formatDateShort, fileToBase64, compressImage)
    exchange-type-badge.tsx   # Badge de tipo de cambio (Blue / Tarjeta / Oficial / MEP / Manual)
    receipt-image.tsx         # Imagen de comprobante con URL firmada desde Supabase Storage
    onboarding-overlay.tsx    # Overlay de bienvenida con pasos animados (3 steps)
    swipe-card.tsx            # Wrapper de swipe con useMotionValue/useTransform; hints de editar/eliminar
    delete-dialog.tsx         # AlertDialog de confirmación de eliminación
    camera-modal.tsx          # Modal de cámara en vivo para capturar tickets
    summary-cards.tsx         # Tarjetas de resumen: modo presupuesto o ingresos+gastos
    category-chart.tsx        # Breakdown colapsable de gastos por categoría con barras animadas
    filter-bar.tsx            # Chips de filtro temporal (semana/mes/año/custom) + calendario inline
    edit-dialog.tsx           # Formulario completo de edición de transacción + exporta EditForm type
    transaction-list.tsx      # Lista swipeable con búsqueda, expand, long-press y paginación
    magic-bar.tsx             # Barra de entrada multimodal fija (texto, foto, audio, nota, fecha)
    chat-panel.tsx            # Sidebar del asistente IA con historial y grabación de voz
  settings-page.tsx           # Theme toggle, notifications, AI provider, exchange rate, profile mode
  analytics-page.tsx          # Trend chart (LineChart), category donut (PieChart), recurring templates
  auth-page.tsx               # Login, register, forgot password flows
  landing-page.tsx            # Landing + PWA install button
  profile-page.tsx            # Name change, password change
  notification-manager.tsx    # Renders null — schedules push notifications
  pwa-register.tsx            # Service worker registration (client component)
  theme-provider.tsx          # next-themes ThemeProvider wrapper
  ui/
    ... (shadcn components)
hooks/
  use-exchange-rate.ts        # DolarAPI integration hook
  use-notifications.ts        # Notification permission + showNotification via SW
  use-mobile.ts
  use-toast.ts
lib/
  app-context.tsx             # Global React Context, all types, Supabase data loaders
  ai.ts                       # callAI() + callAIChat() — Claude / OpenAI / Gemini + key validation
  supabase.ts                 # Supabase client (reads from env vars)
  utils.ts
public/
  manifest.json               # Web App Manifest
  sw.js                       # Service worker: cache, push, notificationclick
  icon.svg                    # App icon
  icon-maskable.svg           # Maskable icon for Android adaptive icons
```

### Dashboard component architecture

`components/dashboard-page.tsx` es el orquestador: contiene todo el estado compartido, los handlers y la composición del layout. No define JSX propio más allá del header sticky y el esqueleto de la página.

Los sub-componentes en `components/dashboard/` son puramente presentacionales o tienen estado local mínimo:

- **`shared.tsx`** — sin JSX, solo exports de constantes/tipos/utilidades usadas por múltiples sub-componentes.
- **`swipe-card.tsx`** — tiene su propio `useMotionValue`/`useTransform` (no puede ser un hook por las reglas de React), recibe `onDragStart`/`onDragEnd` como callbacks.
- **`edit-dialog.tsx`** — exporta también el tipo `EditForm` que el orquestador usa para su `useState<EditForm>`.
- **`transaction-list.tsx`** — recibe `dragActiveRef` y `lpTimerRef` como refs mutables para coordinar el gesto de swipe con el click/expand sin causar re-renders.
- **`magic-bar.tsx`** — recibe `galleryInputRef` y `cameraInputRef` desde el orquestador para poder hacer `.click()` sobre los inputs ocultos.

El patrón de prop drilling explícito (sin Context) es intencional: cada componente declara exactamente qué necesita, lo que facilita el testing y el rastreo de dependencias.

### Native Back Gestures & Android Double-Back-to-Exit

`lib/app-context.tsx` integrates with the browser History API to support the Android back gesture and button:

- **`setView(view, replace?)`** — calls `history.pushState({ view }, "")` on forward navigation, `history.replaceState` when `replace=true` (used on signOut and auth SIGNED_OUT to prevent back-to-dashboard after logout).
- **`history.replaceState` on mount** — seeds the current view into `history.state` on first render so the popstate handler always has a valid `state.view`.
- **`popstate` handler** — fires when the Android back button/gesture navigates the browser history:
  - If the user is authenticated and the target is outside `AUTHENTICATED_VIEWS` (or `null`): dispatch `bb_exit_hint` custom event (shows "Deslizá de nuevo para salir" toast) and do NOT change React state. The browser is now at the bottom of the history stack — the next Android back naturally closes the PWA.
  - Otherwise: set `navDirection = "back"`, update `currentView`, update `sessionStorage`.
- **`navDirection` in `app/page.tsx`**: `initial={navDirection === "back" ? false : { opacity: 0 }}` — when going back, the incoming view appears instantly (no fade-in), matching the native OS gesture animation.
- **iOS limitation**: iOS Safari standalone (PWA) mode does NOT fire `popstate` for the edge-swipe gesture. This is an Apple platform constraint and cannot be fixed with JavaScript.

### iOS Safe Area (Notch / Dynamic Island)

All sticky/fixed headers include an inline `paddingTop` to clear the iOS notch in PWA standalone mode:
```tsx
style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}
```
Applied to: dashboard sticky header, settings sticky header, profile sticky header, analytics sticky header, landing nav header.

The `Toaster` in `app/layout.tsx` uses a bottom offset to clear the home indicator:
```tsx
offset="calc(env(safe-area-inset-bottom, 0px) + 96px)"
```
This requires `viewportFit: 'cover'` + `statusBarStyle: 'black-translucent'` in the metadata viewport (already set).

### Sticky Headers (Settings / Profile / Analytics)

Settings, Profile, and Analytics pages use a sticky header pattern instead of a fixed back button:
```tsx
<div className="min-h-screen flex flex-col bg-background">
  <header className="sticky top-0 z-30 flex items-center gap-3 px-4 pb-3 border-b border-border bg-background/90 backdrop-blur-md"
    style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}>
    {/* back button + page title */}
  </header>
  <motion.div className="flex-1 px-4 py-6 ...">
    {/* scrollable content */}
  </motion.div>
</div>
```
This prevents the back button from overlapping content when scrolling on mobile.

### PWA

The app is installable as a Progressive Web App:
- `public/manifest.json` — name, colors, orientation, SVG icons
- `public/sw.js` — caches app shell + `_next/static`; push + notificationclick handlers; network-first for navigation
- `components/pwa-register.tsx` — registers the SW via `useEffect` on mount
- `components/notification-manager.tsx` — schedules in-app and background notifications
- `components/landing-page.tsx` — `beforeinstallprompt` handler for Android install button; iOS hint for Safari

### Logout (signOut)

`signOut()` in `app-context.tsx` is **synchronous and optimistic**:
1. Immediately clears all local state and navigates to `"landing"` — UI responds instantly
2. Calls `supabase.auth.signOut()` fire-and-forget in the background
3. Clears `sessionStorage` view key

### Custom Range Calendar

The inline calendar (shown when clicking "Personalizado" in the filter bar) has:
- **Quick presets** scrollable chip row: Hoy, Ayer, 7 días, 30 días, Este mes, Mes ant.
- **Selected range preview**: shows `fromDate → toDate` and number of days
- **Calendar picker** for arbitrary ranges + "Aplicar rango" button
- `applyRange(from, to)` helper ensures `to` is always end-of-day (23:59:59.999)

### Key Config Notes

- `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` — TypeScript errors do not fail the build
- `next.config.mjs` has `images: { unoptimized: true }` — Next.js image optimization disabled
- Path alias `@/*` maps to the project root (configured in `tsconfig.json`)
- The UI is in **Spanish** (Argentine Spanish, ARS currency context)
- Deployed on Vercel: `https://finanzas-budget-buddy.vercel.app`
- Supabase Redirect URLs must include `https://finanzas-budget-buddy.vercel.app/**` for email flows to work in production
