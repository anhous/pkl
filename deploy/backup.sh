#!/usr/bin/env bash
# Backup harian pkl_db + foto uploads. Pasang di cron root:
#   0 3 * * * bash /opt/pklnew/deploy/backup.sh >> /var/log/pkl-backup.log 2>&1
# Sesuaikan ROOT dan kredensial DB di bawah.
set -euo pipefail
ROOT="${PKL_ROOT:-/opt/pklnew}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pkl}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_NAME="${DB_NAME:-pkl_db}"
DB_USER="${DB_USER:-pkl}"
DB_PASS="${DB_PASS:-}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%F_%H%M)"

echo "[$TS] dump database..."
if [ -n "$DB_PASS" ]; then
  export MYSQL_PWD="$DB_PASS"
fi
mariadb-dump -u "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_${TS}.sql.gz"
unset MYSQL_PWD || true

echo "[$TS] arsip uploads..."
tar -czf "$BACKUP_DIR/uploads_${TS}.tar.gz" -C "$ROOT/apps/api" uploads

echo "[$TS] prune > ${RETENTION_DAYS} hari..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

echo "[$TS] selesai: $(ls -la "$BACKUP_DIR" | tail -3)"
