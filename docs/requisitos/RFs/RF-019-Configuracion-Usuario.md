# RF-019: Configuración de Usuario

**ID:** RF-019  
**Nombre:** Configuración de Usuario  
**Prioridad:** Media  
**Categoría:** Cuenta / Personalización  

---

## Descripción

El sistema permite al usuario personalizar la configuración de su cuenta, incluyendo preferencias de interfaz, seguridad, notificaciones y experiencia de trading, adaptando la plataforma a sus necesidades.

---

## Criterios de Aceptación

1. El usuario puede configurar:
   - **Apariencia**: Tema (dark/light), idioma (español, inglés), moneda base.
   - **Seguridad**: 2FA (habilitar/deshabilitar), cambio de contraseña, sesiones activas.
   - **Notificaciones**: Tipos de notificaciones por canal (push, email).
   - **Trading**: Tolerancia al riesgo (conservative, moderate, aggressive), confirmación de órdenes.
   - **Privacidad**: Visibilidad del perfil, compartir estadísticas.
2. Los cambios se guardan automáticamente y se aplican inmediatamente.
3. Se requiere contraseña actual para cambios de seguridad.
4. Se envía notificación al email por cambios de seguridad.
5. Las preferencias se sincronizan entre dispositivos.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/settings` | Obtiene configuración actual |
| PUT | `/api/settings` | Actualiza configuración |
| PUT | `/api/settings/password` | Cambia contraseña |
| PUT | `/api/settings/notifications` | Actualiza preferencias de notificaciones |

---

## Request Body (Update Settings)

```json
{
  "theme": "dark",
  "language": "es",
  "currency": "USD",
  "riskTolerance": "moderate",
  "orderConfirmation": true,
  "notifications": {
    "email": {
      "transaction": true,
      "security": true,
      "trading": true,
      "system": false,
      "promotion": false
    },
    "push": {
      "transaction": true,
      "security": true,
      "trading": true,
      "system": true,
      "promotion": false
    }
  }
}
```

---

## Response

```json
{
  "success": true,
  "message": "Configuración actualizada exitosamente.",
  "data": {
    "theme": "dark",
    "language": "es",
    "currency": "USD",
    "riskTolerance": "moderate",
    "orderConfirmation": true
  }
}
```

---

## Reglas de Negocio

- La configuración por defecto: dark theme, español, USD, moderate risk.
- Cambios de seguridad requieren verificación de contraseña actual.
- Se envía notificación por email ante cambios de seguridad.
- El tema se aplica globalmente sin recargar la página.
- El idioma se aplica sin recargar la página (i18n).
- Las preferencias de notificaciones de seguridad no se pueden desactivar completamente.

---

## Dependencias

- Tabla `user_settings` con preferencias.
- Tabla `users` para datos de seguridad.
- Sistema de internacionalización (i18n).
- Sistema de temas (dark/light).

---

## Referencias

- W3C - Web Content Accessibility Guidelines (WCAG).
- Material Design - Theming Guidelines.
