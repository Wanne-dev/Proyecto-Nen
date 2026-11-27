# Cómo probar BANCA NEN

Usa datos ficticios. Los saldos, depósitos, retiros y órdenes de este recorrido no mueven dinero real.

## Arranque y cuenta desde CMD

Abre Docker Desktop. En CMD, entra en la carpeta `BANCA-NEN` (la que contiene `INICIAR.bat`) y ejecuta:

```bat
call INICIAR.bat
```

Al terminar el arranque se abre <http://localhost:5173>. Esa ventana queda mostrando los logs del backend; puedes abrir otra ventana de CMD en la misma carpeta y ejecutar uno de estos comandos:

```bat
call CREAR-ACCESO-NEN.cmd
```

```bat
call CREAR-ACCESO-NEN.cmd admin
```

El primero crea una cuenta normal, la verifica por correo de consola y comprueba que el ingreso funciona. El segundo se usa **solo para el primer administrador**; pide completar el autenticador y no modifica un administrador previo. Copia el correo y la contraseña que imprime el script; usa un código TOTP nuevo al entrar como administrador. Ejecuta el archivo con `call`, **no pegues su contenido** en CMD.

El script requiere el arranque local y el proveedor de correo configurado (`EMAIL_PROVIDER=smtp` en esta copia), con SMS externo desactivado. Si ya tienes cuenta, entra con tus credenciales; no hace falta volver a crearla. Para explorar el registro por el navegador, toma el código del buzón de prueba; nunca se devuelve en la respuesta HTTP.

## Recorrido web reproducible

1. Entra con una cuenta vacía y verificada. El primer destino es **Start IA** (`/asistente`). Escribe una pregunta sobre precios o noticias y comprueba la respuesta; el asistente solo usa las herramientas permitidas para tu rol.
2. En **Billetera → Depositar**, acredita **100 USD virtuales**. Comprueba que aparecen en el saldo y los movimientos.
3. En **Trading**, elige BTC, ETH o USDC. Revisa el precio en USD, la fuente y la hora de consulta. Cambia entre 24 horas, 7 y 30 días: se usan velas de 15 min, 1 h y 4 h, respectivamente. La vela abierta del último intervalo puede cambiar al actualizarse.
4. Si hay una cotización vigente, compra o vende una cantidad pequeña de prueba. La orden usa como referencia el precio del último intercambio observado en Kraken, sin enviarse al exchange. Según el precio y la comisión verás el valor registrado en **Historial**; no esperes un total fijo. Si está desconectado, puedes seguir entrando y depositar o retirar USD virtuales, pero no operar con precios inventados.
5. Consulta **Reportes** y **Seguridad**. En **Noticias** busca titulares y analízalos con IA. **Análisis de mercado**, separado del asistente, muestra estimaciones solo si hay datos válidos de CoinGecko.

Para probar manualmente el panel con una cuenta que **ya** está activa y verificada, primero confirma su 2FA en Seguridad. Después, desde el proyecto local, ejecuta:

```sh
docker compose exec backend node dist/cli/grant-first-admin.js usuario@example.com
```

El comando no crea la cuenta ni quita protecciones. Solo permite promover al primer administrador. Hace falta iniciar una nueva sesión con TOTP después del cambio.

## Conexión de mercado

El mercado viene habilitado. Si ya tenías `MARKET_OFFLINE=true` en tu `.env`, cambia solo ese valor a `false` y vuelve a arrancar. La API necesita salida HTTPS a `api.kraken.com`, `api.frankfurter.dev` y, para el análisis, `api.coingecko.com`. No hacen falta claves de esos proveedores.

Para validar el comportamiento sin mercado en una instalación desechable, arráncala con `MARKET_OFFLINE=true` y ejecuta `scripts/smoke-local.cjs` con las [guardas de pruebas locales](../VALIDACION-LIMPIEZA.md). El estado debe decir «Mercado desconectado» y no mostrar velas ni permitir órdenes.

## Si algo falla

- `docker compose ps -a`: el servicio `backend-migrate` debe terminar con código `0`. `postgres`, `backend` y `frontend` deben quedar activos.
- `docker compose logs backend-migrate backend`: revisa errores de migración o de conexión, sin copiar contraseñas ni códigos a terceros.
- [Actualizar o detener sin borrar datos](con-docker.md#actualizar-una-instalación-existente), [arranque sin Docker](sin-docker.md) y [correo](../CONFIGURAR-CORREO.md).
