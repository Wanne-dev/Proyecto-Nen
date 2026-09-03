# ──────────────────────────────────────────────────────────────
# BANCA NEN — Backend (Express + TypeScript)
# ──────────────────────────────────────────────────────────────

# ---------- STAGE 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Compila el backend (TypeScript -> dist). Fallará si hay errores de tipos.
RUN npm run build

# Verificación: si dist/app.js no existe, la imagen sería inservible.
RUN test -f dist/app.js || (echo "ERROR: la compilacion no genero dist/app.js" && exit 1)

# ---------- STAGE 2: runtime ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# curl lo usa el healthcheck de docker-compose
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Carpeta de logs (winston escribe en logs/) con permisos para el usuario node
RUN mkdir -p logs && chown -R node:node /app

# No ejecutar como root
USER node

EXPOSE 3000
CMD ["node", "dist/app.js"]
