---
id: UI-AUTH-02
title: Jerarquía visual del login y errores de campo visibles
status: finished
phase: product
depends_on: [SLICE-02]
created_at: 2026-10-07T19:57:40-03:00
updated_at: 2026-10-07T19:59:39-03:00
started_at: 2026-10-07T19:57:40-03:00
resolved_at: 2026-10-07T19:59:39-03:00
resolution_commit: null
---

Separar título, descripción, campos y acciones secundarias del login con jerarquía y espaciado explícitos. AuthForm compartido conserva validaciones y contratos de login/registro. Mostrar borde rojo y mensaje cuando un campo sea inválido; mantener foco visible y asociaciones accesibles. No generar espacios mediante párrafos de error vacíos ni referencias a IDs inexistentes. Mantener landing y 404 aprobadas intactas.

Frontend implementa, Testing valida independientemente y Security Reviewer confirma que sólo cambia presentación y accesibilidad, sin modificar submit, schemas, payloads, sesión, logs ni almacenamiento. No realizar capturas o comprobaciones de aspecto.

Los commits autorizados de las slices previas y landing se registraron por separado: `6dfb65b` backend, `d1b679c` frontend y `8d67b2c` UX de landing/carrusel/404. Este ajuste nuevo del login queda sin commit para revisión del usuario.

Lint, typecheck y build completos aprobados. Unitarios: 54 (16 API y 38 frontend). Un worker de `slice.test.tsx` no arrancó en la primera ejecución general: los otros seis archivos aprobaron 18 casos y el reintento específico aprobó los 20 restantes. Integración: 19 casos aprobados contra la base PostgreSQL local aislada, sin modificar la base de desarrollo. Pruebas de navegador de login/registro sin submits válidos ni mutaciones; cierre de registro pendiente tras restaurar la API local.

## Cierre

Ambos casos funcionales de navegador aprobados. Login pasó sin catálogo; registro requirió restaurar API y el contenedor PostgreSQL de desarrollo existentes, detenidos durante la interrupción. GET de localidades volvió a responder 200 con 18 localidades y el caso de registro aprobó sin cambiar expectativas ni mockear el catálogo. Las pruebas no enviaron POST de autenticación ni crearon cuentas o emails.

Revisión final de seguridad aprobada sin bloqueos. Fuente, documentación, tests y diff revisados; índice vacío tras los tres commits autorizados. Los archivos nuevos y diferencias del login permanecen sin commit para revisión del usuario. Frontend en localhost:3000 y API en localhost:3001, con PostgreSQL saludable. Sin comprobaciones de aspecto ni capturas.
