# Gestión de tareas

Las tareas se organizan por estado. La metadata es la fuente de verdad y la carpeta debe reflejarla:

| Carpeta | `status` | Uso |
| --- | --- | --- |
| `pending/` | `pending` | Tarea todavía no iniciada. |
| `in-progress/` | `in-progress` | Tarea actualmente en ejecución. |
| `finished/` | `finished` | Tarea resuelta y validada. |

## Metadata obligatoria

Cada tarea debe comenzar con front matter YAML usando este formato:

```yaml
---
id: FND-00
title: Título de la tarea
status: pending
phase: foundation
depends_on: []
created_at: 2026-09-11T04:24:37-03:00
updated_at: 2026-09-11T04:24:37-03:00
started_at: null
resolved_at: null
resolution_commit: null
---
```

Las fechas usan ISO 8601 con zona horaria. Los campos sin valor confirmado permanecen en `null`; no se deben estimar fechas históricas.

## Transiciones

Al iniciar una tarea:

1. cambiar `status` a `in-progress`;
2. completar `started_at` y actualizar `updated_at`;
3. mover el archivo a `in-progress/`.

Al finalizar una tarea:

1. confirmar los criterios de aceptación y las validaciones requeridas;
2. cambiar `status` a `finished`;
3. completar `resolved_at`, `resolution_commit` y `updated_at`;
4. mover el archivo a `finished/`.

`resolution_commit` identifica el commit que resolvió la tarea, no el commit posterior que actualiza esta metadata.
