# Docker de Hacha y Tiza

Tres servicios: Next.js (`web`), NestJS (`api`) y PostgreSQL/PostGIS (`db`). Ejecutar los comandos desde la raíz con Docker Compose moderno y el motor Linux iniciado. No hay proxy ni terminación TLS en este stack.

## Entorno

Copiar `.env.example` a `.env` y completar `POSTGRES_PASSWORD`, `JWT_SECRET`, `CSRF_SECRET` y `DOCKER_DATABASE_URL`. Generar secretos diferentes de al menos 32 caracteres; no versionarlos. La URL de contenedor debe ser `postgresql://hyt:<password-codificada>@db:5432/hyt?schema=public`, coincidente con `POSTGRES_USER`/`POSTGRES_DB`. `DATABASE_URL` se conserva para procesos ejecutados directamente en el host y utiliza localhost y `POSTGRES_PORT`.

La API recibe sólo variables explícitas: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `RESEND_API_KEY`, `EMAIL_FROM`. Compose base fuerza `NODE_ENV=production`: requiere orígenes HTTPS exactos y email configurado según el contrato actual. No iniciar la base como producción con los ejemplos HTTP locales. El despliegue remoto necesita HTTPS externo previamente configurado; este trabajo no lo proporciona.

`NEXT_PUBLIC_API_URL` (incluye `/api/v1`) y `NEXT_PUBLIC_SESSION_WARNING_SECONDS` son argumentos públicos de build, incorporados al JavaScript del navegador. Cambiarlos requiere reconstruir web. No son secretos; no usar hostname `api` en la URL que consume el navegador. El runtime web recibe únicamente `NODE_ENV=production`, `HOSTNAME=0.0.0.0` y `PORT=3000`.

Para localhost usar `docker-compose.dev.yml`: ejecuta la misma API compilada con `NODE_ENV=development`, permitiendo los orígenes HTTP ya soportados. Next.js continúa en producción. No cambia cookies Secure/HttpOnly, CSRF ni CORS. Acceder desde `http://localhost:3000`, conservando `FRONTEND_URL=http://localhost:3000`, `CORS_ORIGINS=http://localhost:3000` y `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`. El override publica DB sólo en loopback para Prisma Studio y herramientas del host y establece `db_network.internal=false` para permitir ese forwarding; omitirlo fuera del desarrollo. No añade hot reload ni bind mounts.

## Build y primer inicio local

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait db
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --no-deps api node prisma/seed.js
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait
```

El seed de catálogo es una operación explícita. Para partidos ficticios locales, ejecutar el mismo comando seed con `--development`; nunca usarlo contra producción. Ni startup ni restart ejecutan migraciones o seeds. Revisar migraciones y disponer de respaldo antes de aplicarlas sobre datos importantes. El CLI Prisma existente se incluye como dependencia operacional de la imagen API, junto con schema/migraciones y seed compilado; no se incluye el compilador TypeScript ni Nest CLI en runtime.

Para base production-like utilizar los mismos comandos sin `-f docker-compose.dev.yml` y con la configuración de producción válida. El frontend escucha internamente en 3000 y la API en 3001; los puertos del host se ajustan con `WEB_PORT`/`API_PORT`. `DOCKER_BIND_ADDRESS` es loopback por defecto. Una publicación remota requiere establecer explícitamente la interfaz apropiada y configurar URLs públicas, HTTPS externo y orígenes exactos.

## Operación

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail 100
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --wait
```

`stop` termina los procesos; `down` además elimina contenedores/redes. Ambos conservan el volumen `hyt-postgres` (prefijado por el proyecto Compose). No usar `down -v` si se desean conservar datos. Cambiar password en `.env` no altera usuarios de un volumen existente. Los logs van a stdout/stderr y Docker rota `json-file` con 10 MB y tres archivos por servicio, configurable mediante `DOCKER_LOG_MAX_SIZE`/`DOCKER_LOG_MAX_FILE`. Evitar imprimir `docker compose config` completo o inspecciones del entorno: contienen secretos runtime.

## Redes, salud y recursos

Web sólo pertenece a `app_network`; API pertenece a `app_network` y `db_network`; DB sólo a `db_network`, interna en la base. El override local habilita forwarding del puerto loopback mediante `internal=false`; web sigue fuera de esa red. El navegador llama directamente a la API pública, como antes; no se agregó proxy. DB base no tiene `ports`.

Startup espera `pg_isready`, luego `/health` de API y finalmente HTTP `/` de web. `/health` mantiene su contrato de disponibilidad básica, no certifica migraciones ni acceso a datos. Compose espera la salud de DB antes de iniciar API; Prisma puede conectar al realizar la primera consulta. Comprobar además operaciones reales y aplicar migraciones manualmente antes del primer uso.

Los tres servicios usan init y 30 segundos de gracia. API habilita hooks Nest para desconectar Prisma al recibir SIGTERM; Next standalone recibe señales directamente. PostgreSQL conserva el stop signal de la imagen oficial. Restart `on-failure:5` limita reintentos para no ocultar indefinidamente errores de configuración; después de corregirlos, iniciar explícitamente. No reinicia automáticamente por healthcheck fallido.

Web/API ejecutan como `node` (UID/GID 1000), sin capabilities y con `no-new-privileges`. DB conserva su entrypoint oficial para inicializar ownership y bajar a postgres. No se impone `read_only`: Next puede escribir caches y Prisma CLI necesita directorios temporales; no se habilita sin validar esas rutas.

Valores iniciales configurables para desarrollo/pruebas: web/API 1 GiB y 1 CPU cada uno, DB 1 GiB y 2 CPU. PIDs: 512 web/API y 256 DB, incluyendo threads. Son márgenes iniciales, no capacidades productivas demostradas; ajustar con consumo observado antes del go-live. Variables: `WEB_MEMORY_LIMIT`, `API_MEMORY_LIMIT`, `DB_MEMORY_LIMIT`, `WEB_CPU_LIMIT`, `API_CPU_LIMIT`, `DB_CPU_LIMIT`, `WEB_PIDS_LIMIT`, `API_PIDS_LIMIT`, `DB_PIDS_LIMIT`. Los límites se aplican al runtime, no al proceso de build.

## Imágenes y contexto

Dockerfiles usan contexto raíz, manifests de ambos workspaces, lockfile único y pnpm 10.33.2 con instalación frozen. Node 22.23.3 Bookworm slim cumple engines y fija patch; DB conserva `postgis/postgis:16-3.5` del proyecto para las migraciones PostGIS. Actualizar pins deliberadamente con pruebas; no usan latest. Next standalone conserva su estructura monorepo y copia public/static. La API conserva únicamente build y dependencias productivas, datos necesarios y tooling operacional Prisma.

`.dockerignore` excluye entornos reales, dependencias locales, builds, resultados, caches y directorios de credenciales; `.env.example` sólo contiene placeholders. No pasar secretos como build args ni copiarlos al contexto. Las variables runtime son visibles a operadores con acceso Docker: restringir ese acceso.

Referencias: [Compose services](https://docs.docker.com/reference/compose-file/services/) y [Node official image pins](https://github.com/docker-library/official-images/blob/master/library/node).
