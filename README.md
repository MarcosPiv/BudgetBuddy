# BudgetBuddy

Rastreador de gastos potenciado con IA, diseñado para la economía argentina. Registrá tus gastos por texto, foto o audio y organizalos automáticamente.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS v4** + **shadcn/ui** (new-york)
- **Framer Motion** para animaciones
- **DolarAPI** para cotizaciones en tiempo real
- **Lucide React** para íconos

## Funcionalidades actuales

- Registro de gastos e ingresos por texto, imagen o audio
- Clasificación automática por categorías con IA (simulada)
- Soporte multi-moneda ARS / USD con tipo de cambio por transacción
- Tipos de dólar por gasto: Blue, Tarjeta, Oficial, MEP o Manual
- Widget de cotizaciones en vivo (DolarAPI) en el dashboard
- Filtros por semana, mes, año o rango personalizado
- Modo "Solo gastos" con presupuesto mensual y barra de progreso
- Chat con asistente financiero
- Captura de tickets con cámara
- Dark mode

## Instalación

```bash
npm install
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
app/                    # Next.js App Router
components/             # Páginas y componentes UI
  ui/                   # 57 componentes shadcn/ui + exchange-widget
hooks/                  # use-exchange-rate, use-mobile, use-toast
lib/                    # app-context (estado global), utils
```

## Próximo paso: Backend con Supabase

La siguiente fase migra la app de SPA estática a una app con backend real:

- **Auth** — Supabase Auth (email/password, magic link)
- **Base de datos** — tablas `transactions` y `profiles` con Row Level Security
- **Persistencia** — los datos dejan de perderse al recargar
- **Multi-dispositivo** — el historial viaja con el usuario

---

> El tipo de cambio aplicado a cada gasto se guarda de forma inmutable en `txRate`, por lo que el historial en ARS no cambia aunque el dólar suba mañana.
