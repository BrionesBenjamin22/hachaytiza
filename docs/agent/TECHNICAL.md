# TECHNICAL.md — Hacha y Tiza

## 1. Objetivo

Este documento define las decisiones técnicas estables del proyecto.

No contiene reglas detalladas de seguridad. Para autenticación, cookies, CSRF, autorización, secretos y privacidad consultar `SECURITY.md`.

Las reglas funcionales se encuentran en `PRODUCT.md`.

---

## 2. Arquitectura

Arquitectura inicial:

```text
Browser
   ↓
Next.js
   ↓ REST
NestJS
   ↓
PostgreSQL + PostGIS
```

Despliegue:

```text
Frontend → Vercel
Backend  → Render
Database → PostgreSQL administrado
```

El backend es un monolito modular.

No utilizar microservicios para el MVP.

---

## 3. Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod

### Backend

- NestJS
- TypeScript
- Express
- Prisma

### Persistencia

- PostgreSQL
- PostGIS

### Email

- Resend

### Testing

Frontend:

- Vitest
- React Testing Library
- Playwright para E2E

Backend:

- tests unitarios;
- tests de integración;
- Supertest para API cuando corresponda.

### Package manager

```text
pnpm
```

---

## 4. Principios técnicos

Priorizar:

- simplicidad;
- código explícito;
- módulos por dominio;
- contratos claros;
- transacciones donde exista concurrencia;
- tests de reglas críticas.

Evitar abstracciones que todavía no tengan necesidad real.

No introducir sin aprobación:

- Redis;
- Kafka;
- RabbitMQ;
- colas externas;
- WebSockets;
- GraphQL;
- Kubernetes;
- microservicios;
- otra base de datos;
- event sourcing;
- CQRS completo.

---

## 5. Backend

Raíz del proyecto backend: `apps/api/`.

Estructura objetivo aproximada:

```text
src/
├── auth/
├── users/
├── locations/
├── matches/
├── reservations/
├── waitlist/
├── participations/
├── notifications/
├── email/
└── common/
```

Cada módulo puede contener únicamente las capas que necesite.

Flujo preferido:

```text
Controller
   ↓
Service
   ↓
Repository / Prisma
   ↓
Database
```

No crear capas vacías sólo para cumplir una arquitectura teórica.

---

## 6. Frontend

Raíz del proyecto frontend: `apps/web/`.

Estructura aproximada:

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
└── types/
```

Features iniciales:

```text
auth
locations
matches
reservations
waitlist
my-matches
notifications
profile
```

La interfaz debe ser mobile-first.

No es PWA durante el MVP.

---

## 7. API

API REST.

Prefijo:

```text
/api/v1
```

JSON como formato principal.

Contratos documentados con OpenAPI/Swagger generado desde NestJS.

Los endpoints deben utilizar DTOs explícitos.

---

## 8. Errores

Formato general:

```json
{
  "code": "MATCH_FULL",
  "message": "No quedan lugares disponibles.",
  "requestId": "req_123"
}
```

`code` debe ser estable y utilizable por frontend.

`message` debe ser legible.

No exponer stack traces ni información interna en producción.

---

## 9. Request ID

Cada request debe poseer un identificador.

Debe:

- generarse o propagarse;
- aparecer en logs;
- incluirse en errores relevantes.

Objetivo:

```text
frontend error
→ requestId
→ backend log
```

---

## 10. Health check

El backend debe exponer:

```text
GET /health
```

Debe servir para verificar disponibilidad básica de la aplicación.

No debe exponer secretos ni información sensible.

---

## 11. Persistencia

Prisma es el ORM principal.

Las migraciones deben formar parte del repositorio.

PostGIS queda habilitado desde el inicio para permitir evolución geoespacial futura.

No utilizar funcionalidades geoespaciales complejas durante MVP salvo necesidad explícita.

Si Prisma no soporta correctamente una operación PostGIS futura, puede utilizarse SQL parametrizado encapsulado en repositorios.

---

## 12. IDs

Utilizar identificadores no secuenciales para entidades expuestas públicamente.

Preferencia:

```text
UUID
```

No depender del ID como mecanismo de autorización.

---

## 13. Fecha y hora

Persistir timestamps de forma consistente.

La lógica de:

```text
mismo día
inicio del partido
historial
ventana de 24 horas
```

debe respetar la fecha/hora local relevante del partido.

No implementar la regla diaria comparando ingenuamente fechas UTC.

La timezone inicial del producto debe definirse explícitamente para el mercado de La Plata.

---

## 14. Concurrencia

Operaciones críticas deben ejecutarse transaccionalmente.

Especialmente:

```text
crear reserva
cancelar reserva
liberar lugares
aceptar oferta de waitlist
invalidar otras ofertas
```

Nunca implementar:

```text
leer disponibilidad
→ decidir en memoria
→ actualizar después sin protección
```

si puede producir sobre-reserva.

---

## 15. Idempotencia

Las operaciones sensibles susceptibles de repetición accidental deben ser idempotentes cuando corresponda.

Prioridad inicial:

```text
crear reserva
aceptar oferta de waitlist
```

El contrato debe impedir duplicaciones por doble click, retry o problemas de red.

---

## 16. Estados

Los estados de dominio deben representarse explícitamente.

No inferir estados diferentes en frontend y backend.

Ejemplos:

```text
Match:
OPEN
CLOSED
CANCELLED
```

Los estados de reserva, waitlist y oferta deben definirse en el dominio antes de implementar nuevos flujos.

No agregar nuevos estados sin actualizar `PRODUCT.md` cuando afecten comportamiento funcional.

---

## 17. Listados

El home utiliza carga progresiva.

La API debe soportar paginación estable.

No devolver datasets completos sin límite.

Los filtros principales son:

```text
location
date
footballType
```

El orden por defecto debe ser fecha/hora ascendente.

---

## 18. Emails

Toda comunicación por email debe pasar por un servicio interno.

Ejemplo conceptual:

```text
Domain Service
   ↓
