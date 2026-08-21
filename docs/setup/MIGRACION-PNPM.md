# Migración de npm a pnpm

Este documento resume el cambio de gestor de paquetes de **npm** a **pnpm**
en el monorepo BANCA NEN.

---

## 1. Cómo se organizó

El repo tiene varios subproyectos, así que se configuró un **pnpm workspace**:

```
Proyecto-Nen/
├── package.json          <- NUEVO: raiz del workspace + scripts
├── pnpm-workspace.yaml   <- NUEVO: define que carpetas son paquetes
├── pnpm-lock.yaml        <- NUEVO: lockfile unico para todo el repo
├── .npmrc                <- NUEVO: configuracion de pnpm
├── backend/              <- paquete (banca-nen-backend)
├── frontend/             <- paquete (banca-nen-frontend)
├── ia-service/           <- Python, NO entra al workspace
└── mobile/               <- pendiente (ver nota abajo)
```

Ventajas frente a instalar carpeta por carpeta:

- Un solo `pnpm install` desde la raíz instala todo.
- Un solo `pnpm-lock.yaml` (más fácil de revisar, menos conflictos en git).
- Las dependencias compartidas (React, TypeScript...) se guardan **una sola
  vez** en disco y se enlazan; ocupa mucho menos espacio.

---

## 2. Qué se cambió exactamente

| Archivo | Cambio |
|---------|--------|
| `package.json` (raíz) | **Creado.** Scripts `dev`, `dev:back`, `dev:front`, `build:front`, `docker:up`... y `packageManager: pnpm@9.15.4` |
| `pnpm-workspace.yaml` | **Creado.** Declara `backend` y `frontend` como paquetes |
| `.npmrc` | **Creado.** `enable-pre-post-scripts` (para bcrypt/esbuild) y hoisting de `@types/*` |
| `pnpm-lock.yaml` | **Creado** por `pnpm install` |
| `backend/package-lock.json` | **Eliminado** |
| `frontend/package-lock.json` | **Eliminado** |
| `.gitignore` | Ignora `package-lock.json`, `yarn.lock` y `.pnpm-store/` |
| `README.md` | Instrucciones con pnpm + tabla de equivalencias npm→pnpm |
| `backend/Dockerfile` | **Escrito** (estaba vacío): build multi-stage con pnpm |
| `frontend/Dockerfile` | **Escrito** (estaba vacío): build con pnpm + nginx |
| `ia-service/Dockerfile` | **Escrito** (estaba vacío): Python + uvicorn |
| `docker-compose.prod.yml` | Contexto de build en la raíz (lo exige el workspace) + postgres/redis |
| `docker-compose.yml` | Quitado `version:` (obsoleto en Compose v2) |
| `backend/{` | Eliminado (archivo vacío creado por error) |

**No se tocó ni una línea de código fuente** (`src/`): ni del backend ni del
frontend. Las versiones de las dependencias son exactamente las mismas.

---

## 3. Comandos del día a día

```bash
pnpm install        # instalar todo
pnpm dev            # backend + frontend a la vez
pnpm dev:back       # solo backend  -> http://localhost:3000
pnpm dev:front      # solo frontend -> http://localhost:5173
pnpm build:front    # compilar frontend
```

Agregar dependencias a un paquete concreto:

```bash
pnpm --filter banca-nen-backend add express
pnpm --filter banca-nen-frontend add -D vitest
```

Equivalencias rápidas:

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm i <pkg>` | `pnpm add <pkg>` |
| `npm i -D <pkg>` | `pnpm add -D <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` |
| `npx <cmd>` | `pnpm dlx <cmd>` |
| `npm ci` | `pnpm install --frozen-lockfile` |

---

## 4. Verificación realizada

| Prueba | Resultado |
|--------|-----------|
| `pnpm install` desde cero | ✅ OK |
| `pnpm install --frozen-lockfile` (lo que corre en CI) | ✅ OK |
| bcrypt (binario nativo `.node`) | ✅ compila y hashea |
| esbuild (postinstall) | ✅ OK |
| Backend arranca y conecta a PostgreSQL | ✅ OK |
| TypeORM crea las 13 tablas | ✅ OK |
| `POST /api/v1/auth/register` | ✅ crea usuario real en la BD |
| `POST /api/v1/auth/login` | ✅ devuelve JWT |
| `GET /api/v1/health` | ✅ `database: connected` |
| Frontend `pnpm dev` + render en navegador | ✅ sin errores de consola |
| Proxy `/api` de Vite hacia el backend | ✅ OK |
| `pnpm build:front` (producción) | ✅ OK |

### Comparación con npm (antes de migrar)

Se midió el estado **antes** de tocar nada para asegurar que la migración no
rompiera nada:

| | npm (antes) | pnpm (después) |
|---|---|---|
| `frontend build` | ✅ pasa | ✅ pasa |
| `backend tsc` | ❌ 27 errores | ❌ **los mismos 27** |

Los 27 errores de TypeScript del backend **ya existían con npm** y son
idénticos (verificado con `diff`). No los introdujo la migración.

---

## 5. Pendientes conocidos (no son de la migración)

1. **`backend` no compila con `tsc`** — 27 errores de tipos previos.
   `pnpm dev:back` sí funciona porque `ts-node-dev` usa `--transpile-only`
   (ignora los tipos). Para `pnpm build:back` habrá que corregirlos.
   Los más comunes:
   - `TS2440`: en varios controllers se importa una función y se declara otra
     con el mismo nombre en el archivo.
   - `TS2554`: llamadas a `next()` / handlers con número de argumentos erróneo.

2. **`mobile/package.json` no es JSON válido** — es un placeholder con
   comentarios. Por eso `mobile` está fuera del workspace. Cuando se cree el
   proyecto Expo de verdad, basta con agregar `- mobile` a
   `pnpm-workspace.yaml`.

3. **Los scripts `migrate` y `seed`** que mencionaba el README no existen en
   `backend/package.json`. Se quitaron de la guía; la BD se crea sola con
   `synchronize: true` de TypeORM.
