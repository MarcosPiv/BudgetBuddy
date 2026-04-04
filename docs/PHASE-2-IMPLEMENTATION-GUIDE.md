# Guía de Implementación — Fase 2 y Fase 3

## Estado actual de la rama

Los esqueletos de los 5 microservicios están creados y son **compilables**.
Cada uno tiene:
- `pom.xml` con las dependencias correctas
- Clase `Application.java` con las anotaciones Spring correspondientes
- `application.properties` con toda la configuración externalizada via env vars
- `HealthController.java` como stub mínimo verificable
- `Dockerfile` multi-stage con build context en `./microservices`
- (auth-service y transaction-service) Migraciones Flyway V1 con el schema SQL

El frontend Next.js **no está conectado** a los microservicios todavía. Sigue usando Supabase mientras desarrollás los servicios.

---

## Paso 1 — Verificar que los esqueletos levantan

### 1.1 Compilar todo desde la raíz de microservices

```bash
cd microservices
mvn clean package -DskipTests
```

Debe terminar con `BUILD SUCCESS` para los 5 módulos.

### 1.2 Levantar solo la infraestructura

```bash
# Desde la raíz del proyecto (donde está docker-compose.yml)
docker-compose up -d postgres mongodb rabbitmq minio eureka-server
```

Esperar que todos los healthchecks pasen (30-60 segundos). Verificar:

```bash
docker-compose ps        # todos deben estar "healthy"
curl http://localhost:8761    # Eureka UI debe responder
```

### 1.3 Levantar los servicios en modo local (sin Docker)

En terminales separadas:

```bash
# Terminal 1
cd microservices/auth-service
mvn spring-boot:run

# Terminal 2
cd microservices/transaction-service
mvn spring-boot:run

# Terminal 3
cd microservices/ai-service
mvn spring-boot:run

# Terminal 4
cd microservices/api-gateway
mvn spring-boot:run
```

Verificar:
- `http://localhost:8761` → Eureka UI muestra 4 servicios registrados
- `curl http://localhost:8081/health` → `{"status":"UP","service":"auth-service"}`
- `curl http://localhost:8082/health` → `{"status":"UP","service":"transaction-service"}`
- `curl http://localhost:8083/health` → `{"status":"UP","service":"ai-service"}`
- `curl http://localhost:8080/actuator/health` → Gateway responde

### 1.4 Levantar todo con Docker

```bash
docker-compose up --build
```

---

## Paso 2 — Implementar auth-service

### 2.1 Crear entidades JPA

Crear en `src/main/java/com/budgetbuddy/auth/model/`:

**`User.java`**
- Anotaciones: `@Entity`, `@Table(schema = "auth", name = "users")`
- Campos: `id` (UUID, `@GeneratedValue`), `email`, `passwordHash`, `provider`, `providerId`, `createdAt`, `updatedAt`
- Relación: `@OneToOne(mappedBy = "user", cascade = CascadeType.ALL)` con `Profile`

**`Profile.java`**
- Anotaciones: `@Entity`, `@Table(schema = "auth", name = "profiles")`
- PK compartida con User: usar `@MapsId` + `@OneToOne`
- Campos: todos los de `auth.profiles` del SQL de migración

### 2.2 Crear repositorios

Crear en `src/main/java/com/budgetbuddy/auth/repository/`:

```java
// UserRepository.java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
    boolean existsByEmail(String email);
}
```

### 2.3 Configuración de seguridad

Crear `SecurityConfig.java` en `config/`:
- Extender `SecurityFilterChain`
- Deshabilitar CSRF (API REST stateless)
- Permitir sin autenticación: `POST /api/auth/register`, `POST /api/auth/login`
- Todo lo demás requiere JWT válido (implementar el filtro en siguiente paso)
- `PasswordEncoder` Bean → `BCryptPasswordEncoder`

### 2.4 Servicio JWT

Crear `JwtService.java` en `service/`:
- Dependencia: JJWT 0.12.x (ya en pom.xml)
- Métodos: `generateToken(User user)`, `validateToken(String token)`, `extractUserId(String token)`
- Claims incluidos: `{ "sub": userId, "email": email, "iat": ..., "exp": ... }`
- Expiración: 7 días (configurable via `application.properties`)

### 2.5 AuthService y AuthController

**`AuthService.java`** en `service/`:
- `register(RegisterRequest)` → hash con BCrypt → guardar User + Profile → publicar evento `user.registered`
- `login(LoginRequest)` → buscar por email → verificar hash → devolver JWT

