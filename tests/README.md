# Validación de las vertical slices de Hacha y Tiza

Las pruebas utilizan exclusivamente servicios locales y una base PostgreSQL aislada. No ejecutarlas contra producción. La suite de integración rechaza URLs que no apunten a `localhost` o `127.0.0.1` y a una base llamada `hyt_slice` o `hyt_slice_test`. Eliminar únicamente fixtures creados por la suite preserva los seeds.

## Preparación

Desde la raíz, instalar dependencias con `pnpm install`. Crear una base local vacía `hyt_slice_test`, definir `DATABASE_URL` y ejecutar las migraciones. El puerto debe coincidir con el PostgreSQL local utilizado; el ejemplo usa el puerto 55432.

```powershell
$env:DATABASE_URL='postgresql://hyt_test@127.0.0.1:55432/hyt_slice_test?schema=public'
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate deploy
$env:NODE_ENV='development'
pnpm --filter api exec tsx prisma/seed.ts --development
```

El seed de desarrollo crea partidos ficticios en Tolosa, City Bell y Los Hornos. No usar `--development` en producción. Los tests de integración crean y eliminan sus propios usuarios, localidades y partidos; los tests de navegador generan cuentas ficticias únicas en esta base descartable.

## Integración API y persistencia

```powershell
pnpm test:integration
```

Supertest recorre NestJS real, cookies, CSRF, JWT, Argon2id y Prisma contra PostgreSQL real. Únicamente `EmailService.send` se sustituye para capturar enlaces de verificación/reset sin enviar emails externos. La configuración de tests provee secretos ficticios; no requiere secretos productivos.

Cobertura: registro/localidad persistida, privacidad de DTOs, cookies Secure/HttpOnly, credenciales persistidas como hashes, CSRF, Origin, identidad no confiable, filtro público por localidad, fechas futuras/estados, paginación de nueve, login/logout, onboarding con localidad nula, access expirado, renovación explícita, rotación/reuso de refresh, verificación/reset expirable y de uso único, revocación y rate limiting.

Los casos concurrentes envían dos requests simultáneos de refresh, verificación y reset. Comprueban que no quedan sesiones utilizables tras reuso de refresh y que los tokens de email se consumen una sola vez. También verifican las restricciones PostgreSQL de precio/capacidad no negativos y participación activa única por usuario y fecha local.

`apps/api/test/profile-security.e2e-spec.ts` agrega cuatro casos independientes para la segunda iteración: perfil propio e historial privado paginado por tres con actualizaciones parciales, validación de identidad/campos, contraseña actual y nueva con revocación de todas las sesiones/cookies/enlaces pendientes, y dos carreras deterministas de login ya verificado contra reset y cambio de contraseña. Las carreras suspenden únicamente la llamada interna de creación de sesión en el test; la transacción, el bloqueo de fila y la persistencia siguen siendo reales.

## Navegador móvil

Instalar Chromium con `pnpm exec playwright install chromium`. Construir la API con `pnpm --filter api build` y el frontend con `pnpm --filter web build`. Iniciar solamente el frontend en `http://localhost:3000`. El frontend usa `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` al construirse. Dejar libre el puerto 3001: Playwright inicia automáticamente NestJS construido contra la base aislada y lo cierra al finalizar. Las cookies permanecen Secure incluso en localhost.

```powershell
pnpm test:e2e
```

Playwright utiliza Chromium instalado, viewport móvil y servicios reales. El harness `tests/support/harness.ts` sustituye únicamente `EmailService.send`, conservando los enlaces en memoria del proceso de pruebas. No agrega endpoints, inbox HTTP, autenticación ficticia ni mecanismos al código de producción. Esto permite recorrer en navegador verificación y recuperación con enlaces válidos, inválidos, expirados y reutilizados, además de comprobar revocación de sesiones.

Cubre registro/login, Tolosa inicial, restauración por recarga, City Bell temporal sin modificar perfil y mantenido durante navegación SPA, logout/login restaurando Tolosa, protección de rutas, visita pública y selección persistida para cuentas sin localidad. El combobox se recorre con búsqueda y teclado. También verifica carga, recuperación de errores de transporte y una localidad real vacía (Abasto). Sólo este último caso provoca deliberadamente un fallo de red; los datos y respuestas exitosas siguen proviniendo del backend y PostgreSQL reales.

