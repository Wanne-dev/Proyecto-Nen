# PROYECTO NEN BANK 
## Sena ADSO

## Plataforma de Inversión Inteligente con Billetera Digital y Trading Asistido por IA

---

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![React](https://img.shields.io/badge/React-18.x-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

##  Tabla de Contenidos

1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Problemática y Justificación](#-problemática-y-justificación)
3. [Objetivos](#-objetivos)
4. [Alcance y Características Principales](#-alcance-y-características-principales)
5. [Requerimientos Funcionales (RF)](#-requerimientos-funcionales-rf)
6. [Requerimientos No Funcionales (RNF)](#-requerimientos-no-funcionales-rnf)
7. [Arquitectura del Sistema](#-arquitectura-del-sistema)
8. [Tecnologías y Herramientas](#-tecnologías-y-herramientas)
9. [Modelo de Datos (MER)](#-modelo-de-datos-mer)
10. [Estructura del Proyecto](#-estructura-del-proyecto)
11. [Plan de Desarrollo (Sprints)](#-plan-de-desarrollo-sprints)
12. [Seguridad y Cumplimiento](#-seguridad-y-cumplimiento)
13. [Guía de Instalación y Configuración](#-guía-de-instalación-y-configuración)
14. [Equipo y Roles](#-equipo-y-roles)
15. [Entregables Finales](#-entregables-finales)

---

##  Descripción del Proyecto

**BANCA NEN** es una plataforma web y móvil de inversión real que combina inteligencia artificial, seguridad bancaria y educación financiera. Permite a los usuarios:

- **Invertir en activos financieros reales** (acciones, criptomonedas, divisas) con la asistencia de un sistema de IA que evalúa el riesgo de cada operación.
- **Gestionar una billetera multi-moneda** con depósitos y retiros reales a través de Wompi (pasarela de pago colombiana con tokenización PCI DSS).
- **Acceder a gráficos profesionales** en tiempo real integrados con TradingView.
- **Recibir alertas de seguridad y fraude** en tiempo real, con bloqueo automático de cuentas ante actividades sospechosas.
- **Operar desde cualquier dispositivo** con sincronización en tiempo real entre web y app móvil nativa (iOS/Android).

---

##  Problemática y Justificación

### Problemática

En Colombia, el acceso a instrumentos de inversión de calidad sigue siendo limitado para el público general. Las plataformas existentes presentan problemas de:

- **Seguridad deficiente**: Falta de 2FA, cifrado débil y auditoría limitada.
- **Complejidad**: Interfaces poco intuitivas que alejan a los usuarios novatos.
- **Falta de herramientas predictivas**: Los usuarios deben tomar decisiones sin asistencia de IA.
- **Exclusión financiera**: Dificultad para acceder a mercados internacionales y múltiples monedas.

### Justificación

**BANCA NEN** democratiza el acceso a inversiones inteligentes mediante:

✅ **Seguridad de nivel bancario** (2FA, biometría, cifrado AES-256, auditoría inmutable).  
✅ **Inteligencia artificial** (score de acierto en cada operación, explicabilidad SHAP).  
✅ **Educación financiera** (modo demo, backtesting, alertas y recomendaciones).  
✅ **Inclusión financiera** (soporte para COP, USD, EUR, BTC, ETH y depósitos con Wompi).

---

##  Objetivos

### Objetivo General

Desarrollar una plataforma web y móvil que permita a los usuarios invertir en activos financieros reales con la asistencia de un sistema de inteligencia artificial que evalúa el riesgo y la probabilidad de éxito de cada operación, bajo estrictos estándares de seguridad y cumplimiento normativo colombiano.

### Objetivos Específicos

1. Implementar un sistema de autenticación robusto con 2FA, KYC y recuperación de cuenta multi-factor.
2. Diseñar una billetera virtual que soporte múltiples monedas (USD, COP, EUR, BTC, ETH) y estandarice todo en USD.
3. Integrar la pasarela de pago Wompi para depósitos y retiros reales con tokenización PCI DSS.
4. Conectar con datos de mercado en tiempo real (TradingView, Alpha Vantage) y ejecutar órdenes de compra/venta (Market, Limit, Stop-Loss, etc.).
5. Entrenar un modelo de IA (ensemble de LSTM, Random Forest y XGBoost) que evalúe cada transacción y devuelva un score de acierto (0-100) con explicación SHAP.
6. Garantizar la seguridad de los datos con cifrado AES-256, auditoría inmutable y detección de fraudes en tiempo real.
7. Desarrollar una app móvil nativa (iOS/Android) con biometría, notificaciones push y sincronización con la web.

---

##  Alcance y Características Principales

| Módulo | Características |
|--------|-----------------|
| **Autenticación** | Registro con KYC (documento + selfie), login con 2FA (TOTP), recuperación multi-factor, bloqueo remoto |
| **Billetera** | Multi-moneda (USD, COP, EUR, BTC, ETH, USDC), depósitos con Wompi, retiros con seguridad máxima, transferencias entre usuarios |
| **Trading** | Gráficos TradingView en tiempo real, 7 tipos de órdenes (Market, Limit, Stop-Loss, Take-Profit, Stop-Limit, Trailing Stop, OCO), más de 100 indicadores técnicos |
| **IA Predictiva** | Score de acierto (0-100) con 30+ variables, entrenamiento automático diario, explicabilidad SHAP |
| **Seguridad** | Cifrado AES-256, TLS 1.3, 2FA obligatorio, auditoría inmutable (hash encadenado), SARLAFT, PCI DSS Level 1 |
| **App Móvil** | Nativa (iOS/Android), biometría, notificaciones push, geolocalización, sincronización en tiempo real |
| **Administración** | Panel de control, gestión de usuarios, auditoría de transacciones, configuración del sistema |
| **Notificaciones** | Push, email, SMS (alertas de seguridad, transacciones, mercado) |
| **Reportes** | En tiempo real, exportación PDF/Excel/CSV, programación automática |

---

##  Requerimientos Funcionales (RF)

### Módulo de Autenticación y Seguridad

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-01** | Landing Page con Motion Design | Alta |
| **RF-02** | Banner de Cookies y Política de Privacidad | Alta |
| **RF-03** | Registro con KYC (documento + selfie + validación) | Crítica |
| **RF-04** | Login con 2FA (TOTP) | Crítica |
| **RF-05** | Recuperación de contraseña multi-factor | Crítica |
| **RF-06** | Reactivación de cuenta bloqueada | Alta |
| **RF-07** | Cierre de sesión y bloqueo remoto | Alta |

### Módulo de Billetera y Transacciones

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-08** | Billetera multi-moneda (USD, COP, EUR, BTC, ETH, USDC) | Crítica |
| **RF-09** | Depósito con Wompi (tokenización, webhooks) | Crítica |
| **RF-10** | Retiro con seguridad máxima (2FA + biometría + preguntas) | Crítica |
| **RF-11** | Transferencia entre usuarios con IA | Alta |

### Módulo de Trading

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-12** | Gráficos en tiempo real con TradingView | Crítica |
| **RF-13** | Órdenes de compra/venta (Market, Limit, Stop-Loss, etc.) | Crítica |
| **RF-14** | Gestión de órdenes abiertas (cancelar/modificar) | Alta |
| **RF-15** | Historial de órdenes con filtros y exportación | Alta |

### Módulo de IA y Criticidad

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-24** | Score de acierto de IA (0-100) con 30+ variables | Crítica |
| **RF-25** | Entrenamiento automático del modelo (diario) | Alta |
| **RF-26** | Explicabilidad SHAP (variables influyentes) | Media |

### Módulo de App Móvil

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-16** | App nativa (iOS/Android) con biometría | Alta |
| **RF-17** | Sincronización en tiempo real (WebSocket) | Alta |

### Módulo de Administración

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-18** | Panel de administración completo | Alta |
| **RF-19** | Gestión de roles (Analista, Operador, Admin, Usuario) | Alta |
| **RF-20** | Configuración del sistema (límites, comisiones, países) | Media |

### Módulo de Notificaciones y Reportes

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RF-21** | Notificaciones push/email/SMS | Alta |
| **RF-22** | Alertas de seguridad y fraude en tiempo real | Crítica |
| **RF-23** | Reportes automatizados en tiempo real | Media |

*Para detalles completos de cada RF (flujo principal, flujos alternativos, reglas de negocio, criterios de aceptación, dependencias y seguridad), consultar el documento anexo "RF_Completos.md".*

---

##  Requerimientos No Funcionales (RNF)

### Seguridad

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RNF-01** | Cifrado de Datos Sensibles (AES-256-GCM) | Crítica |
| **RNF-02** | Comunicaciones Seguras (TLS 1.3) | Crítica |
| **RNF-03** | Autenticación Robusta (2FA obligatorio) | Crítica |
| **RNF-04** | Auditoría Inmutable (hash encadenado) | Alta |
| **RNF-05** | Protección contra Ataques (OWASP Top 10) | Alta |
| **RNF-20** | Cumplimiento SARLAFT (Colombia) | Crítica |
| **RNF-21** | PCI DSS Level 1 (Wompi) | Alta |
| **RNF-22** | ISO 27001 (directrices) | Alta |
| **RNF-26** | WAF + DDoS Protection | Crítica |
| **RNF-27** | Protección contra Jailbreak/Root | Alta |
| **RNF-28** | HSM (Hardware Security Module) | Alta |

### Rendimiento y Disponibilidad

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RNF-06** | Tiempo de Respuesta (saldo < 200ms, IA < 500ms) | Alta |
| **RNF-07** | Escalabilidad (1000 usuarios concurrentes) | Alta |
| **RNF-08** | Procesamiento Asíncrono (Bull + Redis) | Alta |
| **RNF-09** | Disponibilidad 99.9% | Alta |
| **RNF-17** | Latencia de Datos de Mercado < 500ms | Crítica |
| **RNF-18** | Disponibilidad 99.99% (trading) | Crítica |

### Recuperación y Mantenimiento

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RNF-10** | Estrategia de Backup (RPO 1h, RTO 4h) | Alta |
| **RNF-11** | Tolerancia a Fallos (Circuit Breaker) | Media |
| **RNF-23** | RPO < 1 hora | Alta |
| **RNF-24** | RTO < 4 horas | Alta |

### Calidad de Código y Documentación

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RNF-12** | Calidad de Código (cobertura > 80%) | Media |
| **RNF-13** | Documentación API (Swagger) | Media |
| **RNF-14** | Logs Centralizados (ELK Stack) | Media |
| **RNF-25** | Pruebas de Penetración Trimestrales | Alta |

### Usabilidad

| ID | Nombre | Prioridad |
|----|--------|-----------|
| **RNF-15** | Experiencia de Usuario (Lighthouse > 90) | Media |
| **RNF-16** | Soporte Multilenguaje (Español/Inglés) | Baja |

---

##  Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React / Web)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Landing  │  │  Login   │  │Dashboard │  │ Trading  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ Billetera│  │ Reportes │  │ Settings │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS / WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│               API GATEWAY (Node.js + Express)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware  │ Rate Limiting  │ Compression        │  │
│  │  CORS             │ Helmet         │ Request ID        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                 MICROSERVICIOS (Node.js)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Auth   │ │  Wallet  │ │  Orders  │ │    IA    │        │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │  Report  │ │  Notif.  │ │  Audit   │                     │
│  │ Service  │ │ Service  │ │ Service  │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP / gRPC
┌─────────────────────────────▼───────────────────────────────────┐
│                  IA SERVICE (Python / FastAPI)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LSTM  │ Random Forest │ XGBoost │ Ensemble │ SHAP      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     CAPA DE DATOS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │PostgreSQL│  │Timescale │  │  Redis   │  │   S3     │    │
│  │(Transac.)│  │(Series T.)│  │(Caché,   │  │(Docs,    │    │
│  └──────────┘  └──────────┘  └──────────┘  │Modelos) │    │
│                                             └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos (Unidireccional)

```
Usuario → UI → Hook/Context → Service → API → Backend → IA → BD → UI actualizada
```

---

## 🛠️ Tecnologías y Herramientas

| Área | Tecnologías |
|------|-------------|
| **Frontend Web** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Axios, Socket.io-client, Recharts, TradingView Widget |
| **Backend** | Node.js 20, Express, TypeScript, TypeORM, JWT (RS256), bcrypt, speakeasy (TOTP), Bull (Redis), Winston, Joi/Zod |
| **App Móvil** | React Native + Expo, TypeScript, React Navigation, expo-camera, expo-local-authentication, AsyncStorage, Firebase Cloud Messaging, APNs |
| **IA/ML** | Python 3.11, FastAPI, TensorFlow (LSTM), Scikit-learn (Random Forest, XGBoost), SHAP, Prophet, Pandas, NumPy, Joblib |
| **Base de Datos** | PostgreSQL 16, TimescaleDB 2.12, Redis 7.2, PostGIS (opcional) |
| **Infraestructura** | Docker, Docker Compose, Kubernetes (opcional), AWS (EC2, RDS, S3, ElastiCache), Cloudflare, Nginx, PM2 |
| **Monitorización** | Prometheus + Grafana, ELK Stack, Alertmanager, Sentry |
| **Seguridad** | TLS 1.3, AES-256-GCM, HSM, OWASP ZAP, Burp Suite, PCI DSS Level 1 (Wompi), SARLAFT (Colombia) |

---

##  Modelo de Datos (MER)

### Tablas Principales

| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| **Usuarios** | Datos de los usuarios registrados | id, email, password_hash, documento_numero, twofa_secret, nivel_verificacion, estado |
| **Billeteras** | Billeteras virtuales de los usuarios | id, usuario_id, saldo_disponible, saldo_congelado, moneda |
| **Transacciones** | Historial de todas las transacciones | id, billetera_id, tipo, monto, comision, estado, hash_previo, hash_actual |
| **Órdenes** | Órdenes de compra/venta | id, billetera_id, activo_simbolo, tipo_orden, lado, cantidad, estado, score_ia |
| **Activos** | Activos financieros soportados | simbolo, nombre, tipo, precio_actual, mercado_abierto |

### Relaciones

```
Usuarios (1) ────── (1) Billeteras
                   (1) ────── (N) Transacciones
                   (1) ────── (N) Órdenes

Activos (1) ────── (N) Órdenes
```

---

##  Estructura del Proyecto

```
banca-nen/
├── backend/                  # Backend Node.js
│   ├── src/
│   │   ├── config/           # Configuraciones globales
│   │   ├── models/           # Entidades TypeORM
│   │   ├── services/         # Lógica de negocio
│   │   ├── controllers/      # Controladores Express
│   │   ├── routes/           # Definición de rutas
│   │   ├── middleware/       # Middlewares (auth, rateLimit, etc.)
│   │   ├── validators/       # Esquemas de validación
│   │   ├── utils/            # Utilidades (logger, crypto, etc.)
│   │   ├── jobs/             # Trabajos en segundo plano (Bull)
│   │   └── app.ts            # Punto de entrada
│   ├── tests/                # Pruebas
│   ├── migrations/           # Migraciones TypeORM
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/                  # Frontend Web React
│   ├── public/
│   ├── src/
│   │   ├── api/              # Cliente Axios y endpoints
│   │   ├── components/       # Componentes UI
│   │   ├── pages/            # Páginas (Landing, Dashboard, etc.)
│   │   ├── hooks/            # Custom Hooks
│   │   ├── contexts/         # Contextos (Auth, Wallet, Trading)
│   │   ├── store/            # Estado global (Zustand)
│   │   ├── types/            # Tipos TypeScript
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── mobile/                    # App Móvil React Native + Expo
│   ├── src/
│   │   ├── screens/          # Pantallas
│   │   ├── navigation/       # React Navigation
│   │   ├── components/       # Componentes UI
│   │   ├── api/              # Cliente API
│   │   ├── hooks/            # Custom Hooks
│   │   ├── contexts/         # Contextos
│   │   └── store/            # Zustand
│   ├── App.tsx
│   └── package.json
├── ia-service/                # Servicio de IA (Python/FastAPI)
│   ├── src/
│   │   ├── api/              # Endpoints FastAPI
│   │   ├── models/           # Modelos ML (LSTM, RF, XGBoost)
│   │   ├── training/         # Scripts de entrenamiento
│   │   ├── data/             # Procesamiento de datos
│   │   ├── explainability/   # SHAP
│   │   └── main.py           # Punto de entrada
│   ├── requirements.txt
│   └── Dockerfile
├── infra/                     # Infraestructura y DevOps
│   ├── docker/               # Dockerfiles
│   ├── kubernetes/           # Manifiestos K8s
│   ├── terraform/            # Infraestructura como código
│   ├── monitoring/           # Prometheus, Grafana, ELK
│   └── scripts/              # Scripts de despliegue y backup
├── docs/                      # Documentación
│   ├── api/                  # Swagger/OpenAPI
│   ├── architecture/         # Diagramas C4
│   ├── user-guide/           # Manual de usuario
│   ├── admin-guide/          # Manual de administrador
│   └── rf-rnf.md             # Requerimientos funcionales y no funcionales
├── docker-compose.yml         # Orquestación de servicios
├── .env.example               # Variables de entorno
└── README.md                  # Este archivo
```

---

##  Plan de Desarrollo (Sprints)

| Fase | Duración | Entregables Principales |
|------|----------|-------------------------|
| **Fase 0: Fundación** | 1 semana | Repositorio, Docker, BD, tablas iniciales, health checks |
| **Fase 1: Autenticación y Seguridad** | 2 semanas | Landing Page, registro con KYC, login con 2FA, recuperación multi-factor, auditoría |
| **Fase 2: Billetera y Transacciones** | 2 semanas | Billetera multi-moneda, depósitos Wompi, retiros con seguridad máxima, transferencias |
| **Fase 3: Trading y Gráficos** | 2 semanas | TradingView, órdenes Market/Limit/Stop, gestión de órdenes, historial |
| **Fase 4: IA y Criticidad** | 2 semanas | Score de acierto, SHAP, entrenamiento automático, alertas de fraude |
| **Fase 5: App Móvil y Administración** | 2 semanas | App nativa (iOS/Android), panel de admin, notificaciones, sincronización |
| **Fase 6: Reportes y Despliegue** | 1 semana | Reportes en tiempo real, pruebas de carga y seguridad, despliegue en producción |

**Total estimado:** 12 semanas (3 meses)

---

##  Seguridad y Cumplimiento

| Aspecto | Implementación |
|---------|----------------|
| **Cifrado** | AES-256-GCM en reposo, TLS 1.3 en tránsito |
| **Autenticación** | JWT (RS256), 2FA (TOTP) obligatorio, biometría opcional |
| **Auditoría** | Hash encadenado (blockchain-like) en todas las tablas críticas |
| **PCI DSS** | Nivel 1 a través de Wompi (tokenización de tarjetas) |
| **SARLAFT** | KYC/AML, monitoreo de transacciones, reporte de operaciones sospechosas |
| **Protección** | WAF + DDoS Protection (Cloudflare), Rate limiting, OWASP ZAP |
| **HSM** | Almacenamiento de llaves criptográficas en Hardware Security Module |

---

## 🚀 Guía de Instalación y Configuración

### Requisitos Previos

- Node.js 20.x
- PostgreSQL 16
- Redis 7.2
- Python 3.11 (para IA)
- Docker y Docker Compose (opcional)

### Pasos Rápidos

1. **Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/banca-nen.git
cd banca-nen
```

2. **Configurar variables de entorno**

```bash
cp .env.example .env
# Editar .env con tus credenciales (DB, Redis, Wompi, etc.)
```

3. **Levantar servicios con Docker Compose**

```bash
docker-compose up -d
```

4. **Ejecutar migraciones y seed**

```bash
cd backend
npm run migrate
npm run seed
```

5. **Iniciar el backend**

```bash
npm run dev
```

6. **Iniciar el frontend web**

```bash
cd ../frontend
npm run dev
```

7. **Iniciar la app móvil**

```bash
cd ../mobile
npx expo start
```

8. **Iniciar el servicio de IA**

```bash
cd ../ia-service
pip install -r requirements.txt
uvicorn src.main:app --reload
```

### Acceso

- **Frontend Web:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000/api`
- **Documentación API:** `http://localhost:3000/api-docs`
- **Bull Board:** `http://localhost:3000/admin/queues`

---

##  Entregables Finales

1. **Código fuente completo** (Backend, Frontend Web, App Móvil, IA Service, Infraestructura) en repositorio GitHub.
2. **Documentación técnica** (Arquitectura C4, API Swagger, Modelo de Datos, Manual de Despliegue).
3. **Manual de Usuario** (Guía para inversionistas).
4. **Manual de Administrador** (Gestión de usuarios, auditoría, configuración).
5. **Video demostrativo** (15 minutos mostrando todas las funcionalidades).
6. **Presentación ejecutiva** (Deck de 20 diapositivas).
7. **Reporte de pruebas** (Unitarias, integración, E2E, carga, penetración).
8. **Modelos de IA entrenados** (con precisión > 70%).
9. **Docker Compose funcional** (Levantar todo el sistema).
10. **Plan de continuidad de negocio** (Backup, Disaster Recovery).

---

##  Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

##  Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue las pautas de [CONTRIBUTING.md](CONTRIBUTING.md) y el [Código de Conducta](CODE_OF_CONDUCT.md).

---

## 📧 Contacto

- **Autor:** Wane Lopez
- **Email:** sl99081201125
- **LinkedIn:** Wanne Lopez
- **GitHub:** Wane-Dev
---

**BANCA NEN** - Invierte con inteligencia, respaldado por IA y seguridad bancaria. 