**`AuthController.java`** en `controller/`:
```
POST /api/auth/register   → RegisterRequest → AuthResponse (token + user info)
POST /api/auth/login      → LoginRequest    → AuthResponse
GET  /api/auth/profile    → (requiere JWT)  → ProfileResponse
PUT  /api/auth/profile    → UpdateProfileRequest + JWT → ProfileResponse
```

### 2.6 Publicador RabbitMQ

Crear `UserEventPublisher.java` en `messaging/`:

```java
// Exchange: budgetbuddy.events (topic)
// Routing key: user.registered
// Routing key: user.deleted
rabbitTemplate.convertAndSend("budgetbuddy.events", "user.registered", event);
```

Crear `RabbitMQConfig.java` en `config/` que declare el exchange TopicExchange.

---

## Paso 3 — Implementar transaction-service

### 3.1 Entidades JPA

**`Transaction.java`** → `@Table(schema = "txn", name = "transactions")`
- `userId` es UUID sin `@ManyToOne` (FK lógica — Single Source of Truth)
- `txRate` debe ser inmutable una vez seteado (no incluir en `@DynamicUpdate` de updates)

**`Receipt.java`** → `@Table(schema = "txn", name = "receipts")`

### 3.2 Repositorio con filtros

```java
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Page<Transaction> findByUserIdOrderByDateDesc(UUID userId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.date BETWEEN :from AND :to")
    List<Transaction> findByUserIdAndDateRange(UUID userId, LocalDate from, LocalDate to);

    void deleteByUserId(UUID userId);  // Para el evento user.deleted
}
```

### 3.3 ExchangeRateService (Resilience4J)

```java
@Service
public class ExchangeRateService {

    // WebClient apuntando a https://dolarapi.com/v1/dolares
    // Aplicar Retry con 3 intentos y backoff exponencial
    // Fallback: devolver la última cotización conocida (guardar en caché local)

    @CircuitBreaker(name = "dolar-api", fallbackMethod = "getRatesFallback")
    @Retry(name = "dolar-api")
    public Mono<ExchangeRates> getRates() { ... }

    private Mono<ExchangeRates> getRatesFallback(Exception e) { ... }
}
```

Configurar Resilience4J en `application.properties`:
```properties
resilience4j.retry.instances.dolar-api.max-attempts=3
resilience4j.retry.instances.dolar-api.wait-duration=500ms
resilience4j.circuitbreaker.instances.dolar-api.sliding-window-size=5
resilience4j.circuitbreaker.instances.dolar-api.failure-rate-threshold=60
```

### 3.4 Consumidor RabbitMQ

```java
@RabbitListener(queues = "transaction.user.cleanup")
public void handleUserDeleted(UserDeletedEvent event) {
    transactionRepository.deleteByUserId(event.getUserId());
}
```

### 3.5 TransactionController

```
POST   /api/transactions              → crear (userId extraído del JWT via header)
GET    /api/transactions?page=0&size=6 → listar paginado
GET    /api/transactions?from=&to=    → filtrar por rango de fechas
PUT    /api/transactions/{id}         → actualizar (verificar que userId coincide)
DELETE /api/transactions/{id}         → eliminar
GET    /api/transactions/export/csv   → exportar CSV
GET    /api/rates                     → cotizaciones actuales de DolarAPI
```

---

## Paso 4 — Implementar ai-service

### 4.1 Documentos MongoDB

Crear en `src/main/java/com/budgetbuddy/ai/model/`:

**`ChatSession.java`** → `@Document(collection = "chat_sessions")`
```java
@Id private String id;       // ObjectId de MongoDB
private UUID userId;
private List<ChatMessage> messages;  // embebido o referenciado
private Instant createdAt;
private Instant updatedAt;
```

**`AnalyticsCache.java`** → `@Document(collection = "analytics_cache")`
```java
@Id private String id;
private UUID userId;
private String period;       // "2026-04" (año-mes)
private Object data;         // el resultado cacheado
private Instant cachedAt;
private Instant expiresAt;
```

### 4.2 AiProviderService

```java
@Service
public class AiProviderService {

    // Recibe: texto (+ imagen opcional) + proveedor + API key del usuario
    // Devuelve: lista de transacciones parseadas

    // Claude: POST https://api.anthropic.com/v1/messages
    // OpenAI: POST https://api.openai.com/v1/chat/completions
    // Gemini: POST https://generativelanguage.googleapis.com/v1/models/...

    public Mono<List<ParsedTransaction>> parse(String text, String provider, String apiKey) { ... }

    public Mono<String> chat(List<Message> history, String context, String provider, String apiKey) { ... }
}
```

