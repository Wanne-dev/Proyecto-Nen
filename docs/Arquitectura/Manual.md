# BANCA NEN - Explicación Detallada del Proyecto

Este documento está diseñado para desarrolladores que se incorporan al equipo o para cualquier persona que desee comprender en profundidad la arquitectura, el propósito y el flujo de datos de la plataforma BANCA NEN. Se ha estructurado de manera didáctica, evitando tecnicismos superfluos y centrándose en la funcionalidad de cada componente, su justificación dentro del sistema y el recorrido completo que sigue la información desde la interacción del usuario hasta el procesamiento en los servidores y el retorno de la respuesta.

---

## 1. Introducción y Propósito General

BANCA NEN es una plataforma de inversión asistida por inteligencia artificial. Su objetivo principal es democratizar el acceso a los mercados financieros, permitiendo a usuarios sin experiencia previa invertir en acciones, criptomonedas y divisas. La plataforma se diferencia de otras aplicaciones de trading por la integración de un sistema de evaluación de riesgo basado en modelos de machine learning (LSTM, Random Forest, XGBoost) que asesoran al usuario sobre la viabilidad de cada operación.

Además del asesoramiento inteligente, la plataforma ofrece una billetera digital multidivisa, integración con la pasarela de pago Wompi para depósitos y retiros, visualización de gráficos en tiempo real mediante TradingView, y un sistema de alertas de seguridad que detecta comportamientos anómalos en la cuenta del usuario.

La arquitectura se ha concebido bajo el principio de separación de responsabilidades, adoptando un enfoque de microservicios para facilitar el mantenimiento, la escalabilidad independiente de cada componente y la evolución tecnológica sin afectar al resto del sistema. El repositorio está organizado en módulos claramente diferenciados, cada uno con un rol específico dentro del ecosistema.

---

## 2. Estructura General del Repositorio

El repositorio se divide en las siguientes carpetas raíz, cada una correspondiente a un servicio o capa de la aplicación:

