# Vertical slice de Hacha y Tiza

## Vistas

- `/`: presentación breve para visitantes; Home de partidos disponibles para usuarios autenticados, iniciado con `user.primaryLocation`. Una sesión sin localidad redirige a `/auth/location`.
- `/partidos`: descubrimiento público con el mismo listado y filtros del Home.
- `/account/profile`: edición del nombre y localidad principal, email de solo lectura, auditoría e historial con páginas de 3 cambios. Envía exclusivamente diferencias; sin cambios no llama al backend.
- `/account/security`: contraseña actual, nueva y confirmación. El backend revoca todas las sesiones; el cliente limpia datos privados y vuelve al login con mensaje de éxito.
- `/account/appearance`: tema claro, oscuro o sistema. Persiste exclusivamente una preferencia visual en `hyt-theme-v1`; no contiene datos de autenticación.
- `/auth/register`: nombre, email, contraseña (8 a 128 caracteres) y localidad de catálogo. Registro crea sesión y dirige al Home.
- `/auth/login`: ingreso y restauración de datos mediante `/auth/session`.
- `/auth/location`: requiere sesión vigente; completa únicamente la localidad faltante mediante `PATCH /users/me/location`.
- `/auth/forgot-password`: solicitud con respuesta genérica para evitar enumeración.
- `/auth/reset-password#token=...` y `/auth/verify-email#token=...`: capturan el token en memoria, retiran el fragmento de la URL y requieren confirmación explícita. Un nuevo enlace en la misma pantalla reemplaza el token y limpia el formulario; una respuesta anterior no altera el enlace nuevo. Referrer policy `no-referrer`, sin indexación.

Por decisión temporal del usuario, las contraseñas de registro, restablecimiento y cambio aceptan entre 8 y 128 caracteres. `passwordSchema` centraliza la política y las ayudas muestran el mismo rango. Login conserva su validación de presencia en frontend (mínimo 1 y máximo 128); el DTO del backend valida el rango de 8 a 128 también al ingresar.

Los enlaces nuevos abiertos sobre la misma pantalla se capturan también mediante `hashchange`: se retira el fragmento, se limpia el formulario y su resultado anterior. Las respuestas de una solicitud anterior no borran el token ni alteran el resultado del enlace nuevo. No se ejecutan mutaciones al navegar al enlace.

## Módulos y contratos

`features/auth/service.ts` define DTOs de sesión y usuario y las mutaciones de autenticación. `features/locations/service.ts` consume `GET /locations` (`{items}`) y `features/matches/service.ts` consume `GET /matches?locationId=<uuid>&page=<n>` (`{items,total,page,pageSize,hasMore}`). El backend conserva las reglas del listado y páginas de 9; el cliente ofrece carga progresiva. Fechas se muestran en `America/Argentina/Buenos_Aires`, precios en ARS.

TanStack Query gestiona estado remoto; `useLocations` reutiliza el catálogo. React Hook Form controla formularios y Zod valida nombre, email, contraseña y UUID de localidad. `session.tsx` recupera sesión autoritativa, programa aviso configurable y expiración. El selector temporal vive en memoria del provider, asociado a la identidad; no actualiza el perfil y se limpia al logout. No se agregaron operaciones de reserva ni publicación a esta slice.

`components/shell.tsx` compone `SiteHeader` y `SiteFooter`, conserva el aviso de sesión, feedback y acceso rápido por teclado al contenido. `site-header.tsx` recibe únicamente el estado autenticado para presentar la navegación; `site-footer.tsx` presenta el pie compartido. La navegación pública ofrece Ingresar y Crear cuenta en todas las rutas; Partidos y Mi cuenta se muestran únicamente con sesión vigente. Estados remotos incluyen carga, vacío, error y reintento. La base es mobile-first, con etiquetas, foco visible y anuncios accesibles. Las páginas son Server Components; formularios y estado remoto son Client Components.

