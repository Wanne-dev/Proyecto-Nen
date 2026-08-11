# RNF-009: Integridad de Datos

**ID:** RNF-009  
**Nombre:** Integridad de Datos  
**Categoría:** Seguridad  
**Prioridad:** Alta  

---

## Descripción

El sistema debe garantizar que los datos almacenados y procesados sean completos, exactos y no hayan sido alterados de forma no autorizada, implementando mecanismos de verificación que detecten cualquier modificación indebida.

---

## Criterios de Aceptación

1. Los registros de auditoría forman una cadena inmutable con hash SHA-256 (cada registro incluye el hash del anterior).
2. Cualquier modificación a un registro de auditoría invalida toda la cadena posterior.
3. Las transacciones financieras se verifican con hash antes y después de su procesamiento.
4. Los balances de billetera se recalculan periódicamente contra el historial de transacciones.
5. Se implementa validación de integridad en la comunicación API (checksums).
6. La base de datos aplica restricciones de integridad referencial (foreign keys, constraints).
7. Los datos de mercado se validan contra múltiples fuentes antes de almacenar.

---

## Especificaciones Técnicas

### Cadena de Hash (Audit Trail)

```
Registro 1: hash = SHA-256(id1 + datos1 + timestamp1 + "GENESIS")
Registro 2: hash = SHA-256(id2 + datos2 + timestamp2 + hash_registro1)
Registro 3: hash = SHA-256(id3 + datos3 + timestamp3 + hash_registro2)
```

### Verificación de Integridad

| Componente | Mecanismo | Frecuencia |
|------------|-----------|-----------|
| Audit logs | Verificación de cadena de hash | Cada 24 horas |
| Transacciones | Hash de verificación por registro | Cada transacción |
| Balances | Reconciliación contra historial | Cada 6 horas |
| Precios de mercado | Comparación multi-fuente | Cada actualización |
| API responses | Checksum HMAC | Cada request |

### Constraints de Base de Datos

| Tabla | Constraint | Propósito |
|-------|-----------|-----------|
| users | UNIQUE(email, document_number) | Prevenir duplicados |
| wallets | UNIQUE(user_id) | Una billetera por usuario |
| transactions | FOREIGN KEY(user_id, wallet_id) | Integridad referencial |
| orders | CHECK(amount > 0) | Valores positivos |
| audit_logs | INSERT ONLY | No se puede UPDATE/DELETE |
| wallet_balances | FOREIGN KEY(wallet_id, currency) | Integridad referencial |

---

## Estrategias de Cumplimiento

- **Hash Chain**: Cada registro de auditoría incluye hash del anterior.
- **Database Constraints**: Foreign keys, UNIQUE, CHECK constraints.
- **Transaction Verification**: Hash antes y después de cada operación financiera.
- **Reconciliation Job**: Tarea programada que recalcula balances vs transacciones.
- **INSERT ONLY Table**: La tabla audit_logs no permite UPDATE ni DELETE.
- **WAL (Write-Ahead Log)**: PostgreSQL WAL para recuperación de datos.

---

## Referencias

- ISO/IEC 27001 - Information Security - Integrity.
- Blockchain-style audit trail pattern.
- SARLAFT - Integridad de registros financieros.
- ACID Properties - Database Transactions.
