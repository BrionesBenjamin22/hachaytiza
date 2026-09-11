# FND-09 — Smoke test de Foundation

## Objetivo

Validar que la base completa funciona antes de comenzar Auth.

## Dependencias

- `FND-01`;
- `FND-02`;
- `FND-03`;
- `FND-04`;
- `FND-05`;
- `FND-06`;
- `FND-07`;
- `FND-08`.

## Flujo mínimo

Desde un entorno limpio:

1. instalar dependencias;
2. levantar PostgreSQL/PostGIS;
3. ejecutar migraciones;
4. ejecutar seed;
5. iniciar backend;
6. iniciar frontend;
7. consumir `/health`;
8. ejecutar:
   - lint;
   - typecheck;
   - tests;
   - build.

## Criterios de aceptación

Todos los pasos finalizan correctamente sin modificaciones manuales no documentadas.

La fase Foundation puede considerarse terminada únicamente si este smoke test pasa completo.
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
