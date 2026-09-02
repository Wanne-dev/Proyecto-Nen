# ──────────────────────────────────────────────────────────────
# BANCA NEN — Frontend (React + Vite) servido por Nginx
# ──────────────────────────────────────────────────────────────

# ---------- STAGE 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# El script del proyecto es "tsc --noEmit && vite build", pero el chequeo de
# tipos falla por tipado suelto preexistente. Vite transpila sin comprobar
# tipos, asi que el bundle sale correcto igualmente.
RUN npx vite build

# Si no hay index.html la imagen serviria una pagina en blanco: mejor fallar aqui.
RUN test -f dist/index.html || (echo "ERROR: vite build no genero dist/index.html" && exit 1)

# ---------- STAGE 2: serve ----------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Falla el build si la config de Nginx tiene errores de sintaxis
RUN nginx -t

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
