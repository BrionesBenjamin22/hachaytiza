---
id: SLICE-01
title: Autenticación, localidad principal y descubrimiento de partidos
status: finished
phase: product
depends_on: [FND-01, FND-02]
created_at: 2026-10-06T15:13:18-03:00
updated_at: 2026-10-06T23:58:43-03:00
started_at: 2026-10-06T15:13:18-03:00
resolved_at: 2026-10-06T23:58:43-03:00
resolution_commit: null
---

# Primera vertical slice

Fuentes de verdad: `docs/agent/PRODUCT.md`, `TECHNICAL.md`, `SECURITY.md` e `IMPLEMENTATION.md`.

## Alcance confirmado

- Autenticación local, verificación de email y recuperación de contraseña. Google queda para otra etapa, según decisión del usuario.
- Sesión con access y refresh en cookies seguras HttpOnly, renovación solicitada por el usuario, CSRF, revocación y límites de requests.
- Localidad principal persistida al registrarse; selección obligatoria para cuentas existentes sin localidad.
- Home público y autenticado; filtro inicial por localidad principal, exploración temporal independiente del perfil.
- Consulta real de localidades y partidos futuros, no cancelados, ordenados por inicio, paginación de 9.
- PostgreSQL/Prisma, migraciones y seeds de La Plata; partidos ficticios exclusivamente en desarrollo.
- No GPS, radio, reservas, publicación, infraestructura adicional ni commit automático.

## Responsabilidades y dependencias

1. Backend: persistencia, auth, usuarios, localidades, consulta de partidos, email, contratos y tests.
2. Frontend: formularios, sesión, selección de localidad, Home y estados; depende del contrato API.
3. Security reviewer: revisión independiente de sesión, credenciales, CSRF, CORS, privacidad y tokens de email.
4. Testing: validación independiente de persistencia y recorrido real de navegador; depende de servicios listos.
5. Orquestación: coordinación, entorno de prueba, scripts raíz y evidencias.

## Criterios de aceptación

- Registro persiste la localidad y entrega sesión; login/logout y restauración observan la sesión del servidor.
- Home inicia en Tolosa, cambiar a City Bell cambia partidos sin alterar el perfil; otro login vuelve a Tolosa.
- Cuenta sin localidad puede seleccionarla y continuar.
- Verificación y reset usan tokens impredecibles, expiran y se consumen una sola vez; reset revoca sesiones.
- Pruebas de seguridad sin bloqueos pendientes.
- Lint, typecheck, tests, build y revisión del diff; documentar las verificaciones que el entorno impida.

## Estado de validación

Implementada y validada con backend, frontend, testing independiente y revisión de seguridad aprobada sin bloqueos.

- Lint, typecheck y build: aprobados.
- Unitarios: 19/19 (12 backend y 7 frontend).
- Integración PostgreSQL real: 15/15, incluyendo rotación y consumo concurrente de tokens y restricciones de integridad.
- Navegador móvil: 4/4; repetición final sobre servicios reiniciados con el último build aprobada.
- Migraciones sobre base limpia Compose: aprobadas; extensión PostGIS verificada sin consultas geoespaciales en esta slice.
- Seeds ejecutados dos veces sin duplicados; fixtures separados de producción.
- Inspección visual a 390 px: sin desbordamiento horizontal.
- Diff revisado y `git diff --check` aprobado.

Evidencia y reproducción: `tests/README.md`. Contratos: `apps/api/VERTICAL-SLICE.md` y `apps/web/FRONTEND.md`. Revisión independiente: `SLICE-01-security-review.md`.

No se realiza commit por instrucción explícita del usuario; `resolution_commit` permanece null. La entrega de emails reales necesita credenciales y remitente Resend; se probó el contrato mediante sustitución exclusiva del transporte de email. Cookies bajo dominios productivos se verifican al desplegar. Google permanece fuera de esta etapa según alcance confirmado.
