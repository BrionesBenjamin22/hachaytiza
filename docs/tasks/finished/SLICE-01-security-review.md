---
id: SEC-01
title: Revisión de seguridad de la primera vertical slice
status: finished
phase: product
depends_on: [SLICE-01]
created_at: 2026-10-06T23:58:43-03:00
updated_at: 2026-10-06T23:58:43-03:00
started_at: null
resolved_at: 2026-10-06T23:58:43-03:00
resolution_commit: null
---

# Revisión de seguridad SLICE-01

Estado: pass. Revisión de seguridad aprobada para la primera vertical slice; no hay bloqueos abiertos.

## Alcance

Revisión independiente de AGENTS.md, task SLICE-01, SECURITY.md completo, PRODUCT.md, TECHNICAL.md y cambios de auth, users, matches, configuración HTTP, persistencia, seeds y cliente de sesión. Google queda fuera de esta etapa por decisión del usuario.

## Controles verificados en código

- Access JWT de 15 minutos, algoritmo HS256 restringido, issuer y audience verificados; cada acceso consulta sesión persistida vigente y no revocada.
- Refresh aleatorio de 256 bits, persistido mediante SHA-256, vencimiento absoluto de 30 días, rotación transaccional con actualización condicional y registro de credenciales consumidas; reutilización revoca la sesión.
- Logout revoca en servidor; restablecer contraseña revoca todas las sesiones y otros enlaces RESET pendientes.
- Cookies Secure, HttpOnly, SameSite=Lax y Path=/; prefijo __Host- en producción, sin Domain. Secretos JWT y CSRF diferentes, mínimos de 32 caracteres; producción exige orígenes HTTPS y configuración de email.
- csrf-csrf usa HMAC ligado a nonce aleatorio por navegador. El nonce rota al crear/renovar/cerrar sesión. Toda operación mutable exige token, cookie de navegador y Origin exacto permitido; se rechaza Fetch Metadata cross-site. CORS usa lista explícita con credentials.
- Helmet se inicializa primero. Requests API no se cachean. DTOs rechazan propiedades ajenas; la identidad para actualizar localidad procede exclusivamente de la sesión.
- Argon2id con memoria 65536 KiB, tres iteraciones y paralelismo uno; login desconocido verifica un hash ficticio. Password entre 12 y 128 caracteres, sin transformar sus bytes.
- Enlaces de verificación/reset aleatorios, hash persistido, expiración y consumo condicional dentro de transacción. Reset inválido no modifica contraseña.
- Rate limiting global y límites de diez requests por minuto por endpoint auth mutable. Límites mayores explícitos para consulta CSRF/sesión.
- Queries Prisma parametrizadas; listado limitado a nueve, orden estable, no cancelados ni pasados, ubicación activa. DTO público no incluye contacto, email ni credenciales del organizador.
- Perfil de sesión expone únicamente datos del propio usuario, localidad, verificación y metadatos de expiración; nunca tokens o hashes.
- Frontend usa credentials include, CSRF sólo transitorio, sin tokens en localStorage/sessionStorage/IndexedDB. Renovación únicamente por acción Mantener sesión; expiración invalida el estado autenticado y consulta servidor.
- Tokens de email viajan en fragmento URL y se eliminan tras capturarlos en memoria; no se envían como query ni se consumen mediante GET.
- Logs limitados a metadatos HTTP y eventos de email sin destinatario, token ni excepción del proveedor. Errores internos son genéricos sin stack. Ejemplos de entorno mantienen secretos vacíos; datos ficticios requieren development.

## Hallazgos

### SEC-01: enumeración de email por tiempo de recuperación

Severidad: medium; incumplimiento explícito de la regla de no confirmar existencia, bloqueante hasta corregir.

Evidencia inicial: AuthService.forgot esperaba issueEmail, que realizaba fetch al proveedor con timeout de diez segundos, sólo para usuarios existentes. Emails desconocidos retornaban tras una consulta.

Corrección revisada: forgot devuelve el mismo mensaje tras la consulta compartida y despacha issueEmail sin esperar al proveedor, capturando fallos con log seguro. El token continúa persistido como hash antes de enviarse; una entrega fallida marca el enlace como consumido. Test nuevo mantiene pendiente la promesa de entrega y verifica que la respuesta no espera.

Estado: corregido; test unitario aprobado.

### SEC-02: durabilidad del envío de recuperación

Severidad: low; no bloqueante para la slice.

La entrega desacoplada reside en el proceso. Si éste termina antes de completar la operación, el usuario puede necesitar solicitar otro enlace. No afecta confidencialidad ni habilita tokens usados/expirados. Documentar esta limitación y reevaluar entrega durable sólo cuando se amplíe el alcance; no se autoriza nueva infraestructura por esta revisión.

### SEC-03: persistencia temporal de cookie refresh

Severidad: info; no bloqueante.

MaxAge de cookie refresh vuelve a treinta días en cada rotación, pero el vencimiento absoluto de la sesión permanece anclado a su creación. El servidor rechaza la credencial al alcanzar ese vencimiento; no hay extensión silenciosa. Alinear MaxAge con el tiempo restante sería una mejora futura de consistencia.

### SEC-04: alcance del rate limiting

Severidad: info; no bloqueante para ejecución inicial de una instancia.

El contador del throttler es local al proceso. Antes de ejecutar múltiples réplicas debe validarse una estrategia de límites compartidos o en el proxy y su configuración de IP; no introducir almacenamiento externo sin autorización.

## Evidencia y recomendaciones

- Revisor ejecutó pnpm --filter api test: 12/12 aprobados, incluyendo la regresión de entrega pendiente.
- Orquestación informó ejecución final de integración PostgreSQL: 15/15 aprobados, once casos slice y cuatro casos HTTP base, con migraciones 001 y 002 aplicadas. El revisor inspeccionó los tests añadidos: refresh concurrente produce un único sucesor y revocación por reutilización; verificación y reset concurrentes consumen el enlace una sola vez y reset revoca sesiones. Las pruebas esperan explícitamente la entrega asíncrona capturada.
- Testing informó 4/4 pruebas mobile Playwright aprobadas. Orquestación confirmó lint, typecheck, unitarios 19/19 (API 12, web 7) y build aprobados sobre la implementación final. El revisor ejecutó también git diff --check sin errores.
- Dominios productivos definitivos requieren verificar cookies y políticas same-site; no asumir equivalencia de hosts compartidos Vercel/Render con dominios Hacha y Tiza.

## Recomendación al Orchestrator

Aceptar la implementación de esta slice desde seguridad. La entrega real mediante Resend y los dominios productivos definitivos quedan como verificaciones de despliegue, sin bloquear la validación local con PostgreSQL y navegador reales. SEC-01 quedó corregido y cubierto por regresión; SEC-02 a SEC-04 son limitaciones acotadas documentadas. No se realizaron cambios de implementación ni commits desde esta revisión.
