# Backups y recuperación de la base

Procedimiento operativo para `ganaderia-db` (PostgreSQL en Dokploy).
Estado actual: **sin backup automático configurado**; este documento deja el
camino listo para ejecutar en cuanto se decida el destino.

Datos de producción:

| Dato | Valor |
|---|---|
| Servicio de base | `ganaderia-db` (postgres:18) |
| Contenedor | `ganaderia-db-ngcyyy.1.<task>` |
| Base | `ganaderia` |
| Usuario administrador | `ganaderia_admin` |
| Rol de la aplicación | `ganaderia_app` (NOBYPASSRLS) |

## 1. Backup manual (hoy)

Desde un shell con acceso al VPS:

```bash
# 1. Nombre del contenedor de la base
CONTAINER=$(docker ps --format '{{.Names}}' | grep ganaderia-db | head -1)

# 2. Dump comprimido de la base completa (formato custom: permite restore selectivo)
docker exec -t "$CONTAINER" pg_dump -U ganaderia_admin -d ganaderia -Fc \
  > "ganaderia-$(date +%Y%m%d-%H%M).dump"

# 3. Verificación inmediata: el archivo debe listar su contenido
pg_restore -l "ganaderia-$(date +%Y%m%d-%H%M).dump" | head
```

Un backup sin verificación no es un backup: si `pg_restore -l` no lista tablas,
el archivo está corrupto.

## 2. Restauración

```bash
# Restaurar sobre una base nueva (nunca sobre la de producción en caliente)
docker exec -t "$CONTAINER" createdb -U ganaderia_admin ganaderia_restore
docker exec -i "$CONTAINER" pg_restore -U ganaderia_admin -d ganaderia_restore --clean --if-exists \
  < ganaderia-YYYYMMDD-HHMM.dump

# Verificación mínima: las migraciones y los datos están
docker exec -t "$CONTAINER" psql -U ganaderia_admin -d ganaderia_restore \
  -c 'SELECT count(*) FROM schema_migrations' -c 'SELECT count(*) FROM tenants'
```

Para promover el restore hay que detener la aplicación, renombrar bases y volver
a arrancar; hacerlo en una ventana acordada y con el dump verificado.

## 3. Automatización pendiente (cuando se elija destino)

**Opción A — Dokploy + S3 (recomendada).** Crear un *database backup* en Dokploy
apuntando a un destino S3 (Backblaze B2, Wasabi, Cloudflare R2 o AWS), con
frecuencia diaria y retención de 14–30 días. Requiere: endpoint, bucket, región,
access key y secret. El backup queda fuera del VPS, que es lo que protege contra
la pérdida del servidor.

**Opción B — copia programada en el VPS.** Cron diario que ejecuta el dump del
punto 1 y lo deja en `/var/backups/ganaderia/`, con rotación (por ejemplo 14
archivos). No protege contra la pérdida del servidor ni contra un borrado del
disco; sirve como red de seguridad contra errores humanos.

**Opción C — híbrida.** Cron en el VPS + sincronización del directorio a un
bucket con `rclone`. Requiere las mismas credenciales que la opción A.

## 4. Frecuencia y retención sugeridas

- Base de producción: **diario**, retención 30 días; antes de cada despliegue con
  migraciones, un backup puntual adicional.
- Verificación: **semanal**, restaurar el último dump en una base temporal y
  contar filas de `tenants`, `animals` y `users`.
- Prueba de recuperación completa una vez antes de entregar al dueño.

## 5. Verificación de entrega

Dos scripts, sin dependencias adicionales:

```bash
# Flujo completo de punta a punta contra producción (26 verificaciones)
node scripts/aceptacion-e2e.js

# Latencia con usuarios concurrentes, auto-limitada al guardián por IP
node scripts/carga.js https://ganaderia.187.127.19.244.sslip.io/api 3 20
```

El primero crea un establecimiento de prueba ("Aceptación …"), recorre alta de
insumo, animal, fase, compras con pagos, alertas, reportes, CSV, equipo y
permisos, y deja el operario dado de baja. El segundo mide p50/p95/p99 bajo
carga; por defecto se mantiene en ~8 req/s para no chocar con el límite de 600
req/min por IP (subí `MAX_RPS` sólo si medís desde otra IP o elevás el límite).

## 6. Monitoreo

- Salud de la API: `GET https://ganaderia.187.127.19.244.sslip.io/api/health`
  debe responder `200 {"data":{"status":"ok"}}`.
- Salud del front: `GET https://ganaderia-web.187.127.19.244.sslip.io/` debe
  responder `200`.
- Recomendado: un chequeo externo cada 5 minutos (UptimeRobot, BetterStack o
  similar) que avise por email/WhatsApp cuando alguno falle. Es gratuito y no
  requiere tocar el servidor.
