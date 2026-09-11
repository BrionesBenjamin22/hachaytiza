# Repository Guidelines

## Propósito y fuentes de verdad

Hacha y Tiza (HyT) conecta organizadores que necesitan jugadores con personas que desean reservar lugares. Mantener el MVP simple: no agregar reglas, estados, entidades o infraestructura sin justificación.

Antes de implementar, leer sólo lo necesario:

- `README.md`: visión del producto.
- `docs/agent/PRODUCT.md`: alcance, actores y reglas funcionales.
- `docs/agent/TECHNICAL.md`: arquitectura, stack, testing y despliegue.
- `docs/agent/SECURITY.md`: autenticación, autorización, privacidad y secretos.
- `docs/agent/IMPLEMENTATION.md`: pautas prácticas complementarias.

Ante contradicciones, prevalecen `PRODUCT.md`, `TECHNICAL.md` y `SECURITY.md` según el área. Si no resuelven una decisión, informar la ambigüedad antes de cambiar contratos o comportamiento.

## Arquitectura y organización

El objetivo es un monolito modular: frontend Next.js en `apps/web/`, backend NestJS en `apps/api/` y PostgreSQL/PostGIS mediante Prisma. Organizar frontend por features y backend por dominio. El flujo backend preferido es `Controller -> Service -> Repository/Prisma`; no crear capas vacías. El health check público es `GET /health`; el resto de la API usa `/api/v1`.

Usar `pnpm` y un único lockfile. No introducir sin aprobación microservicios, colas externas, Redis, WebSockets, GraphQL, Kubernetes, nuevas bases de datos o dependencias relevantes.

## Agentes y skills

Las tareas viven en `docs/tasks/`. Coordinar trabajo transversal con `orchestrator`; delegar implementación a `backend` o `frontend`, validación independiente a `testing` y cambios sensibles a `security-reviewer`. Los perfiles locales opcionales se registran en `.codex/config.toml` y `.codex/agents/`; no se versionan.

Usar `frontend-design` para diseño visual, `vercel-react-best-practices` al escribir o revisar React/Next.js y `commit-work` sólo cuando se solicite preparar o crear un commit.

## Reglas críticas

- Nunca sobre-reservar lugares.
- Un usuario no puede tener dos participaciones confirmadas en la misma fecha local.
- Crear `Participation(ORGANIZER)` al publicar y `Participation(PLAYER)` al reservar.
- Crear, cancelar y liberar reservas; aceptar ofertas; e invalidar ofertas relacionadas deben ser operaciones atómicas.
- El organizador no puede reservar su propio partido.
- No confiar en el frontend para reglas de negocio o autorización.

## Seguridad

Tratar toda entrada como no confiable. Validar autenticación, autorización y dominio en backend. Usar cookies seguras `HttpOnly`, protección CSRF en operaciones mutables, CORS restringido y consultas parametrizadas. Nunca registrar ni versionar contraseñas, hashes, tokens, cookies, claves o secretos. Toda tarea de seguridad exige leer `SECURITY.md` completo y agregar tests.

## Flujo de implementación y validación

Realizar el cambio mínimo y cohesivo, actualizar contratos/documentación y añadir tests para todo comportamiento modificado. Ejecutar, según los scripts disponibles:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Usar tests unitarios para reglas puras, PostgreSQL real para integración y Playwright para flujos críticos. Si no corresponden tests nuevos, justificarlo.

Antes de cerrar: revisar `git status` y `git diff`; confirmar criterios de aceptación, lint, typecheck, tests y build. No incluir cambios ajenos. No hacer commit si falla una verificación. Cuando se solicite un commit, usar la skill `commit-work` y mensajes como `feat(matches): agregar publicación de partidos`.

El flujo Git objetivo es `feature/* -> dev -> main`. Mientras `FND-08` no se complete, no renombrar ramas ni modificar el remoto automáticamente.
