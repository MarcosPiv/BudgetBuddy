# BudgetBuddy

Rastreador de gastos con IA para la economía argentina. Registrá movimientos por texto, foto o audio y dejá que la IA los interprete.

**Demo:** [finanzas-budget-buddy.vercel.app](https://finanzas-budget-buddy.vercel.app)

---

## Funcionalidades

- **Magic Bar con IA** — escribí, dictá o mandá una foto de un ticket; Claude / GPT-4o / Gemini extrae monto, categoría e ícono automáticamente
- **Multi-moneda ARS / USD** — tipo de cambio en vivo (Blue, Oficial, Tarjeta, MEP) vía DolarAPI; el tipo se bloquea al momento de cargar cada movimiento
- **Analítica** — gráfico de tendencia anual y donut por categoría; sección de gastos fijos mensuales
- **Exportar CSV y PDF** — desde Analítica, elegí un rango predefinido (mes, año) o un rango personalizado con calendario; el PDF se genera en el navegador sin dependencias externas
- **Modo sin conexión mejorado** — las transacciones creadas, editadas o eliminadas sin internet se guardan en cola local y se sincronizan automáticamente al volver la conexión; el dashboard muestra un indicador de estado
- **Resumen semanal automático** — cada lunes, notificación con el gasto total de la semana anterior y las 3 categorías principales
- **Modo oscuro / claro** — paleta "Sage Morning" en modo claro, transición suave de 0.45s
- **Swipe en mobile** — deslizá derecha para editar, izquierda para eliminar; gestos nativos de navegación en Android (botón/gesto back con doble-back para salir)
- **Notificaciones push (PWA)** — recordatorio diario, alerta al 90% del presupuesto, aviso de fijos el 1° de cada mes, resumen semanal los lunes
- **Instalable como PWA** — soporte completo para notch / Dynamic Island de iPhone, headers sticky con safe-area insets, funciona con conexión inestable
- **Chat financiero** — consultá tu historial con lenguaje natural; contexto de los últimos 12 meses
- **Tres proveedores de IA** — Claude, GPT-4o, Gemini; switcheable en Ajustes

---

## Modo sin conexión — caso de uso

> **Escenario:** estás en una feria o mercado con mala señal y querés registrar varios gastos en el momento.

1. El celular pierde conexión a internet (o está en modo avión).
2. Registrás normalmente: "Compré verduras $4.500", "Café $1.200", "Transporte $800".
3. Las tres transacciones aparecen en el dashboard de inmediato gracias al **update optimista** — sin spinner, sin error.
4. En el header aparece un badge ámbar: **"3 en cola"**, indicando que hay operaciones pendientes.
5. Al salir del mercado y recuperar señal, BudgetBuddy detecta la reconexión automáticamente y sincroniza las 3 operaciones con Supabase en orden.
6. El badge desaparece y las transacciones quedan persistidas con sus IDs reales.

Lo mismo aplica para editar o eliminar un movimiento sin conexión: la operación queda en cola y se ejecuta en Supabase al volver la señal, sin que el usuario tenga que hacer nada.

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
