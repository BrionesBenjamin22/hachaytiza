# FND-06 — Calidad y scripts del repositorio

## Objetivo

Unificar las verificaciones que todos los agentes deberán ejecutar.

## Dependencias

- `FND-02`;
- `FND-03`.

## Tareas

Definir desde la raíz comandos equivalentes a:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Cuando corresponda, agregar:

```text
pnpm test:integration
pnpm test:e2e
```

Configurar linting y formatting de forma consistente.

## Criterios de aceptación

- comandos funcionan desde la raíz;
- un fallo en frontend o backend hace fallar el comando correspondiente;
- no existen pasos manuales ocultos para validar el proyecto.
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