La segunda iteración añade landing, perfil con payload de diferencias reales y ausencia de requests sin cambios, contraseña con cierre de todas las sesiones, temas light/dark/system persistidos, reduced motion y aislamiento de caché entre usuarios. El último caso conserva el mismo proceso SPA sin logout ni recarga para demostrar que un login posterior no muestra perfil/historial de la identidad anterior. Las capturas de temas se escriben exclusivamente en `.runtime/`, ignorado por Git.

`E2E_WEB_URL` permite cambiar la URL del frontend; ajustar CORS del harness si se cambia su origen. `DATABASE_URL` es obligatorio para todo el harness. El puerto de API del harness es 3001 y no debe usarse simultáneamente por otro servidor. Las trazas están deshabilitadas para evitar almacenar credenciales o headers de cookies. No versionar resultados de pruebas.

### Landing y carrusel sin modificar datos existentes

`tests/landing-carousel.spec.ts` usa Playwright base, sin importar el harness de autenticación. Se ejecuta contra frontend y API locales ya iniciados y sólo recorre rutas públicas: no inicia otro servidor API, no crea cuentas, no sustituye email y no modifica la base. No genera capturas ni realiza revisión visual. La navegación autenticada se valida con los unitarios del frontend.

```powershell
pnpm exec playwright test tests/landing-carousel.spec.ts
```

No ejecutar todos los archivos contra la API de desarrollo: las suites con harness requieren su base aislada y el puerto 3001 libre, como se explica arriba.

## Verificaciones finales

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Un fallo o una validación requerida pendiente impide considerar la slice lista para commit. La entrega del proyecto no crea commits automáticamente.

## Evidencia de validación del 6 de octubre de 2026

Resultado de pruebas: **pass**. Integración API: 15/15 casos contra PostgreSQL real `hyt_slice_test`, después de aplicar ambas migraciones. Pruebas unitarias del proyecto: 19/19. Navegador móvil: 4/4 casos con Chromium y servicios construidos localmente. Lint, typecheck, build y `git diff --check` pasaron. La orquestación repitió el recorrido de navegador sobre los servicios reiniciados con el build final: 4/4 aprobados. La inspección visual del Home a 390 px no mostró desbordamiento horizontal.

| Criterio | Evidencia |
| --- | --- |
| Registro con localidad persistida | API consulta `User.primaryLocationId`; navegador registra en Tolosa y accede al Home. |
| Login, sesión y restauración | Login entrega sesión sin tokens en DTO; recarga mantiene identidad y filtro Tolosa. |
| Filtro inicial y listado real | Home inicial Tolosa; API excluye pasados/cancelados, incluye completos y ordena por inicio. |
| Cambio temporal | Navegador muestra resultados City Bell y consulta sesión con principal Tolosa; API confirma persistencia sin cambios. |
| Logout y login posterior | Logout revoca credenciales copiadas; nuevo login retorna al filtro Tolosa. |
| Cuenta sin localidad | Fixture legacy sin localidad inicia sesión, selecciona City Bell y persiste antes de acceder al Home. |
| Sesión expirada y renovación | Access expirado devuelve usuario nulo y refresh disponible; refresh explícito rota; refresh expirado se rechaza. |
| Seguridad observable | Cookies Secure/HttpOnly; almacenamiento cliente vacío; CSRF ausente/Origin ajeno rechazados; identidad inyectada rechazada; hashes no expuestos. |
| Verificación y recuperación | Tokens con hash, expiración y uso único; respuesta genérica a email desconocido; reset revoca sesiones e invalida contraseña anterior. |
| Concurrencia | Dos refresh simultáneos no dejan sesiones utilizables; verify/reset simultáneos sólo permiten un consumo. |
| Límites y regresiones | Paginación 9+1 y página cero inválida; restricciones PostgreSQL de precio, capacidad y participación diaria; rate limiting devuelve 429; health/OpenAPI mantienen contratos. |
| UX de estados | Carga visible, error de transporte con reintento exitoso y Abasto vacío; navegación pública y protección de selección de perfil. |

