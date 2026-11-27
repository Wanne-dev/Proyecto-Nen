# BANCA NEN · Menú superior Liquid Glass

Esta copia **solo simula dinero**. Las dos cuentas están preparadas para este ZIP. No uses estas claves en una instalación real ni publiques la instalación local en Internet.

**Para ver el menú sin instalar:** abre `../../../PROBAR.html` y alterna **Usuario / Admin**. La vista no conecta tus cuentas. Para usar la aplicación completa, sigue los pasos de abajo.

1. Si tienes abierta la instalación local anterior, detenla con su **`DETENER.bat`** desde la carpeta `BANCA-NEN`. No borres sus volúmenes. Extrae **todo el ZIP en una carpeta nueva**, sin sobrescribir la anterior.
2. Abre Docker Desktop en modo contenedores Linux (Compose ≥ 2.24.4). En la carpeta `BANCA-NEN`, haz doble clic en **`INICIAR.bat`**. Si lo abres desde CMD, usa `call INICIAR.bat`.
3. Espera a que se abra [http://banca-nen.localhost:5184/login](http://banca-nen.localhost:5184/login). Puede tardar unos minutos. Entra con las mismas cuentas de la instalación; si cambiaste tu clave, usa la nueva. No necesitas registrarte.

| Cuenta | Correo | Clave inicial |
| --- | --- | --- |
| Usuario | `usuario@example.com` | `NenUsuario7-79fc656752` |
| Administrador | `admin@example.com` | `NenAdmin9-89753730c1` |

**Administrador:** después de escribir el correo y la clave, cuando el login pida los seis dígitos, abre **`CODIGO-ADMIN.bat`** desde la carpeta `BANCA-NEN`. Copia el código que muestra la ventana. Es de un solo uso y cambia cada 30 segundos. El lanzador, solo para la cuenta administradora de esta copia, obtiene un código local; no hace falta instalar una app de autenticación. No compartas el código. La protección 2FA del portal no se desactiva. Si el código venció o ya se usó, vuelve a abrir el archivo; puede esperar al código siguiente.

## ¿Por qué no entra en otra dirección?

Estas claves son solo para **`banca-nen.localhost:5184`**, no para tu instalación anterior en `localhost:5173`. Usa el enlace que abre `INICIAR.bat`; el nombre de host separado también aísla las cookies. El puerto 5184 debe estar libre. La API y PostgreSQL no se publican en tu equipo.

- **Menú superior:** todas las pestañas del rol en una barra arriba, sin barra lateral, sin botón de colapso ni títulos de grupo. Si no caben, los enlaces se acomodan en más filas. Utiliza `Ctrl+K` / `⌘K` para buscar una pestaña. Ver [arquitectura y pruebas](../SIDEBAR-LIQUID-GLASS.md).
- **Usuario:** al entrar verás **Start IA** (`/asistente`), un asistente conectado a Gemini. Puedes preguntar por precios y noticias; la pestaña **Noticias** muestra titulares y análisis IA. La cuenta normal no abre el panel administrativo.
- **Trading:** muestra datos de Kraken para BTC/USD, ETH/USD y USDC/USD. Necesita conexión a Internet; si falla el proveedor muestra el estado y no ejecuta órdenes sin cotización vigente. Los saldos y las operaciones siguen siendo virtuales.
- **Administrador:** entra con 2FA para tener acceso al panel; el código se envía al correo de la cuenta y también se obtiene con `CODIGO-ADMIN.bat`. Si cambias las claves, el lanzador no vuelve a poner las claves iniciales. Tampoco vuelve a promover ni reactivar una cuenta cambiada.
- **Detener**: abre `DETENER.bat` desde la carpeta `BANCA-NEN`. Conserva las cuentas, el saldo de prueba y los volúmenes. Para volver a usarla, abre `INICIAR.bat` desde esa misma carpeta.

La preparación funciona solo con los archivos y la base separada de esta copia. Se usan los servicios de registro, verificación y 2FA del proyecto y el CLI oficial del primer administrador. No se modifica la instalación estándar ni se agregan endpoints. El otro README y la documentación técnica describen la versión estándar: en este ZIP usa únicamente los lanzadores de arriba para arrancar.

## Si ya usabas la instalación local con accesos

Esta versión conserva el mismo proyecto Compose y los mismos volúmenes. Basta con detener el anterior e iniciar desde la nueva carpeta: no se reinician las cuentas, el 2FA, las claves cambiadas ni los saldos. No ejecutes `docker compose down -v`.

## Proveedores

Kraken aporta las cotizaciones, el gráfico y el libro; Frankfurter, las tasas diarias de COP/EUR para movimientos virtuales. No hacen falta claves de mercado ni conectar una cuenta de un exchange. La hora mostrada indica la consulta del dato al proveedor, no operación en tiempo real. Si usas el arranque estándar en otra instalación, véase [Cómo probar](como-probar.md).

## Pruebas realizadas

En esta entrega se verificaron la compilación del frontend y la navegación por rol en Chromium, con la API interceptada en pruebas. Se conservan sin cambios el backend, los lanzadores, el archivo de perfil, el proyecto Compose y los volúmenes de la entrega previa.

En la entrega anterior se verificó la actualización desde la instalación anterior con cuentas, clave cambiada, 2FA, saldo e historial conservados. Las cotizaciones y el gráfico se comprobaron en Docker/Linux y Chromium con datos del proveedor. El modo sin mercado dejó operativos los movimientos virtuales en USD y bloqueó las órdenes. No se ejecutaron los archivos `.bat` en Windows.
