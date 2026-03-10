# BudgetBuddy

Rastreador de gastos con IA para la economía argentina. Registrá movimientos por texto, foto o audio y dejá que la IA los interprete.

**Demo:** [finanzas-budget-buddy.vercel.app](https://finanzas-budget-buddy.vercel.app)

---

## Funcionalidades

- **Magic Bar con IA** — escribí, dictá o mandá una foto de un ticket; Claude / GPT-4o / Gemini extrae monto, categoría e ícono automáticamente
- **Multi-moneda ARS / USD** — tipo de cambio en vivo (Blue, Oficial, Tarjeta, MEP) vía DolarAPI; el tipo se bloquea al momento de cargar cada movimiento
- **Analítica** — gráfico de tendencia anual y donut por categoría; sección de gastos fijos mensuales
- **Modo oscuro / claro** — paleta "Sage Morning" en modo claro, transición suave de 0.45s
- **Swipe en mobile** — deslizá derecha para editar, izquierda para eliminar
- **Notificaciones push (PWA)** — recordatorio diario, alerta al 90% del presupuesto, aviso de fijos el 1° de cada mes
- **Instalable como PWA** — funciona offline, soporte para notch de iPhone
- **Chat financiero** — consultá tu historial con lenguaje natural; contexto de los últimos 12 meses
- **Tres proveedores de IA** — Claude, GPT-4o, Gemini; switcheable en Ajustes

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Animaciones | Framer Motion |
| Gráficos | Recharts |
| Temas | next-themes |
| IA | Anthropic / OpenAI / Google APIs |
| Deploy | Vercel |

---

## Estructura del proyecto

```
app/
  page.tsx                  # SPA router — renderiza la vista activa
  layout.tsx                # ThemeProvider, PWA meta, Toaster
  reset-password/page.tsx   # Ruta standalone para recuperación de contraseña
components/
  dashboard-page.tsx        # Orquestador del dashboard (estado + handlers)
  dashboard/                # Sub-componentes del dashboard
    shared.tsx              # Constantes, tipos y utilidades compartidas
    filter-bar.tsx          # Chips de filtro temporal + calendario inline
    summary-cards.tsx       # Tarjetas de resumen (presupuesto / ingresos+gastos)
    category-chart.tsx      # Breakdown de gastos por categoría
    transaction-list.tsx    # Lista swipeable con búsqueda y paginación
    swipe-card.tsx          # Wrapper de gesto de swipe (editar / eliminar)
    magic-bar.tsx           # Barra multimodal de entrada (texto, foto, audio)
    chat-panel.tsx          # Sidebar del asistente IA
    edit-dialog.tsx         # Formulario de edición de transacción
    delete-dialog.tsx       # Confirmación de eliminación
    camera-modal.tsx        # Cámara en vivo para capturar tickets
    onboarding-overlay.tsx  # Overlay de bienvenida
    receipt-image.tsx       # Imagen de comprobante desde Supabase Storage
    exchange-type-badge.tsx # Badge de tipo de cambio
  settings-page.tsx         # Tema, notificaciones, IA, tipo de cambio
  analytics-page.tsx        # Gráficos de tendencia y categoría; gastos fijos
  auth-page.tsx             # Login, registro, recuperación de contraseña
  landing-page.tsx          # Landing + instalación PWA
  profile-page.tsx          # Cambio de nombre y contraseña
hooks/
  use-exchange-rate.ts      # Cotizaciones en vivo desde DolarAPI
  use-notifications.ts      # Permisos y envío de notificaciones push
lib/
  app-context.tsx           # Estado global (React Context + Supabase)
  ai.ts                     # callAI() / callAIChat() — Claude, OpenAI, Gemini
public/
  sw.js                     # Service worker (cache + push notifications)
  manifest.json             # Web App Manifest
```

---

## Setup local

```bash
git clone https://github.com/MarcosPiv/BudgetBuddy.git
cd BudgetBuddy
npm install
```

Crear `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

```bash
npm run dev   # http://localhost:3000
```

---

## Desarrollado por

[Marcos Pividori](https://github.com/MarcosPiv)
