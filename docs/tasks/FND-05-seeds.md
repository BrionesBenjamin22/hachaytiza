# FND-05 — Seeds de desarrollo

## Objetivo

Disponer de datos reproducibles para desarrollo y pruebas manuales posteriores.

## Dependencias

- `FND-04`.

## Tareas

- integrar seed inicial de ubicaciones de La Plata;
- hacer el seed idempotente;
- preparar estructura para futuros:
  - usuarios ficticios;
  - partidos ficticios;
- separar claramente datos de desarrollo de datos iniciales necesarios en producción.

No cargar datos ficticios automáticamente en producción.

## Tests mínimos

- ejecutar seed sobre base vacía;
- ejecutar seed una segunda vez y verificar que no genere duplicados.

## Criterios de aceptación

- seed puede ejecutarse más de una vez sin generar duplicados;
- ubicaciones quedan disponibles correctamente;
- proceso está documentado.
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
