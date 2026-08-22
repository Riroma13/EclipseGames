#!/usr/bin/env bash
set -euo pipefail

: "${RESTIC_REPOSITORY:?Set RESTIC_REPOSITORY in a host-only environment file}"
: "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE in a host-only environment file}"
: "${SQLITE_VOLUME:?Set SQLITE_VOLUME to the private SQLite volume}"

test -r "$RESTIC_PASSWORD_FILE"
test -d "$SQLITE_VOLUME"
restic backup "$SQLITE_VOLUME"
restic forget --keep-daily 30 --keep-monthly 12 --prune
