# HyT API

API de Hacha y Tiza construida con NestJS, Express y TypeScript.

## Funcionalidad base

- valida la configuración antes de iniciar y falla con un mensaje explícito;
- aplica `ValidationPipe` global con transformación, whitelist y rechazo de campos desconocidos;
- publica la API bajo `/api/v1`;
- expone `GET /health` fuera del prefijo para healthchecks;
- genera o propaga un `x-request-id` seguro y lo devuelve en la respuesta;
- normaliza errores como `{ code, message, requestId }` sin detalles internos;
- registra por request únicamente `requestId`, método, path sin query string, estado y duración;
- aplica Helmet y CORS con credenciales para orígenes exactos configurados;
- publica Swagger UI en `/api/v1/docs` y OpenAPI JSON en `/api/v1/docs-json`.

La primera vertical slice agrega autenticación local, cookies seguras, CSRF, sesiones revocables, verificación y recuperación de contraseña, localidades y partidos filtrados. Ver [VERTICAL-SLICE.md](VERTICAL-SLICE.md) para configuración completa, persistencia y contratos actuales.

## Configuración

Copiar los placeholders de `../../.env.example` a un archivo `.env` local. No versionar valores reales. Además de las variables HTTP siguientes, la slice requiere `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET` y `FRONTEND_URL`; los secretos deben ser distintos y tener al menos 32 caracteres. Resend requiere `RESEND_API_KEY` y `EMAIL_FROM` para la entrega real de emails; ambas son obligatorias en producción.

| Variable | Contrato |
| --- | --- |
| `NODE_ENV` | Obligatoria. `development` o `production`. |
| `PORT` | Obligatoria. Entero entre `1` y `65535`. |
| `CORS_ORIGINS` | Obligatoria. Lista de origins HTTP(S) exactos separada por comas; no acepta `*`, paths ni credenciales embebidas. |

Configuración HTTP local (completar también las variables de persistencia y sesión anteriores):

```dotenv
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000
```

En producción, `CORS_ORIGINS` debe contener exclusivamente el origen controlado del frontend Hacha y Tiza. CORS usa `credentials: true` y nunca combina credenciales con un comodín.

## Contratos HTTP

### `GET /health`

Respuesta `200`:

```json
{
  "status": "ok"
}
```

El endpoint no consulta servicios externos y no expone configuración ni secretos.

### Errores

```json
{
  "code": "NOT_FOUND",
  "message": "No encontramos el recurso solicitado.",
  "requestId": "req_..."
}
```

`code` es estable para consumo del frontend. Los errores inesperados usan `INTERNAL_SERVER_ERROR` y un mensaje genérico.

## Estructura

- `src/config/`: contrato y validación del entorno.
- `src/common/http/`: request ID, logging y filtro de errores.
- `src/health/`: endpoint y DTO de health.
- `src/configure-app.ts`: configuración HTTP compartida por runtime y tests E2E.
- `test/`: pruebas HTTP de los contratos base.

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
