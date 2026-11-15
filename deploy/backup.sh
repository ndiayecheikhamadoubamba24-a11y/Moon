#!/bin/sh
# Sauvegarde quotidienne de la base Moon dans /backups (dossier deploy/backups sur le serveur).
# Les sauvegardes de plus de 14 jours sont effacées.
set -u
while true; do
  file="/backups/moon-$(date +%Y-%m-%d_%H%M).dump"
  if pg_dump -h db -U moon -d moon -Fc -f "$file"; then
    echo "Sauvegarde OK : $file"
  else
    echo "ÉCHEC de la sauvegarde" >&2
  fi
  find /backups -name 'moon-*.dump' -type f -mtime +14 -delete
  sleep 86400
done
