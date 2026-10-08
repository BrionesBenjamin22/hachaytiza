# Revisión de seguridad Docker

Fecha: 2026-10-07.

Estado: pass. Sin hallazgos de seguridad bloqueantes en el alcance Docker revisado.

## Superficies revisadas

`AGENTS.md`, `docs/agent/SECURITY.md` completo, arquitectura técnica, Dockerfiles de API/web, Compose base y override local, `.dockerignore`, ejemplo de entorno, documentación, configuración Next.js, dependencias Prisma, hooks de shutdown y harness de browser tests.

## Controles revisados en archivos

- Exactamente tres servicios. Web sólo integra la red de aplicación; API integra ambas redes; DB sólo integra la red de persistencia. La base declara red DB interna y ningún puerto de PostgreSQL.
- El override de desarrollo publica PostgreSQL únicamente en `127.0.0.1` y permite salida de su red para herramientas locales. No concede acceso directo de web a DB. Está documentado y debe omitirse en producción.
- Web/API declaran usuario `node`, `init`, eliminación de capabilities, `no-new-privileges`, límites configurables de PIDs/memoria/CPU y 30 segundos de gracia. DB conserva el entrypoint oficial.
- Dockerfiles usan versiones explícitas, instalación frozen con el lockfile y artefactos compilados. Ningún secreto se suministra como argumento de build. Las variables públicas de Next son explícitas y requieren reconstrucción.
- El contexto excluye `.env` y variantes reales, directorios de credenciales, claves, dependencias locales y resultados de build/tests. `.env.example` contiene placeholders. Las copias runtime son explícitas.
- Prisma CLI, schema, migraciones y seed JavaScript son tooling operacional intencional. El compilador TypeScript opcional se elimina después de generar cliente en la etapa de dependencias productivas. Startup no ejecuta migraciones ni seeds.
- No se modifican guards, ownership, sesiones, DTOs ni reglas de dominio. El frontend mantiene requests con credenciales y CSRF en memoria.
- Cookies conservan `Secure`, `HttpOnly`, `SameSite=Lax` y `Path=/`; producción mantiene prefijo `__Host-`. El override sólo utiliza la semántica development existente. CORS sigue siendo una lista explícita, con credenciales; las mutaciones validan Origin y token CSRF. Producción rechaza orígenes HTTP y configuración de email incompleta.
- Logs HTTP existentes escriben stdout sin bodies, headers de credenciales ni query strings. Compose rota logs. Errores HTTP no exponen stacks; secretos runtime quedan visibles a operadores con acceso Docker y ese acceso debe restringirse.

## Hallazgos y decisiones

No se identifican hallazgos critical, high ni incumplimientos explícitos nuevos de SECURITY.md en los cambios revisados.

Info: no se activa `read_only`; requiere identificar y probar las rutas de escritura de Next/Prisma antes de adoptarlo. TLS externo y dominios definitivos siguen siendo requisitos de despliegue productivo, fuera de esta tarea. No se afirma aptitud para go-live ni ausencia de vulnerabilidades en todas las dependencias.

## Evidencia y alcance de validación

Evidencia del Testing Agent sobre las imágenes finales:

- Web: 92.326.409 bytes; API: 179.613.941 bytes. Ambas declaran `USER node` y ejecutan UID/GID 1000. `/proc` muestra `CapEff=0`, `CapBnd=0`, `NoNewPrivs=1`, `Seccomp=2`.
- Inspect confirma init, 512 PIDs para aplicaciones, gracia de 30 segundos, restart on-failure con máximo cinco reintentos, capabilities eliminadas y no-new-privileges. DB conserva init, 256 PIDs, 30 segundos, 1 GiB y 2 CPU.
- Inspección de API no encontró `.env`, `.git`, fuente/tests propios ni paquetes TypeScript, Vitest o tsx en las rutas revisadas. Migraciones reales con Prisma y seed JavaScript funcionan tras retirar TypeScript; un schema limpio recibió las tres migraciones.
- Once browser tests contra la API Docker pasaron, incluyendo registro, localidad, sesión, login/logout y filtros. Cookies de sesión/browser/CSRF preservan Secure/HttpOnly. El probe HTTP confirma origen permitido exacto con credenciales, ausencia de ACAO para origen hostil, rechazo 403 sin token CSRF y rechazo 403 de Origin hostil incluso con token válido.
- Base production-like: los tres servicios saludables, DB `PortBindings={}` y `5432/tcp=null`; red DB `Internal=true`. Web no resuelve `db` y tampoco conecta al IP real de DB (timeout TCP); API consulta PostgreSQL y el marcador persistido.
- Down/up sin eliminar volumen conserva el mismo UUID marcador y datos existentes. Shutdown registra SIGTERM para web/API y SIGINT para DB, sin SIGKILL; PostgreSQL registra checkpoint y cierre limpio. El código 143 de API corresponde a SIGTERM.

Las pruebas existentes de integración cubren también identidad inyectada, accesos privados, rotación/revocación y límites. Las pruebas de base production-like utilizaron configuración HTTPS y email sintética sólo para probes sin envío de correo; no validan TLS externo ni entrega real de email.

La revisión directa del daemon desde el sandbox de este agente no estuvo disponible; los controles efectivos anteriores se aprueban con evidencia independiente suministrada por el Testing Agent. No se publicaron valores secretos del entorno runtime.

## Recomendación al Orchestrator

Aprobar los cambios de seguridad Docker: sin bloqueos pendientes. El Orchestrator debe cerrar la tarea sólo cuando el resto de las verificaciones y la aprobación final de Testing estén completos. No realizar commits. Antes de go-live verificar HTTPS externo, dominios efectivos, entrega real de email y dimensionamiento observado; esas verificaciones no forman parte de la arquitectura local solicitada.
