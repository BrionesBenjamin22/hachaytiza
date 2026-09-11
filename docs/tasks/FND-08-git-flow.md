# FND-08 — Flujo Git y protección de integración

## Objetivo

Dejar preparado el flujo de trabajo definido para el proyecto.

## Dependencias

- `FND-07`.

## Estrategia

```text
feature/*
    ↓
PR
    ↓
dev
    ↓
validación
    ↓
PR
    ↓
main
    ↓
producción
```

## Tareas

- documentar flujo de ramas;
- renombrar la rama inicial `master` a `main` y actualizar el remoto de forma coordinada;
- tratar `main` como producción estable;
- utilizar `dev` como rama de integración;
- establecer PR obligatorio;
- requerir CI exitoso antes del merge cuando la configuración del repositorio lo permita.

No realizar desarrollo directo sobre `main`.

## Criterios de aceptación

- flujo queda documentado;
- agentes pueden identificar claramente rama destino;
- las reglas coinciden con `AGENTS.md`.
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
