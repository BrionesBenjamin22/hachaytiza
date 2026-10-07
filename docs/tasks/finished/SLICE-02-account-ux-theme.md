---
id: SLICE-02
title: Gestión de cuenta, UX de localidades e identidad visual
status: finished
phase: product
depends_on: [SLICE-01]
created_at: 2026-10-07T00:58:16-03:00
updated_at: 2026-10-07T01:23:00-03:00
started_at: 2026-10-07T00:58:16-03:00
resolved_at: 2026-10-07T01:23:00-03:00
resolution_commit: null
---

# Segunda iteración de la vertical slice

La slice existente permanece como base. Fuentes de verdad en `docs/agent/`; las rutas `docs/PRODUCT.md`, `TECHNICAL.md` y `SECURITY.md` indicadas en el pedido no existen.

## Alcance

- Landing pública breve; descubrimiento público conservado; Home autenticado con título Partidos disponibles.
- Localidad de catálogo buscable y accesible por teclado en registro, Home, onboarding y perfil.
- Menú Cuenta: perfil, seguridad, apariencia y cierre de sesión.
- Perfil: nombre y localidad principal, actualización sólo de diferencias reales. Email visible sin edición; no se añade teléfono al modelo.
- Historial privado paginado de tres cambios de campos, de acuerdo con las instrucciones operativas suministradas; sin contraseñas ni credenciales.
- Cambio de contraseña con contraseña actual, nueva y confirmación cliente. Decisión humana: revocar todas las sesiones, incluida la actual, y volver a Login.
- Recuperación existente integrada y probada con sustitución del transporte de email; sin endpoints de prueba en producción.
- Light, dark y system; preferencia visual persistida en cliente, sin almacenar credenciales.
- Glassmorphism moderado, Lucide, estados accesibles, responsive y reduced motion.
- Dependencias cmdk y Radix Popover/Dropdown aprobadas explícitamente por el usuario; instalación centralizada por orquestación.
- Limpieza de marca en documentación, conservando nombres efectivos de cookies y contratos de sesión.

## Coordinación

Backend conserva propiedad de API, contratos y unitarios. Frontend conserva aplicación web, componentes y unitarios. Testing controla integración y navegador de forma independiente. Security Reviewer revisa perfil, password, recuperación, autorización, CSRF/cookies y concurrencia; la orquestación mantiene scripts, entorno y evidencia final.

## Validación requerida

Lint, typecheck, unitarios, PostgreSQL real, navegador móvil y temas, recuperación completa con transporte de email fake, revisión visual/contraste y seguridad sin bloqueos. Revisar diff y documentar límites externos. No se realiza commit automáticamente.

## Resultado y evidencia

Segunda iteración terminada. Backend, Frontend y Testing entregaron sus módulos; Security Reviewer aprobó explícitamente sin bloqueos abiertos en [SLICE-02-security-review.md](SLICE-02-security-review.md).

- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`: aprobados sobre el código final. Unitarios: 37/37 (API 16, web 21).
- Integración contra PostgreSQL real: 19/19, con la migración de historial aplicada. Incluye autorización entre dos cuentas, cambios parciales, no-op, historial privado de tres elementos, validaciones y revocación completa.
- Playwright sobre servicios compilados finales: 9/9 en 35,1 segundos. Conserva el flujo anterior y añade landing/CTA, búsqueda por teclado, perfil, contraseña, recuperación completa y temas.
- Regresión de privacidad: A y B comparten la misma navegación SPA sin logout ni recarga; con la respuesta del perfil B demorada, no aparecen perfil ni historial de A. Las claves privadas incorporan el titular.
- Concurrencia: login con el hash anterior verificado no puede crear una sesión válida después de cambio/reset. Las operaciones comparten bloqueo transaccional de User.
- Recuperación: enlaces válidos, inválidos, expirados y reutilizados; un nuevo fragmento en la misma ruta se captura y elimina, sin consumo automático. Respuestas anteriores no alteran el enlace nuevo.
- Claro/oscuro/sistema, persistencia visual, reduced motion, contraste de texto/controles/foco y estados loading/error/empty aprobados. Capturas móviles de landing, Home y Apariencia revisadas por orquestación sin desbordamiento ni contenido ilegible.
- `git diff --check` aprobado y estado revisado; documentación relevante sin referencias residuales a la marca anterior. Se preservaron cambios de SLICE-01 que ya estaban sin commit.

Contratos documentados en [PROFILE.md](../../../apps/api/PROFILE.md) y [FRONTEND.md](../../../apps/web/FRONTEND.md); preparación y evidencia en [tests/README.md](../../../tests/README.md).

Límite externo: Resend se sustituye únicamente como transporte de email en los tests, con enlaces reales del backend en memoria. No se probó entrega al proveedor ni dominios productivos. No se agregaron endpoints de prueba a producción y no se realizó commit.
