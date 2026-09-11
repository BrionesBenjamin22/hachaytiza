# FND-04 — PostgreSQL y PostGIS

## Objetivo

Preparar la persistencia local del proyecto.

## Dependencias

- `FND-01`.

Puede ejecutarse en paralelo con `FND-02` y `FND-03`.

## Tareas

- configurar PostgreSQL para desarrollo;
- habilitar PostGIS;
- integrar Prisma;
- definir `DATABASE_URL`;
- crear configuración inicial del schema;
- crear primera migración;
- verificar conexión desde backend;
- documentar cómo levantar la base localmente.

No crear todavía entidades de negocio completas salvo lo mínimo requerido por la configuración.

## Tests mínimos

- conexión a base de datos;
- ejecución de migraciones sobre una base limpia.

## Criterios de aceptación

- backend conecta correctamente;
- migraciones pueden ejecutarse;
- PostGIS está habilitado;
- una instalación limpia puede reproducirse.
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
