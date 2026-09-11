---
id: FND-02
title: Configuración base del backend
status: finished
phase: foundation
depends_on:
  - FND-01
created_at: 2026-09-11T04:24:37-03:00
updated_at: 2026-09-11T15:59:33-03:00
started_at: 2026-09-11T15:38:34-03:00
resolved_at: 2026-09-11T15:59:33-03:00
resolution_commit: 0b1ddce6f795ce7618bf3b651d6f3d06971e31d5
---

# FND-02 — Configuración base del backend

## Objetivo

Preparar NestJS para recibir los módulos funcionales posteriores.

## Dependencias

- `FND-01`.

## Tareas

- configurar variables de entorno;
- habilitar validación global de DTOs;
- configurar prefijo `/api/v1`;
- crear manejo base de errores;
- implementar `requestId`;
- crear endpoint público `GET /health` fuera del prefijo de API;
- preparar logging estructurado;
- configurar Swagger/OpenAPI;
- habilitar la configuración base de seguridad indicada en `SECURITY.md`.

No implementar autenticación todavía.

## Tests mínimos

- health endpoint;
- formato base de respuesta/error;
- generación o propagación de `requestId`.

## Criterios de aceptación

- `/health` responde correctamente;
- cada request posee `requestId`;
- errores mantienen estructura consistente;
- Swagger puede generarse;
- configuración inválida de entorno falla de forma explícita;
- backend compila y tests pasan.

---

## Reglas de ejecución

Antes de modificar código:

1. leer `AGENTS.md`;
2. leer `docs/agent/TECHNICAL.md`;
3. leer `docs/agent/SECURITY.md`;
4. revisar la implementación existente;
5. verificar que las dependencias de esta tarea estén cumplidas.

No introducir reglas de negocio, entidades, servicios externos o patrones arquitectónicos no definidos sin aprobación.

## Validación y commit

Antes de realizar un commit:

```text
implementar
→ agregar/actualizar tests
→ lint
→ typecheck
→ tests
→ build cuando corresponda
→ revisar git status
→ revisar git diff
→ commit-work
→ commit
```

Si alguna validación falla:

```text
NO COMMIT
```

Corregir primero y volver a ejecutar las verificaciones.

Si la tarea no requiere tests nuevos, justificarlo explícitamente en el reporte final.