- **backend/**: Servidor principal desarrollado en Node.js con Express. Contiene toda la lógica de negocio, la gestión de autenticación, la orquestación de transacciones, la integración con proveedores externos (Wompi, TradingView) y la comunicación con el servicio de inteligencia artificial.

- **frontend/**: Aplicación web de una sola página (SPA) construida con React y Vite. Proporciona la interfaz de usuario para navegadores de escritorio y dispositivos móviles, consumiendo la API REST expuesta por el backend.

- **mobile/**: Aplicación móvil híbrida para iOS y Android, desarrollada con React Native y Expo. Comparte la mayor parte de la lógica de estado y consumo de API con el frontend web, pero adapta la interfaz a los patrones de navegación y componentes nativos de cada plataforma.

- **ia-service/**: Servicio independiente escrito en Python con FastAPI. Aloja los modelos de machine learning entrenados y expone endpoints específicos para la predicción de riesgo, explicabilidad de las predicciones (SHAP) y reentrenamiento periódico de los modelos.

- **infra/**: Contiene todos los artefactos relacionados con el despliegue y la operación en entornos productivos: Dockerfiles, archivos de composición de contenedores, plantillas de Kubernetes (deployments, services, ingress), scripts de Terraform para la provisión de infraestructura en la nube, y configuraciones para herramientas de monitoreo como Prometheus y Grafana.

- **docs/**: Documentación técnica y funcional del proyecto, que incluye la especificación OpenAPI/Swagger de la API, diagramas de arquitectura (modelo C4), manuales de usuario, guías de despliegue y un registro de decisiones de diseño (ADR).

- **docker-compose.yml**: Archivo de orquestación que permite levantar todos los servicios (backend, frontend, base de datos PostgreSQL, Redis, ia-service, y dependencias auxiliares) en un entorno de desarrollo o pruebas con un solo comando, garantizando la reproducibilidad del entorno.

La utilización de contenedores Docker no es arbitraria; responde a la necesidad de eliminar las discrepancias entre entornos de desarrollo, pruebas y producción, asegurando que el código se ejecute siempre sobre las mismas versiones de sistema operativo, librerías y dependencias.

---

## 3. Backend: El Núcleo de la Lógica de Negocio

El backend es el componente más crítico del sistema, ya que orquesta todas las operaciones, mantiene la coherencia de los datos y garantiza la seguridad de las transacciones. Está construido con TypeScript sobre Node.js, utilizando Express como framework web y TypeORM como ORM para la interacción con la base de datos PostgreSQL. La elección de Node.js se debe a su alto rendimiento en operaciones de entrada/salida y su amplio ecosistema para el desarrollo de APIs REST, mientras que TypeScript aporta tipado estático que reduce errores en tiempo de ejecución y mejora la mantenibilidad del código.

A continuación se detalla la estructura interna de la carpeta `backend/src/`, explicando la responsabilidad de cada subdirectorio y justificando su existencia dentro del patrón de diseño adoptado.

### 3.1. Carpeta `config/`

Esta carpeta contiene los archivos de configuración centralizada del sistema. Su propósito es evitar la dispersión de valores sensibles o parámetros modificables a lo largo del código fuente. Aquí se definen:

- La conexión a la base de datos mediante TypeORM, incluyendo el host, puerto, credenciales y opciones de sincronización.
- Las variables de entorno, validadas con la librería dotenv, que incluyen claves JWT, credenciales de Wompi, URLs de servicios externos y parámetros de la aplicación.
- La configuración del cliente HTTP utilizado para comunicarse con el ia-service, con tiempos de espera y reintentos adecuados para evitar bloqueos.
- La configuración de la cola de trabajos Bull, que utiliza Redis para almacenar tareas en segundo plano.

Centralizar la configuración facilita el cambio de parámetros sin modificar el código fuente, lo que es fundamental para el despliegue en diferentes entornos (desarrollo, pruebas, producción) y para la rotación de claves de seguridad sin necesidad de recompilar la aplicación.

### 3.2. Carpeta `models/`

Los modelos son la representación de las entidades de la base de datos dentro del código. Utilizando TypeORM, cada modelo es una clase que define una tabla, sus columnas, tipos de datos, restricciones y relaciones con otras tablas (OneToMany, ManyToOne, ManyToMany). Los modelos principales incluyen:

- **Usuario**: Almacena credenciales, datos personales, estado de verificación, y preferencias de seguridad (2FA).
- **Billetera**: Representa el saldo de un usuario en diferentes divisas (ARS, USD, BTC, ETH, etc.). Está relacionada con el usuario y con las transacciones.
- **Transacción**: Registra cada movimiento de fondos (depósito, retiro, compra, venta), incluyendo monto, divisa, estado (pendiente, completada, fallida), y referencias a la billetera origen y destino.
- **Activo**: Catálogo de instrumentos financieros disponibles para invertir (acciones, criptomonedas, pares de divisas), con su símbolo, nombre, precio actual y volatilidad histórica.
- **Inversión**: Registra las posiciones abiertas por un usuario, incluyendo el activo, cantidad, precio de entrada, stop-loss, take-profit y el score de riesgo proporcionado por la IA.
- **Alerta**: Configuraciones de notificaciones definidas por el usuario (por ejemplo, cuando un activo alcanza cierto precio) y alertas de seguridad generadas automáticamente por el sistema.

La separación de las entidades en modelos permite que el ORM gestione las consultas SQL de forma abstracta, evita la inyección de SQL y facilita la migración de esquemas de base de datos.

### 3.3. Carpeta `services/`

Los servicios contienen la lógica de negocio pura de la aplicación. Esta es la capa más importante desde el punto de vista funcional, ya que aquí se implementan las reglas que dan valor al sistema. Cada servicio está especializado en un dominio de la aplicación:

- **AuthService**: Gestiona el registro de usuarios, el inicio de sesión (incluyendo verificación de contraseña y 2FA), la emisión y renovación de tokens JWT, y el cierre de sesión. También maneja la recuperación de contraseñas y la verificación por correo electrónico.

- **WalletService**: Administra las billeteras de los usuarios. Permite consultar saldos, crear nuevas billeteras para diferentes divisas, verificar la disponibilidad de fondos antes de una operación, y actualizar los saldos tras una transacción. Este servicio es crítico para la integridad financiera y se diseñó con mecanismos de bloqueo optimista para evitar condiciones de carrera en operaciones concurrentes.

- **TransactionService**: Procesa depósitos, retiros y transferencias. Se comunica con el servicio de Wompi para la pasarela de pagos, maneja los webhooks de confirmación de pago y actualiza los estados de las transacciones. También genera los comprobantes internos y notifica al usuario mediante correo electrónico.

- **InvestmentService**: Orquesta la compra y venta de activos. Valida que el usuario tenga fondos suficientes en la divisa correspondiente, consulta el precio actual del activo desde una fuente externa (o desde un caché actualizado periódicamente), verifica el score de riesgo obtenido del ia-service (y bloquea la operación si el riesgo es demasiado alto según el perfil del usuario), y ejecuta la operación actualizando tanto la billetera como el registro de inversiones.

- **RiskAnalysisService**: Es el cliente que se comunica con el ia-service. Prepara los datos de la operación (historial del usuario, volatilidad del activo, tendencias de mercado) y envía una petición al endpoint de predicción. También gestiona la lógica de reintentos en caso de caída del servicio y almacena en caché las predicciones para operaciones repetitivas.

- **AlertService**: Evalúa periódicamente las condiciones de las alertas configuradas por los usuarios y dispara notificaciones por correo electrónico o en la propia aplicación cuando se cumplen. También es responsable de generar alertas de seguridad cuando el sistema detecta patrones inusuales (por ejemplo, inicio de sesión desde una ubicación geográfica desconocida o múltiples intentos fallidos de retiro).

- **PriceUpdateService**: Se ejecuta como un trabajo programado para consultar fuentes externas de precios (APIs de mercados financieros) y actualizar la tabla de activos con los precios más recientes. Esta información es utilizada por el InvestmentService y por el ia-service.

La razón de separar la lógica en servicios es doble: por un lado, promueve la reutilización de código, ya que diferentes controladores o trabajos en segundo plano pueden utilizar el mismo servicio; por otro lado, facilita las pruebas unitarias, ya que los servicios pueden ser aislados con mocks de sus dependencias.

### 3.4. Carpeta `controllers/`

Los controladores actúan como un adaptador entre la capa HTTP (rutas) y la capa de servicios. Su función es recibir la petición del cliente, extraer los parámetros y el cuerpo de la solicitud, llamar al servicio adecuado con estos datos y, finalmente, enviar la respuesta HTTP con el código de estado correspondiente. Los controladores deben mantenerse extremadamente delgados, es decir, deben contener la menor lógica posible y delegar todo el procesamiento en los servicios. Esta separación asegura que los controladores solo se ocupen de los aspectos relacionados con el protocolo HTTP (códigos de estado, cabeceras, formatos de respuesta), mientras que la lógica de negocio reside en los servicios, que son independientes del transporte.

### 3.5. Carpeta `routes/`

Las rutas definen los endpoints de la API REST. Cada archivo de ruta instancia un enrutador de Express y asocia cada método HTTP (GET, POST, PUT, DELETE) con una función específica del controlador. En este nivel también se aplican middlewares de autenticación, validación y límite de tasa. La modularización de las rutas por dominio (auth.routes.ts, wallet.routes.ts, investment.routes.ts, etc.) permite una organización clara y facilita la documentación automática mediante Swagger.

### 3.6. Carpeta `middleware/`

Los middlewares son funciones que se ejecutan secuencialmente antes de que la petición alcance el controlador. Desempeñan un papel fundamental en la seguridad y la robustez del sistema:

- **Auth Middleware**: Extrae el token JWT del encabezado Authorization, verifica su firma y validez (incluyendo expiración), y, si es correcto, añade el objeto del usuario decodificado al objeto `req.user` para que esté disponible en controladores y servicios posteriores. Si el token es inválido, devuelve un error 401 (No autorizado).

- **Rate Limiter Middleware**: Implementa un límite de peticiones por IP o por usuario para prevenir ataques de fuerza bruta, especialmente en rutas sensibles como login o recuperación de contraseña. Se basa en Redis para mantener el contador de peticiones de forma distribuida en caso de que haya múltiples instancias del backend.

- **Validation Middleware**: Utiliza los esquemas definidos en la carpeta validators para comprobar que los datos enviados en el body, query string o parámetros de URL cumplan con el formato y los tipos esperados. Si la validación falla, devuelve un error 400 con una descripción detallada de los campos incorrectos, evitando que datos malformados lleguen a los servicios.

- **Error Handler Middleware**: Es el último middleware en la cadena. Captura cualquier excepción no manejada que haya ocurrido en los controladores o servicios y devuelve una respuesta JSON estandarizada que incluye el código de error, un mensaje legible y, en entornos de desarrollo, el stack trace para facilitar la depuración. Este middleware garantiza que la API siempre devuelva una respuesta consistente, incluso en situaciones de error inesperado, evitando que el servidor se caiga o que se expongan detalles internos al cliente.

### 3.7. Carpeta `validators/`

Contiene los esquemas de validación creados con la librería Zod. Cada esquema define un conjunto de reglas para los campos que se esperan en una determinada operación. Por ejemplo, el esquema de registro de usuario exige que el email sea un correo electrónico válido, que la contraseña tenga al menos 8 caracteres e incluya una mayúscula, un número y un carácter especial, y que el nombre no esté vacío. La validación en esta capa reduce la carga de trabajo de los servicios, que pueden asumir que los datos que reciben son sintácticamente correctos, y mejora la experiencia del usuario al proporcionar mensajes de error precisos y rápidos.

### 3.8. Carpeta `utils/`

Esta carpeta agrupa funciones auxiliares genéricas que no pertenecen a ningún dominio particular pero que son utilizadas por múltiples servicios o controladores. Incluye:

- **Logger**: Una instancia de Winston configurada con diferentes niveles de log (info, error, debug, warn) y transporte a la consola y, en producción, a servicios de agregación de logs como ELK o Datadog. El logger incluye el ID de la solicitud (correlation ID) para poder rastrear el flujo completo de una petición a través de logs distribuidos.

- **Encryption**: Funciones para hashear contraseñas con bcrypt y para encriptar datos sensibles (como números de tarjeta o tokens de acceso) usando AES.

- **JWT Helpers**: Funciones para generar y verificar tokens JWT con firmas asimétricas o simétricas, incluyendo la gestión de tokens de refresco.

- **Date Helpers**: Utilidades para formatear fechas, calcular diferencias temporales y manejar zonas horarias de forma uniforme en toda la aplicación.

- **Error Factory**: Fábrica de errores personalizados que extienden la clase Error nativa, permitiendo lanzar errores con códigos específicos (por ejemplo, `InsufficientFundsError`, `InvalidTokenError`, `RiskThresholdExceededError`) que el error handler puede interpretar para devolver el código HTTP adecuado.

### 3.9. Carpeta `jobs/`

Define trabajos en segundo plano utilizando la librería Bull, que se apoya en Redis para la gestión de colas y la programación de tareas. Los trabajos son fundamentales para operaciones que no requieren respuesta inmediata o que pueden ser procesadas de forma asíncrona, mejorando así la experiencia del usuario y el rendimiento general del sistema. Algunos de estos trabajos son:

- **PriceUpdateJob**: Se ejecuta cada minuto (o según la frecuencia configurada) para consumir APIs de precios de mercados (por ejemplo, Yahoo Finance, CoinGecko, o proveedores de divisas) y actualizar la tabla de activos en la base de datos. Si la llamada falla, el trabajo se reintenta con un backoff exponencial para no sobrecargar al proveedor externo.

- **TransactionConfirmationJob**: Cuando un usuario inicia un depósito mediante Wompi, el estado de la transacción queda en "pendiente" hasta que Wompi envía un webhook de confirmación. Este trabajo se encarga de consultar periódicamente el estado del pago en Wompi para transacciones que no hayan recibido el webhook en un tiempo razonable, actualizando el estado y liberando los fondos cuando sea necesario.

- **AlertTriggerJob**: Cada cierto tiempo (o basado en eventos de cambio de precio), evalúa todas las alertas activas de los usuarios y comprueba si se han cumplido las condiciones (por ejemplo, precio del activo supera un umbral). Cuando se cumple una condición, envía una notificación al usuario a través del servicio de notificaciones.

- **RiskBatchAnalysisJob**: Toma todas las posiciones abiertas de los usuarios y las evalúa nuevamente con el ia-service, detectando si el perfil de riesgo actual ha variado significativamente y generando recomendaciones de cierre parcial o total de posiciones si es necesario.

- **CleanupJob**: Tareas de mantenimiento como eliminar logs antiguos, borrar tokens de refresco expirados y limpiar sesiones inactivas.

La separación de estos trabajos del flujo principal de peticiones HTTP permite que el backend sea altamente reactivo y no se vea bloqueado por operaciones pesadas o dependientes de terceros.

### 3.10. `app.ts` y `server.ts`

- **app.ts**: Es el archivo donde se configura la aplicación Express. Aquí se registran todos los middlewares globales (cors, parser JSON, morgan para logging de solicitudes), se importan y montan los enrutadores de las diferentes rutas, se conecta la base de datos mediante TypeORM (con manejo de errores en caso de fallo), y se registra el middleware de manejo de errores global. Este archivo no inicia el servidor por sí mismo, sino que exporta la aplicación configurada para que sea iniciada por `server.ts`. Esta separación permite probar la aplicación sin tener que levantar un puerto real.

- **server.ts**: Es el punto de entrada de la ejecución. Importa la aplicación configurada desde `app.ts`, define el puerto (obtenido de las variables de entorno), y llama a `app.listen()` para poner el servidor en marcha. Además, maneja señales del sistema operativo (SIGINT, SIGTERM) para realizar un apagado graceful (cerrar conexiones activas, finalizar trabajos en curso, etc.) antes de detenerse.

### 3.11. Flujo de una Petición en el Backend

Cuando el frontend realiza una petición a la API, el recorrido interno es el siguiente:

1. La petición llega al servidor y es recibida por el middleware de logging (morgan) y el de CORS, que permite peticiones desde orígenes autorizados.
2. El middleware de parseo de JSON convierte el cuerpo de la petición en un objeto JavaScript.
3. El enrutador de Express examina la URL y el método HTTP para determinar qué ruta y controlador deben manejar la solicitud. Antes de llegar al controlador, se ejecutan los middlewares específicos de esa ruta (autenticación, validación, límite de tasa).
4. En el middleware de autenticación, se verifica la presencia y validez del token JWT. Si es válido, se decodifica y se añade la información del usuario a `req.user`. Si no es válido o no está presente en rutas protegidas, se devuelve un error 401 y el flujo se interrumpe.
5. El middleware de validación comprueba que el cuerpo de la petición, los parámetros de la URL o la query string cumplan con el esquema definido para esa ruta. Si la validación falla, se devuelve un error 400 con los detalles de los campos inválidos.
6. La petición, ya validada y autenticada, llega al controlador correspondiente. El controlador extrae los parámetros necesarios (por ejemplo, el ID del usuario desde `req.user.id` y el monto desde el cuerpo de la petición) y realiza una o varias llamadas a los servicios.
7. El servicio ejecuta la lógica de negocio, que puede incluir consultas a la base de datos mediante los modelos, llamadas a servicios externos (Wompi, ia-service, APIs de precios), y la actualización de múltiples tablas dentro de una transacción SQL para garantizar la consistencia.
8. Si el servicio encuentra una condición que impide completar la operación (por ejemplo, fondos insuficientes), lanza una excepción personalizada que es capturada por el middleware de manejo de errores, el cual devuelve una respuesta HTTP con el código apropiado (por ejemplo, 409 Conflict o 422 Unprocessable Entity).
9. Si el servicio se completa con éxito, devuelve un resultado al controlador, que lo formatea como un objeto JSON y lo envía al cliente con el código de estado 200 (para GET), 201 (para POST de creación), o el que corresponda.
10. Finalmente, el middleware de logging registra la duración de la petición y el código de estado de la respuesta.

Este flujo garantiza que cada petición pase por todas las capas de seguridad y validación antes de tocar la lógica de negocio, y que cualquier error sea capturado y respondido de forma uniforme.

---

## 4. Frontend Web: La Interfaz de Usuario

El frontend web es una aplicación de una sola página construida con React y Vite. Vite se eligió por su rapidez en el desarrollo (recarga instantánea con HMR) y por su configuración optimizada para producción, que utiliza Rollup para generar bundles eficientes. La aplicación está escrita en TypeScript para compartir tipos con el backend y reducir la probabilidad de errores en tiempo de ejecución.

La estructura de carpetas de `frontend/src/` sigue el principio de organización por funcionalidad, agrupando archivos que cambian juntos y facilitando el escalado a medida que crece el código.

### 4.1. Carpeta `api/`

Esta carpeta contiene el cliente HTTP configurado con Axios y las funciones que realizan peticiones a cada endpoint del backend. El cliente centralizado se configura con la URL base (obtenida de variables de entorno), interceptores de petición y respuesta, y manejo de tokens de autenticación. Los interceptores son especialmente importantes porque:

- **Interceptor de petición**: Añade automáticamente el token JWT al encabezado `Authorization` de cada petición, siempre que el usuario esté autenticado. Esto evita tener que pasar el token manualmente en cada llamada.
- **Interceptor de respuesta**: Captura errores globalmente, como un token expirado (código 401), y automáticamente intenta refrescar el token antes de reenviar la petición fallida, o redirige al usuario a la página de inicio de sesión si el refresco falla.

Cada archivo de la carpeta `api/` agrupa las peticiones de un dominio específico: `auth.api.ts` contiene `loginUser()`, `registerUser()`, `refreshToken()`; `wallet.api.ts` contiene `getBalance()`, `depositFunds()`, `withdrawFunds()`; `investment.api.ts` contiene `buyAsset()`, `sellAsset()`, `getPortfolio()`, etc. De esta forma, el código de las páginas y componentes solo importa las funciones de la API que necesita, manteniendo un bajo acoplamiento.

### 4.2. Carpeta `components/`

Contiene componentes de React reutilizables y de presentación. Estos componentes son funcionales, aceptan props y no suelen tener lógica de estado compleja o conexión directa con el estado global. La idea es construir una biblioteca de componentes UI (botones, inputs, modales, tarjetas, tablas, gráficos, etc.) que puedan ser combinados para construir páginas completas. Algunos ejemplos son:

- **Button**: Un botón estilizado con variantes (primario, secundario, peligro, etc.) y estados (cargando, deshabilitado).
- **Input**: Campo de texto con validación visual y mensajes de error integrados.
- **Modal**: Ventana emergente reutilizable para confirmaciones o formularios.
- **Chart**: Componente que envuelve la librería de gráficos (por ejemplo, Recharts o una integración con TradingView) y proporciona una interfaz simplificada para mostrar datos de precios.
- **TransactionList**: Muestra una lista paginada de transacciones con formato de fechas y montos.

La separación de estos componentes en una carpeta específica permite que los diseñadores y desarrolladores trabajen sobre ellos de forma aislada, aplicando estilos consistentes en toda la aplicación sin duplicar código.

### 4.3. Carpeta `pages/`

Las páginas son componentes de React que representan vistas completas y que suelen estar asociadas a una ruta de la aplicación (por ejemplo, `/dashboard`, `/wallet`, `/investments`, `/profile`). Cada página se compone de una combinación de componentes reutilizables y contiene la lógica específica de esa vista, como la obtención de datos al montar el componente (usando hooks) y el manejo de eventos de usuario. Las páginas actúan como el punto de entrada de cada funcionalidad y coordinan la interacción entre el usuario y el estado de la aplicación.

### 4.4. Carpeta `hooks/`

Los hooks personalizados encapsulan lógica de estado y efectos que pueden ser reutilizados por múltiples componentes o páginas. Son la evolución natural de los componentes de clase y los higher-order components, permitiendo extraer lógica compleja fuera de la capa de presentación. Algunos hooks importantes son:

- **useAuth**: Gestiona el estado de autenticación del usuario. Proporciona funciones como `login()`, `logout()`, `register()`, y expone el objeto del usuario y un booleano `isAuthenticated`. Este hook se apoya en el contexto de autenticación o en el store global para mantener la sesión.
- **useWallet**: Se encarga de obtener y actualizar el saldo de la billetera del usuario. Internamente llama a la API de wallet, maneja el estado de carga y errores, y actualiza el store global cuando hay cambios. Los componentes de la página de dashboard o de inversión utilizan este hook para mostrar el saldo sin tener que repetir la lógica de petición y manejo de errores.
- **useInvestment**: Proporciona funciones para comprar, vender y consultar el portafolio de inversiones, incluyendo la obtención de precios en tiempo real y el análisis de riesgo. Utiliza el servicio de inversión de la API y maneja la actualización del estado de las inversiones después de cada operación.
- **useAlert**: Gestiona la creación, consulta y eliminación de alertas de precio, así como la suscripción a notificaciones en tiempo real si el backend soporta WebSockets.

La creación de hooks personalizados no solo simplifica el código de las páginas, sino que también centraliza la lógica de negocio del frontend en un lugar donde puede ser testeada de forma aislada.

### 4.5. Carpeta `contexts/`

Los contextos de React se utilizan para compartir datos globales que son necesarios en muchos componentes sin tener que pasar props manualmente a través de varios niveles del árbol de componentes. En BANCA NEN, los contextos principales son:

- **AuthContext**: Proporciona el usuario autenticado y las funciones de login/logout a toda la aplicación. Cuando el usuario inicia sesión, el contexto se actualiza y todos los componentes que lo consumen se re-renderizan automáticamente, mostrando la información del usuario.
- **WalletContext**: Comparte el saldo de la billetera y las transacciones recientes. Aunque podría ser sustituido por un store global, el contexto es útil para datos que son leídos por muchos componentes en diferentes profundidades.
- **ThemeContext**: Permite cambiar entre tema claro y oscuro, almacenando la preferencia en localStorage para persistir entre sesiones.

El uso de contextos está justificado para datos que no cambian con alta frecuencia, pero para datos más dinámicos (como los precios de los activos), se prefiere el uso de stores (Zustand) que ofrecen un rendimiento superior al evitar re-renderizados innecesarios.

### 4.6. Carpeta `store/`

Utiliza la librería Zustand para manejar el estado global de la aplicación de una manera más eficiente y menos verbosa que Redux. Zustand permite crear stores con mutaciones simples y selectores para evitar re-renderizados cuando partes del estado que no son relevantes para un componente cambian. Los stores principales son:

- **authStore**: Almacena el token JWT, el perfil del usuario, y el estado de autenticación. Proporciona acciones como `setToken()`, `clearToken()`, `updateUserProfile()`. Aunque el AuthContext también maneja estos datos, el store es la fuente de verdad única, y el contexto se sincroniza con él.
- **walletStore**: Contiene el saldo agrupado por divisa, el historial de transacciones y el estado de carga. Las acciones incluyen `fetchBalance()`, `addTransaction()`, `updateBalance()`.
- **investmentStore**: Almacena el portafolio de inversiones, los activos disponibles con sus precios actuales, y los scores de riesgo. Incluye acciones para actualizar precios (usadas por un WebSocket o por polling), y para añadir o eliminar inversiones.
- **uiStore**: Controla el estado de la interfaz de usuario, como el sidebar abierto o cerrado, el tema actual, y los modales activos.

La elección de Zustand frente a Redux se debe a su simplicidad, menor cantidad de boilerplate y su soporte nativo para TypeScript, que permite un tipado completo de las acciones y el estado.

### 4.7. Carpeta `types/`

Define interfaces y tipos TypeScript que se utilizan en todo el frontend. Estos tipos reflejan la estructura de los datos que se reciben del backend (usuarios, transacciones, activos, inversiones, etc.), asegurando que el frontend maneje los datos con la misma estructura que espera el backend. Gracias a que el backend y el frontend comparten TypeScript, las definiciones de tipos pueden ser exportadas desde el backend a un paquete común (o copiadas manualmente) para garantizar la coherencia entre ambas capas. Esto reduce errores de desajuste de campos y facilita la refactorización.

### 4.8. `App.tsx` y `main.tsx`

- **main.tsx**: Es el punto de entrada de la aplicación React. Monta el componente `<App />` en el elemento DOM con id `root`. También envuelve la aplicación con los proveedores de contexto necesarios y el `StrictMode` de React para detectar problemas potenciales.
- **App.tsx**: Define las rutas de la aplicación utilizando React Router. Cada ruta se asocia a un componente de página, y se aplican rutas protegidas que verifican si el usuario está autenticado antes de renderizar la página. Si el usuario intenta acceder a una ruta protegida sin estar autenticado, se le redirige a la página de login.

### 4.9. Flujo de Interacción en el Frontend

Cuando el usuario realiza una acción en la interfaz (por ejemplo, hace clic en "Depositar" y envía el formulario):

1. El evento `onSubmit` del formulario captura los datos (monto, método de pago) y previene el comportamiento predeterminado del navegador.
2. El componente de la página (o un hook personalizado) valida los datos en el lado del cliente (por ejemplo, que el monto sea un número positivo) y muestra un mensaje de error inmediato si no lo son, mejorando la experiencia de usuario sin necesidad de llamar al servidor.
3. Si los datos son válidos, el componente llama a la función correspondiente del archivo de API (por ejemplo, `depositFunds()`), pasando los datos del formulario.
4. La función de API realiza la petición POST al backend. Mientras tanto, el componente activa un estado de "cargando", mostrando un spinner o deshabilitando el botón para evitar envíos duplicados.
5. Si la petición es exitosa, la respuesta del backend (por ejemplo, el nuevo saldo y el ID de la transacción) se pasa al store global (a través de una acción de Zustand) para actualizar el estado de la billetera.
6. El componente, que está suscrito al store, detecta el cambio de estado (gracias al sistema de reactividad de Zustand) y se re-renderiza, mostrando el nuevo saldo actualizado sin necesidad de recargar la página.
7. Si la petición falla, el interceptor de Axios captura el error y el componente muestra un mensaje de error (por ejemplo, "Fondos insuficientes" o "Error de conexión"). El estado de carga se desactiva y el usuario puede intentar de nuevo.

Este flujo reactivo garantiza que la interfaz sea ágil y que el usuario reciba retroalimentación inmediata de cada acción, siguiendo el patrón de "optimistic UI" en algunos casos (por ejemplo, mostrando una actualización temporal antes de la confirmación del servidor).

---

## 5. Mobile: La Experiencia Nativa

La aplicación móvil está desarrollada con React Native y Expo, lo que permite escribir código JavaScript/TypeScript que se ejecuta como una aplicación nativa en iOS y Android. La estructura de carpetas es muy similar a la del frontend web, adaptando los componentes de React a componentes nativos (`<View>`, `<Text>`, `<ScrollView>`, etc.) y utilizando librerías específicas para navegación (React Navigation), almacenamiento local (AsyncStorage) y notificaciones push.

A diferencia del frontend web, la aplicación móvil no puede confiar en el almacenamiento en localStorage para guardar el token JWT, por lo que utiliza el almacenamiento seguro (SecureStore en iOS, EncryptedSharedPreferences en Android) para guardar credenciales y tokens.

Los flujos de comunicación con el backend son idénticos a los del frontend web: consumen la misma API REST y utilizan los mismos interceptores de Axios. La lógica de estado también se comparte en gran medida, reutilizando los hooks y stores de Zustand, lo que reduce la duplicación de código entre las dos plataformas.

---

## 6. ia-service: El Motor de Inteligencia Artificial

El servicio de IA es un componente crucial que proporciona la ventaja competitiva de la plataforma. Está desarrollado en Python con FastAPI, un framework moderno y de alto rendimiento para construir APIs. Se eligió Python por ser el lenguaje estándar en ciencia de datos y machine learning, con un ecosistema maduro de librerías como TensorFlow, scikit-learn, pandas y SHAP.

### 6.1. Estructura de `ia-service/src/`

- **api/**: Define los endpoints REST utilizando FastAPI. Los endpoints principales son:
  - `/predict-risk`: Recibe datos de una posible operación (como el historial de inversiones del usuario, la volatilidad del activo, el monto, la tendencia actual del mercado) y devuelve un score de riesgo (0 a 100) y una interpretación (por ejemplo, "Riesgo alto", "Riesgo moderado", "Riesgo bajo").
  - `/explain-prediction`: Utiliza SHAP (SHapley Additive exPlanations) para devolver la contribución de cada variable de entrada a la predicción, lo que proporciona transparencia y permite al usuario entender por qué el modelo considera que una operación es riesgosa o segura. Esta característica es fundamental para generar confianza en el sistema.
  - `/retrain`: Endpoint interno (protegido por una clave de API) que permite lanzar un proceso de reentrenamiento del modelo con los nuevos datos históricos acumulados.

- **models/**: Contiene la definición de los modelos de machine learning. BANCA NEN utiliza un enfoque de ensemble, combinando tres modelos:
  - **LSTM (Long Short-Term Memory)**: Una red neuronal recurrente adecuada para series temporales, utilizada para predecir tendencias de precios a corto plazo basándose en datos históricos de precios.
  - **Random Forest**: Un modelo de árboles de decisión que es robusto a datos no lineales y proporciona una buena interpretabilidad, utilizado para clasificar el riesgo en función de características estáticas del usuario y del activo.
  - **XGBoost**: Un modelo de gradient boosting que suele ofrecer un alto rendimiento en problemas de clasificación y regresión, utilizado para refinar la predicción final a partir de las salidas de los dos modelos anteriores.

  El ensemble combina las predicciones de estos tres modelos mediante un meta-modelo o un promedio ponderado, mejorando la precisión y reduciendo el sesgo de cada modelo individual.

- **training/**: Contiene los scripts de entrenamiento de los modelos. Estos scripts se ejecutan de forma periódica (por ejemplo, diaria o semanal) para reentrenar los modelos con los últimos datos de mercado y de operaciones reales de la plataforma. El entrenamiento puede realizarse offline y el modelo resultante se guarda en un formato serializado (por ejemplo, `.pkl` para modelos de scikit-learn, `.h5` para modelos de Keras) para ser cargado por el servicio en tiempo de ejecución.

- **data/**: Procesa y prepara los datos que llegan al servicio. Incluye funciones de limpieza, normalización, codificación de variables categóricas y creación de características (feature engineering). Por ejemplo, a partir del precio histórico de un activo, se calculan indicadores técnicos como el RSI (Relative Strength Index) o las medias móviles, que se utilizan como variables de entrada del modelo.

- **explainability/**: Contiene la implementación de SHAP para explicar las predicciones del modelo. SHAP asigna a cada característica de entrada un valor que representa su contribución a la predicción, permitiendo generar gráficos de barras o force plots que se devuelven al frontend para que el usuario pueda visualizar por qué se consideró una operación como riesgosa.

### 6.2. Flujo de Integración con el Backend

El backend se comunica con el ia-service mediante peticiones HTTP síncronas. Cuando un usuario solicita comprar un activo, el backend no autoriza inmediatamente la operación. En su lugar:

1. Reúne los datos necesarios: el perfil de riesgo del usuario (edad, ingresos, experiencia previa), el histórico de transacciones del usuario, la volatilidad del activo, y las condiciones actuales del mercado (obtenidas de una API externa de precios).
2. Envía una petición POST al endpoint `/predict-risk` del ia-service, con timeout configurado para que no supere los 2 segundos.
3. El ia-service carga el modelo ensamblado en memoria, preprocesa los datos, ejecuta los modelos y devuelve el score de riesgo y la explicación.
4. El backend recibe esta información y, en función de la política de riesgo configurada (por ejemplo, si el score supera el 80%, se bloquea automáticamente la operación), decide autorizar o rechazar la compra. En caso de autorización, registra la inversión en la base de datos.

Si el ia-service no responde en el tiempo establecido, el backend puede optar por aplicar una política de fallback (por ejemplo, permitir la operación solo si el monto es pequeño, o rechazar la operación por defecto para no exponer al usuario a un riesgo no evaluado). Esta estrategia de resiliencia es fundamental para que el sistema no quede inoperante ante caídas del servicio de IA.

---

## 7. Otras Carpetas de Infraestructura y Documentación

### 7.1. Carpeta `infra/`

Esta carpeta es utilizada por los equipos de DevOps y SRE (Site Reliability Engineering) para gestionar el ciclo de vida de la aplicación en entornos de pre-producción y producción. Su contenido incluye:

- **Dockerfile**: Para cada servicio (backend, frontend, mobile, ia-service) se define un Dockerfile que construye la imagen del contenedor, copiando el código fuente, instalando dependencias y configurando el punto de entrada. El uso de multi-stage builds en los Dockerfiles permite optimizar el tamaño de las imágenes en producción.
- **docker-compose.yml** (en la raíz del proyecto): Orquesta todos los servicios para desarrollo local, levantando PostgreSQL, Redis, el backend, el frontend, el ia-service, e incluso una herramienta como Adminer para gestionar la base de datos.
- **k8s/**: Contiene los manifiestos de Kubernetes para desplegar la aplicación en un clúster. Incluye Deployments (con réplicas para alta disponibilidad), Services (LoadBalancer o ClusterIP), ConfigMaps, Secrets (para las variables de entorno), Ingress (para enrutamiento de tráfico) y HorizontalPodAutoscaler (para escalado automático basado en CPU/memoria).
- **terraform/**: Scripts de Terraform para aprovisionar la infraestructura en la nube (por ejemplo, AWS o Google Cloud), incluyendo la creación de la base de datos gestionada (RDS), el clúster de Kubernetes (EKS o GKE), el sistema de almacenamiento de objetos (S3) para backups, y el registro de contenedores (ECR).
- **monitoring/**: Configuraciones para Prometheus (scraping de métricas) y Grafana (paneles de monitoreo), así como alertas basadas en Prometheus Alertmanager. El backend y el ia-service exponen métricas en un endpoint `/metrics` que Prometheus recolecta para monitorear el rendimiento (latencia de peticiones, uso de CPU, uso de memoria, número de errores, etc.).

### 7.2. Carpeta `docs/`

La documentación es un artefacto de primera clase en este proyecto. Se divide en:

- **api/**: Archivos YAML o JSON que definen la especificación OpenAPI de los endpoints del backend. Esto permite generar automáticamente la documentación interactiva con Swagger UI, que los desarrolladores y testers pueden consultar para conocer los parámetros, ejemplos de solicitud y respuesta, y códigos de error.
- **architecture/**: Diagramas de arquitectura en el modelo C4 (Contexto, Contenedores, Componentes, Código) y descripciones en texto de las decisiones de diseño (Architecture Decision Records - ADR). Estos documentos explican por qué se eligió cada tecnología y patrón, facilitando la toma de decisiones futuras y la incorporación de nuevos miembros al equipo.
- **user-guide/**: Manuales de usuario para las diferentes funcionalidades de la plataforma, con capturas de pantalla y tutoriales paso a paso.
- **deployment/**: Guías detalladas para el despliegue en cada entorno, incluyendo la configuración de variables de entorno, la ejecución de migraciones de base de datos, y los procedimientos de rollback en caso de fallos.

---

## 8. El Recorrido Completo de la Información: Ejemplo Práctico

Para consolidar todo lo explicado, se describe a continuación un ejemplo concreto y completo del flujo de información a través de todos los componentes del sistema, desde que el usuario interactúa con la interfaz hasta que recibe la confirmación de su operación.

### Escenario: Un usuario desea comprar una acción de Apple (AAPL) desde su billetera en dólares.

**Paso 1: Interacción en el frontend**
El usuario inicia sesión en la aplicación web o móvil. En el panel de inversiones, selecciona el activo AAPL, introduce la cantidad de acciones que desea comprar y hace clic en el botón "Comprar". El frontend (la página de inversiones) captura estos datos y llama a la función `buyAsset` definida en el archivo de API de inversiones.

**Paso 2: Petición al backend**
La función `buyAsset` realiza una petición POST a la URL `/api/investments/buy` del backend, incluyendo en el cuerpo de la petición el ID del activo, la cantidad y la divisa (USD). La petición incluye el token JWT en el encabezado `Authorization`, que fue añadido automáticamente por el interceptor de Axios.

**Paso 3: Middleware y enrutamiento en el backend**
La petición llega al backend y atraviesa el middleware de autenticación, que verifica la validez del token JWT y extrae el ID del usuario. Luego, el middleware de validación comprueba que el cuerpo de la petición tenga los campos correctos con los tipos esperados (por ejemplo, que `quantity` sea un número positivo). Si todo es válido, el enrutador dirige la petición al controlador de inversiones.

**Paso 4: Controlador y servicio de inversiones**
El controlador de inversiones recibe la petición, extrae el `userId` de `req.user` y los parámetros de `req.body`, y llama al `InvestmentService` con estos datos.

**Paso 5: Lógica del servicio de inversiones**
El `InvestmentService` ejecuta la siguiente secuencia:
1. **Validación de saldo**: Llama al `WalletService` para verificar que el usuario tenga suficiente saldo en su billetera de dólares para cubrir la compra (cantidad × precio actual). Si el saldo es insuficiente, lanza una excepción `InsufficientFundsError`.
2. **Obtención del precio actual**: Consulta la tabla de activos en la base de datos para obtener el precio más reciente de AAPL (actualizado por el `PriceUpdateService`).
3. **Análisis de riesgo**: Para cumplir con la política de seguridad y ofrecer asesoramiento inteligente, el servicio prepara un conjunto de características: el historial de transacciones del usuario, su edad, su perfil de riesgo (definido en el registro), la volatilidad actual de AAPL, y las condiciones generales del mercado (por ejemplo, índice S&P 500). Envía una petición POST al endpoint `/predict-risk` del ia-service con estos datos.
4. **Procesamiento de la IA**: El ia-service recibe los datos, los preprocesa (normalización, cálculo de indicadores técnicos), ejecuta los tres modelos (LSTM, Random Forest, XGBoost) y combina sus salidas en un score de riesgo (por ejemplo, 35 sobre 100, considerando que AAPL es un activo de relativa baja volatilidad). Además, genera la explicación SHAP que indica que el principal factor de riesgo es la volatilidad del mercado general. El ia-service devuelve esta información al backend en formato JSON.
5. **Política de riesgo**: El `InvestmentService` evalúa el score de riesgo. Si el score supera el umbral permitido para el usuario (por ejemplo, el usuario tiene perfil "moderado" y el umbral es 70), el servicio autoriza la operación. Si el score fuera superior, se denegaría la compra y se devolvería un mensaje explicativo al usuario.
6. **Ejecución de la transacción**: Se inicia una transacción SQL. Dentro de esta transacción, el `WalletService` descuenta el monto de la billetera en dólares y actualiza el saldo. El `InvestmentService` crea un nuevo registro en la tabla `Inversiones` con los detalles de la compra (activo, cantidad, precio de entrada, fecha, score de riesgo). También se registra la operación en la tabla `Transacciones` con tipo "compra".
7. **Trabajos en segundo plano (opcional)**: Si se configuraron alertas para este activo, se encola un trabajo en Bull (`AlertTriggerJob`) para evaluar si se cumplen las condiciones de la alerta y notificar al usuario si es necesario.
8. **Confirmación**: El `InvestmentService` devuelve al controlador el resultado de la operación, incluyendo el ID de la inversión, el nuevo saldo y el score de riesgo.

**Paso 6: Respuesta al frontend**
El controlador recibe el resultado y lo envía al frontend con un código de estado 201 (Created). La respuesta incluye los datos de la inversión creada y el saldo actualizado.

**Paso 7: Actualización de la interfaz**
El frontend recibe la respuesta. El interceptor de Axios no detecta errores, por lo que la función `buyAsset` resuelve la promesa. El componente de la página de inversiones actualiza el estado local (o llama al store de inversiones) con los nuevos datos: el portafolio ahora muestra la acción AAPL, y el saldo de la billetera en dólares se ha reducido. La interfaz se re-renderiza, mostrando al usuario un mensaje de éxito y los detalles de la operación.

**Paso 8: Persistencia y operaciones posteriores (asíncronas)**
Paralelamente, algunos trabajos en segundo plano pueden estar en ejecución:
- El `PriceUpdateService` continuará actualizando los precios de AAPL, lo que permitirá que el usuario vea la valoración de su inversión en tiempo real.
- El `RiskBatchAnalysisJob` reevaluará periódicamente las posiciones abiertas y, en caso de que el riesgo de AAPL aumente significativamente, podría generar una recomendación de venta que aparecerá en el dashboard del usuario.

Este ejemplo demuestra la interconexión de todos los servicios y cómo cada capa tiene una responsabilidad bien definida que contribuye al funcionamiento global del sistema. La separación de la lógica en servicios permite que cada paso sea testeable de forma independiente y que los cambios en el análisis de riesgo (por ejemplo, ajustar el umbral de riesgo) se realicen sin afectar al proceso de compra en sí.

---

## 9. Tecnologías Utilizadas

A continuación se enumeran las principales tecnologías y librerías empleadas en cada componente, junto con su justificación:

### Backend
- **Node.js y Express**: Plataforma de ejecución y framework web. Node.js ofrece un alto rendimiento para aplicaciones de entrada/salida, y Express es minimalista y flexible.
- **TypeScript**: Aporta tipado estático, reduciendo errores y mejorando la mantenibilidad.
- **TypeORM**: ORM que facilita la interacción con PostgreSQL, con soporte para migraciones y relaciones complejas.
- **PostgreSQL**: Base de datos relacional elegida por su robustez, soporte para transacciones ACID y rendimiento en consultas analíticas.
- **Redis**: Utilizado como almacén de caché y como broker de mensajes para Bull, proporcionando colas de trabajos eficientes y distribuibles.
- **Bull**: Librería para manejo de colas de trabajos basada en Redis, fundamental para tareas asíncronas y programadas.
- **JWT y bcrypt**: Para autenticación y seguridad de contraseñas.
- **Axios**: Cliente HTTP para comunicaciones con servicios externos (ia-service, APIs de precios, Wompi).
- **Winston**: Logging estructurado para monitoreo y debugging.

### Frontend Web
- **React**: Biblioteca para construir interfaces de usuario declarativas y basadas en componentes.
- **Vite**: Herramienta de build que proporciona un desarrollo rápido y compilación optimizada.
- **TypeScript**: Compartir tipos con el backend para una integración más segura.
- **Zustand**: Gestión de estado global minimalista y eficiente.
- **Axios**: Cliente HTTP con interceptores para manejo de tokens y errores.
- **React Router**: Navegación entre páginas.
- **Recharts** o **Chart.js**: Librerías de gráficos para visualización de datos financieros.
- **Tailwind CSS** (o similar): Framework de estilos para un diseño ágil y consistente.

### Mobile
- **React Native**: Framework para construir aplicaciones nativas usando JavaScript/TypeScript.
- **Expo**: Herramientas y servicios que simplifican el desarrollo y build de apps React Native.
- **React Navigation**: Navegación nativa para móviles.
- **SecureStore**: Almacenamiento de datos sensibles (tokens) de forma segura.

### ia-service
- **Python**: Lenguaje por excelencia para machine learning y análisis de datos.
- **FastAPI**: Framework web asíncrono que genera automáticamente documentación OpenAPI y ofrece alto rendimiento.
- **TensorFlow / Keras**: Para modelos de deep learning (LSTM).
- **scikit-learn**: Para modelos clásicos (Random Forest) y preprocesamiento.
- **XGBoost**: Librería especializada para gradient boosting.
- **SHAP**: Explicabilidad de predicciones.
- **pandas y numpy**: Manipulación de datos y cálculos numéricos.

### Infraestructura y DevOps
- **Docker**: Contenerización de todos los servicios para un despliegue reproducible.
- **Kubernetes**: Orquestación de contenedores para escalado automático y alta disponibilidad.
- **Terraform**: Gestión de infraestructura como código en la nube.
- **Prometheus y Grafana**: Monitoreo y visualización de métricas de rendimiento.
- **GitHub Actions** (o GitLab CI): Pipelines de CI/CD para automatizar pruebas, construcción y despliegue.

---

## 10. Cómo Empezar a Contribuir o Ejecutar el Proyecto en Local

Para poner en marcha el entorno de desarrollo, se recomienda seguir estos pasos. La utilización de Docker permite levantar todo el stack con un único comando, pero también se puede ejecutar cada servicio de forma independiente si se prefiere.

### 10.1. Prerrequisitos
- Tener instalado Docker y Docker Compose en el sistema.
- (Opcional) Node.js 18+ y Python 3.10+ si se quiere ejecutar sin contenedores.
- Clonar el repositorio.

### 10.2. Variables de Entorno
Cada servicio requiere un archivo `.env` con las variables de configuración. Se proporcionan archivos de ejemplo (`.env.example`) en cada carpeta (backend, frontend, ia-service) que deben ser copiados a `.env` y adaptados con las credenciales adecuadas (por ejemplo, la URL de la base de datos, las claves de APIs externas, etc.).

### 10.3. Levantar Todos los Servicios con Docker Compose
Desde la raíz del proyecto, ejecutar:
```bash
docker-compose up --build
```
Esto construirá las imágenes de todos los servicios (si no existen) y levantará los contenedores de:
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- Backend (puerto 3000)
- Frontend (puerto 5173)
- ia-service (puerto 8000)
- (Opcional) Adminer (puerto 8080) para gestionar la BD.

Una vez levantados, el frontend estará accesible en `http://localhost:5173` y el backend en `http://localhost:3000`. La documentación Swagger del backend estará en `http://localhost:3000/api-docs`.

### 10.4. Migraciones de Base de Datos
En el entorno de desarrollo, el backend puede configurarse para sincronizar automáticamente los modelos con la base de datos (opción `synchronize: true` en TypeORM), pero en entornos más controlados se recomienda ejecutar las migraciones manualmente:
```bash
cd backend
npm run typeorm migration:run
```

### 10.5. Pruebas y Quality Assurance
El proyecto incluye pruebas unitarias y de integración. Para ejecutarlas:
- **Backend**: `npm test` dentro de la carpeta `backend/`.
- **Frontend**: `npm test` dentro de `frontend/` (utiliza Vitest).
- **ia-service**: `pytest` dentro de `ia-service/`.

Además, el pipeline de CI/CD ejecuta automáticamente estas pruebas en cada push y pull request, garantizando que el código cumpla con los estándares de calidad antes de ser desplegado.

### 10.6. Convenciones de Código
- Se utiliza ESLint y Prettier en todos los proyectos para mantener un estilo de código consistente.
- Los commits deben seguir el estándar Conventional Commits para facilitar la generación de changelogs y el versionado semántico.

---

## 11. Conclusión

BANCA NEN es un sistema complejo, pero su diseño modular y la separación clara de responsabilidades entre el frontend, backend, y el servicio de IA permiten que cada parte sea desarrollada, probada y escalada de forma independiente. El backend actúa como el orquestador principal, gestionando el estado de la aplicación y la integridad de los datos financieros. El frontend proporciona una experiencia de usuario fluida y reactiva. El servicio de IA añade valor diferencial mediante el asesoramiento inteligente. Y la infraestructura basada en contenedores y orquestación garantiza que todo funcione de manera fiable y escalable en producción.

Este documento ha recorrido cada carpeta y archivo, explicando no solo su función, sino también el porqué de su existencia dentro de la arquitectura general. Se espera que esta explicación detallada sirva como punto de partida para que nuevos desarrolladores se familiaricen rápidamente con el código base y puedan contribuir de manera efectiva al proyecto.

Para cualquier duda adicional, se recomienda consultar la documentación en la carpeta `docs/` o contactar con el equipo responsable de cada módulo.