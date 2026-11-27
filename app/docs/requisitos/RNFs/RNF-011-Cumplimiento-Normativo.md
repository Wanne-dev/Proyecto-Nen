# RNF-011: Cumplimiento Normativo

**ID:** RNF-011  
**Nombre:** Cumplimiento Normativo  
**Categoría:** Cumplimiento  
**Prioridad:** Alta  

---

## Descripción

El sistema debe cumplir con las normativas y regulaciones aplicables a plataformas financieras y de criptomonedas en Colombia, incluyendo SARLAFT, protección de datos personales, y requisitos de prevención de lavado de activos.

---

## Criterios de Aceptación

1. El sistema implementa verificación KYC (Know Your Customer) para todos los usuarios.
2. Se registran y mantienen registros de auditoría inmutables por mínimo 5 años.
3. Se implementan controles de prevención de lavado de activos (SARLAFT).
4. Se cumple con la Ley 1581 de 2012 de protección de datos personales.
5. Se implementan límites de transacción según nivel de verificación del usuario.
6. Se generan reportes de operaciones sospechosas (ROS) para revisión de compliance.
7. El sistema permite la exportación de datos para auditorías regulatorias.
8. Se implementan mecanismos de consentimiento explícito para tratamiento de datos.

---

## Especificaciones Técnicas

### SARLAFT - Controles Implementados

| Control | Implementación | Detalle |
|---------|---------------|---------|
| Identificación del cliente | KYC en registro | Documento, fecha nacimiento, país |
| Verificación de identidad | Email + teléfono + documento | Multi-factor verification |
| Conocimiento de la actividad | Perfil de riesgo | Risk tolerance questionnaire |
| Monitoreo de transacciones | Score de riesgo IA | Transacciones sospechosas marcadas |
| Reporte de operaciones sospechosas | Flag automático | ROS para revisión manual |
| Registro de auditoría | Hash chain inmutable | Audit logs con verificación |

### Límites por Nivel de Verificación

| Nivel KYC | Depósito Diario | Retiro Diario | Depósito Mensual | Retiro Mensual |
|-----------|----------------|---------------|-----------------|----------------|
| Básico (email verificado) | $1,000 | $500 | $5,000 | $3,000 |
| Intermedio (+ teléfono) | $5,000 | $2,000 | $25,000 | $15,000 |
| Completo (+ documento) | $50,000 | $10,000 | $200,000 | $50,000 |
| Premium (verificación completa) | Sin límite | $50,000 | Sin límite | $200,000 |

### Ley 1581 de 2012 - Protección de Datos

| Requisito | Implementación |
|-----------|---------------|
| Autorización previa | Consentimiento en registro |
| Finalidad del tratamiento | Informada en términos y condiciones |
| Derecho de acceso | Usuario puede ver todos sus datos |
| Derecho de rectificación | Usuario puede actualizar sus datos |
| Derecho de supresión | Solicitud de eliminación de cuenta |
| Seguridad de datos | Cifrado, acceso restringido, audit logs |

---

## Estrategias de Cumplimiento

- **KYC obligatorio**: No se puede operar sin verificación mínima.
- **Límites progresivos**: Más verificación = más límites.
- **Audit trail inmutable**: Cadena de hash para registros regulatorios.
- **Score de riesgo IA**: Detección automática de patrones sospechosos.
- **Exportación de datos**: APIs para generar reportes regulatorios.
- **Términos y condiciones**: Aceptación explícita en registro.
- **Consentimiento granular**: Por tipo de dato y finalidad.

---

## Referencias

- SARLAFT - Circular Externa 007 de 2016 (Superintendencia Financiera de Colombia).
- Ley 1581 de 2012 - Protección de Datos Personales (Colombia).
- Decreto 1377 de 2013 - Reglamento de la Ley 1581.
- FATF Recommendations - Anti-Money Laundering.
- GAFILAT - Grupo de Acción Financiera de Latinoamérica.