Se detectó durante la ejecución que la base aislada no tenía aplicada la migración de restricciones; las pruebas lo rechazaron correctamente. Aplicar la migración y volver a ejecutar produjo 15/15. Los ajustes de espera de respuestas HTTP, CSRF rotado y timeouts de Argon2 fueron correcciones del harness, sin cambiar expectativas funcionales ni controles.

Alcance externo: envío real a Resend y políticas de cookies bajo dominios productivos no fueron ejecutados; la entrega prueba el contrato de email mediante sustitución del transporte y el flujo local de sesiones. Security Reviewer aprobó sin bloqueos abiertos y la orquestación confirmó el build final. No se realizó commit.

## Evidencia de validación del 7 de octubre de 2026: SLICE-02

Resultado de pruebas: **pass**. La suite completa de integración aprobó **19/19** casos contra PostgreSQL real con las tres migraciones. Los cuatro casos nuevos de perfil/credenciales también se ejecutaron después de añadir comprobaciones de segunda identidad e invalidación de enlaces pendientes: **4/4**. La ejecución final de Chromium aprobó **9/9 en 35,1 segundos**, contra el último frontend construido y NestJS real iniciado por el harness. La orquestación confirmó lint, typecheck, build y **37/37 unitarios** (16 API, 21 frontend); `git diff --check` aprobó.

| Criterio de SLICE-02 | Evidencia independiente |
| --- | --- |
| Landing y descubrimiento público | Visitante a 375 px accede al registro o a partidos sin sesión; footer menciona Argentina. |
| Registro y localidad | Combobox buscable recorrido con teclado; Tolosa persiste y filtra inicialmente; City Bell temporal cambia resultados sin modificar el perfil. |
| Perfil propio e historial | GET/PATCH requieren sesión; identidad inyectada y campos no editables se rechazan; segunda cuenta sólo ve su perfil/historial. Historial registra diferencias y pagina 3+1. |
| Edición parcial y feedback | Formulario sin cambios no hace PATCH; cambios de nombre/localidad envían únicamente el campo modificado y muestran éxito; Email permanece readonly. |
| Cambio de contraseña | Contraseña actual incorrecta, nueva inválida y CSRF ausente se rechazan. Cambio válido revoca todas las sesiones, elimina cookies e invalida enlaces RESET pendientes; login anterior falla y el nuevo funciona. |
| Carreras de credenciales | Login suspendido después de verificar el hash pierde contra reset o cambio de contraseña; no crea una sesión con credenciales anteriores. Bloqueos y transacciones usan PostgreSQL real. |
| Recuperación y verificación en navegador | Enlaces reales capturados en memoria verifican email; reset inválido, expirado y reutilizado se rechazan. Reset válido revoca sesión y permite sólo la nueva contraseña. Se cambia el token dentro de la misma ruta. |
| Privacidad de caché | Se conserva la SPA: A carga perfil/historial, se revoca A y B inicia sesión sin logout ni recarga. Con la respuesta privada de B demorada, nunca se renderizan email ni historial de A. |
| Apariencia y accesibilidad observada | Claro/oscuro/sistema persisten sin almacenar tokens; sistema responde a cambios del dispositivo; reduced motion elimina transiciones/animaciones; no hay desbordamiento horizontal. Contraste calculado de texto ≥4,5 y controles/foco ≥3 en ambos temas, incluyendo composición del panel translúcido sobre el fondo. |
| Regresiones de primera slice | Los cuatro casos originales siguen aprobados: restauración de filtro tras login, onboarding de localidad nula, rutas protegidas y estados loading/error recuperable/empty. |

Se detectaron dos defectos reales durante la revisión: claves de caché privadas sin identidad de usuario y captura de token que no reaccionaba a un enlace nuevo dentro de la misma ruta. Frontend corrigió ambos y la ejecución final conservó las expectativas originales. Un intento de refetch con un evento de visibilidad incorrecto se corrigió en el harness; una ejecución interrumpida durante una reconstrucción compartida no se utilizó como evidencia del producto.

Se inspeccionaron las capturas finales `.runtime/iteration2-landing-dark.png`, `.runtime/iteration2-home-light.png`, `.runtime/iteration2-dark.png` y `.runtime/iteration2-light.png`: texto, iconos, CTAs y cancha se renderizan completos; Home muestra un título sin repetir el filtro y las vistas móviles no se desbordan. Las capturas deshabilitan animaciones para evitar estados intermedios. No se versionan imágenes ni trazas con credenciales.

