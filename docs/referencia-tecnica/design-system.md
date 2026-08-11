# Design System — BANCA NEN (FinPredictor Pro)

## 1. Principios de Diseño

| Principio | Regla aplicada |
|---|---|
| Minimalismo | Solo los elementos necesarios — sin decoración innecesaria |
| Color plano | Cero degradados (`gradient`) en ningún lugar de la aplicación |
| Tipografía | `Inter` + `system-ui` — sans-serif siempre |
| Consistencia | Escala de spacing de Tailwind (p-4, gap-6, space-y-4) — sin valores ad hoc |
| Accesibilidad | WCAG AA: contraste mínimo 4.5:1, `aria-*` en elementos críticos |
| Mobile-first | Formularios utilizables desde 320px de ancho |
| Trading-first | Inspirado en apps como Binance/Robinhood: datos densos, acción rápida |

---

## 2. Sistema de Temas — Dark y Light

### Mecanismo

El FE soporta dos temas controlados por el usuario. El `ThemeToggle` añade o quita la clase `.dark` en `<html>`. Persiste en `localStorage`.

### Paletas

| Contexto | Light | Dark |
|---|---|---|
| Fondo de página (body) | `white` | `#0a0a0f` |
| Fondo sidebar | `white` | `#1a1a2e` |
| Fondo cards | `white` | `#1a1a2e` |
| Fondo inputs | `white` | `#16213e` |
| Texto principal | `gray-900` | `gray-100` |
| Texto secundario | `gray-500` | `gray-400` |
| Bordes | `gray-200` | `#2a2a4a` |

**¿Por qué estos colores en dark?** Los tonos azul oscuro (`#0a0a0f`, `#1a1a2e`, `#16213e`) dan personalidad al dark mode sin necesidad de degradados, evocando la estética de apps de trading profesionales.

---

## 3. Sistema de Color de Marca

### Colores primarios

| Variable | Tailwind | Uso |
|---|---|---|
| `brand-400` | `blue-400` | Dark mode: íconos, links, focus rings |
| `brand-500` | `blue-500` | Borde del logo, color de íconos neutro |
| `brand-600` | `blue-600` | Botones primarios en light mode |
| `brand-800` | `blue-800` | Fondo de badges en light mode |

### Colores semánticos

| Contexto | Color | Tailwind |
|---|---|---|
| Ganancia / Bullish | Verde | `emerald-500` / `emerald-600` |
| Pérdida / Bearish | Rojo | `red-500` / `red-600` |
| Alerta / Warning | Amarillo | `amber-500` |
| Info | Azul | `blue-500` |
| Error | Rojo | `red-600` |
| Éxito | Verde | `emerald-500` |

> **Regla de trading**: Los precios que suben SIEMPRE son verde, los que bajan SIEMPRE son rojo. No depender solo del color — incluir flechas ↑↓ o signo +/-.

---

## 4. Tipografía

### Familia principal

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Escala tipográfica

| Elemento | Tamaño | Peso | Tailwind |
|---|---|---|---|
| H1 (página) | 2rem (32px) | 700 | `text-3xl font-bold` |
| H2 (sección) | 1.5rem (24px) | 600 | `text-2xl font-semibold` |
| H3 (subsección) | 1.25rem (20px) | 600 | `text-xl font-semibold` |
| Body | 1rem (16px) | 400 | `text-base` |
| Small | 0.875rem (14px) | 400 | `text-sm` |
| Caption | 0.75rem (12px) | 400 | `text-xs` |
| Precio grande | 2.5rem (40px) | 700 | `text-4xl font-bold` |
| Precio card | 1.5rem (24px) | 600 | `text-2xl font-semibold` |
| Cambio % | 0.875rem (14px) | 600 | `text-sm font-semibold` |

---

## 5. Componentes

### 5.1 Botones

| Variante | Estilo | Uso |
|---|---|---|
| Primary | `bg-brand-600 text-white` | Acción principal (Comprar, Depositar) |
| Secondary | `bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100` | Acción alternativa |
| Danger | `bg-red-600 text-white` | Acción destructiva (Vender, Cancelar) |
| Success | `bg-emerald-600 text-white` | Confirmación positiva |
| Ghost | `text-brand-600 hover:bg-brand-50` | Acción secundaria inline |

