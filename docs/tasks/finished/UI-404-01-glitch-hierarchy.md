---
id: UI-404-01
title: Jerarquía clara y efecto glitch para página 404
status: finished
phase: product
depends_on: [LAND-01]
created_at: 2026-10-07T15:29:46-03:00
updated_at: 2026-10-07T15:39:36-03:00
started_at: 2026-10-07T15:29:46-03:00
resolved_at: 2026-10-07T15:39:36-03:00
resolution_commit: null
---

Adaptar la referencia NotFoundGlitch proporcionada por el usuario: código 404 grande como elemento principal, mensaje explicativo debajo y enlaces de recuperación. Componente reutilizable en `apps/web/src/components/ui/`, con temas existentes, semántica accesible estable y animación breve que respeta reducción de movimiento. Las dependencias clsx, motion y tailwind-merge están solicitadas explícitamente en el prompt.

Frontend implementa; Testing valida de forma independiente. No cambiar navbar, carrusel, autenticación ni estados de carga. No realizar capturas ni comprobaciones de aspecto: el usuario valida el diseño. Ejecutar lint, typecheck, unitarios, build y navegador funcional acotado a la 404. No repetir integración backend porque no cambian contratos ni persistencia. Preservar datos de desarrollo y dejar la aplicación levantada. No realizar commit.

## Validación final

Lint, typecheck y build aprobados. API: 16/16 unitarios; frontend: 36/36 unitarios con pnpm --filter web test --pool=threads --maxWorkers=1 tras timeout de arranque del pool forks (sin casos ejecutados). Total: 52 unitarios. Testing independiente: 1/1 caso navegador de 404 en 11,4 segundos, con HTTP 404 real, nombre accesible estable, restauración del código decorativo, reducción de movimiento, layout compartido único y enlaces funcionales.

Documentación frontend y tests actualizada. Diff y estado revisados. Sin cambios de contratos o persistencia: no corresponde repetir integración backend. Sin capturas ni revisión visual. Frontend levantado en localhost:3000 y API saludable en localhost:3001. No se realizó commit.