Límites: el transporte real de email y los dominios de producción siguen fuera de esta validación local; las comprobaciones de contraste cubren los tokens y superficies observados, no constituyen una auditoría WCAG completa. Security Reviewer aceptó SLICE-02 sin bloqueos abiertos en `docs/tasks/finished/SLICE-02-security-review.md`. Recomendación de testing: aceptar el alcance validado. No se realizó commit.

## Evidencia funcional del 7 de octubre de 2026: LAND-01

Esta primera evidencia corresponde al alcance anterior de LAND-01, previo a la navegación pública unificada y al carrusel sin botones Anterior/Siguiente. La validación final vigente se registra en la sección siguiente.

Resultado: **pass**. `pnpm exec playwright test tests/landing-carousel.spec.ts` aprobó **3/3 en 8,2 segundos** sobre el frontend compilado final y la API local existente. No se inició el harness API, no se crearon cuentas ni se modificaron datos. La orquestación confirmó lint, typecheck, build y **43/43 unitarios** (16 API, 27 frontend).

Los casos independientes comprueban el texto exacto "Futbol en La Argentina", hero y CTAs conservados, ausencia de Partidos sólo en la landing visitante, acceso público a `/partidos`, registro/login sin signos de interrogación de apertura y ausencia de requests mutables. El carrusel conserva las tres copias aprobadas; controles Anterior/Siguiente deshabilitados en sus límites, indicadores con `aria-current`, activación con Enter y navegación ArrowLeft/ArrowRight/Home/End funcionan. Cada acción comprueba también que el scroll termina en la diapositiva seleccionada, no sólo el estado accesible. Un gesto táctil Chromium real desplaza hasta la segunda diapositiva y actualiza su indicador. No hay reproducción automática en la fuente; una observación acotada confirma que el carrusel permanece en la selección manual.

Un primer intento de gesto con `Input.synthesizeScrollGesture` no desplazó el track. Se corrigió el generador del test usando `touchStart`, movimientos y `touchEnd`, verificando que las coordenadas alcanzan el track. La prueba dirigida y la suite final aprobaron sin cambiar producción ni expectativas.

No se ejecutaron las nueve pruebas con harness contra la base de desarrollo: el cambio no modifica persistencia, autenticación ni contratos backend y los datos del usuario se preservaron. La navegación autenticada y reduced motion están cubiertos por los unitarios del frontend. Por instrucción del usuario, esta etapa no incluyó capturas, comprobaciones de contraste, inspección visual ni valoración del diseño. Recomendación de testing: aceptar el alcance funcional validado. No se realizó commit.

## Validación final LAND-01 por fases: navegación, estados y carrusel

Resultado: **pass**. La ejecución final de `tests/landing-carousel.spec.ts` aprobó **5/5 en 17,9 segundos** sobre el último frontend compilado. La orquestación confirmó lint, typecheck, build y **48/48 unitarios** (16 API, 32 frontend). Las pruebas se ejecutaron en el orden solicitado:

1. **Navegación reutilizable:** landing, partidos, registro y login mantienen la navegación anónima sin Partidos; el CTA conserva acceso al descubrimiento público. Hero y textos aprobados permanecen. Las páginas de autenticación no muestran signos de interrogación de apertura. La navegación autenticada se cubre en los unitarios de frontend, sin crear cuentas nuevas.
2. **404 y estados de datos:** una ruta inexistente responde HTTP 404, muestra una sola cabecera/footer y sus enlaces llevan al inicio o a partidos. Una request GET de partidos demorada mantiene el estado de carga con `aria-busy` y skeletons ocultos a tecnologías de asistencia. Al liberar la request real, Abasto devuelve cero partidos; aparecen explicación y acción Cambiar localidad, que abre el buscador y le da foco. Escape mantiene la selección actual. No se fabrican respuestas vacías ni se alteran datos del catálogo.
3. **Carrusel manual final:** se conservan las tres copias; no existen Anterior/Siguiente. Indicadores responden a Enter y Space; teclado ArrowLeft/ArrowRight/Home/End respeta extremos. Cada transición termina en su posición real y actualiza `aria-current`. El test observa `scrollTo` sin sustituirlo: solicita smooth normalmente y auto con reduced motion. El gesto táctil real conserva scroll snap e indicador. La fuente no contiene autoplay y una observación finita conserva la selección manual.

