# Fase 1: Análisis de Dominio y Delimitación de Servicios
## TP DAN 2026 — BudgetBuddy Microservices

---

## Origen: Monolito Actual

BudgetBuddy en su versión actual es una SPA Next.js que delega toda la persistencia y autenticación a
Supabase (BaaS). La lógica de negocio vive distribuida entre:

| Archivo original | Lógica contenida | Destino en microservicios |
|-----------------|------------------|---------------------------|
| `lib/app-context.tsx` | Auth, perfil, CRUD de transacciones, offline queue | → auth-service + transaction-service |
| `lib/ai.ts` | Llamadas a Claude/OpenAI/Gemini, parseo de lenguaje natural | → ai-service |
| `hooks/use-exchange-rate.ts` | Integración con DolarAPI, tipos de cambio | → transaction-service |
| `hooks/use-chat-handler.ts` | Contexto financiero para el chat, intenciones AI | → ai-service |
| `components/analytics-page.tsx` | Cálculos de tendencias, exportación CSV/PDF | → transaction-service + ai-service |

---

## Bounded Contexts identificados

Un Bounded Context (DDD) delimita dónde aplican los mismos términos y reglas de negocio.
Se identificaron 3 contextos claros:

### Contexto 1: Identidad y Perfiles
**Términos clave:** usuario, contraseña, perfil, presupuesto mensual, proveedor IA, clave API

**Reglas de negocio:**
- Un usuario tiene exactamente un perfil
- El presupuesto mensual es opcional (puede ser 0)
- La clave de API (Claude/OpenAI/Gemini) pertenece al perfil del usuario
- El modo del perfil (`standard` | `expenses_only`) cambia cómo se muestran los datos

**→ Microservicio:** `auth-service`

---

### Contexto 2: Finanzas y Transacciones
**Términos clave:** transacción, ingreso, gasto, monto, cotización, tipo de cambio, comprobante, recurrente

**Reglas de negocio:**
- Una transacción pertenece a exactamente un usuario
- El `txRate` (cotización al momento del registro) es inmutable una vez guardado
- El monto siempre es positivo; el tipo (`income`/`expense`) determina si suma o resta
- Las transacciones recurrentes se marcan con `isRecurring = true`
- Una transacción puede tener comprobante (receipt image)

**→ Microservicio:** `transaction-service`

---

### Contexto 3: Inteligencia Artificial y Analytics
**Términos clave:** chat, mensaje, intención, transacción parseada, tendencia, proyección, categoría

**Reglas de negocio:**
- El historial de chat es per-sesión y per-usuario
- El AI no persiste transacciones directamente; devuelve la transacción parseada y el frontend
  (o el transaction-service via async) la persiste
- El contexto financiero para el chat se construye en base a las últimas 60 transacciones
- El cache de analytics se invalida cuando se agrega/modifica/elimina una transacción

**→ Microservicio:** `ai-service`

---

## Modelo de Datos por Servicio

### auth-service — Schema `auth` (PostgreSQL)

```sql
-- Tabla: users
CREATE TABLE auth.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),              -- NULL si es OAuth puro
    name        VARCHAR(100),
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: profiles
CREATE TABLE auth.profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_budget      NUMERIC(15,2) DEFAULT 0,
    profile_mode        VARCHAR(20) DEFAULT 'standard',   -- 'standard' | 'expenses_only'
    exchange_rate_mode  VARCHAR(10) DEFAULT 'api',        -- 'api' | 'manual'
    usd_rate            NUMERIC(10,2),
    ai_provider         VARCHAR(20) DEFAULT 'claude',     -- 'claude' | 'openai' | 'gemini'
    api_key_claude      VARCHAR(500),
    api_key_openai      VARCHAR(500),
    api_key_gemini      VARCHAR(500),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: oauth_connections
CREATE TABLE auth.oauth_connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider    VARCHAR(20) NOT NULL,   -- 'google' | 'github'
    provider_id VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);
```

---

### transaction-service — Schema `txn` (PostgreSQL)

```sql
-- Tabla: transactions
CREATE TABLE txn.transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,           -- FK lógica (no DB constraint cross-schema)
    description         VARCHAR(40) NOT NULL,
    amount              NUMERIC(15,2) NOT NULL CHECK (amount >= 1),
    type                VARCHAR(10) NOT NULL,    -- 'income' | 'expense'
    icon                VARCHAR(50),
    category            VARCHAR(50),
    date                DATE NOT NULL,
    observation         TEXT,
    currency            VARCHAR(3) DEFAULT 'ARS', -- 'ARS' | 'USD'
    amount_usd          NUMERIC(15,2),
    tx_rate             NUMERIC(10,2),           -- Inmutable: cotización al momento del registro
    exchange_rate_type  VARCHAR(20),             -- 'BLUE' | 'TARJETA' | 'OFICIAL' | 'MEP' | 'MANUAL'
    receipt_url         VARCHAR(500),
    is_recurring        BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON txn.transactions(user_id);
CREATE INDEX idx_transactions_date ON txn.transactions(date DESC);

-- Tabla: receipts (metadata de comprobantes; archivo físico en MinIO/S3)
CREATE TABLE txn.receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES txn.transactions(id) ON DELETE CASCADE,
    file_path       VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(50),
    size_bytes      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ai-service — Collections (MongoDB)

```javascript
// Collection: chat_sessions
{
  _id: ObjectId,
  userId: String,           // UUID del usuario (sin FK a PostgreSQL)
  startedAt: Date,
  lastActivityAt: Date,
  messageCount: Number
}

