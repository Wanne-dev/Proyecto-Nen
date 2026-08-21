# Archivo: frontend/Dockerfile
# Proposito: Imagen de produccion del frontend (pnpm + nginx)
# Contexto de build: la RAIZ del repo (por el workspace de pnpm)
#   docker build -f frontend/Dockerfile -t banca-nen-frontend .

FROM node:20-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN pnpm install --frozen-lockfile --filter banca-nen-frontend...

COPY frontend/ frontend/
RUN pnpm --filter banca-nen-frontend build

# ---------- runtime ----------
FROM nginx:alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html
# SPA: cualquier ruta cae en index.html (React Router)
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
