# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.23.3

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

FROM base AS dependencies
# The root is the build context: preserve the workspace and the single lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,id=hyt-web-pnpm,target=/pnpm/store \
    pnpm install --filter web... --frozen-lockfile --store-dir /pnpm/store

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# These values are public and frozen into browser JavaScript by next build.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_SESSION_WARNING_SECONDS=120
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SESSION_WARNING_SECONDS=$NEXT_PUBLIC_SESSION_WARNING_SECONDS
COPY apps/web ./apps/web
RUN pnpm --filter web build

FROM node:${NODE_VERSION}-bookworm-slim AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
# Standalone tracing retains the monorepo directory structure.
COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /workspace/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/', { signal: AbortSignal.timeout(4000), redirect: 'manual' }).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
