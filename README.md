# Hacha y Tiza (HyT)

Para ejecutar la aplicación localmente, seguir el [instructivo de desarrollo](#levantar-el-proyecto-en-desarrollo).

## Mis amigos son unos loros, y siempre renegamos para rescatar gente para el fulbito.

Una idea simple: me faltan 4 para un fútbol 6 en Megaestadio, 1 y 63. El que quiera jugar puede reservar su lugar, y el de su compañero si quiere llevar a alguien.

HyT nace para resolver una necesidad concreta: **reclutar jugadores para completar los lugares necesarios para una cancha, sin que tengan que ser conocidos entre sí**.

El problema lo tiene cualquiera que organice partidos de fútbol y dependa siempre del mismo grupo de gente. Hay días en los que conseguir jugadores se vuelve más difícil por horarios, compromisos o incluso por partidos importantes. Por ejemplo, un martes a las 22:00 puede jugar Boca por Copa y varios de los que normalmente juegan pueden bajarse, mientras que otras personas que sí están disponibles podrían ocupar esos lugares.

La idea es simplemente conectar esas dos situaciones.

> Yo, Benjamín, quiero jugar al fútbol, pero mis amigos se ortivan y no junto jugadores. Reservo la cancha, publico que tengo 6 lugares disponibles y cualquier persona interesada puede reservar uno o más lugares para jugar.

## Buena fe y respeto por el fútbol ajeno

Cualquier persona puede reservar.

La primera versión de HyT se basa en algo muy simple: la buena fe de la gente.

> **Cualquier persona puede reservar, me debo a la buena fe de la gente y el respeto por el fútbol ajeno. En la tierra de Maradona no bardeen con el fútbol ajeno.**

Si reservás, la idea es que vayas.

Si no podés ir, avisá con tiempo.

No reserves lugares porque sí y no te bajes 30 minutos antes si podés evitarlo.

La aplicación no busca complicar algo que debería ser sencillo. El objetivo es facilitar que un partido se complete y que gente que no se conoce pueda jugar junta.

## Qué busca resolver

HyT apunta únicamente a este flujo:

1. Alguien reserva una cancha.
2. Le faltan jugadores.
3. Publica cuántos lugares tiene disponibles.
4. Otra persona entra a Hacha y Tiza.
5. Encuentra el partido.
6. Reserva uno o más lugares.
7. Va a jugar.

Nada más.

Al menos al principio.

## Idea a futuro

A futuro estaría buenísimo que las propias canchas puedan utilizar Hacha y Tiza para ofrecer sus servicios, publicar disponibilidad o integrarse al flujo de reservas.

Pero eso viene después.

Primero hay que resolver bien algo mucho más simple:

> **Me faltan jugadores. Publico los lugares. Alguien los reserva. Jugamos.**

Soñar es gratis.

## Desarrollo de la vertical slice

La aplicación implementa registro y login local, sesión segura, verificación de email, recuperación de contraseña y descubrimiento de partidos por localidad. La selección temporal del Home es independiente de la localidad principal del perfil. Google y las reservas quedan para etapas posteriores.

La segunda iteración agrega edición del perfil con historial privado, cambio de contraseña con cierre de todas las sesiones, localidades buscables, navegación de cuenta y temas claro, oscuro y sistema.

- [Backend: configuración, persistencia y contratos](apps/api/VERTICAL-SLICE.md).
- [Backend: perfil e historial privado](apps/api/PROFILE.md).
- [Frontend: vistas, sesión y filtros](apps/web/FRONTEND.md).
- [Pruebas de la vertical slice](tests/README.md).

## Levantar el proyecto en desarrollo

### Requisitos

- Node.js **22.17 o superior dentro de la versión 22**; consultar `.nvmrc`.
- pnpm **10.33.2**.
- Docker con Docker Compose disponible y el motor iniciado (Docker Desktop en Windows).
- Puertos **3000** (frontend), **3001** (API) y **5432** (PostgreSQL) disponibles.

Los pasos siguientes se ejecutan desde la raíz del repositorio. Los comandos de copia usan PowerShell; en Linux/macOS reemplazar `Copy-Item origen destino` por `cp origen destino`.

### 1. Instalar dependencias

```powershell
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install --frozen-lockfile
```

### 2. Configurar las variables de entorno

Crear el archivo para Docker y completar sus valores antes de continuar:

```powershell
Copy-Item .env.example .env
```

En `.env`, conservar la configuración local y completar los campos vacíos:

```dotenv
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

POSTGRES_USER=hyt
POSTGRES_DB=hyt
POSTGRES_PORT=5432
POSTGRES_PASSWORD=<contraseña-local>
DATABASE_URL=postgresql://hyt:<contraseña-local>@localhost:5432/hyt?schema=public

JWT_SECRET=<secreto-aleatorio>
CSRF_SECRET=<otro-secreto-aleatorio>

RESEND_API_KEY=
EMAIL_FROM=
```

Los valores entre `<...>` son marcadores: reemplazarlos. `DATABASE_URL` debe coincidir con el usuario, contraseña, puerto y base configurados para Docker. Si la contraseña contiene caracteres especiales, codificarla para su uso dentro de una URL.

`JWT_SECRET` y `CSRF_SECRET` deben ser distintos y tener al menos 32 caracteres. Para generar cada valor localmente, ejecutar este comando por separado; también puede usarse para generar una contraseña de base sin caracteres especiales:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copiar el archivo ya configurado a la carpeta de la API. Nest y Prisma utilizan `apps/api/.env`; Docker Compose utiliza el `.env` de la raíz. Mantener ambos sincronizados si cambia la configuración del backend:

```powershell
Copy-Item .env apps/api/.env
```

Crear **`apps/web/.env.local`** con estas variables públicas, sin copiar secretos del backend:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SESSION_WARNING_SECONDS=120
```

Para recibir emails reales de verificación y recuperación, completar `RESEND_API_KEY` y `EMAIL_FROM` con la configuración de Resend. Sin esos valores, el desarrollo permite registro/login y explorar partidos, pero no entrega los emails. Las pruebas cubren esos flujos con un transporte de email fake; no existe una bandeja de prueba en la aplicación.

Los archivos `.env` y `.env.local` están ignorados por Git. No versionar sus valores.

### 3. Preparar la base de datos

```powershell
docker compose up -d --wait db
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

Docker levanta PostgreSQL con PostGIS y conserva los datos en el volumen `hyt-postgres`. `db:migrate` aplica las migraciones existentes, incluido el historial del perfil.

Cargar el catálogo de localidades de La Plata:

```powershell
pnpm --filter api exec node --env-file=.env --import tsx prisma/seed.ts
```

Para demostrar el filtro con partidos ficticios en Tolosa, City Bell y Los Hornos, ejecutar además:

```powershell
pnpm --filter api exec node --env-file=.env --import tsx prisma/seed.ts --development
```

Los seeds son idempotentes. Estos comandos cargan explícitamente `apps/api/.env` porque el seed no inicia Nest ni carga sus variables automáticamente. Los datos ficticios son exclusivos de desarrollo; no ejecutar `--development` contra producción.

### 4. Iniciar API y frontend

Abrir dos terminales en la raíz del repositorio y mantenerlas abiertas.

**Terminal 1 — API:**

```powershell
pnpm dev:api
```

**Terminal 2 — frontend:**

```powershell
pnpm dev:web
```

| Servicio | Dirección |
| --- | --- |
| Aplicación | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Health check | http://localhost:3001/health |
| OpenAPI JSON | http://localhost:3001/api/v1/docs-json |

Usar **`localhost`** para acceder desde el navegador: las cookies de sesión mantienen `Secure` también en desarrollo. No intercambiarlo con `127.0.0.1` ni con la IP de la red sin configurar HTTPS y los orígenes correspondientes.

### 5. Probar el flujo

1. Abrir la aplicación y seleccionar **Crear cuenta**.
2. Completar nombre, email y una contraseña de entre 8 y 128 caracteres (mínimo temporal autorizado).
3. Buscar **Tolosa** y seleccionarla como localidad principal.
4. Registrarse: se inicia sesión y aparece el Home con los partidos de Tolosa.
5. Cambiar temporalmente el selector a **City Bell** para comprobar que cambia el listado sin modificar el perfil.
6. Desde **Cuenta**, acceder al perfil, seguridad, apariencia o cerrar sesión. Al ingresar nuevamente, el filtro inicial vuelve a la localidad principal.

### Detener y volver a iniciar

Detener API y frontend con `Ctrl+C` en sus terminales. Para detener la base conservando los datos:

```powershell
docker compose stop db
```

En siguientes ejecuciones basta con iniciar la base y ambos servidores. Después de actualizar el código, instalar dependencias si cambió el lockfile y ejecutar `db:generate` y `db:migrate` si cambió Prisma. Los partidos de demostración tienen fechas futuras al ejecutar el seed; si ya pasaron, volver a ejecutar el seed de desarrollo.

### Problemas frecuentes

- **Puerto 5432 ocupado:** cambiar `POSTGRES_PORT` y el puerto de `DATABASE_URL`, sincronizar `.env` con `apps/api/.env` y volver a iniciar la base.
- **Error de variables faltantes:** revisar `apps/api/.env`, los secretos y `DATABASE_URL`; reiniciar la API después de editarlos.
- **Error de conexión o autenticación de PostgreSQL:** comprobar `docker compose ps` y `docker compose logs db`. Cambiar `POSTGRES_PASSWORD` en `.env` no modifica la contraseña de una base que ya existe en el volumen.
- **Registro sin localidades o Home vacío:** ejecutar los seeds y verificar que las migraciones están aplicadas. El catálogo y los partidos de demostración se cargan por separado.
- **Sesión o CORS fallan:** usar `http://localhost:3000`, comprobar `NEXT_PUBLIC_API_URL` y mantener `FRONTEND_URL` dentro de `CORS_ORIGINS`. Reiniciar el frontend si cambian sus variables.
- **No llegan emails:** configurar Resend y un remitente autorizado; sin proveedor configurado no se envían enlaces en desarrollo.

## Validaciones

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test:integration` requiere PostgreSQL aislado. `pnpm test:e2e` requiere el frontend compilado levantado y utiliza una API real con transporte de email en memoria. Seguir [tests/README.md](tests/README.md) para preparar el entorno de pruebas; no ejecutar estas suites contra la base de desarrollo habitual ni producción.
