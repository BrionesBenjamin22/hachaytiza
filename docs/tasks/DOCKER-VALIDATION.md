# Docker architecture: validación independiente

Fecha: 2026-10-07, America/Buenos_Aires. Resultado: **PASS**. No se realizó commit.

## Entorno y aislamiento

Docker Desktop 4.70.0, Engine 29.4.0 Linux/amd64 y Compose v5.1.2. Node del host 22.17.0, pnpm 10.33.2. Proyecto Compose exclusivo `hyt-docker-validation`; base `hyt_slice_test`, volumen `hyt-docker-validation_hyt-postgres`. Credenciales ficticias en archivos ignorados bajo `.runtime/`, nunca incluidas en esta evidencia ni en imágenes.

Puertos de prueba: web `127.0.0.1:3300`, API `127.0.0.1:3301`, PostgreSQL de desarrollo `127.0.0.1:55439`. Los servidores existentes de 3000/3001 y `furvo-db-1` no se detuvieron ni modificaron. El primer intento en 55433 encontró esa otra DB; se corrigió el puerto antes de aplicar migraciones o fixtures. No se ejecutaron tests contra producción ni contra la base habitual.

## Builds y regresiones

| Validación | Resultado |
| --- | --- |
| `docker build --no-cache -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3301/api/v1 -t hyt-web:local .` | PASS, instalación frozen desde la raíz y build Next completo |
| `docker build --no-cache -f apps/api/Dockerfile -t hyt-api:local .` | PASS, instalación frozen, Prisma, Nest y seed compilado |
| `docker build -f apps/api/Dockerfile -t hyt-api:local .` después de eliminar el peer TypeScript operacional | PASS, imagen definitiva; etapas de instalación/compilación previamente construidas sin cache |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test --maxWorkers=1` | PASS, API 37 y web 47: 84 casos |
| `pnpm test:integration` con `DATABASE_URL` de DB aislada | PASS, 20 casos en 4 archivos, PostgreSQL real, 51,06 s |
| Builds del host API/seed y web | PASS, informados por Backend/Frontend; intento root `pnpm build` encontró un build Next concurrente y no se consideró PASS por sí solo |
| `git diff --check` | PASS; sólo advertencias de conversión LF/CRLF |

El primer `pnpm test` concurrente produjo timeouts de arranque de workers de web, sin ejecutar sus casos. Repetir con un worker permitió verificar todos los casos, sin cambiar código ni expectativas.

Las integraciones cubren autenticación, validación, cookies, CSRF/Origin, permisos, historial privado, contraseñas, tokens de un uso, carreras de sesiones/revocación, paginación, restricciones de DB y regresiones del listado. No se agregaron reglas de dominio Docker. El test nuevo `apps/api/src/main.spec.ts` comprueba el registro de shutdown hooks.

## Navegador real y ciclo de los servicios

Se conservó el harness con email simulado para los casos de recuperación/verificación. Se parametrizaron su origen y puerto usando `E2E_WEB_URL`/`E2E_API_URL`, manteniendo sus defaults. `E2E_EXTERNAL_API=1` permite usar la API del contenedor y no inicia un servidor ni simula emails. Los guards de base aislada permanecen.

1. `pnpm test:e2e` con web Docker 3300, API real del harness 3301 y DB Docker: los 9 casos de `account-recovery.spec.ts` y `vertical-slice.spec.ts` pasaron. Los archivos que importan Playwright directamente corrieron luego de cerrar la API del harness y fallaron al cargar sesión/localidades. Se interrumpió esa corrida al identificar el problema de ciclo de servicios; no se cambiaron expectativas de UI.
2. Con los tres contenedores healthy y `E2E_EXTERNAL_API=1`: `pnpm exec playwright test tests/auth-validation.spec.ts tests/landing-carousel.spec.ts tests/vertical-slice.spec.ts`: **11/11 PASS en 24,7 s**. Incluye los 7 casos públicos anteriores y repite los 4 casos críticos contra la API containerizada.

Resultado efectivo: **16 casos únicos aprobados**, con cuatro además aprobados usando API Docker. Registro con localidad, sesión/cookies, Home filtrado, exploración temporal, logout/login, cuenta sin localidad, errores recuperables y localidad vacía funcionan contra los servicios reales. También pasaron perfil/historial/cambio de contraseña y recuperación con el harness, validaciones sin mutaciones, navegación pública, 404 y carrusel móvil.

## Migraciones y seed con imagen definitiva

Los comandos siguientes se ejecutaron con el Compose de desarrollo, `--env-file .runtime/docker-validation.env` y `-p hyt-docker-validation`:

```text
docker compose ... run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
docker compose ... run --rm --no-deps api node prisma/seed.js --development
```

PASS: conexión real a `db:5432`, migraciones sin pendientes y seed JS idempotente. Además, se ejecutó el CLI de la misma imagen con `DATABASE_URL` apuntando al schema aislado `docker_probe` de esa misma base: **las tres migraciones se aplicaron desde cero**. No se utilizó TypeScript, pnpm, Nest CLI ni tsx en runtime. Las migraciones y seeds no aparecen en CMD/startup.

## Runtime, persistencia y apagado

`up -d --wait --wait-timeout 120` aprobó los tres healthchecks, tanto con el override local como con Compose base. La base se probó en `NODE_ENV=production`, orígenes HTTPS de prueba y configuración ficticia de email; no se enviaron emails. Este test no proporciona terminación TLS ni afirma haber probado un navegador remoto con HTTPS.

Un probe Prisma creó una localidad ficticia y registró su ID `a648b693-9355-4358-acfc-304527720892`. Después de `docker compose down` **sin `-v`** y `up` con la configuración base, el ID siguió presente y los conteos se conservaron: 10 usuarios, 21 localidades y 4 partidos. API accedió a PostgreSQL mediante Prisma real después de recrear los contenedores.

`docker compose stop` finalizó en aproximadamente cuatro segundos. Web/API recibieron SIGTERM y terminaron con 143; DB recibió SIGINT y terminó con 0. Docker events registró únicamente señales 15, 15 y 2, sin SIGKILL. `OOMKilled=false` y `State.Error` vacío para los tres. PostgreSQL registró checkpoint y `database system is shut down`. `start --wait` posterior volvió a dejar los tres healthy. Esto comprueba el apagado normal; no es una prueba de carga ni de drenaje bajo tráfico sostenido.

## Inspección de imágenes y operación

| Imagen | ID abreviado | Tamaño informado por image inspect |
| --- | --- | --- |
| `hyt-web:local` | `39538b61d071` | 92.326.409 bytes |
| `hyt-api:local` | `9bdebe59e525` | 179.613.941 bytes |
| `postgis/postgis:16-3.5` | `94146ac37bc6` | 217.201.841 bytes |

Docker Desktop también informa disk usage mayor por capas/almacenamiento local; no es el tamaño de contenido anterior.

Web/API: `USER=node`, `id` confirmó UID/GID 1000. `/proc/self/status` confirmó `CapEff=0`, `CapBnd=0`, `NoNewPrivs=1` y seccomp activo. `docker inspect` confirmó init, 512 PIDs, 30 segundos de stop, restart `on-failure` máximo 5, capabilities ALL eliminadas y no-new-privileges. DB: init, 256 PIDs, 30 segundos, 1 GiB y 2 CPUs. Los límites web/API son 1 GiB/1 CPU cada uno; son defaults configurables, no un dimensionamiento de producción.

Inventario runtime API: sin `.env`, `.git`, fuentes de aplicación, tests, TypeScript, Vitest o tsx en las rutas inspeccionadas. Prisma CLI/schema/migraciones y seed JS permanecen intencionalmente para operación controlada. Web contiene standalone, static y public; no se copiaron secretos ni código fuente de aplicación. No se habilitó `read_only`; no se afirma que caches de Next funcionen con filesystem inmutable.

## Redes y seguridad efectiva

Compose base ejecutado realmente: `app_network` conecta web/API; `db_network` conecta API/DB y `Internal=true`. DB tuvo `PortBindings={}` y `5432/tcp:null`, sin publicación al host. Web no resolvió `db` (`ENOTFOUND`) ni pudo abrir TCP al IP real de DB:5432 (timeout). API sí accedió mediante Prisma. En desarrollo el override usa red no interna y publica DB sólo en loopback para herramientas del host; no modifica la base.

Probes HTTP contra la API Docker en development y production verificaron:

- CORS devuelve únicamente el origen permitido y `Access-Control-Allow-Credentials: true`.
- Un GET con origen hostil no recibe `Access-Control-Allow-Origin`.
- POST sin CSRF devuelve 403 `CSRF_INVALID`.
- POST con CSRF válido y Origin hostil devuelve 403.
- Cookies browser/CSRF mantienen Secure/HttpOnly; el browser smoke confirmó esos atributos en access/refresh y que no se guardan credenciales en storage ni cookies legibles por JavaScript.
- Production conserva configuración HTTPS y nombres de cookies `__Host-`; no se cambiaron auth, permisos o protección CSRF para Docker.

Security Reviewer: **PASS**, evidencia en `DOCKER-SECURITY.md`. Sin bloqueos pendientes.

## Estado final y recomendación

Stack exclusivo de validación detenido correctamente. Se preservaron imágenes, volumen y los fixtures ficticios; no se eliminaron datos ni contenedores ajenos. Archivo de secretos de prueba permanece ignorado fuera del build context. Recomendación del Testing Agent: **aceptar la arquitectura Docker**. No se autorizó ni realizó un commit automático.
