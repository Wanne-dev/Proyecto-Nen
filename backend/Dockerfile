# Archivo: backend/Dockerfile
# Proposito: Imagen de produccion del backend (pnpm)
# Contexto de build: la RAIZ del repo (por el workspace de pnpm)
#   docker build -f backend/Dockerfile -t banca-nen-backend .

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ---------- deps + build ----------
FROM base AS build
# bcrypt puede necesitar compilar binarios nativos
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Solo las dependencias del backend
RUN pnpm install --frozen-lockfile --filter banca-nen-backend...

COPY backend/ backend/
RUN pnpm --filter banca-nen-backend exec tsc || \
    echo "AVISO: tsc reporto errores de tipos; revisar backend/src"

# Deja solo dependencias de produccion
RUN pnpm --filter banca-nen-backend --prod deploy /deploy

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/package.json ./package.json
COPY --from=build /app/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]
