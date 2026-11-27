# Validación · Start IA y mercado real

## Qué cambió

- Start IA conserva `/asistente` como inicio. Se retiraron la ruta y los recursos del estudio visual, junto con las tarjetas de sugerencias. La portada usa `public/assets/videos/assistant-bg.mp4` como fondo fijo a página completa, con un aspecto sobrio: velocidad a la mitad, menor brillo y saturación, y veladuras azuladas muy suaves en lugar de colores vibrantes. El video se pausa al enfocar la caja de texto y se reanuda al salir, para no distraer mientras se escribe. El vidrio de la barra y del editor se mantiene, y la portada usa la marca del logo oficial en lugar del icono genérico. No lleva la franja contextual (ruta, estado de API y campana), que sigue visible en las demás páginas. No existe una conexión de chat y el botón Enviar sigue deshabilitado.
- Portada, acceso y Trading consultan referencias reales de Kraken para BTC, ETH y USDC en USD. Las velas conservan el tiempo, el precio y el volumen del proveedor. El gráfico, el ticker y el libro son observaciones independientes: sus precios no tienen por qué coincidir exactamente. El cambio del día parte de las 00:00 UTC; el máximo, mínimo y volumen abarcan las últimas 24 horas.
- Para registrar una orden virtual se exige una referencia vigente. Si el proveedor falla, la vista puede mostrar la última observación real con su hora y la marca «Datos atrasados». No se completa con precios de prueba. Los movimientos virtuales en COP/EUR usan la tasa diaria de Frankfurter; USD no necesita un proveedor. El análisis independiente sigue usando datos de CoinGecko.

## Comprobaciones en el entorno de prueba

- Compilación de Express y Vite, pruebas de la API y la interfaz, y pruebas con PostgreSQL 17. Las cifras fijas de pruebas viven únicamente en fixtures; no hay un proveedor simulado en ejecución.
- Actualización desde la instalación anterior, preservando usuarios, contraseña cambiada, semilla TOTP cifrada, saldo y órdenes de un proyecto desechable. Acceso normal, denegación de administración, 2FA de administrador y rechazo del código reutilizado en Chromium.
- Datos de Kraken recibidos por el backend dentro de Docker: los tres pares, intervalos de 15 min, 1 h y 4 h, y libro por ambos lados; registro de una orden virtual con origen Kraken. Pantallas de 1440, 390 y 320 px sin desborde horizontal en las vistas comprobadas.
- Prueba sin mercado con `MARKET_OFFLINE=true`: no se muestran datos ficticios y no se puede operar; depósito y retiro de USD virtuales funcionan. También se comprobaron registro, verificación, recuperación, revocación, roles, auditoría y cierre de sesión.
- Docker/Linux y Chromium de pruebas. No se ejecutó `cmd.exe` en Windows ni se probó dinero, pagos, correo o SMS reales.

Referencias: [Kraken Ticker](https://docs.kraken.com/api-reference/market-data/get-ticker-information), [velas OHLC](https://docs.kraken.com/api-reference/market-data/get-ohlc-data) y [Frankfurter](https://frankfurter.dev/). Consultar [Cómo probar](setup/como-probar.md) para el arranque local.
