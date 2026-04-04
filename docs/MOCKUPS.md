# Mockups de Pantallas Principales
## TP DAN 2026 — BudgetBuddy Microservices

Las pantallas del frontend Next.js no cambian visualmente en la refactorización.
Lo que cambia es la fuente de datos: de Supabase directo → API Gateway.

---

## Pantalla 1: Landing / Inicio
```
┌─────────────────────────────────────────┐
│  BudgetBuddy                    [🌙]    │
├─────────────────────────────────────────┤
│                                         │
│     Tu dinero, inteligente.             │
│                                         │
│   [  Empezar gratis  ]                  │
│   [  Iniciar sesión  ]                  │
│                                         │
│  ✓ Registrá gastos con texto o foto     │
│  ✓ IA que entiende castellano           │
│  ✓ ARS y USD con cotización real        │
│                                         │
└─────────────────────────────────────────┘
```
**Servicio involucrado:** Ninguno (página estática)

---

## Pantalla 2: Autenticación (Login / Registro)
```
┌─────────────────────────────────────────┐
│  ← Volver                               │
├─────────────────────────────────────────┤
│  Iniciar sesión                         │
│                                         │
│  Email: [_____________________________] │
│  Contraseña: [______________________]   │
│                                         │
│  [  Ingresar  ]                         │
│                                         │
│  ─────────── o ───────────              │
│  [G] Continuar con Google               │
│  [●] Continuar con GitHub               │
│                                         │
│  ¿No tenés cuenta? Registrate           │
│  ¿Olvidaste tu contraseña?              │
└─────────────────────────────────────────┘
```
**Servicio involucrado:** `auth-service`
- `POST /api/auth/login` → devuelve JWT
- `POST /api/auth/register` → crea usuario + perfil
- `POST /api/auth/oauth/google` / `POST /api/auth/oauth/github`

---

## Pantalla 3: Dashboard Principal
```
┌─────────────────────────────────────────┐
│  Hola, Marcos ☀️          [⚙️] [👤]    │
│  Presupuesto: $150.000 ARS              │
├─────────────────────────────────────────┤
│  [Semana] [Mes✓] [Año] [Custom]         │
├─────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐         │
│  │ Gastos     │  │ Ingresos   │         │
│  │ $87.500    │  │ $200.000   │         │
│  │ ████░░ 58% │  │            │         │
│  └────────────┘  └────────────┘         │
├─────────────────────────────────────────┤
│  Movimientos                            │
│  🛒 Supermercado   -$4.200  15 abr      │
│  🚌 SUBE           -$500    14 abr      │
│  💼 Sueldo         +$200k   10 abr      │
│  [Ver 12 más]                           │
├─────────────────────────────────────────┤
│  [📷] [🎤] [___ Registrar gasto ___] → │
└─────────────────────────────────────────┘
```
**Servicios involucrados:**
- `auth-service` → nombre de usuario, presupuesto mensual (del perfil)
- `transaction-service` → `GET /api/transactions?period=month`
- `ai-service` → `POST /api/ai/parse` (cuando se usa Magic Bar)

---

## Pantalla 4: Analytics
```
┌─────────────────────────────────────────┐
│  ← Analytics                            │
├─────────────────────────────────────────┤
│  Tendencia anual (LineChart)            │
│  ╭─────────────────────────────────╮    │
│  │ Ingresos ──── Gastos ....       │    │
│  │     ___                         │    │
│  │  __/   \___                     │    │
│  │ /           \.....              │    │
│  ╰─────────────────────────────────╯    │
│  ENE FEB MAR ABR MAY JUN...            │
├─────────────────────────────────────────┤
│  Por categoría (PieChart)               │
│      🛒 Comida      35%                 │
│      🚌 Transporte  20%                 │
│      🏠 Vivienda    28%                 │
│      💊 Salud       10%                 │
│      📚 Educación    7%                 │
├─────────────────────────────────────────┤
│  [Exportar CSV] [Exportar PDF]          │
└─────────────────────────────────────────┘
```
**Servicios involucrados:**
- `ai-service` → `GET /api/ai/analytics?period=annual`
- `transaction-service` → `GET /api/transactions/export/csv`

---

## Pantalla 5: Chat AI
```
┌─────────────────────────────────────────┐
│  ← Asistente financiero          [✕]   │
├─────────────────────────────────────────┤
│                                         │
│  🤖 ¡Hola! Puedo ayudarte a analizar   │
│     tus finanzas. ¿Qué querés saber?   │
│                                         │
│  👤 ¿Cuánto gasté en comida este mes?  │
│                                         │
│  🤖 Este mes gastaste $32.400 en        │
│     Comida, distribuido en:             │
│     • Supermercado: $28.200             │
│     • Restaurantes: $4.200              │
│     Eso representa el 37% de tus        │
│     gastos totales del mes.             │
│                                         │
│  👤 Café 800                           │
│                                         │
│  🤖 ✅ Registré: Café - $800 ARS       │
│     Categoría: Comida                   │
│                                         │
├─────────────────────────────────────────┤
│  [___ Escribí acá... ___________] [→]  │
│  [📷] [🎤]                             │
└─────────────────────────────────────────┘
```
**Servicio involucrado:**
- `ai-service` → `POST /api/ai/chat` (conversación)
- `ai-service` → `POST /api/ai/parse` (cuando detecta nueva transacción)
- `transaction-service` → `POST /api/transactions` (para persistir lo parseado)

---

## Pantalla 6: Configuración
```
┌─────────────────────────────────────────┐
│  ← Configuración                        │
├─────────────────────────────────────────┤
│  Proveedor de IA                        │
│  ○ Claude (Anthropic)                   │
│  ● OpenAI (GPT-4o)                      │
│  ○ Gemini (Google)                      │
│  API Key: [sk-••••••••••••••••••]       │
│                                         │
│  Cotización USD                         │
│  ● Automática (DolarAPI)  ○ Manual      │
│  Blue: $1.245  Oficial: $1.080          │
│                                         │
│  Notificaciones                         │
│  [✓] Recordatorio diario    08:00       │
│  [✓] Alerta de presupuesto (90%)        │
│  [ ] Resumen semanal                    │
│                                         │
│  Tema                                   │
│  [🌙 Oscuro] / [☀️ Claro]              │
└─────────────────────────────────────────┘
```
**Servicios involucrados:**
- `auth-service` → `GET/PUT /api/auth/profile` (proveedor IA, claves, modo)
- `transaction-service` → `GET /api/transactions/rates` (cotizaciones actuales)

---

## Roles y Acceso a Pantallas

| Pantalla | Usuario Anónimo | Usuario Autenticado |
|---------|:-:|:-:|
| Landing | ✅ | ✅ |
| Auth (Login/Registro) | ✅ | ❌ (redirige a dashboard) |
| Dashboard | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Chat AI | ❌ | ✅ |
| Configuración | ❌ | ✅ |
| Perfil | ❌ | ✅ |