### 4.3 AiController

```
POST /api/ai/parse          → { text, imageBase64?, provider, apiKey } → List<ParsedTransaction>
POST /api/ai/chat           → { userId, message, context, provider, apiKey } → { reply }
GET  /api/ai/chat/{userId}  → historial de la sesión actual
GET  /api/ai/analytics/{userId}?period=2026-04 → analytics del período
```

### 4.4 Consumidor RabbitMQ

```java
@RabbitListener(queues = "ai.analytics.invalidate")
public void handleTransactionCreated(TransactionCreatedEvent event) {
    // Eliminar el cache del mes correspondiente para ese userId
    analyticsCacheRepository.deleteByUserIdAndPeriod(event.getUserId(), event.getPeriod());
}
```

---

## Paso 5 — Configurar Queues en RabbitMQ

Definir la topología de mensajería en una clase de configuración compartida o en cada servicio.
Se recomienda crear `RabbitMQConfig.java` en cada servicio que interactúe con RabbitMQ:

```
Exchange: budgetbuddy.events  (TopicExchange)

Routing key          Queue                           Consumidor
user.registered   →  notification.welcome         →  (futuro notification-service)
user.deleted      →  transaction.user.cleanup      →  transaction-service
transaction.created→  ai.analytics.invalidate      →  ai-service
budget.exceeded   →  notification.budget.alert     →  (futuro notification-service)
```

Cada servicio declara solo las queues que consume. El exchange es compartido.

---

## Paso 6 — Completar api-gateway (Fase 3)

### 6.1 JwtValidationFilter

Crear `JwtValidationFilter.java` implementando `GatewayFilter` o `GlobalFilter`:
- Extraer el header `Authorization: Bearer <token>`
- Validar el JWT con la misma clave secreta que usa auth-service (`JWT_SECRET` env var)
- Si es válido: propagar el `userId` como header interno (`X-User-Id`) hacia el servicio destino
- Si no: devolver 401
- Rutas públicas (no validar): `/api/auth/register`, `/api/auth/login`

### 6.2 Activar Circuit Breakers en las rutas

En `application.properties`, agregar filtros a cada ruta:
```properties
spring.cloud.gateway.routes[0].filters[0]=CircuitBreaker=name=auth-service,fallbackUri=forward:/fallback/auth
```

Crear `FallbackController.java` con endpoints de fallback que devuelven 503 con mensaje claro.

---

## Paso 7 — Observabilidad

### 7.1 Verificar métricas

```bash
curl http://localhost:8081/actuator/prometheus  # auth-service
curl http://localhost:8082/actuator/prometheus  # transaction-service
curl http://localhost:8083/actuator/prometheus  # ai-service
curl http://localhost:8080/actuator/prometheus  # gateway
```

### 7.2 Levantar el stack de observabilidad

```bash
docker-compose up -d prometheus grafana loki promtail
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (admin/admin)

### 7.3 Agregar logs estructurados

Agregar a cada `pom.xml`:
```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

Crear `src/main/resources/logback-spring.xml` en cada servicio para emitir JSON con campos:
`timestamp`, `level`, `service`, `traceId`, `spanId`, `message`.

---

## Checklist de validación final

### Eureka
- [ ] `http://localhost:8761` muestra los 4 servicios como UP

### auth-service
- [ ] `POST /api/auth/register` → devuelve JWT
- [ ] `POST /api/auth/login` → devuelve JWT
- [ ] `GET /api/auth/profile` con token → devuelve datos del perfil
- [ ] Al registrar un usuario → mensaje en RabbitMQ

### transaction-service
- [ ] `GET /api/transactions` con token → lista vacía (usuario nuevo)
- [ ] `POST /api/transactions` con token → crea y devuelve la transacción
- [ ] `GET /api/rates` → cotizaciones de DolarAPI
- [ ] Al borrar usuario → transacciones eliminadas via RabbitMQ

### ai-service
- [ ] `POST /api/ai/parse` con texto → devuelve transacción parseada
- [ ] `POST /api/ai/chat` → respuesta del asistente con contexto financiero

### api-gateway
- [ ] Request sin token a ruta protegida → 401
- [ ] Request con token inválido → 401
- [ ] Request con token válido → proxea al servicio correcto
- [ ] Al bajar auth-service → Gateway devuelve 503 (Circuit Breaker abierto)

### Observabilidad
- [ ] Grafana muestra métricas de los 4 servicios
- [ ] Un mismo `traceId` aparece en logs de Gateway y del servicio destino
- [ ] Estado del Circuit Breaker visible en Grafana
