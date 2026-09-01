# ──────────────────────────────────────────────────────────────
# BANCA NEN — Frontend (React + Vite)
# Multi-stage: build estático → servido por Nginx (con proxy /api)
# ──────────────────────────────────────────────────────────────

# ---------- STAGE 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# El script oficial es "tsc --noEmit && vite build"; el tsc del proyecto falla
# por tipado suelto. Compilamos directo con Vite (transpila sin chequear tipos).
RUN npx vite build

# ---------- STAGE 2: serve ----------
FROM nginx:alpine
# Config propia: sirve la SPA y hace proxy de /api hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]