# RNF-006: Compatibilidad

**ID:** RNF-006  
**Nombre:** Compatibilidad  
**Categoría:** Portabilidad  
**Prioridad:** Media  

---

## Descripción

El sistema debe funcionar correctamente en los principales navegadores web, sistemas operativos y dispositivos, garantizando una experiencia consistente sin importar la plataforma utilizada por el usuario.

---

## Criterios de Aceptación

1. El sistema debe ser compatible con los últimos 2 versiones de los navegadores principales.
2. La interfaz debe ser completamente funcional en dispositivos móviles (iOS y Android).
3. El sistema debe funcionar correctamente en conexiones de red lentas (3G).
4. El backend debe ser independiente del sistema operativo (contenedores Docker).
5. Las APIs deben seguir estándares REST para ser consumidas desde cualquier cliente.

---

## Especificaciones Técnicas

### Navegadores Soportados

| Navegador | Versión Mínima | Notas |
|-----------|---------------|-------|
| Google Chrome | 90+ | Soporte completo |
| Mozilla Firefox | 88+ | Soporte completo |
| Microsoft Edge | 90+ | Basado en Chromium |
| Safari | 14+ | iOS y macOS |
| Samsung Internet | 14+ | Android |

### Dispositivos

| Dispositivo | Resolución Mínima | Soporte |
|-------------|-------------------|---------|
| iPhone SE | 375x667 | Completo |
| iPhone 12/13/14 | 390x844 | Completo |
| Android estándar | 360x640 | Completo |
| iPad | 768x1024 | Completo |
| Desktop | 1024x768 | Completo |

### Tecnologías Base

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Docker | 20+ | Containerización |
| Node.js | 18+ LTS | Runtime backend |
| PostgreSQL | 15+ | Base de datos |
| Redis | 7+ | Cache y sesiones |

---

## Estrategias de Cumplimiento

- **Babel/PostCSS**: Transpilación para compatibilidad con navegadores antiguos.
- **Polyfills**: Para APIs no soportadas (Intl, IntersectionObserver).
- **Docker**: Abstracción del sistema operativo.
- **REST API**: Estándar universal para cualquier cliente.
- **Progressive Enhancement**: Funcionalidad base sin JavaScript, mejorada con JS.
- **Browser Testing**: Testing automatizado con Playwright en múltiples navegadores.

---

## Referencias

- ISO/IEC 25010 - Software Quality - Compatibility.
- Browserlist Best Practices.
- Can I Use - Compatibility Tables.
