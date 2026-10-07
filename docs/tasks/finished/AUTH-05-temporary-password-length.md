---
id: AUTH-05
title: Mínimo temporal de contraseña de ocho caracteres
status: finished
phase: product
depends_on: [SLICE-02]
created_at: 2026-10-07T20:16:25-03:00
updated_at: 2026-10-07T20:27:40-03:00
started_at: 2026-10-07T20:16:25-03:00
resolved_at: 2026-10-07T20:20:35-03:00
resolution_commit: 4c3c122c4a9b63907b036721b47fd266bf2bec6f
---

Decisión explícita del usuario: reducir temporalmente el mínimo de contraseña de 12 a 8 caracteres. Aplicar en DTOs y Swagger de registro/login, reset y cambio de contraseña; schema frontend compartido y ayudas visibles de registro, reset y seguridad. Conservar máximo 128, preservación de bytes, Argon2id, CSRF/CORS, cookies y revocación de sesiones. No crear flags, infraestructura o expiración automática no solicitada. Login frontend conserva su validación de presencia actual.

Backend y Frontend implementan; Testing agrega fronteras 7/8/128/129 y flujo real con contraseña de ocho caracteres en PostgreSQL aislado. Security Reviewer revisa la excepción autorizada y los controles conservados. No modificar datos de desarrollo ni enviar emails reales. Validar lint, typecheck, unitarios, integración, build y navegador relevante sin capturas ni comprobaciones de aspecto. No realizar commit; mantener los ajustes anteriores del login pendientes.

## Cierre y evidencia

Lint, typecheck y build completos aprobados. Unitarios: API 36/36 y frontend 47/47, total 83. Fronteras 7/8/128/129 validadas en DTOs y schema. Integración PostgreSQL aislada: 20/20, incluyendo registro, login, cambio y reset con ocho caracteres; longitudes inválidas no crean cuentas, revocan sesiones o consumen tokens. Confirmados Argon2id, revocación tras cambios y rechazo de reset reutilizado.

Navegador funcional de formularios: 2/2 en 4,9 segundos, mensajes y asociaciones accesibles actualizados a ocho caracteres, sin POST de autenticación ni datos de desarrollo modificados. Security Reviewer aprobó AUTH-05 sin bloqueos: sólo mínimo temporal autorizado; máximo 128, bytes, hash, sesiones, cookies, CSRF/CORS, permisos y logs conservados.

Documentación actualizada en SECURITY, contratos backend/frontend y README; registros históricos de doce caracteres conservados como evidencia del estado previo. Diff y estado revisados. Frontend y API levantados con catálogo HTTP 200. Sin revisión de aspecto, capturas ni commit; cambios previos del login preservados.

## Registro posterior de commit

El usuario autorizó guardar esta etapa. El cambio quedó registrado en 4c3c122c4a9b63907b036721b47fd266bf2bec6f. Las referencias previas a cambios sin commit describen el cierre anterior a esa autorización. No se realizó push.
