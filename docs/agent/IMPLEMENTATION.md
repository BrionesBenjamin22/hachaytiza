# HyT    — Implementation Rules

## Stack

### Package manager

```text
pnpm
```

Mantener un único lockfile.

---

## Frontend

Raíz: `apps/web/`.

```text
Next.js
React
TypeScript
```

Dependencias principales:

```text
@tanstack/react-query
react-hook-form
zod
@hookform/resolvers
```

Responsabilidades:

```text
UI
formularios
estado remoto
validaciones UX
sesión visual
```

El frontend nunca implementa por sí solo reglas críticas de negocio.

---

## Backend

Raíz: `apps/api/`.

```text
NestJS
TypeScript
Express
```

Dependencias base:

```text
@nestjs/config
@nestjs/jwt
@nestjs/swagger
@nestjs/throttler

class-validator
class-transformer

cookie-parser
csrf-csrf
helmet

argon2
```

Para logs estructurados se podrá utilizar una integración basada en Pino.

---

## Persistencia

```text
PostgreSQL
PostGIS
Prisma
```

Prisma será utilizado para operaciones habituales.

Las operaciones PostGIS que no puedan expresarse adecuadamente mediante el ORM deberán implementarse mediante SQL parametrizado y encapsulado en repositorios.

No distribuir SQL geoespacial por services o controllers.

---

# Estructura del backend

```text
src/
├── auth/
├── users/
├── locations/
├── matches/
├── reservations/
├── participations/
├── admin/
├── common/
└── main.ts
```

Cada módulo puede utilizar:

```text
controller
service
repository
dto
domain
```

cuando sea necesario.

No crear capas vacías únicamente para cumplir una estructura.

---

# Dependencias entre módulos

Dirección general:

```text
controllers
    ↓
services
    ↓
repositories
    ↓
database
```

Controllers:

* reciben HTTP;
* validan DTO;
* delegan.

Services:

* coordinan casos de uso;
* aplican reglas.

Repositories:

* acceden a persistencia.

Evitar lógica de negocio en controllers.

---

# Frontend

Estructura conceptual:

```text
src/
├── app/
├── components/
├── features/
├── lib/
├── hooks/
└── types/
```

Organizar comportamiento por feature cuando resulte útil:

```text
features/
├── auth/
├── matches/
├── reservations/
├── profile/
└── locations/
```

---

# API

Prefijo:

```text
/api/v1
```

REST + JSON.

OpenAPI debe reflejar el contrato implementado.

No agregar endpoints sin requerimiento.

---

# Errores

Formato:

```json
{
  "code": "MATCH_FULL",
  "message": "El partido ya no tiene lugares disponibles.",
  "requestId": "..."
}
```

El frontend debe reaccionar principalmente a `code`.

---

# Request ID

Toda request recibe un `requestId`.

Debe:

```text
entrar
→ propagarse
→ incluirse en logs
→ aparecer en errores
```

---

# Logging

Usar logs estructurados.

Registrar como mínimo:

```text
requestId
method
path
status
duration
```

No registrar payload completo por defecto.

---

# Health

Implementar:

```http
GET /health
```

Debe poder utilizarse desde Render.

---

# Testing

Para cada cambio:

### Regla pura

Unit test.

### Persistencia / transacción / autorización

Integration test.

### Flujo principal

E2E sólo cuando aporte valor.

No hacer mocks de PostgreSQL para validar comportamiento transaccional.

---

# GitHub Actions

Pull Requests:

```text
install
→ lint
→ typecheck
→ test
→ build
```

El pipeline debe fallar ante cualquier paso fallido.

---

# Deploy

```text
Frontend → Vercel
Backend  → Render
Database → PostgreSQL administrado
```

No introducir infraestructura adicional sin requerimiento.

---

# Principio de implementación

Elegir siempre:

```text
solución simple
+
correcta
+
testeable
```

antes que:

```text
solución genérica
+
compleja
+
preparada para escenarios hipotéticos
```
