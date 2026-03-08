# BudgetBuddy

Rastreador de gastos potenciado con IA, diseñado para la economía argentina. Registrá tus gastos por texto, foto o audio y organizalos automáticamente.

## Stack

- **Next.js 16** (App Router)
- **Supabase** — auth, base de datos PostgreSQL, Row Level Security
- **Tailwind CSS v4** + **shadcn/ui** (new-york)
- **Framer Motion** para animaciones
- **DolarAPI** para cotizaciones en tiempo real
- **Lucide React** para íconos
- **PWA** — instalable en Android e iOS sin app store

## Funcionalidades

- Autenticación con email y contraseña (Supabase Auth)
- Recuperación de contraseña por email
- Registro de gastos e ingresos por texto, imagen o audio
- Soporte multi-moneda ARS / USD con tipo de cambio por transacción
- Tipos de dólar por gasto: Blue, Tarjeta, Oficial, MEP o Manual
- Widget de cotizaciones en vivo (DolarAPI) en el dashboard
- Filtros por semana, mes, año o rango personalizado con atajos rápidos
- Modo "Solo gastos" con presupuesto mensual y barra de progreso
- Asistente de IA configurable: Claude, OpenAI o Gemini
- Chat financiero con IA usando datos reales del período activo
- Persistencia en la nube — los datos no se pierden al recargar
- Dark mode
- PWA instalable: botón de instalación en landing (Android) e instrucciones para iOS

## Instalación

```bash
npm install
```

Configurar variables de entorno en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

## Estructura

```
app/
  page.tsx                  # Raíz, AppProvider, router de vistas SPA
  reset-password/page.tsx   # Página de recuperación de contraseña
  globals.css               # Tokens de tema Tailwind v4 (oklch)
  layout.tsx                # Meta PWA, manifest, service worker register
components/
  dashboard-page.tsx        # Vista principal
  settings-page.tsx         # Configuración AI, tipo de cambio, perfil
  auth-page.tsx             # Login, registro, recuperación de contraseña
  profile-page.tsx          # Nombre y contraseña del usuario
  pwa-register.tsx          # Registro del service worker
  ui/                       # Componentes shadcn/ui + exchange-widget
hooks/
  use-exchange-rate.ts      # Hook para DolarAPI (Blue, Oficial, Tarjeta, MEP)
lib/
  app-context.tsx           # React Context global + tipos + loaders Supabase
  ai.ts                     # Integración Claude / OpenAI / Gemini
  supabase.ts               # Cliente Supabase
public/
  manifest.json             # Web App Manifest (PWA)
  sw.js                     # Service worker (cache shell + assets estáticos)
  icon.svg                  # Ícono principal
  icon-maskable.svg         # Ícono adaptive para Android
```

## Producción

Desplegado en Vercel: [finanzas-budget-buddy.vercel.app](https://finanzas-budget-buddy.vercel.app)

Configuración requerida en Supabase Dashboard:
- **Site URL:** `https://finanzas-budget-buddy.vercel.app`
- **Redirect URLs:** `https://finanzas-budget-buddy.vercel.app/**`

---

> El tipo de cambio aplicado a cada gasto se guarda de forma inmutable en `txRate`, por lo que el historial en ARS no cambia aunque el dólar suba mañana.
