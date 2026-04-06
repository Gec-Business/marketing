#!/bin/bash
# deploy/backup.sh — Daily database backup
set -e

BACKUP_DIR="/var/www/marketing/backups"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H%M)
FILENAME="marketing_db_${DATE}.sql.gz"

pg_dump -U marketing marketing_db | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup complete: ${FILENAME}"
