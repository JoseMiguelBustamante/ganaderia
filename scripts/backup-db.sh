#!/usr/bin/env bash
# Backup de la base de producción (ver docs/backups.md).
#
# Uso:
#   ./scripts/backup-db.sh [DESTINO]
#
# Corre EN EL VPS, donde existen docker y el contenedor de la base. Genera un
# dump comprimido en formato custom y lo verifica con pg_restore -l.
# Rotación: conserva los últimos RETENTION archivos del destino.
set -euo pipefail

DESTINO="${1:-/var/backups/ganaderia}"
RETENTION="${RETENTION:-14}"
STAMP="$(date +%Y%m%d-%H%M)"
ARCHIVO="$DESTINO/ganaderia-$STAMP.dump"

CONTAINER=$(docker ps --format '{{.Names}}' | grep ganaderia-db | head -1)
if [ -z "$CONTAINER" ]; then
  echo "ERROR: no se encontró el contenedor de la base (ganaderia-db)" >&2
  exit 1
fi

mkdir -p "$DESTINO"

echo "[backup] $CONTAINER -> $ARCHIVO"
docker exec -t "$CONTAINER" pg_dump -U ganaderia_admin -d ganaderia -Fc > "$ARCHIVO"

# Un backup sin verificar no es un backup.
if ! pg_restore -l "$ARCHIVO" > /dev/null 2>&1; then
  echo "ERROR: el dump no se puede leer; se descarta para no simular un backup válido" >&2
  rm -f "$ARCHIVO"
  exit 1
fi

TABLAS=$(pg_restore -l "$ARCHIVO" | grep -c "TABLE DATA" || true)
TAMANO=$(du -h "$ARCHIVO" | cut -f1)
echo "[backup] ok: $TABLAS tablas con datos, $TAMANO"

# Rotación: los más nuevos quedan.
ls -1t "$DESTINO"/ganaderia-*.dump 2>/dev/null | tail -n +$((RETENTION + 1)) | while read -r viejo; do
  echo "[backup] rotando $viejo"
  rm -f "$viejo"
done

echo "[backup] listo. Recordá copiar el archivo fuera del VPS."
