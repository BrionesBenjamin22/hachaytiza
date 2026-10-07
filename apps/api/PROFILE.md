# Perfil y cambio de contraseña de Hacha y Tiza

Esta iteración extiende el monolito existente, sin cambiar la estrategia de sesión ni los campos funcionales del usuario. El perfil permite editar nombre y localidad principal. El email es de solo lectura y el teléfono no forma parte del modelo implementado. La localidad del perfil es persistente; la selección temporal del Home permanece independiente.

## Contratos

Todos los endpoints utilizan el prefijo `/api/v1`, autenticación por cookies y autorización sobre la identidad obtenida de la sesión.

| Método y ruta | Datos | Respuesta |
| --- | --- | --- |
| GET `/users/me` | Sin payload | Usuario autenticado |
| PATCH `/users/me` | `{name?,primaryLocationId?}` | Usuario actualizado |
| GET `/users/me/history?page=1` | Página opcional | `{items,total,page,pageSize:3,hasMore}` |
| POST `/auth/password/change` | `{currentPassword,newPassword}` | `{message}` y cookies de autenticación eliminadas |

El DTO de usuario, utilizado también en `/auth/session`, contiene `{id,name,email,emailVerified,hasLocalPassword,createdAt,updatedAt,primaryLocation}`. La localidad es `{id,name,type}` o `null`. Las fechas son timestamps ISO. `hasLocalPassword` es un booleano calculado; jamás se expone el hash. El endpoint anterior `PATCH /users/me/location` se conserva para completar la localidad de usuarios existentes y utiliza la misma operación con historial.

PATCH acepta solamente los campos editables enviados. Rechaza `null`, email, identificadores de usuario, passwords, roles y cualquier propiedad desconocida. El nombre se normaliza con trim y valida entre 2 y 100 caracteres. La localidad debe existir, estar activa y ser seleccionable. Si no hay diferencias, no actualiza `updatedAt` ni genera historial. El frontend evita enviar solicitudes sin cambios.

## Persistencia e historial

La migración `202610070001_profile_history` agrega `UserProfileChange`, relacionada con User sin modificar sus campos funcionales. Cada edición registra un timestamp y diferencias de nombre/localidad. La modificación y el historial se ejecutan en una transacción bajo bloqueo de la fila del usuario; no se generan eventos por campos sin cambios.

Cada item del historial es `{id,occurredAt,changes}`. `changes.name` contiene `{before,after}` de tipo string. `changes.primaryLocation` contiene `{before:{id,name}|null,after:{id,name}}`; solo aparece cuando cambia esa relación. Los nombres se guardan como snapshots para no depender de futuras modificaciones del catálogo. El historial es privado, se obtiene exclusivamente para el dueño de la sesión y se ordena por fecha/UUID descendentes con páginas de tres elementos. Nunca contiene contraseñas, hashes, cookies ni tokens.

## Cambio de contraseña y concurrencia

Se requiere una sesión de acceso válida, prueba de la contraseña actual y ambas contraseñas con longitud de 8 a 128 caracteres, preservando sus bytes sin trim. El mínimo de 8 es una excepción temporal aprobada por el usuario y documentada en `docs/agent/SECURITY.md`. La confirmación de la nueva contraseña es una validación UX del frontend. Cuentas sin contraseña local reciben `LOCAL_PASSWORD_UNAVAILABLE`; la contraseña actual incorrecta produce `CURRENT_PASSWORD_INVALID`, con mensaje seguro. No se impone una regla nueva que prohíba reutilizar la contraseña actual.

La nueva contraseña se procesa con Argon2id y los parámetros de autenticación existentes. Una transacción vuelve a verificar el hash observado y la sesión bajo bloqueo del usuario, cambia el hash, revoca todas las sesiones —incluida la actual— e invalida enlaces de recuperación pendientes. Después se eliminan las cookies de acceso y refresh, se rota el nonce CSRF y el usuario vuelve al login con el mensaje de éxito. La política fue confirmada por Human in the Loop.

Login, creación de sesión, restablecimiento por email y cambio autenticado comparten el bloqueo de la fila User. Login valida el password y luego comprueba que ese mismo hash continúa vigente al crear la sesión dentro de la transacción. Si una modificación de credenciales intervino, rechaza la sesión. El orden de bloqueo es User antes que Session/EmailToken. Refresh mantiene su compare-and-set del hash y nunca elimina `revokedAt`, por lo que no resucita una sesión revocada.

Los endpoints conservan CSRF, Origin exacto, CORS restringido, cookies HttpOnly/Secure/SameSite y errores `{code,message,requestId}`. Cambio de contraseña está sujeto al límite de autenticación de 10 solicitudes por minuto por endpoint/IP. El perfil no admite permisos ni identidad proporcionados por el cliente. No se agregan dependencias ni infraestructura.

## Validación

Ejecutar `pnpm --filter api db:generate`, `db:migrate`, `lint`, `typecheck`, `test`, `test:e2e` y `build` con la configuración existente. Las pruebas unitarias validan payloads parciales, nulabilidad, normalización, ausencia de escrituras sin diferencias y límites de contraseñas. Las pruebas independientes de integración cubren persistencia e historial privado, cambio correcto/incorrecto, revocación de sesiones, bloqueo de contraseñas anteriores y concurrencia de login con cambios y recuperación.
