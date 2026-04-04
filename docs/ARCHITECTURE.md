# BudgetBuddy — Arquitectura Distribuida de Microservicios
## TP DAN 2026

---

## Visión General

BudgetBuddy fue refactorizado desde un monolito Next.js + Supabase hacia una arquitectura distribuida
con 3 microservicios Spring Boot, un frontend desacoplado, mensajería asíncrona, y observabilidad completa.

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                     │
│                  Next.js Frontend (:3001)                           │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS — único punto de entrada
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   api-gateway (:8080)                               │
│         Spring Cloud Gateway + JWT Filter + Resilience4J            │
│                                                                     │
│  /api/auth/**     →  auth-service                                   │
│  /api/transactions/** →  transaction-service                        │
│  /api/ai/**       →  ai-service                                     │
└────────┬─────────────────┬────────────────────────┬────────────────┘
         │ REST            │ REST                    │ REST
         ▼                 ▼                         ▼
┌──────────────┐  ┌──────────────────┐   ┌─────────────────┐
│ auth-service │  │transaction-service│   │   ai-service    │
│   (:8081)    │  │     (:8082)       │   │    (:8083)      │
│              │  │                  │   │                 │
│  PostgreSQL  │  │  PostgreSQL      │   │    MongoDB      │
│ schema:auth  │  │  schema:txn      │   │                 │
└──────┬───────┘  └───────┬──────────┘   └────────┬────────┘
       │                  │                        │
       └──────────────────┼────────────────────────┘
                          │ Eventos Async
                          ▼
               ┌─────────────────────┐
               │     RabbitMQ        │
               │  (budgetbuddy.events│
               │   topic exchange)   │
               └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Service Discovery                                 │
│              Eureka Server (:8761)                                  │
│       (todos los servicios se registran aquí)                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Observabilidad                                    │
│  Prometheus (:9090) + Grafana (:3000) + Loki + Tempo               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Componente | Tecnología | Puerto |
|------------|-----------|--------|
| Frontend | Next.js 15 (App Router) | 3001 |
| API Gateway | Spring Cloud Gateway 4.x | 8080 |
| Service Discovery | Spring Cloud Netflix Eureka | 8761 |
| Auth Service | Spring Boot 3.x + Spring Security | 8081 |
| Transaction Service | Spring Boot 3.x | 8082 |
| AI Service | Spring Boot 3.x | 8083 |
| Base de datos SQL | PostgreSQL 16 | 5432 |
| Base de datos NoSQL | MongoDB 7 | 27017 |
| Mensajería | RabbitMQ 3.x | 5672 / 15672 |
| Métricas | Prometheus | 9090 |
| Dashboards | Grafana | 3000 |
| Logs | Loki + Promtail | 3100 |
| Tracing | Grafana Tempo | 3200 |
| Feature Extra | Resilience4J (Circuit Breaker) | — |

---

## Feature Extra: Resilience4J

Implementado en el API Gateway y en los servicios que consumen APIs externas.

**Patrones aplicados:**

| Origen | Destino | Patrón | Config |
|--------|---------|--------|--------|
| api-gateway | auth-service | Circuit Breaker + Retry | 3 reintentos, 500ms backoff |
| api-gateway | transaction-service | Circuit Breaker + Rate Limiter | 100 req/s |
| api-gateway | ai-service | Circuit Breaker + Timeout | 30s timeout |
| transaction-service | DolarAPI (externo) | Retry + Fallback | 3 intentos, fallback a última cotización |

**Estados del Circuit Breaker:**
- `CLOSED` → tráfico normal
- `OPEN` → corta el circuito, devuelve fallback inmediatamente
- `HALF_OPEN` → prueba si el servicio se recuperó

---

## Persistencia y Single Source of Truth

**Regla:** un microservicio accede a exactamente UNA base de datos. Nunca accede a las tablas de otro servicio, aunque compartan la misma instancia física de PostgreSQL.

```
PostgreSQL (instancia única en Docker)
├── schema: auth        ← SOLO auth-service tiene credenciales de acceso
│   ├── users
│   ├── profiles
│   └── oauth_connections
└── schema: txn         ← SOLO transaction-service tiene credenciales de acceso
    ├── transactions
    └── receipts

MongoDB (instancia única en Docker)  ← SOLO ai-service tiene credenciales de acceso
├── chat_sessions
├── chat_messages
└── analytics_cache
```

**Nota técnica:** Los schemas de PostgreSQL se separan por credenciales a nivel de `application.properties` de cada servicio. El schema `auth` tiene un usuario de DB `auth_user` y el schema `txn` tiene un usuario `txn_user`. Esto hace imposible el acceso cruzado incluso si hay un error de programación.

---

## Mensajería Asíncrona (RabbitMQ)

**Exchange principal:** `budgetbuddy.events` (tipo: `topic`)

| Routing Key | Productor | Consumidor | Propósito |
|-------------|-----------|-----------|-----------|
| `user.registered` | auth-service | (notification-service futuro) | Email de bienvenida |
| `user.deleted` | auth-service | transaction-service | Limpiar transacciones del usuario |
| `transaction.created` | transaction-service | ai-service | Invalidar cache de analytics |
| `budget.threshold.exceeded` | transaction-service | (notification-service futuro) | Alerta de presupuesto al 90% |

**Regla general:**
- Usar **REST síncrono** cuando el cliente necesita una respuesta inmediata
- Usar **mensajería async** cuando es un efecto secundario que no bloquea el flujo principal

---

## Roles y Funcionalidades

| Rol | Acciones permitidas |
|-----|---------------------|
| **Usuario Anónimo** | Ver landing page, acceder al flujo de autenticación |
| **Usuario Autenticado** | CRUD de transacciones, chat AI, analytics, exportar, configurar perfil |

**Seguridad:**
- El JWT se emite en auth-service y contiene: `{ userId, email, profileMode, aiProvider }`
- El api-gateway valida el JWT en cada request antes de enrutar
- Cada servicio puede leer el JWT para extraer `userId` sin llamar a auth-service

---

## Decisiones Arquitectónicas (ADR — Architecture Decision Records)

### ADR-001: Resilience4J sobre Kubernetes, CQRS y Serverless
**Decisión:** Implementar Resilience4J como feature extra obligatoria.
**Justificación:** Es nativo de Spring Cloud, aplica directamente a la comunicación entre servicios,
expone métricas en Prometheus/Grafana (refuerza el requisito de telemetría), y es el patrón de
resiliencia estándar en la industria para microservicios Spring Boot.

### ADR-002: MongoDB para ai-service
**Decisión:** El historial de chat y el cache de analytics se almacenan en MongoDB.
**Justificación:** Los mensajes de chat tienen estructura de documento anidado variable (texto, imágenes,
metadatos de transacción). El cache de analytics se regenera con frecuencia. Ambos patrones son
idóneos para un modelo de documento NoSQL.

### ADR-003: Schemas separados en una sola instancia PostgreSQL
**Decisión:** auth-service y transaction-service comparten la misma instancia de PostgreSQL pero
usan schemas distintos con usuarios de base de datos distintos.
**Justificación:** Reduce la complejidad operacional para el TP manteniendo el principio de
Single Source of Truth. En producción real se usarían instancias separadas.

### ADR-004: RabbitMQ sobre Kafka
**Decisión:** Usar RabbitMQ para la mensajería asíncrona.
**Justificación:** El volumen de mensajes es bajo (eventos de usuario/transacción). RabbitMQ es más
simple de configurar y operar. Kafka añade complejidad innecesaria (Zookeeper/KRaft, partitions,
consumer groups) para este caso de uso.

---

## Fases de Implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Análisis de dominio y separación de servicios | ✅ Completa |
| **Fase 2** | Infraestructura base (Eureka, Gateway, Docker network) | 🔄 Pendiente |
| **Fase 3** | Migración de lógica y persistencia | 🔄 Pendiente |
| **Fase 4** | Comunicación asíncrona y observabilidad | 🔄 Pendiente |

---

## Mockup de Pantallas Principales

Ver: `docs/MOCKUPS.md`

## Documentación de Servicios

- `microservices/auth-service/README.md`
- `microservices/transaction-service/README.md`
- `microservices/ai-service/README.md`
- `microservices/api-gateway/README.md`
- `microservices/eureka-server/README.md`
