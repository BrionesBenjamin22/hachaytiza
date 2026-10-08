# HyT Web

Aplicación web de Hacha y Tiza, creada con Next.js, React y TypeScript.

## Estructura actual

- `src/app/`: landing, Home, cuenta y rutas de autenticación del App Router.
- `src/features/`: autenticación, perfil, apariencia, localidades y descubrimiento de partidos.
- `src/lib/http.ts`: cliente HTTP con credenciales y CSRF.
- `src/components/`: estructura visual de la aplicación.
- `public/`: recursos estáticos servidos por Next.js.
- `next.config.ts`: configuración del framework.

La segunda iteración incorpora búsqueda accesible de localidades, gestión de cuenta y temas claro, oscuro y sistema, sobre la sesión existente. Ver [FRONTEND.md](FRONTEND.md) para vistas, contratos, permisos y validaciones.

## Comandos

Ejecutar desde la raíz del repositorio:

```bash
pnpm dev:web
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

El servidor de desarrollo usa `http://localhost:3000` por defecto. `NEXT_PUBLIC_API_URL` configura la API, incluyendo `/api/v1`. Las variables de Next.js se definen en `apps/web/.env.local`; no contiene secretos de backend.

## Docker

El contexto de build es la raíz del monorepo, no `apps/web`. La imagen multi-stage usa Node 22.23.3 y pnpm 10.33.2; instala con el lockfile y copia únicamente el output `standalone`, `public` y `.next/static` al runtime. El servidor se ejecuta como usuario `node` (UID/GID 1000), escucha en `0.0.0.0:3000` y responde al healthcheck HTTP sobre `/`. Next.js conserva su manejo de SIGTERM; Compose proporciona init y 30 segundos para finalizar.

Desde la raíz:

```bash
docker compose build web
docker compose up -d
```

El navegador sigue consumiendo la API directamente. `NEXT_PUBLIC_API_URL` debe ser una URL accesible desde el navegador, incluir `/api/v1` y coincidir con el backend publicado (localmente `http://localhost:3001/api/v1`). Nunca utilizar `http://api:3001` como URL del navegador: ese nombre pertenece a la red Docker.

`NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_SESSION_WARNING_SECONDS` son argumentos de build públicos que Next.js incorpora en JavaScript. Modificarlos requiere reconstruir la imagen; cambiarlos sólo en runtime no actualiza el bundle. No suministrar JWT, CSRF, credenciales de base de datos ni claves de email al build web. El runtime sólo necesita `NODE_ENV=production`, `HOSTNAME=0.0.0.0` y `PORT=3000`, configurados en la imagen.

No se modifica el cliente HTTP: conserva cookies mediante `credentials: "include"` y obtiene un token CSRF por mutación. Las URLs públicas de frontend y API requieren CORS explícito en backend. El filesystem permanece escribible para permitir caches de Next.js; no se habilita `read_only` sin validar sus necesidades de escritura.

Consultar [Docker](../../docs/DOCKER.md) para migraciones controladas, configuración, logs, persistencia y parada del stack.
