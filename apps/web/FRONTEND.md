# Vertical slice de Hacha y Tiza

## Vistas

- `/`: presentación breve para visitantes; Home de partidos disponibles para usuarios autenticados, iniciado con `user.primaryLocation`. Una sesión sin localidad redirige a `/auth/location`.
- `/partidos`: descubrimiento público con el mismo listado y filtros del Home.
- `/account/profile`: edición del nombre y localidad principal, email de solo lectura, auditoría e historial con páginas de 3 cambios. Envía exclusivamente diferencias; sin cambios no llama al backend.
- `/account/security`: contraseña actual, nueva y confirmación. El backend revoca todas las sesiones; el cliente limpia datos privados y vuelve al login con mensaje de éxito.
- `/account/appearance`: tema claro, oscuro o sistema. Persiste exclusivamente una preferencia visual en `hyt-theme-v1`; no contiene datos de autenticación.
- `/auth/register`: nombre, email, contraseña (12 a 128 caracteres) y localidad de catálogo. Registro crea sesión y dirige al Home.
- `/auth/login`: ingreso y restauración de datos mediante `/auth/session`.
- `/auth/location`: requiere sesión vigente; completa únicamente la localidad faltante mediante `PATCH /users/me/location`.
- `/auth/forgot-password`: solicitud con respuesta genérica para evitar enumeración.
- `/auth/reset-password#token=...` y `/auth/verify-email#token=...`: capturan el token en memoria, retiran el fragmento de la URL y requieren confirmación explícita. Un nuevo enlace en la misma pantalla reemplaza el token y limpia el formulario; una respuesta anterior no altera el enlace nuevo. Referrer policy `no-referrer`, sin indexación.

Los enlaces nuevos abiertos sobre la misma pantalla se capturan también mediante `hashchange`: se retira el fragmento, se limpia el formulario y su resultado anterior. Las respuestas de una solicitud anterior no borran el token ni alteran el resultado del enlace nuevo. No se ejecutan mutaciones al navegar al enlace.

## Módulos y contratos

`features/auth/service.ts` define DTOs de sesión y usuario y las mutaciones de autenticación. `features/locations/service.ts` consume `GET /locations` (`{items}`) y `features/matches/service.ts` consume `GET /matches?locationId=<uuid>&page=<n>` (`{items,total,page,pageSize,hasMore}`). El backend conserva las reglas del listado y páginas de 9; el cliente ofrece carga progresiva. Fechas se muestran en `America/Argentina/Buenos_Aires`, precios en ARS.

TanStack Query gestiona estado remoto; `useLocations` reutiliza el catálogo. React Hook Form controla formularios y Zod valida nombre, email, contraseña y UUID de localidad. `session.tsx` recupera sesión autoritativa, programa aviso configurable y expiración. El selector temporal vive en memoria del provider, asociado a la identidad; no actualiza el perfil y se limpia al logout. No se agregaron operaciones de reserva ni publicación a esta slice.

`components/shell.tsx` compone `SiteHeader` y `SiteFooter`, conserva el aviso de sesión, feedback y acceso rápido por teclado al contenido. `site-header.tsx` recibe únicamente el estado autenticado para presentar la navegación; `site-footer.tsx` presenta el pie compartido. La navegación pública ofrece Ingresar y Crear cuenta en todas las rutas; Partidos y Mi cuenta se muestran únicamente con sesión vigente. Estados remotos incluyen carga, vacío, error y reintento. La base es mobile-first, con etiquetas, foco visible y anuncios accesibles. Las páginas son Server Components; formularios y estado remoto son Client Components.

## Segunda iteración: cuenta y presentación

`features/account/service.ts` consume `GET /users/me`, `PATCH /users/me` (`{name?,primaryLocationId?}`), `GET /users/me/history?page=n` y `POST /auth/password/change` (`{currentPassword,newPassword}`). El DTO privado agrega `hasLocalPassword`, `createdAt` y `updatedAt`. No se cambia email ni se introduce teléfono. Las consultas privadas usan claves que incluyen `session.user.id`; no se reutilizan datos de una cuenta al ingresar con otra. El historial muestra sólo cambios de campos, en páginas de 3.