## Segunda iteración: cuenta y presentación

`features/account/service.ts` consume `GET /users/me`, `PATCH /users/me` (`{name?,primaryLocationId?}`), `GET /users/me/history?page=n` y `POST /auth/password/change` (`{currentPassword,newPassword}`). El DTO privado agrega `hasLocalPassword`, `createdAt` y `updatedAt`. No se cambia email ni se introduce teléfono. Las consultas privadas usan claves que incluyen `session.user.id`; no se reutilizan datos de una cuenta al ingresar con otra. El historial muestra sólo cambios de campos, en páginas de 3.

`features/locations/location-combobox.tsx` reutiliza catálogo y búsqueda por nombre en registro, selección pendiente, Home y perfil. Usa cmdk + Radix Popover con opciones accesibles, teclado, Escape, retorno de foco y estados remotos. `components/account-menu.tsx` usa Radix Dropdown Menu: Perfil, Seguridad, Apariencia y Cerrar sesión. Los íconos son Lucide decorativos; todas las acciones tienen texto o nombre accesible. No se agregan destinos futuros.

La paleta de club azul/gris incorpora superficies translúcidas moderadas, tokens claros/oscuros y bordes de controles con contraste. No carga fuentes, imágenes ni scripts de terceros. `public/theme-init.js` aplica la preferencia antes de pintar mediante script estático del mismo origen, compatible con CSP `script-src 'self'`; no se altera la política de seguridad. `useTheme` escucha cambios de sistema y navegador; si storage está bloqueado conserva la selección sólo en memoria. `suppressHydrationWarning` se aplica exclusivamente a `html`, cuyos atributos modifica el bootstrap. Se respeta `prefers-reduced-motion`.

## Carrusel informativo de la landing

El hero conserva su título, descripción y acciones; el texto superior es `Futbol en La Argentina`, conforme al texto aprobado. La navegación oculta `Partidos` para visitantes en todas las rutas y conserva la opción en el Home autenticado. Las preguntas de los formularios usan signo de cierre sin signo de apertura y mantienen las tildes.

Debajo del hero, `features/landing/benefits-carousel.tsx` presenta `Más fácil juntarse a jugar`: Elegí dónde jugar, Anotate a un partido y Sumá a tus compañeros. Es información aprobada del producto, sin implementar nuevas operaciones de reserva ni agregar enlaces a flujos futuros.

El carrusel usa un escenario CSS 3D y estado React local, sin nuevas dependencias ni avance automático. El escenario se adapta al ancho de la sección con un máximo de 960 px. Las tarjetas de hasta 480 px usan una proporción cuadrada como tamaño preferido, con altura mínima según el contenido para evitar recortes. La tarjeta activa queda frontal; las laterales usan perspectiva, rotación y profundidad. Todas las tarjetas tienen superficie opaca con `var(--solid)` y opacidad completa en ambos temas, sin blur ni transparencias que superpongan textos y sin modificar los tokens base.

Permite gestos horizontales manuales con Pointer Events, tres indicadores accesibles de 44 px y teclado ArrowLeft/ArrowRight/Home/End sobre el grupo enfocable. No contiene botones Anterior/Siguiente. Los gestos inferiores a 40 px, predominantemente verticales o cancelados no cambian la selección; el desplazamiento vertical de página y pinch zoom siguen habilitados. La navegación respeta los extremos y usa transiciones CSS suaves de 650 ms, desactivadas al solicitar reducción de movimiento. Las diapositivas inactivas tienen `aria-hidden` e `inert`. Un anuncio `sr-only` informa la posición a lectores de pantalla, sin contador visible. Tests unitarios cubren contenido aprobado, indicadores, teclado, gestos y cancelación, ausencia de autoplay y visibilidad contextual de navegación. Las pruebas de navegador cubren también teclado, gesto táctil y reducción de movimiento. La validación visual queda a cargo del usuario.

## Componentes compartidos y estados

