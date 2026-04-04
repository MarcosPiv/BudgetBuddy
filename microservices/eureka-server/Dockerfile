# ============================================================
# Dockerfile — eureka-server
# Build context: ./microservices  (desde el docker-compose.yml)
# Esto permite acceder al parent pom.xml en la raíz de microservices/
# ============================================================

# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /workspace

# Copiar parent POM (disponible porque el context es ./microservices)
COPY pom.xml ./pom.xml

# Copiar POM del módulo para aprovechar el cache de capas de Docker:
# si solo cambia el código fuente, Maven no re-descarga dependencias
COPY eureka-server/pom.xml ./eureka-server/pom.xml
RUN mvn -pl eureka-server dependency:go-offline -q

# Copiar fuentes y compilar
COPY eureka-server/src ./eureka-server/src
RUN mvn -pl eureka-server clean package -DskipTests -q

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copiar el JAR generado
COPY --from=builder /workspace/eureka-server/target/*.jar app.jar

EXPOSE 8761

# La JVM usa por defecto toda la RAM del contenedor; -XX:MaxRAMPercentage lo limita
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