**Tamaños:**

| Tamaño | Padding | Tailwind |
|---|---|---|
| sm | `px-3 py-1.5 text-sm` | Botón en tablas |
| md | `px-4 py-2 text-base` | Botón estándar |
| lg | `px-6 py-3 text-lg` | Botón hero / CTA |

### 5.2 Cards

```tsx
// Card estándar con fondo dark
<div className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#2a2a4a] p-6">
  {children}
</div>
```

### 5.3 Inputs

```tsx
// Input con focus ring accesible
<input
  className="w-full rounded-lg border border-gray-300 dark:border-[#2a2a4a]
    bg-white dark:bg-[#16213e] px-4 py-2.5
    text-gray-900 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-brand-500
    placeholder:text-gray-400 dark:placeholder:text-gray-500"
  aria-required="true"
  aria-describedby="field-error"
/>
```

### 5.4 Sidebar

```
┌──────────────────────────────────┐
│  🏦 BANCA NEN                    │
│──────────────────────────────────│
│  📊 Dashboard                    │
│  💰 Wallet                       │
│  📈 Trading                      │
│  📋 Orders                       │
│  🔔 Notifications                │
│  ⚙️  Settings                    │
│──────────────────────────────────│
│  👤 Profile                      │
│  🚪 Logout                      │
└──────────────────────────────────┘
```

- Ancho: `w-64` (256px) en desktop, colapsable en móvil
- Fondo: `#1a1a2e` en dark, `white` en light
- Ícono activo: `brand-600` con `bg-brand-50` / `bg-brand-900/20`
- Lucide icons exclusivamente

---

## 6. Iconografía

**Librería exclusiva**: `lucide-react`

| Icono | Uso |
|---|---|
| `LayoutDashboard` | Dashboard |
| `Wallet` | Billetera |
| `TrendingUp` | Trading / Ganancia |
| `TrendingDown` | Pérdida |
| `ArrowUpRight` | Depósito |
| `ArrowDownRight` | Retiro |
| `Bell` | Notificaciones |
| `Settings` | Configuración |
| `Shield` | Seguridad / 2FA |
| `Eye` / `EyeOff` | Ver/ocultar contraseña |
| `Moon` / `Sun` | Toggle dark/light |
| `Menu` | Sidebar móvil |
| `X` | Cerrar modal |
| `AlertTriangle` | Warning |
| `CheckCircle` | Éxito |
| `Info` | Información |

---

## 7. Animaciones

Librería: `framer-motion`

| Animación | Duración | Uso |
|---|---|---|
| Fade in | 200ms | Aparición de cards y secciones |
| Slide up | 300ms | Modales y toasts |
| Scale | 150ms | Hover en botones e íconos |
| Number ticker | 500ms | Cambios de precio en tiempo real |

```tsx
// Ejemplo: card con fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <Card>...</Card>
</motion.div>
```

---

## 8. Contraste y Accesibilidad

| Combinación | Contraste | Cumple AA |
|---|---|---|
| `text-gray-900` sobre `white` | 21:1 | ✅ |
| `text-gray-100` sobre `#1a1a2e` | 12.3:1 | ✅ |
| `text-white` sobre `blue-600` | 4.6:1 | ✅ |
| `text-emerald-500` sobre `#1a1a2e` | 5.8:1 | ✅ |
| `text-red-500` sobre `#1a1a2e` | 5.2:1 | ✅ |
| `text-gray-400` sobre `#1a1a2e` | 3.8:1 | ⚠️ Solo decorativo |

---

## 9. Responsive Breakpoints

| Dispositivo | Ancho | Layout |
|---|---|---|
| Mobile | 320px - 767px | Stack vertical, sidebar oculta (hamburger) |
| Tablet | 768px - 1023px | Sidebar colapsable, 2 columnas |
| Desktop | 1024px - 1439px | Sidebar fija, 3 columnas |
| Wide | 1440px+ | Sidebar fija, contenido centrado max 1400px |

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
