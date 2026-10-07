---
id: LAND-01
title: Navegación reutilizable, estados de interfaz y carrusel de propósito
status: finished
phase: product
depends_on: [SLICE-02]
created_at: 2026-10-07T14:35:57-03:00
updated_at: 2026-10-07T15:11:00-03:00
started_at: 2026-10-07T14:35:57-03:00
resolved_at: 2026-10-07T15:11:00-03:00
resolution_commit: null
---

# Cambios aprobados

Conservar título, descripción y CTA del hero. Cambiar el texto superior por "Futbol en La Argentina". Ajuste posterior: navegación pública consistente sin Partidos también en Login y restantes rutas anónimas; conservar descubrimiento público mediante CTA y navegación autenticada.

Agregar debajo del hero la sección "Más fácil juntarse a jugar", con tres slides de textos aprobados: Elegí dónde jugar, Anotate a un partido y Sumá a tus compañeros. Carrusel manual con scroll snap e indicadores accesibles, sin reproducción automática ni dependencias nuevas. Ajuste posterior solicitado: tarjetas compactas y más cuadradas, superficies menos sólidas y transición suave; retirar Anterior/Siguiente conservando contenido, teclado y swipe. Mantener temas y reduced motion. Quitar signos de interrogación de apertura también en las preguntas de login/registro.

Frontend implementa; Testing valida de forma independiente. Sin cambios backend, reservas, catálogo ni seguridad de sesión. No se crean cuentas de prueba en la base de desarrollo. Ejecutar lint, typecheck, unitarios, build y navegador funcional acotado. No se realiza revisión visual ni capturas por solicitud del usuario. No se hace commit.

## Orden de ejecución solicitado

1. Unificar Navbar pública y extraer componentes reutilizables de estructura.
2. Implementar not-found del App Router y primitivas compartidas para skeletons de carga y estados vacíos con orientación/acciones. Integrarlas en partidos, recuperación de sesión, perfil e historial sin alterar las consultas ni sus claves privadas.
3. Finalizar el carrusel compacto, más cuadrado, translúcido y de transición suave, sin Anterior/Siguiente. Mantener textos e indicadores accesibles, teclado, swipe, sin autoplay y con reduced motion.

Los skeletons corresponden a datos pendientes; un resultado vacío muestra un mensaje útil y acciones. La validación visual de cada sección corresponde al usuario.

## Cierre y evidencia final

Etapas completadas en el orden solicitado. Header y Footer son componentes de presentación separados de Shell; las consultas y el aviso de sesión conservan sus reglas. Skeleton, LoadingState y EmptyState son primitivas reutilizables con composición específica por feature. MatchCard conserva todos los detalles del partido y reutiliza los formateadores. La 404 utiliza el layout existente, sin duplicar navegación.

- Lint, typecheck y build completos aprobados; unitarios finales 48/48 (API 16, frontend 32).
- Playwright funcional: 5/5 en 17,9 segundos sobre el frontend final compilado y la API de desarrollo existente, en orden navegación, 404/estados y carrusel.
- Verificados HTTP 404 real, enlaces de recuperación, skeletons que desaparecen al llegar datos, Abasto sin partidos con acción para abrir el selector, navegación pública consistente y carrusel con indicadores, teclado, swipe y reducción de movimiento.
- `git diff --check` y estado revisados. No se modificaron datos, se crearon cuentas ni se enviaron emails en la validación funcional. No se repitió integración backend porque no cambiaron modelos ni contratos.
- Documentación relevante en [FRONTEND.md](../../../apps/web/FRONTEND.md) y [tests/README.md](../../../tests/README.md).

La aplicación queda levantada en localhost:3000 con la API en localhost:3001. No se realizaron capturas ni comprobaciones de aspecto; la validación visual queda pendiente del usuario. No se realizó commit.