// Collection: chat_messages
{
  _id: ObjectId,
  sessionId: ObjectId,      // ref a chat_sessions
  userId: String,
  role: String,             // 'user' | 'assistant'
  content: String,
  attachments: [            // imágenes o audio transcripto
    {
      type: String,         // 'image' | 'audio'
      mimeType: String,
      transcription: String // solo para audio
    }
  ],
  parsedTransaction: Object, // si el AI parseó una transacción en este mensaje
  createdAt: Date
}

// Collection: analytics_cache
{
  _id: ObjectId,
  userId: String,
  period: String,           // 'monthly-2025-04' | 'annual-2025'
  data: Object,             // resultado del cálculo de analytics
  generatedAt: Date,
  validUntil: Date          // TTL del cache
}
```

---

## Comunicación entre Servicios

### REST Síncrono (Gateway → Servicio)

| Endpoint | Servicio | Descripción |
|----------|---------|-------------|
| `POST /api/auth/register` | auth-service | Registro de usuario |
| `POST /api/auth/login` | auth-service | Login, devuelve JWT |
| `GET /api/auth/profile` | auth-service | Obtener perfil del usuario |
| `PUT /api/auth/profile` | auth-service | Actualizar perfil |
| `GET /api/transactions` | transaction-service | Listar transacciones (paginadas) |
| `POST /api/transactions` | transaction-service | Crear transacción |
| `PUT /api/transactions/{id}` | transaction-service | Actualizar transacción |
| `DELETE /api/transactions/{id}` | transaction-service | Eliminar transacción |
| `GET /api/transactions/rates` | transaction-service | Cotizaciones actuales (proxy DolarAPI) |
| `GET /api/transactions/export/csv` | transaction-service | Exportar CSV |
| `GET /api/transactions/export/pdf` | transaction-service | Exportar PDF |
| `POST /api/ai/parse` | ai-service | Parsear texto/imagen/audio → transacción |
| `POST /api/ai/chat` | ai-service | Mensaje de chat conversacional |
| `GET /api/ai/analytics` | ai-service | Datos para gráficos y tendencias |

### Mensajería Asíncrona (RabbitMQ)

```
Exchange: budgetbuddy.events (tipo: topic)

Productores → Consumidores:
  auth-service       → user.registered         → (futuro: notification-service)
  auth-service       → user.deleted             → transaction-service
  transaction-service → transaction.created     → ai-service
  transaction-service → budget.threshold.exceeded → (futuro: notification-service)
```

---

## Estrategia de Seguridad

### Flujo de Autenticación

```
1. Usuario → POST /api/auth/login → auth-service
2. auth-service valida credenciales → emite JWT firmado con clave secreta
3. JWT claims: { sub: userId, email, profileMode, aiProvider, exp }
4. Cliente almacena JWT (cookie httpOnly o localStorage)
5. Cada request posterior: Bearer {jwt} en header Authorization
6. api-gateway intercepta → valida firma JWT → si válido, agrega headers X-User-Id, X-Email
7. Microservicios leen X-User-Id del header (no validan JWT ellos mismos)
```

### Por qué no validar JWT en cada microservicio
- El Gateway centraliza la validación → los servicios internos confían en los headers X-User-*
- Reduce el acoplamiento: si rotamos la clave JWT, solo cambia el Gateway y auth-service
- Evita que las claves secretas se distribuyan a todos los servicios

---

## Resumen de Cumplimiento de Requisitos del TP

| Requisito | Implementación |
|-----------|---------------|
| ≥ 3 microservicios Spring Boot | auth-service, transaction-service, ai-service |
| 1 base de datos SQL | PostgreSQL (schemas: auth + txn) |
| 1 base de datos NoSQL | MongoDB (ai-service) |
| Single Source of Truth | Cada servicio tiene su propio schema/DB con credenciales separadas |
| Mensajería asíncrona | RabbitMQ con topic exchange `budgetbuddy.events` |
| Spring Cloud Gateway | api-gateway como único punto de entrada |
| Eureka | eureka-server para service discovery |
| Docker | docker-compose con todos los componentes |
| Seguridad | JWT en Gateway + Spring Security en servicios |
| Logs centralizados | Loki + Promtail + Grafana |
| Telemetría de rendimiento | Prometheus + Micrometer + Grafana dashboards |
| Feature extra | Resilience4J (Circuit Breaker + Retry + Rate Limiter + Timeout) |
