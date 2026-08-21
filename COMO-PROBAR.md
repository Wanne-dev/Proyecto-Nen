# Cómo probar el proyecto

## 1. Abre Docker Desktop

Espera a que diga **"Engine running"** (abajo a la izquierda, en verde).

## 2. Doble clic en `INICIAR.bat`

Eso es todo. El script hace el resto solo y te abre la página al terminar.

- Página web: <http://localhost:5173>
- API: <http://localhost:3000>

Para detener: `Ctrl + C` en la ventana negra.

---

## Si prefieres escribir los comandos

Abre CMD en esta carpeta y escribe **uno a la vez**:

```
docker compose up -d
```
```
pnpm install
```
```
pnpm dev
```

> ⚠️ Copia el comando **solo hasta donde termina**. Si copias algo con `#`
> (como `pnpm dev   # arranca todo`), CMD toma el `#` como parte del comando
> y falla. En Windows no existen los comentarios con `#`.

---

## Si algo falla

Vuelve a hacer doble clic en `INICIAR.bat` — limpia y reintenta solo.

Si sigue fallando, mira el mensaje:

| Dice | Qué hacer |
|------|-----------|
| `Docker no esta encendido` | Abre Docker Desktop, espera "Engine running" |
| `pnpm no se reconoce` | Escribe `corepack enable` y reintenta |
| `ECONNREFUSED ... 5433` | La base de datos no arrancó. Usa `INICIAR.bat` |
| `container name is already in use` | Ya está resuelto en `INICIAR.bat`, úsalo |

---

## Comandos, por si los necesitas

| Para | Comando |
|------|---------|
| Instalar todo | `pnpm install` |
| Arrancar backend + frontend | `pnpm dev` |
| Solo backend | `pnpm dev:back` |
| Solo frontend | `pnpm dev:front` |
| Compilar frontend | `pnpm build:front` |
| Apagar la base de datos | `docker compose down` |

---

## Nota

Este proyecto usa **pnpm**, no npm. No ejecutes `npm install`.
