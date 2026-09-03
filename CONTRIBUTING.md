# Contribuir a BANCA NEN

Guía de ramas, commits y entrega. **Única vía de entrega: GitHub + Docker.**

---

## 1. Modelo de ramas (Git Flow simplificado)

| Rama | Propósito | Reglas |
| :--- | :--- | :--- |
| `main` | Producción. **Siempre 100 % funcional.** | Solo se recibe vía pull request desde `develop`. Nunca commits directos. |
| `develop` | Integración de todos los desarrollos. | Base de todas las ramas de trabajo. |
| `feature/<nombre>` | Desarrollo de una funcionalidad. | Sale de `develop` y vuelve a `develop`. |
| `docs/<nombre>` | Documentación (RFs, RNFs, HUs, guías). | Sale de `develop` y vuelve a `develop`. |

### Flujo de trabajo

```bash
git checkout develop
git pull origin develop

# Nueva funcionalidad
git checkout -b feature/nombre-feature
# ... desarrollar y commitear ...
git push -u origin feature/nombre-feature
# Abrir Pull Request: feature/nombre-feature -> develop

# Documentación
git checkout -b docs/nombre-docs
# ... escribir y commitear ...
git push -u origin docs/nombre-docs
```

---

## 2. Commits convencionales

Todo commit **debe** seguir el estándar [Conventional Commits](https://www.conventionalcommits.org/)
y es **validado automáticamente** por `commitlint` vía husky (un commit con mensaje
inválido se rechaza).

```
<tipo>[<alcance>]: <descripción en imperativo>
```

| Tipo | Cuándo usarlo | Ejemplo |
| :--- | :--- | :--- |
| `feat:` | Nueva funcionalidad | `feat: agrega login con 2FA` |
| `fix:` | Corrección de bug | `fix: corrige crash al cancelar orden` |
| `docs:` | Documentación | `docs: documenta RF-012 reportes` |
| `chore:` | Tareas de mantenimiento/deps | `chore: pina dependencias a version exacta` |
| `refactor:` | Cambios de código sin cambiar comportamiento | `refactor: extrae servicio de billetera` |
| `test:` | Tests | `test: cubre flujo de depósito` |
| `style:` | Formato | `style: aplica prettier` |
| `perf:` | Mejora de rendimiento | `perf: cachea consulta de mercado` |
| `build:` | Sistema de build/Docker | `build: actualiza Dockerfile backend` |
| `ci:` | Integración continua | `ci: agrega job de auditoría` |

---

## 3. Dependencias

- **Nunca usar comodines** (`^`, `~`, `*`): siempre versión exacta.
- Antes de unir cambios, ejecutar `pnpm audit` y registrar el resultado en
  `docs/referencia-tecnica/auditoria-dependencias.md`.
- El lockfile (`pnpm-lock.yaml`) **se versiona** y es la única fuente de verdad.

```bash
pnpm install --frozen-lockfile   # instalar exactamente lo lockeado
pnpm audit                       # revisión de seguridad
```

---

## 4. Verificación antes de push

```bash
pnpm typecheck   # backend + frontend
pnpm test        # backend (77) + frontend (19)
pnpm build       # compila ambos
```

---

## 5. Entrega

```bash
docker compose up -d --build
```

La rama `main` refleja **siempre** la versión estable y funcional del producto.
