# HyT Web

Aplicación web de Hacha y Tiza, creada con Next.js, React y TypeScript.

## Estructura actual

- `src/app/`: landing, Home, cuenta y rutas de autenticación del App Router.
- `src/features/`: autenticación, perfil, apariencia, localidades y descubrimiento de partidos.
- `src/lib/http.ts`: cliente HTTP con credenciales y CSRF.
- `src/components/`: estructura visual de la aplicación.
- `public/`: recursos estáticos servidos por Next.js.
- `next.config.ts`: configuración del framework.

La segunda iteración incorpora búsqueda accesible de localidades, gestión de cuenta y temas claro, oscuro y sistema, sobre la sesión existente. Ver [FRONTEND.md](FRONTEND.md) para vistas, contratos, permisos y validaciones.

## Comandos

Ejecutar desde la raíz del repositorio:

```bash
pnpm dev:web
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

El servidor de desarrollo usa `http://localhost:3000` por defecto. `NEXT_PUBLIC_API_URL` configura la API, incluyendo `/api/v1`. Las variables de Next.js se definen en `apps/web/.env.local`; no contiene secretos de backend.
