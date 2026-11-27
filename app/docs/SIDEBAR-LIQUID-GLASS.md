# BANCA NEN · Menú superior

El portal personal y el administrativo comparten **el mismo marco y la misma navegación horizontal**. Este cambio no crea rutas ni modifica autenticación, TOTP, roles, saldos, operaciones ni proveedores de mercado. **Start IA sigue siendo el inicio**. Los accesos de administración se obtienen con la matriz de permisos que ya usa el portal; `StaffRoute` y la API siguen controlando el acceso.

## Pestañas

| Zona | Usuario | Administrador |
| --- | --- | --- |
| Navegación principal | Start IA, Mi billetera (Historial de órdenes, Depositar, Retirar), Trading (Mis reportes), Noticias | Las mismas pestañas más Panel de control, Usuarios, Auditoría, Reportes admin y Configuración |
| Cuenta | Ajustes, Seguridad, perfil y cierre de sesión | Los mismos controles de cuenta; la tarjeta identifica el rol |

Analista, Operador y Cumplimiento ven el subconjunto que permiten sus permisos actuales. Las pestañas hijas viven dentro de su pestaña principal: `Mi billetera` abre Historial de órdenes, Depositar y Retirar; `Trading` abre Mis reportes. No aparecen sueltas en la barra, pero siguen siendo enlaces reales y están en la búsqueda `Ctrl+K`. `Noticias` conserva la ruta `/trading/prediction`. No se añade Transferencias ni un panel IA administrativo porque no tienen rutas en la app. El alta 2FA (`/2fa-setup`) conserva visible la sección Seguridad como ubicación actual, sin marcar también Ajustes.

## Barra y material

- La navegación va **arriba**, flotando con separación de los bordes, con el logo oficial a la izquierda, los enlaces en el centro y la cuenta a la derecha. No hay barra lateral, botón de colapso ni rótulos de grupo.
- La zona de enlaces se ajusta en filas cuando no caben todas las pestañas; las etiquetas se mantienen visibles y no hay desplazamiento oculto. El logo se reduce ligeramente en pantallas estrechas y el nombre del perfil se oculta para dar espacio.
- Altura de la barra: `56 px`; enlaces de `38 px` con radio `10 px`, iconos de `18 px` con trazo `1.75 px` y avatar de `32 px`. El contenido empieza debajo de la barra y de la cabecera contextual.
- Material: tarjeta de vidrio con esquinas de `18 px`, relleno translúcido (`rgba(20,23,31,.46)`), `blur(30px) saturate(190%)`, borde blanco al 16 %, reflejo interior y sombra. En Start IA el vídeo de fondo queda detrás de la barra, así que el vidrio muestra sus colores. Si el navegador no admite filtro de fondo se conserva una superficie oscura opaca.
- Los submenús son tarjetas de vidrio con el mismo material, se abren con el chevron de la pestaña principal, se cierran con `Esc` o al tocar fuera, y se abren automáticamente cuando la ruta activa pertenece a una pestaña hija. La barra tiene `z-index` superior a la cabecera contextual para que el submenú no quede tapado ni se pierda el clic.
- Estado actual: texto blanco, icono dorado `#D4AF37`, pastilla de vidrio claro y subrayado inferior. Texto inactivo `#B6BCC9`; hover `#E2E4E9`. Se respeta `prefers-reduced-motion` y `forced-colors`.
- Tipografía del sistema: SF Pro en Apple, `Segoe UI Variable` en Windows e `Inter`/`system-ui` como alternativas, sin descargar fuentes. Titulares usan la variante Display con seguimiento más cerrado.

## Cómo está construido

| Archivo (en `frontend/src/components/layout/`) | Función |
| --- | --- |
| `AppLayout.tsx` | Conecta las páginas del router, la sesión real y las notificaciones al marco. |
| `PortalFrame.tsx` · `portal.css` | Retícula, tokens de vidrio, foco tras navegar y atajo de búsqueda. |
| `TopNav.tsx` · `topnav.css` | Enlaces horizontales, estado activo, iconografía y estilos de la barra y el perfil. |
| `sidebarNavigation.ts` | Rutas navegables, permisos de visualización, nombre activo, sinónimos y búsqueda normalizada. |
| `GlassDialog.tsx` · `SidebarDialogs.tsx` | Búsqueda por teclado y confirmación de salida. La salida llama al servicio existente; si falla, se puede reintentar. |
| `Sidebar.tsx` · `sidebar.css` | Componente heredado que aporta `isLocalLink`, el avatar de la confirmación y los estilos compartidos de los diálogos. |
| `../common/BrandLogo.tsx` | Logo oficial del usuario, en variante completa o de marca, reutilizado en el portal. |
| `useSidebarMode.ts` | Utilidad heredada; ya no controla la navegación visible. |

Los componentes son React/TypeScript. El proyecto mantiene Tailwind para utilidades semánticas/de retícula y usa propiedades CSS para las medidas exactas y el material. La tipografía de sistema prioriza SF en Apple y usa alternativas locales en otros sistemas, sin descargar fuentes.

## Cómo probar

1. Abre la vista `PROBAR.html` en la carpeta superior del ZIP, o genera el archivo local con `pnpm --filter banca-nen-frontend build:sidebar-preview` (queda en `frontend/dist/sidebar-preview.html`). El HTML no usa API ni sesión real; los dos perfiles son ficticios y el gráfico de referencia es histórico.
2. Alterna **Usuario** y **Admin** en la cabecera. Comprueba que todas las pestañas del rol aparecen en la barra superior, sin rótulos de grupo ni controles de búsqueda o colapso.
3. Pulsa `⌘K` o `Ctrl+K` para abrir la búsqueda rápida; comprueba una búsqueda sin tildes y la selección con flechas o Enter. En la app real, la tarjeta de cuenta permite confirmar el cierre de sesión; la vista de diseño solo muestra un aviso.
4. Para probar en la aplicación instalada, inicia la instalación local con sus lanzadores y usa las cuentas existentes. El administrador sigue pasando por 2FA antes de acceder a su panel.

**Verificación de esta entrega:** tests de frontend y build de producción; Chromium con ambos roles, atajos, foco y visor aislado sin red. Se comprobó el enrutamiento de la app compilada con respuestas de API interceptadas; eso no sustituye una prueba de arranque en Windows ni valida nuevamente el backend.
