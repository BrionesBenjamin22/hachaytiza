# syntax=docker/dockerfile:1

# Keep the build and runtime libc/OpenSSL identical for Prisma and Argon2.
FROM node:22.23.3-bookworm-slim AS runtime-base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM runtime-base AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

FROM base AS dependencies
RUN --mount=type=cache,id=hyt-api-pnpm,target=/pnpm/store \
    pnpm --filter api install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma
# Generation needs no database connection and consumes no build secrets.
RUN pnpm --filter api db:generate

FROM dependencies AS builder
COPY apps/api/nest-cli.json apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/tsconfig.seed.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma/seed.ts ./apps/api/prisma/seed.ts
RUN pnpm --filter api build \
    && pnpm --filter api exec tsc -p tsconfig.seed.json \
    && find apps/api/dist -type f \( -name '*.map' -o -name '*.d.ts' \) -delete

FROM base AS production-dependencies
RUN --mount=type=cache,id=hyt-api-pnpm,target=/pnpm/store \
    pnpm --filter api install --prod --frozen-lockfile --ignore-scripts --store-dir /pnpm/store
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma
# Prisma's optional compiler peer is needed only while building/generating;
# migration commands use schema.prisma and the seed is already JavaScript.
RUN pnpm --filter api db:generate \
    && find /app/node_modules/.pnpm -maxdepth 1 -type d -name 'typescript@*' -exec rm -rf '{}' + \
    && find /app/node_modules /app/apps/api/node_modules -type l -name typescript -delete \
    && rm -f /app/node_modules/.bin/tsc /app/node_modules/.bin/tsserver \
             /app/apps/api/node_modules/.bin/tsc /app/apps/api/node_modules/.bin/tsserver \
    && node apps/api/node_modules/prisma/build/index.js migrate deploy --help

FROM runtime-base AS production
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=production-dependencies /app/node_modules /app/node_modules
COPY --from=production-dependencies /app/apps/api/node_modules ./node_modules
COPY --from=production-dependencies /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/seed-build/seed.js ./prisma/seed.js
COPY apps/api/prisma/schema.prisma ./prisma/schema.prisma
COPY apps/api/prisma/migrations ./prisma/migrations
COPY localidades.json /app/localidades.json
# No source, tests, pnpm CLI, watch process, or automatic migrations in runtime.
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
