# Contexto: raíz del repositorio (se utiliza el lockfile del workspace).
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0 SCARF_ANALYTICS=false
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --filter banca-nen-frontend...
COPY frontend ./frontend
RUN pnpm --filter banca-nen-frontend build && test -f frontend/dist/index.html

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
RUN nginx -t
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health || exit 1
CMD ["nginx", "-g", "daemon off;"]
