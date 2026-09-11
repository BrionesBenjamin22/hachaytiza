# FND-03 — Configuración base del frontend

## Objetivo

Preparar Next.js para implementar posteriormente los flujos funcionales.

## Dependencias

- `FND-01`.

Puede ejecutarse en paralelo con `FND-02` y `FND-04`.

## Tareas

- configurar Tailwind;
- definir estructura inicial:

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
└── types/
```

- configurar TanStack Query;
- preparar cliente HTTP base;
- configurar manejo global básico de errores;
- preparar soporte de:
  - light;
  - dark;
  - system;
- establecer diseño mobile-first;
- utilizar las skills de frontend indicadas en `AGENTS.md` cuando corresponda.

No implementar todavía pantallas funcionales completas.

## Tests mínimos

- render base;
- selector/persistencia de tema, si se implementa en esta tarea.

## Criterios de aceptación

- aplicación carga correctamente;
- theme puede seleccionarse entre light/dark/system;
- configuración persiste en cliente;
- cliente HTTP puede consumir una URL configurable del backend;
- build de Next.js pasa.
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
