FROM node:22.22.0-bookworm-slim AS build
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
RUN npm install --global pnpm@12.6.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @formsmith/api build
RUN bun build apps/api/src/db/migrate.ts --target=bun --outfile=apps/api/dist/migrate.js --external=postgres
RUN cp -RL apps/api/node_modules/postgres /tmp/postgres

FROM build AS selfhost-build
RUN pnpm --filter @formsmith/dashboard --filter @formsmith/forms --filter @formsmith/selfhost build

FROM oven/bun:1.3.14-slim AS selfhost
WORKDIR /app
ENV NODE_ENV=production
ENV DASHBOARD_ASSETS=/app/dashboard
ENV FORMS_ASSETS=/app/forms
COPY --from=selfhost-build --chown=bun:bun /app/apps/selfhost/dist /app
COPY --from=selfhost-build --chown=bun:bun /app/apps/dashboard/dist /app/dashboard
COPY --from=selfhost-build --chown=bun:bun /app/apps/forms/dist /app/forms
USER bun
EXPOSE 3000 8787
CMD ["bun", "index.js"]

FROM oven/bun:1.3.14-slim AS api
WORKDIR /app
ENV NODE_ENV=production
ENV MIGRATIONS_DIR=/app/drizzle
COPY --from=build --chown=bun:bun /app/apps/api/dist /app
COPY --from=build --chown=bun:bun /app/apps/api/drizzle /app/drizzle
COPY --from=build --chown=bun:bun /tmp/postgres /app/node_modules/postgres
COPY --chown=bun:bun apps/api/start.ts /app/start.ts
USER bun
EXPOSE 3001
CMD ["bun", "start.ts"]
