# HyT Web

Aplicación web de Hacha y Tiza, creada con Next.js, React y TypeScript.

## Estructura actual

- `src/app/`: layout, estilos globales y página inicial del App Router.
- `public/`: recursos estáticos servidos por Next.js.
- `next.config.ts`: configuración del framework.

La estructura por features, el cliente HTTP, los temas y Tailwind se incorporarán en FND-03.

## Comandos

Ejecutar desde la raíz del repositorio:

```bash
pnpm dev:web
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

El servidor de desarrollo usa `http://localhost:3000` por defecto. La URL del backend se configurará mediante variables de entorno en FND-03.
