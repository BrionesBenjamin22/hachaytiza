---
id: SLICE-02-SEC
title: Revisión de seguridad de perfil, contraseña y estado cliente
status: finished
phase: product
depends_on: [SLICE-02]
created_at: 2026-10-07T01:05:00-03:00
updated_at: 2026-10-07T01:22:33-03:00
started_at: 2026-10-07T01:05:00-03:00
resolved_at: 2026-10-07T01:22:33-03:00
resolution_commit: null
---

# Revisión independiente SLICE-02

Estado: pass. Aprobación explícita de seguridad para SLICE-02; no hay hallazgos bloqueantes abiertos.

## Superficies revisadas

AGENTS.md, task SLICE-02, SECURITY.md completo, PRODUCT.md y TECHNICAL.md; auth, perfil propio e historial, helper de bloqueo PostgreSQL, migración de historial, sesión cliente, vistas Cuenta y bootstrap de tema. Se aplicaron pautas vercel-react-best-practices para consultas y estado React. No se modificó implementación ni se realizaron commits.

## Hallazgos

### SEC-02-01: caché privada compartida entre identidades

Severidad: high, bloqueante.

Evidencia inicial: Profile utiliza queryKey [profile] y ProfileHistory [profile-history, page]. Logout explícito y cambio de contraseña limpian caché, pero expiración/revocación seguida de login de otra cuenta no la elimina. La ventana staleTime de treinta segundos puede entregar a la segunda cuenta el email, nombre, localidad e historial de la primera. El formulario también podría basarse en los valores anteriores.

Corrección solicitada a Frontend: incluir user.id en todas las claves de consultas privadas y en los accesos/actualizaciones de caché correspondientes, o asegurar limpieza de identidad antes de renderizar. Regresión solicitada a Testing: perfil de A cargado, revocación o expiración sin logout, login B en el mismo navegador, perfil e historial únicamente de B.

Estado: corregido y probado. Profile usa [profile, user.id] y ProfileHistory [profile-history, user.id, page], habilitados únicamente con sesión autenticada. Actualizaciones e invalidación de caché usan el mismo titular; formulario usa key del usuario. Frontend informó regresión unitaria aprobada y Testing confirmó regresión independiente en navegador sin reload/logout, con respuesta del perfil B deliberadamente suspendida.

### SEC-02-02: login validado antes de cambio/reset

Severidad: high para el diseño sin serialización; resuelto preventivamente durante implementación.

Un login que verifica el hash viejo antes del cambio podría crear su sesión después de revocar las anteriores. Se revisó la corrección: createSession bloquea la fila User mediante SQL parametrizado FOR UPDATE y compara el hash verificado con el vigente. ChangePassword y consume adquieren el mismo bloqueo antes de actualizar contraseña y revocar sesiones. La creación anterior al cambio queda revocada; la posterior rechaza el hash viejo. No se agrega infraestructura ni otra estrategia de sesión.

Testing confirmó pruebas PostgreSQL con barrera determinista entre verificación e emisión, tanto para reset como para cambio: login viejo retorna 401 y no quedan sesiones activas.

Estado: corregido y probado.

## Controles verificados

- GET/PATCH /users/me y GET /users/me/history obtienen identidad de la sesión. No existe selector de titular proporcionado por cliente.
- PATCH permite exclusivamente nombre y primaryLocationId; rechaza propiedades ajenas, null, nombres vacíos e identificadores inválidos. La ubicación debe existir, estar activa y tener tipo seleccionable.
- Actualización e historial son transaccionales, registran sólo diferencias reales y se serializan por usuario. Historial privado paginado de tres, orden estable e índice por titular y fecha; contiene únicamente nombre/localidad antes y después.
- DTO de usuario añade fechas y hasLocalPassword booleano; passwordHash se usa internamente pero nunca se serializa. Email permanece de sólo lectura.
- Cambio autenticado requiere contraseña actual válida y nueva contraseña de doce a ciento veintiocho caracteres, preserva sus bytes y Argon2id. La sesión y hash vigente se revalidan dentro de la transacción. Cuentas sin password local reciben error seguro.
- Decisión humana documentada en SECURITY.md: cambio revoca todas las sesiones incluida la actual, invalida enlaces RESET pendientes y limpia cookies. Frontend limpia formulario y caché de sesión, y navega a Login con mensaje de éxito.
- Se conserva limitación de diez requests por minuto del controller Auth, cookies Secure/HttpOnly/SameSite=Lax/Path=/ y prefijo productivo __Host-. No hay renombres de cookies efectivos.
- CSRF con nonce de navegador y rotación sigue activo en cada mutación; validación de Origin, CORS explícito, Helmet y no-store permanecen.
- SQL del bloqueo usa template parametrizado Prisma; no hay concatenación de entradas. Orden User antes de Session/EmailToken evita inversión de locks entre cambio, reset y login. Refresh conserva actualización condicional que no resucita sesiones revocadas.
- Tema almacena únicamente preferencia light/dark/system en clave versionada. Script estático servido desde el propio origen valida los valores; no utiliza datos privados, interpolación HTML, eval ni relajación de CSP. No se persisten credenciales en storage.
- Recuperación/verificación capturan fragmentos tanto al montar como al cambiar hash en la misma ruta, los eliminan inmediatamente preservando el estado de navegación y reinician el formulario con valores vacíos. Versionado de enlace impide que una respuesta anterior borre un nuevo token o sustituya su feedback. No se consume un enlace sin submit explícito; token sólo en memoria y listeners eliminados al desmontar.
- Nombres e historial se renderizan con escape React. No se agregan logs de payloads, passwords, hashes, tokens ni datos personales. Se mantienen errores internos seguros y ejemplos de secretos vacíos.

## Evidencia y límites

- Revisor ejecutó pnpm --filter api test: 16/16 unitarios aprobados.
- Testing informó integración completa PostgreSQL 19/19 aprobada: quince casos anteriores más actualización/historial privado, cambio con revocación completa y dos carreras deterministas de login frente a cambio/reset. Revisor inspeccionó las aserciones concretas.
- Orquestación confirmó lint, typecheck, build y unitarios finales 37/37 aprobados (API 16, web 21), posteriores al ajuste de captura de enlaces. El revisor detectó una falla intermedia de reinicialización del formulario en la nueva regresión, luego corregida con defaultValues y reset explícitos; inspeccionó el ajuste final y sus tests.
- Revisor inspeccionó la regresión Playwright de identidad: mantiene la navegación SPA y QueryClient, revoca A en servidor, entra B, demora GET del perfil B y comprueba que A nunca aparece mientras se espera. Evita que un reload o una respuesta rápida oculten el defecto original.
- Testing confirmó Playwright final completo 9/9 aprobado en 35,1 segundos sobre el último build. Incluye aislamiento privado SPA sin logout/recarga, perfil B demorado sin datos A, recuperación con nuevos fragmentos en la misma ruta, enlaces inválidos/expirados/reutilizados, revocación al cambiar contraseña y ausencia de credenciales en storage. Revisor ejecutó git diff --check sin errores.
- Se mantienen los límites de SLICE-01: entrega de email en proceso, rate limiting por instancia y comprobación de dominios productivos/Resend real durante despliegue.

## Recomendación

Aceptar SLICE-02 desde seguridad: SEC-02-01 corregido y validado con regresión independiente; protección de carreras SEC-02-02 implementada y probada; suite completa de navegador y verificaciones finales aprobadas. Mantener los límites de despliegue documentados y no ampliar infraestructura por esta revisión. No se realizaron commits por instrucción del usuario.
