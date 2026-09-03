# Auditoría de Dependencias — BANCA NEN

| Campo | Valor |
| :--- | :--- |
| **Fecha de auditoría** | 2026-09-03 |
| **Herramienta** | `pnpm audit` (base de datos OSV / GitHub Advisories) |
| **Gestor** | pnpm 9.15.4 (lockfile `pnpm-lock.yaml`, versiones pinadas exactas) |
| **Resultado** | 26 vulnerabilidades: 13 moderadas · 10 altas · 3 críticas |
| **Estado** | Revisado y documentado. Ver plan de remediación al final. |

---

## 1. Resumen ejecutivo

La auditoría se ejecutó **después de pinar todas las dependencias a versión exacta**
(requisito del proyecto: nunca usar comodines `^`/`~`).

El 100 % de las vulnerabilidades críticas y la mayoría de las altas corresponden a
**herramientas de desarrollo/compilación** (`tar`, `vitest`, `vite`, `esbuild`), que
**no se incluyen en la imagen de producción**: el backend se construye con
`npm install --omit=dev` y el frontend se compila a estáticos servidos por Nginx.

Las vulnerabilidades que sí alcanzan runtime son de severidad **moderada** y están
identificadas en la sección 3 con su plan de remediación.

---

## 2. Detalle por severidad

### 2.1 Críticas (3)

| Paquete | Título | Rango vulnerable | Corregido en | Alcanza producción |
| :--- | :--- | :--- | :--- | :--- |
| `tar` | DoS por descompresión/parseo con entrada ilimitada | ≤ 7.5.18 | ≥ 7.5.19 | **No** (build) |
| `vitest` | Lectura/ejecución de archivos arbitrarios con el UI server activo | < 3.2.6 | ≥ 3.2.6 | **No** (dev) |

### 2.2 Altas (10)

| Paquete | Título | Rango vulnerable | Corregido en | Alcanza producción |
| :--- | :--- | :--- | :--- | :--- |
| `tar` (×8 advisories) | Path traversal, symlink poisoning, race condition, recursión sin control | ≤ 7.5.20 | ≥ 7.5.21 | **No** (build) |
| `vite` | Bypass de `server.fs.deny` en Windows | ≤ 6.4.2 | ≥ 6.4.3 | **No** (dev server) |

### 2.3 Moderadas (13)

| Paquete | Título | Rango vulnerable | Corregido en | Alcanza producción |
| :--- | :--- | :--- | :--- | :--- |
| `qs` (×2) | DoS y bypass de array-limit (vía `express` → `body-parser`) | 2.2.5 – 6.15.3 | ≥ 6.16.0 | **Sí** (backend) |
| `uuid` | Falta validación de bounds en v3/v5/v6 con buffer externo | < 11.1.1 | ≥ 11.1.1 | **Sí** (backend, uso v4) |
| `react-router` (×2) | Open redirect y constructor injection en SSR | 6.0.0 – 7.18.0 | ≥ 7.18.0 | Parcial (solo bundle navegador) |
| `esbuild` | El dev server permite peticiones arbitrarias | ≤ 0.24.2 | ≥ 0.25.0 | **No** (dev) |
| `vite` (×2) | Path traversal en deps optimizadas y leak NTLM | ≤ 6.4.2 | ≥ 6.4.3 | **No** (dev) |
| `tar` (×3) | File smuggling y crash por PAX malformado | ≤ 7.5.17 | ≥ 7.5.18 | **No** (build) |

---

## 3. Análisis de alcance (runtime vs. desarrollo)

| Entorno | Dependencias instaladas | Vulnerabilidades que aplican |
| :--- | :--- | :--- |
| **Producción (Docker)** | backend: `npm install --omit=dev` · frontend: estáticos (build) | `qs` (moderada), `uuid` (moderada), `react-router` (bundle) |
| **Desarrollo / CI** | todo el árbol de devDependencies | todas las demás (tar, vitest, vite, esbuild) |

**Conclusión:** ninguna vulnerabilidad **crítica** alcanza el runtime de producción.
Las que llegan a producción son moderadas y de bajo riesgo práctico:

- `qs` (DoS): requiere payloads HTTP especialmente construidos; mitigado por
  `rate-limiter-flexible` y `helmet` ya configurados en el backend.
- `uuid` (v3/v5/v6 con buffer provisto por el usuario): el proyecto usa `uuid` v4
  para identificadores, por lo que la ruta vulnerable no se ejercita.
- `react-router` (open redirect en `<Link>`/`useNavigate`): solo afecta redirecciones
  controladas por la app; no hay redirecciones abiertas a URLs externas del usuario.

---

## 4. Plan de remediación (siguiente sprint, sin romper funcionalidad)

| Acción | Paquete | Objetivo | Riesgo |
| :--- | :--- | :--- | :--- |
| 1. Override parche | `qs` → `6.16.0` | Eliminar 2 moderadas de runtime | Bajo (parche compatible) |
| 2. Upgrade mayor | `uuid` → `11.1.1` | Eliminar 1 moderada | Bajo (API v4 estable) |
| 3. Upgrade mayor | `react-router-dom` → `7.18.0` | Eliminar 2 moderadas | Medio (migración v6→v7) |
| 4. Upgrade dev | `vitest` → `3.2.6+` | Eliminar 1 crítica de dev | Bajo (solo tests) |
| 5. Upgrade dev | `vite` → `6.4.3+` | Eliminar 4 (alta+moderadas) de dev | Medio (config de build) |
| 6. Override transitivo | `tar` → `7.5.21` | Eliminar 8+ críticas/altas de build | Bajo (transitivo) |

> **Nota de decisión:** estos upgrades se programan para el siguiente sprint porque
> los majors (react-router 7, vite 6, vitest 3) requieren validación de compatibilidad
> con el código existente. La política del proyecto es **no romper funcionalidad**;
> por eso se documentan antes de aplicarse.

---

## 5. Cómo reproducir

```bash
pnpm install --frozen-lockfile
pnpm audit
```
