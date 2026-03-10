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
