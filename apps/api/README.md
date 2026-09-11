# HyT API

API de Hacha y Tiza, creada con NestJS, Express y TypeScript.

## Estructura actual

- `src/main.ts`: arranque de la aplicación NestJS.
- `src/app.module.ts`: módulo raíz temporal del scaffold.
- `src/app.controller.ts` y `src/app.service.ts`: ejemplo mínimo generado.
- `test/`: pruebas HTTP del scaffold.

Los módulos de dominio, configuración, seguridad, logging, Swagger y `GET /health` se incorporarán desde FND-02.

## Comandos

Ejecutar desde la raíz del repositorio:

```bash
pnpm dev:api
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api build
```

El servidor usa `http://localhost:3000` por defecto. Las variables de entorno se definirán cuando se configure la API en FND-02.