Una ejecución previa obtuvo 4/5 por una suposición incorrecta del nombre accesible del input cmdk: el contenedor Command lo nombra Localidades. Se corrigió el selector de test al placeholder público estable Buscar localidad…, comprobando además el foco. La suite final aprobó sin cambiar producción ni criterios.

No se inició otro backend ni se usó el harness de autenticación; la API existente sólo recibió consultas públicas. No se enviaron emails, crearon cuentas, escribieron datos ni realizaron commits. Por solicitud explícita del usuario no hubo capturas, snapshots, valoración visual, controles de aspecto ni pruebas de contraste. Los estilos quedan para su revisión. Las nueve pruebas de la slice anterior no se repitieron contra los datos de desarrollo; los cambios no alteran persistencia ni contratos de autenticación. Recomendación: aceptar el alcance funcional probado.

## Ajuste posterior de 404: NotFoundGlitch

Validación independiente de navegador: **pass, 1/1 en 11,4 segundos**, ejecutando únicamente `pnpm exec playwright test tests/landing-carousel.spec.ts --grep 'unknown route'` sobre el frontend compilado final. Una ruta inexistente mantiene HTTP 404 y una única cabecera/footer; el heading accesible conserva el código 404 aunque sus glifos decorativos cambien, y vuelve a mostrar 404 al terminar el scramble. El subtítulo y ambos enlaces de recuperación funcionan. Una segunda visita con reduced motion mantiene HTTP 404 y el código decorativo 404 sin esperar animación. La revisión de fuente confirma exclusión de glifos decorativos del árbol accesible, guard de reduced motion y cancelación del RAF al desmontar.

La orquestación confirmó lint, typecheck, build y **52/52 unitarios**: API 16/16; frontend 36/36 en seis archivos mediante `pnpm --filter web test --pool=threads --maxWorkers=1` (75,11 segundos). El intento con pool fork predeterminado agotó el tiempo de inicio antes de ejecutar casos; el reintento con threads y un worker aprobó sin cambiar la configuración del proyecto ni las expectativas. `git diff --check` aprobó. No se añadieron pruebas de persistencia ni se repitieron las otras pruebas funcionales porque el ajuste modifica únicamente 404 y no hay cambios backend. Recomendación: aceptar el alcance funcional validado. No hubo capturas, snapshots, revisión de aspecto, cuentas, emails, escrituras en base ni commits.

## Ajuste posterior: carrusel con escenario 3D

Resultado funcional: **pass**. Los dos casos adaptados verifican el estado activo y su copia, una sola diapositiva expuesta a tecnologías de asistencia, indicadores con Enter/Space, teclado con extremos, ausencia de Anterior/Siguiente y selección manual sin autoplay. Las mismas acciones siguen funcionando con reduced motion. Gestos táctiles reales cambian a la segunda diapositiva, vuelven a la primera y respetan el extremo inicial. No se utilizan posiciones de scroll: el escenario ahora cambia el estado de las tarjetas sin scroll snap.

La primera ejecución con `--grep 'carousel|swipe'` coincidió también con el nombre del archivo y ejecutó los cinco casos funcionales: **5/5 en 11,6 segundos**. El filtro de títulos `--grep 'manual carousel|real mobile swipe'` seleccionó exactamente los dos casos del carrusel: **2/2 en 7,0 segundos**. El código y el caso de 404 no se modificaron; la ejecución adicional sólo recorrió las rutas públicas existentes.

Orquestación confirmó lint, typecheck, build y **52/52 unitarios** (frontend 36/36 con pool threads y un worker en 50,62 segundos; API 16/16 en 2,02 segundos). No hubo capturas, snapshots, pruebas de transforms, tamaños, colores ni valoración visual. Tampoco cuentas, emails, escrituras de datos o commits. La representación visual del escenario 3D queda para la revisión del usuario. Recomendación: aceptar el comportamiento funcional probado.
