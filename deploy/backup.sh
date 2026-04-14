#!/bin/bash
# deploy/backup.sh — Daily database backup
# Add to crontab: 0 3 * * * /var/www/marketing/deploy/backup.sh >> /var/www/marketing/logs/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="/var/www/marketing/backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H%M)
FILENAME="marketing_db_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Starting backup..."

# Run backup
if pg_dump -U marketing marketing_db | gzip > "${FILEPATH}"; then
  # Verify backup file exists and has content
  FILESIZE=$(stat -f%z "${FILEPATH}" 2>/dev/null || stat -c%s "${FILEPATH}" 2>/dev/null || echo "0")
  if [ "$FILESIZE" -lt 100 ]; then
    echo "[$(date)] ERROR: Backup file too small (${FILESIZE} bytes). Backup may have failed."
    rm -f "${FILEPATH}"
    exit 1
  fi
  echo "[$(date)] Backup complete: ${FILENAME} (${FILESIZE} bytes)"
else
  echo "[$(date)] ERROR: pg_dump failed with exit code $?"
  rm -f "${FILEPATH}"
  exit 1
fi

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

REMAINING=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "[$(date)] Retention cleanup done. ${REMAINING} backups remaining."
