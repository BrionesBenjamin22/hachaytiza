---
id: UI-CAROUSEL-02
title: Carrusel de propósito con perspectiva 3D
status: finished
phase: product
depends_on: [LAND-01]
created_at: 2026-10-07T15:45:21-03:00
updated_at: 2026-10-07T15:52:03-03:00
started_at: 2026-10-07T15:45:21-03:00
resolved_at: 2026-10-07T15:52:03-03:00
resolution_commit: null
---

Modificar únicamente el carrusel de propósito: tarjetas algo más grandes y disposición 3D con tarjeta principal frontal y laterales en perspectiva. Conservar los tres textos aprobados, indicadores, teclado, swipe, temas y reducción de movimiento. Sin autoplay ni botones Anterior/Siguiente. No modificar la 404 aprobada, navbar, hero ni autenticación. Sin nuevas dependencias.

Frontend implementa y Testing valida independientemente. Ejecutar lint, typecheck, unitarios, build y navegador funcional del carrusel. No repetir integración backend: no cambian contratos o persistencia. Sin capturas ni comprobaciones de aspecto por solicitud del usuario. No realizar commit y dejar la aplicación levantada.

## Validación final

Lint, typecheck y build aprobados. Unitarios: frontend 36/36 con pool threads y un worker; API 16/16. Total: 52. Testing independiente: suite pública de navegador 5/5 en 11,6 segundos, incluyendo los dos casos relevantes de indicadores, teclado y swipe real. El filtro también coincidió con el nombre del archivo y ejecutó los casos públicos existentes; todos fueron de sólo lectura y no se repitieron al pasar.

Textos aprobados preservados, navegación manual con extremos, sin autoplay ni Anterior/Siguiente. Gestos verticales y cancelados no cambian de tarjeta. Reducción de movimiento desactiva la transición CSS. Archivos de la 404 y bloque CSS de la 404 comparados con sus versiones aprobadas, sin modificaciones. Documentación frontend y tests actualizada, diff y estado revisados. No corresponde nueva integración backend porque no cambian contratos o persistencia.

El filtro exacto de los dos casos de carrusel también terminó antes del aviso de evitar repeticiones: 2/2 aprobados en 7,0 segundos. No quedaron pruebas en ejecución.

Frontend levantado en localhost:3000. Sin capturas, comprobaciones de aspecto, datos modificados ni commit. La validación visual corresponde al usuario.

## Ajuste de legibilidad posterior

Por solicitud del usuario, las tarjetas usan el fondo opaco de cada tema y mantienen opacidad completa también en los laterales. Se conserva la perspectiva y la transición 3D. El contador de posición queda sólo para lectores de pantalla mediante `sr-only`; los indicadores siguen visibles. No se modificó la 404.

Lint, typecheck, build frontend y los cuatro tests existentes del carrusel aprobados. Revisión independiente de Testing sobre la fuente aprobada. No se añadieron tests nuevos ni se repitió navegador: es un cambio de presentación acotado y reversible, sin nueva lógica de navegación, contratos o persistencia. Aplicación levantada, sin comprobaciones de aspecto ni commit.
