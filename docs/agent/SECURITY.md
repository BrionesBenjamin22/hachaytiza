# HyT — Security Implementation Rules

## Regla general

La seguridad es requisito funcional.

Ningún agente puede simplificar o remover controles de seguridad para completar una tarea más rápidamente.

---

# Sesión

HyT utilizará:

```text
Access Token
+
Refresh Token
```

transportados mediante cookies seguras.

No almacenar tokens de autenticación en:

```text
localStorage
sessionStorage
IndexedDB
```

OWASP recomienda cookies `HttpOnly` para reducir la exposición de credenciales a JavaScript.

---

# Cookies de autenticación

Las cookies deberán utilizar:

```text
HttpOnly
Secure
Path=/
SameSite
```

En producción utilizar cookies con prefijo:

```text
__Host-
```

cuando la configuración del dominio lo permita.

Ejemplo conceptual:

```text
__Host-furvo-access
__Host-furvo-refresh
```

No establecer atributo `Domain` para cookies `__Host-`.

---

# Dominios

Objetivo productivo:

```text
app.furvo.<tld>
api.furvo.<tld>
```

Frontend y API deberán operar bajo dominios controlados por Furvo.

Esto simplifica políticas de cookies, CORS y CSRF.

No asumir que:

```text
*.vercel.app
+
*.onrender.com
```

tendrán el mismo comportamiento de cookies que los dominios productivos.

La configuración de producción deberá verificarse con los dominios definitivos.

---

# Access token

Debe tener una duración corta.

El frontend no necesita leer el token.

El navegador lo adjunta automáticamente mediante cookie.

---

# Refresh token

Debe tener una duración mayor.

Debe:

```text
rotarse
invalidarse al logout
invalidarse cuando corresponda
protegerse como credencial
```

El backend deberá permitir revocación.

No almacenar refresh tokens en texto plano si se persisten del lado servidor.

---

# Estado de sesión

El frontend necesita conocer cuándo expira la sesión sin acceder a las cookies `HttpOnly`.

Crear un endpoint:

```http
GET /api/v1/auth/session
```

Respuesta conceptual:

```json
{
  "authenticated": true,
  "accessExpiresAt": "2026-09-11T06:00:00Z",
  "refreshAvailable": true
}
```

No devolver tokens.

---

# Aviso de expiración

El frontend utilizará `accessExpiresAt` para mostrar un aviso antes de que expire la sesión.

Ejemplo:

```text
Tu sesión está por finalizar.

[ Mantener sesión ]
[ Cerrar sesión ]
```

El tiempo exacto del aviso será configurable.

---

# Refresh solicitado por usuario

Al seleccionar:

```text
Mantener sesión
```

el frontend deberá ejecutar:

```http
POST /api/v1/auth/refresh
```

El navegador enviará automáticamente la cookie de refresh.

El endpoint deberá requerir protección CSRF.

Si el refresh es válido:

```text
rotar refresh token
emitir nuevo access token
actualizar expiración
```

El frontend deberá actualizar la información obtenida mediante `/auth/session`.

---

# Sesión expirada

Si access y refresh ya no son válidos:

```text
authenticated = false
```

El frontend deberá:

```text
limpiar estado de usuario
→ informar expiración
→ redirigir a login cuando corresponda
```

Nunca simular una sesión válida sólo porque existe estado React previo.

---

# CSRF

Como la autenticación utiliza cookies, todos los endpoints que modifican estado deberán estar protegidos contra CSRF.

Ejemplos:

```text
POST
PUT
PATCH
DELETE
```

No utilizar `GET` para modificar datos.

---

# Estrategia CSRF

Utilizar una estrategia basada en token.

Backend NestJS:

```text
csrf-csrf
```

Flujo conceptual:

```text
Frontend
   │
   ├── solicita CSRF token
   ▼
Backend

Backend genera token
   │
   ▼
Frontend lo mantiene temporalmente
   │
   ▼
X-CSRF-Token
   │
   ▼
POST / PATCH / DELETE
```

El token CSRF no es un token de autenticación.

---

# Endpoint CSRF

Conceptualmente:

```http
GET /api/v1/auth/csrf
```

Respuesta:

```json
{
  "csrfToken": "..."
}
```

El frontend deberá enviar posteriormente:

```http
X-CSRF-Token: ...
```

en operaciones que modifiquen estado.

El token deberá mantenerse en memoria siempre que sea posible.

---

# Defensa CSRF adicional

Además del token:

```text
SameSite apropiado
Origin validation
CORS restringido
Fetch Metadata cuando corresponda
```

deberán utilizarse como defensa en profundidad.

No confiar únicamente en `SameSite`.

---

# CORS

Producción:

```text
origin = frontend Furvo
credentials = true
```

Nunca:

```text
origin = *
credentials = true
```

Los entornos permitidos deberán configurarse explícitamente.

---

# Cookies y credenciales

Todas las requests autenticadas del frontend deberán utilizar:

```text
credentials: "include"
```

cuando sea requerido por la configuración cross-origin.

---

# Passwords

Hash:

```text
Argon2id
```

No almacenar contraseña reversible.

No loggear contraseña.

No devolver hash mediante DTO.

---

# Recuperación de contraseña

Token:

```text
aleatorio
un solo uso
expirable
```

La respuesta inicial no debe confirmar si un email existe.

---

# Email verification

Mismas propiedades:

```text
token impredecible
expiración
uso único
```

---

# Rate limiting

Aplicar especialmente a:

```text
login
register
refresh
password reset
email verification resend
```

Una protección global puede complementarse con límites más restrictivos por endpoint.

---

# Headers

NestJS deberá inicializar Helmet antes de rutas/middlewares que deban recibir sus headers de seguridad.

Configurar CSP de acuerdo con los recursos reales utilizados.

No deshabilitar CSP globalmente únicamente para solucionar problemas de desarrollo.

---

# Autorización

Nunca inferir permisos desde información enviada por cliente.

Ejemplo incorrecto:

```json
{
  "userId": "soy-el-dueño"
}
```

Siempre obtener identidad desde la sesión y consultar propiedad real del recurso.

---

# Admin

Las operaciones administrativas requieren:

```text
authenticated
+
ADMIN
```

No confiar en ocultar botones de UI.

---

# Database

Toda operación debe ser parametrizada.

Las operaciones de reserva deben utilizar transacción.

Las reglas críticas deberán poseer tests de integración.

---

# Secretos

Nunca agregar al repositorio:

```text
DATABASE_URL real
JWT secrets
email keys
cookie secrets
CSRF secrets
```

Usar:

```text
Vercel Environment Variables
Render Environment Variables
GitHub Secrets
```

---

# Logs

Antes de loggear un objeto, verificar que no contenga:

```text
Authorization
Cookie
Set-Cookie
password
tokens
CSRF token
personal data innecesaria
```

---

# Cambios relacionados con seguridad

Si una tarea modifica:

```text
auth
cookies
CORS
CSRF
sessions
passwords
permissions
admin
email verification
password reset
```

el agente debe:

1. Leer este archivo completo.
2. Consultar `PRODUCT.md` y `TECHNICAL.md` cuando el control dependa del dominio o la arquitectura.
3. Agregar tests.
4. Informar explícitamente los controles afectados.

---

# Regla final

Ante una elección entre facilidad y seguridad:

```text
no degradar silenciosamente la seguridad
```

Si un control impide implementar una tarea, informar el conflicto antes de eliminarlo.
