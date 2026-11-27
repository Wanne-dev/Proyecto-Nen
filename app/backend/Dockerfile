# Contexto: raíz del repositorio (un lockfile para todo el workspace).
FROM node:22-bookworm-slim AS manifests
WORKDIR /app
ENV HUSKY=0 SCARF_ANALYTICS=false
# bcrypt puede compilar en plataformas sin binario preconstruido.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates g++ make python3 \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

FROM manifests AS build
RUN pnpm install --frozen-lockfile --filter banca-nen-backend...
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN pnpm --filter banca-nen-backend build && test -f backend/dist/data-source.js

FROM manifests AS production-deps
# No ejecutar Husky en esta instalación solo-prod; reconstruir el nativo de runtime.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter banca-nen-backend... \
 && pnpm --filter banca-nen-backend rebuild bcrypt \
 && cd backend && node -e 'require("bcrypt"); require("typeorm")'

FROM node:22-bookworm-slim
WORKDIR /app/backend
ENV NODE_ENV=production
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=production-deps /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
RUN install -d -o node -g node /app/backend/logs \
 && install -d -m 0700 -o node -g node /app/backend/.local
USER node
EXPOSE 3000
CMD ["node", "dist/app.js"]
