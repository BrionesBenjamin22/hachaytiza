# FND-07 — CI con GitHub Actions

## Objetivo

Evitar integrar código que no haya sido validado.

## Dependencias

- `FND-06`.

## Tareas

Crear pipeline para PRs hacia `dev` y `main`.

Debe ejecutar como mínimo:

```text
install
lint
typecheck
tests
build
```

Agregar integration tests cuando ya existan y sean viables dentro del pipeline.

Utilizar caché de dependencias cuando sea apropiado, sin agregar complejidad innecesaria.

## Criterios de aceptación

- CI se ejecuta automáticamente en PR;
- cualquier validación fallida bloquea el pipeline;
- frontend y backend son validados;
- workflow no utiliza secretos hardcodeados.
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
