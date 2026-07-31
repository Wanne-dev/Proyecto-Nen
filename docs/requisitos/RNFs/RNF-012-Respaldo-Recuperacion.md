# RNF-012: Respaldo y Recuperación

**ID:** RNF-012  
**Nombre:** Respaldo y Recuperación  
**Categoría:** Fiabilidad  
**Prioridad:** Alta  

---

## Descripción

El sistema debe implementar una estrategia de respaldo y recuperación de datos que garantice la preservación de la información ante desastres, fallos de hardware o errores humanos, permitiendo la restauración completa del sistema en el menor tiempo posible.

---

## Criterios de Aceptación

1. Se realizan respaldos automáticos de la base de datos cada 6 horas.
2. Los respaldos se almacenan en ubicación diferente al servidor principal.
3. El tiempo máximo de recuperación (RTO) ante desastre total es de 30 minutos.
4. La pérdida máxima de datos (RPO) ante desastre es de 15 minutos.
5. Se realizan respaldos incrementales cada hora y completos cada 24 horas.
6. Los respaldos se verifican automáticamente (restore test) semanalmente.
7. Los respaldos se mantienen por mínimo 90 días.
8. El proceso de restauración está documentado y probado.

---

## Especificaciones Técnicas

### Estrategia de Respaldo

| Tipo | Frecuencia | Retención | Almacenamiento |
|------|-----------|-----------|----------------|
| Completo | Cada 24 horas (2:00 AM) | 30 días | S3 / almacenamiento externo |
| Incremental | Cada 6 horas | 14 días | S3 / almacenamiento externo |
| WAL (Write-Ahead Log) | Continuo | 7 días | Servidor local |
| Código fuente | Cada push (Git) | Indefinido | GitHub |
| Configuración | Cada cambio (Git) | Indefinido | GitHub |

### Procedimiento de Recuperación

| Escenario | Procedimiento | Tiempo Estimado |
|-----------|--------------|-----------------|
| Pérdida de datos reciente | Restaurar incremental + WAL | 10-15 minutos |
| Fallo del servidor | Nuevo servidor + restore completo | 20-30 minutos |
| Fallo de tabla específica | Restore parcial de tabla | 5-10 minutos |
| Eliminación accidental | Point-in-time recovery | 10-20 minutos |
| Desastre total | Nuevo ambiente + restore completo | 30-60 minutos |

### Comandos de Respaldo (PostgreSQL)

```bash
# Respaldo completo
docker exec banca_nen_postgres pg_dump -U banca_nen -Fc banca_nen > backup_$(date +%Y%m%d_%H%M%S).dump

# Restaurar desde respaldo
docker exec -i banca_nen_postgres pg_restore -U banca_nen -d banca_nen < backup.dump

# Point-in-time recovery
# Configurar recovery_target_time en postgresql.conf
```

---

## Estrategias de Cumplimiento

- **pg_dump**: Respaldos automáticos de PostgreSQL en formato comprimido.
- **WAL Archiving**: PostgreSQL WAL para point-in-time recovery.
- **Cron Job**: Tareas programadas para respaldos automáticos.
- **Verificación automática**: Restore test semanal en ambiente de staging.
- **Almacenamiento externo**: Respaldos en S3 o almacenamiento fuera del servidor.
- **Documentación**: Runbook de recuperación paso a paso.
- **Git**: Código y configuración siempre respaldados en GitHub.

---

## Referencias

- ISO/IEC 27001 - Information Security - Backup.
- PostgreSQL Backup and Recovery Documentation.
- AWS Well-Architected Framework - Reliability Pillar.
- NIST SP 800-34 - Contingency Planning Guide.