Los elementos reutilizables de presentación viven en `components/`: `SiteHeader`, `SiteFooter`, menú de cuenta y `ui/`. Se mantienen separados de los services, hooks y reglas de cada feature; `Shell` conserva su composición y el aviso de sesión.

- `ui/skeleton.tsx`: `Skeleton({className?})` ofrece placeholders decorativos con `aria-hidden`, dimensiones ajustables por clase y animación deshabilitada con `prefers-reduced-motion`.
- `ui/loading-state.tsx`: `LoadingState({label,children?})` anuncia una sola etiqueta con `role=status` y `aria-live=polite`. Sus hijos son placeholders excluidos del árbol accesible; no presenta datos ficticios.
- `ui/empty-state.tsx`: `EmptyState({title,description,action?})` explica un resultado vacío real en una superficie glass y admite una acción útil fuera del anuncio. No contiene skeletons ni inventa acciones.
- `app/not-found.tsx`: 404 del App Router usando `components/ui/be-ui-404-not-found.tsx` (`NotFoundGlitch`). Código 404 grande y centrado, subtítulo `Acá no hay partido`, explicación y enlaces Volver al inicio / Buscar un partido. Sólo renderiza contenido: el layout conserva un único encabezado, main y pie. Next.js maneja el estado HTTP; la prueba de navegador verifica el 404 real. El componente permite configurar código, textos, destinos y clases. Un único ciclo RAF comparte los glifos decorativos durante 700 ms, con actualizaciones cada 45 ms y cancelación al desmontar. El nombre accesible del h1 permanece estable; los glifos y capas de color son decorativos. Motion detecta reducción de movimiento para evitar el ciclo y CSS oculta las capas. No hay autoplay, llamadas API ni persistencia.

Estas piezas reutilizan los tokens de ambos temas y no dependen de autenticación, almacenamiento, llamadas HTTP ni infraestructura nueva. La integración de loading y empty corresponde a cada feature y mantiene separados carga pendiente, resultado vacío y error.

Partidos compone `MatchesLoading` durante la consulta y `MatchCard` para los resultados reales; la tarjeta reutilizable conserva los campos y formatos anteriores. Cuando falta localidad o el resultado está vacío, `EmptyState` abre el selector existente para elegir otra zona, sin modificar la localidad principal. `SessionLoading` se comparte entre Home, acceso a Cuenta y selección de localidad; `ProfileLoading` y el historial reutilizan las mismas primitivas. El historial vacío ofrece acceso al campo de nombre mediante Editar perfil. Las consultas, sus claves por identidad y los permisos permanecen intactos.

## Seguridad y configuración

`lib/http.ts` envía `credentials: include`, deshabilita caché HTTP y obtiene CSRF fresco antes de toda mutación. No lee cookies HttpOnly ni almacena credenciales en storage. No hay refresh automático: Mantener/Recuperar sesión solicita `POST /auth/refresh` y luego vuelve a consultar sesión. Expiración elimina la identidad expuesta y los endpoints protegidos deben seguir validando en backend. El error técnico del servidor no se registra; fallos 5xx reciben mensaje seguro con reintento.

Variables públicas: `NEXT_PUBLIC_API_URL` incluye `/api/v1`, por defecto `http://localhost:3001/api/v1`; `NEXT_PUBLIC_SESSION_WARNING_SECONDS`, por defecto `120`. No son secretos. Producción requiere API HTTPS y CORS explícito compatible con cookies, configurados en backend bajo dominios controlados.

## Validación

`pnpm --filter web lint`, `typecheck`, `test`, `build`. Vitest/RTL cubren registro, ubicación inicial, cambio temporal, localidad faltante, perfil e historial, aislamiento de caché entre identidades y protección de tokens de email; HTTP cubre credenciales, CSRF fresco y ausencia de renovación automática. La persistencia real, recuperación, temas y cookies del navegador se verifican en tests de integración/E2E de la slice.
