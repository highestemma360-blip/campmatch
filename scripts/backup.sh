#!/bin/bash
# Campmatch Database Backup Script
# Runs scheduled backups with rotation

set -e

DATA_DIR="${DATA_DIR:-/data}"
BACKUP_DIR="${DATA_DIR}/backups"
DB_PATH="${DATA_DIR}/campmatch.db"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/campmatch-${TIMESTAMP}.db"

mkdir -p "${BACKUP_DIR}"

if [ -f "${DB_PATH}" ]; then
    cp "${DB_PATH}" "${BACKUP_FILE}"
    echo "[$(date)] Backup created: ${BACKUP_FILE}"

    # Rotate old backups
    find "${BACKUP_DIR}" -name "campmatch-*.db" -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] Old backups older than ${RETENTION_DAYS} days removed"
else
    echo "[$(date)] ERROR: Database not found at ${DB_PATH}"
    exit 1
fi