EmailService
   ↓
Resend
```

El dominio no debe depender directamente del SDK del proveedor.

Esto debe permitir mockear email durante pruebas.

---

## 19. Notificaciones

Las notificaciones in-app deben almacenarse cuando el usuario necesite consultarlas posteriormente.

No usar WebSockets en el MVP.

Los cambios pueden reflejarse mediante navegación, refetch o estrategias simples del cliente.

No introducir tiempo real complejo sin necesidad demostrada.

---

## 20. Testing

Toda modificación de comportamiento requiere tests.

### Unitarios

Para:

- reglas de negocio;
- validadores;
- selección de waitlist;
- transformaciones.

### Integración

Utilizar PostgreSQL real para funcionalidades dependientes de persistencia.

Prioridad:

- reservas;
- concurrencia;
- participación diaria;
- lista de espera;
- transacciones.

### E2E

Playwright debe cubrir al menos los flujos críticos antes de Beta:

```text
registro/login
crear partido
encontrar partido
reservar
cancelar reserva
lista de espera
aceptar oferta
cancelar partido
mis partidos
```

---

## 21. Regla de commit

Un cambio no se considera listo para commit hasta ejecutar las verificaciones correspondientes.

Mínimo:

```text
lint
typecheck
tests
```

Cuando aplique:

```text
integration tests
build
```

Después:

```text
git status
git diff
```

El agente debe utilizar `commit-work` para realizar commits.

Si cualquier validación falla:

```text
NO COMMIT
```

Primero corregir y volver a verificar.

---

## 22. Git

Ramas:

```text
main
dev
feature/*
```

Flujo:

```text
feature/*
   ↓ PR
dev
   ↓ validación
PR
   ↓
main
   ↓
producción
```

`main` representa producción estable.

No desarrollar directamente sobre `main`.

El repositorio parte temporalmente de `master`. Su migración al flujo anterior pertenece a `FND-08`; no renombrar ramas o modificar el remoto antes de esa tarea.

Los PR deben tener CI exitoso antes de merge.

---

## 23. CI

GitHub Actions debe ejecutar como mínimo:

```text
pnpm install
lint
typecheck
tests
build
```

El merge debe bloquearse si falla una verificación requerida.

---

## 24. Entornos

Sólo se mantienen inicialmente:

```text
development
production
```

No crear staging hasta que exista una necesidad real.

Vercel Preview Deployments pueden utilizarse para revisar cambios frontend antes de producción.

---

## 25. Migraciones

Desarrollo:

- crear migraciones mediante Prisma;
- versionarlas en Git;
- probarlas localmente.

Producción:

- NO ejecutarlas automáticamente en cada deploy;
- aplicarlas como paso controlado;
- revisar previamente los cambios;
- disponer de estrategia de recuperación cuando sea relevante.

---

## 26. Seeds

Development puede incluir:

- ubicaciones;
- usuarios ficticios;
- partidos ficticios.

Producción sólo debe cargar datos realmente necesarios.

El seed inicial incluye ubicaciones del Partido de La Plata.

Los seeds deben poder ejecutarse de forma predecible y no destruir datos existentes.

---

## 27. Observabilidad mínima

MVP:

- logs estructurados;
- requestId;
- `/health`;
- error tracking.

No desplegar inicialmente stacks complejos de observabilidad como Prometheus/Grafana/Loki/Tempo salvo decisión posterior.

Los logs no deben contener información sensible.

Consultar `SECURITY.md`.

---

## 28. Deploy

### Frontend

Vercel.

### Backend

Render.

### Database

PostgreSQL administrado.

El deploy de aplicación puede integrarse con Git.

Las migraciones de producción permanecen como paso controlado independiente.

---

## 29. Definition of Done

Una tarea puede marcarse terminada cuando:

- cumple sus criterios de aceptación;
- respeta `PRODUCT.md`;
- respeta `SECURITY.md`;
- respeta este documento;
- incluye tests apropiados;
- lint pasa;
- typecheck pasa;
- tests pasan;
- build pasa cuando corresponde;
- no contiene cambios fuera del alcance;
- documentación fue actualizada si cambió un contrato;
- el diff fue revisado;
- el commit se realizó siguiendo el flujo definido.

Si una tarea no necesita tests nuevos, el agente debe justificarlo explícitamente.

---

## 30. Regla para agentes

Ante cualquier ambigüedad:

```text
NO INVENTAR ARQUITECTURA
NO INVENTAR REGLAS DE NEGOCIO
NO DEGRADAR SEGURIDAD
```

Consultar:

```text
regla funcional → PRODUCT.md
decisión técnica → TECHNICAL.md
seguridad → SECURITY.md
```

Si los documentos no resuelven la decisión, informar el bloqueo antes de introducir comportamiento nuevo.
