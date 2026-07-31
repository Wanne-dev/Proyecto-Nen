# RF-001: Registro de Usuarios con KYC

**ID:** RF-001  
**Nombre:** Registro de Usuarios con KYC  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite el registro de nuevos usuarios mediante un formulario que captura datos personales, información de contacto y datos de verificación de identidad (KYC - Know Your Customer), cumpliendo con los estándares bancarios y normativas SARLAFT.

---

## Criterios de Aceptación

1. El usuario debe ingresar: nombre completo, tipo de documento, número de documento, fecha de nacimiento, país, correo electrónico, número de teléfono y contraseña.
2. El sistema valida que el usuario sea mayor de 18 años según la fecha de nacimiento ingresada.
3. El tipo de documento debe corresponder al país seleccionado (ej: CC para Colombia, DNI para España, Passport internacional).
4. El número de teléfono debe incluir el prefijo del país seleccionado de forma sincronizada (ej: +57 para Colombia).
5. La contraseña debe tener mínimo 8 caracteres, incluyendo al menos una mayúscula, una minúscula, un número y un carácter especial.
6. El sistema verifica que el correo electrónico y el número de documento no estén previamente registrados.
7. Al completar el registro, el usuario recibe un código de verificación al correo electrónico.
8. La cuenta se crea con estado `pending_verification` hasta que el email sea verificado.
9. Se genera automáticamente una billetera virtual con saldos en USD, COP, EUR, BTC, ETH y USDC inicializados en cero.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registra un nuevo usuario con datos KYC |

---

## Request Body

```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "dateOfBirth": "1995-05-15",
  "country": "Colombia",
  "phonePrefix": "+57",
  "phoneNumber": "3001234567",
  "email": "juan@email.com",
  "password": "SecurePass1!"
}
```

---

## Response

```json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Verifique su correo electrónico.",
  "data": {
    "id": "uuid",
    "email": "juan@email.com",
    "status": "pending_verification"
  }
}
```

---

## Reglas de Negocio

- Menores de 18 años no pueden registrarse.
- Un correo electrónico no puede estar asociado a más de una cuenta.
- Un número de documento no puede estar duplicado en el mismo país.
- La contraseña se almacena con hash bcrypt (salt rounds: 12).
- Los datos del usuario se almacenan cifrados en la base de datos.

---

## Dependencias

- Base de datos: tabla `users` con campos KYC.
- Servicio de email para envío de código de verificación.
- Validación de edad según fecha de nacimiento.

---

## Referencias

- Normativa SARLAFT - Prevención de lavado de activos.
- Reglamento de KYC para entidades financieras.
