# FND-01 — Inicializar estructura del proyecto

## Objetivo

Crear la estructura base para frontend y backend utilizando `pnpm`.

## Dependencias

Ninguna.

## Tareas

- configurar workspace;
- inicializar frontend con Next.js + TypeScript;
- inicializar backend con NestJS + TypeScript;
- configurar scripts raíz;
- crear `.gitignore`;
- crear `.env.example`;
- verificar que no se versionen secretos;
- definir versiones compatibles de Node.js y pnpm.

## Estructura esperada

```text
/
├── apps/
│   ├── web/
│   └── api/
├── docs/
│   ├── agent/
│   └── tasks/
├── .codex/
│   └── agents/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

No agregar paquetes o abstracciones que no sean necesarias para completar esta tarea.

## Criterios de aceptación

- `pnpm install` funciona desde la raíz;
- frontend inicia correctamente;
- backend inicia correctamente;
- ambos proyectos compilan;
- no existen secretos versionados.
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