`features/locations/location-combobox.tsx` reutiliza catálogo y búsqueda por nombre en registro, selección pendiente, Home y perfil. Usa cmdk + Radix Popover con opciones accesibles, teclado, Escape, retorno de foco y estados remotos. `components/account-menu.tsx` usa Radix Dropdown Menu: Perfil, Seguridad, Apariencia y Cerrar sesión. Los íconos son Lucide decorativos; todas las acciones tienen texto o nombre accesible. No se agregan destinos futuros.

La paleta de club azul/gris incorpora superficies translúcidas moderadas, tokens claros/oscuros y bordes de controles con contraste. No carga fuentes, imágenes ni scripts de terceros. `public/theme-init.js` aplica la preferencia antes de pintar mediante script estático del mismo origen, compatible con CSP `script-src 'self'`; no se altera la política de seguridad. `useTheme` escucha cambios de sistema y navegador; si storage está bloqueado conserva la selección sólo en memoria. `suppressHydrationWarning` se aplica exclusivamente a `html`, cuyos atributos modifica el bootstrap. Se respeta `prefers-reduced-motion`.

## Componentes compartidos y estados

Los elementos reutilizables de presentación viven en `components/`: `SiteHeader`, `SiteFooter`, menú de cuenta y `ui/`. Se mantienen separados de los services, hooks y reglas de cada feature; `Shell` conserva su composición y el aviso de sesión.

- `ui/skeleton.tsx`: `Skeleton({className?})` ofrece placeholders decorativos con `aria-hidden`, dimensiones ajustables por clase y animación deshabilitada con `prefers-reduced-motion`.
- `ui/loading-state.tsx`: `LoadingState({label,children?})` anuncia una sola etiqueta con `role=status` y `aria-live=polite`. Sus hijos son placeholders excluidos del árbol accesible; no presenta datos ficticios.
- `ui/empty-state.tsx`: `EmptyState({title,description,action?})` explica un resultado vacío real en una superficie glass y admite una acción útil fuera del anuncio. No contiene skeletons ni inventa acciones.

Estas piezas reutilizan los tokens de ambos temas y no dependen de autenticación, almacenamiento, llamadas HTTP ni infraestructura nueva. La integración de loading y empty corresponde a cada feature y mantiene separados carga pendiente, resultado vacío y error.

Partidos compone `MatchesLoading` durante la consulta y `MatchCard` para los resultados reales; la tarjeta reutilizable conserva los campos y formatos anteriores. Cuando falta localidad o el resultado está vacío, `EmptyState` abre el selector existente para elegir otra zona, sin modificar la localidad principal. `SessionLoading` se comparte entre Home, acceso a Cuenta y selección de localidad; `ProfileLoading` y el historial reutilizan las mismas primitivas. El historial vacío ofrece acceso al campo de nombre mediante Editar perfil. Las consultas, sus claves por identidad y los permisos permanecen intactos.

## Seguridad y configuración

`lib/http.ts` envía `credentials: include`, deshabilita caché HTTP y obtiene CSRF fresco antes de toda mutación. No lee cookies HttpOnly ni almacena credenciales en storage. No hay refresh automático: Mantener/Recuperar sesión solicita `POST /auth/refresh` y luego vuelve a consultar sesión. Expiración elimina la identidad expuesta y los endpoints protegidos deben seguir validando en backend. El error técnico del servidor no se registra; fallos 5xx reciben mensaje seguro con reintento.

Variables públicas: `NEXT_PUBLIC_API_URL` incluye `/api/v1`, por defecto `http://localhost:3001/api/v1`; `NEXT_PUBLIC_SESSION_WARNING_SECONDS`, por defecto `120`. No son secretos. Producción requiere API HTTPS y CORS explícito compatible con cookies, configurados en backend bajo dominios controlados.

## Validación

`pnpm --filter web lint`, `typecheck`, `test`, `build`. Vitest/RTL cubren registro, ubicación inicial, cambio temporal, localidad faltante, perfil e historial, aislamiento de caché entre identidades y protección de tokens de email; HTTP cubre credenciales, CSRF fresco y ausencia de renovación automática. La persistencia real, recuperación, temas y cookies del navegador se verifican en tests de integración/E2E de la slice.
