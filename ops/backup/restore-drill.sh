#!/usr/bin/env bash
set -euo pipefail

: "${RESTIC_REPOSITORY:?Set RESTIC_REPOSITORY in a host-only environment file}"
: "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE in a host-only environment file}"
: "${RESTORE_TARGET:?Set RESTORE_TARGET to an empty temporary directory}"

test -r "$RESTIC_PASSWORD_FILE"
test -d "$RESTORE_TARGET"
restic restore latest --target "$RESTORE_TARGET"
test -s "$RESTORE_TARGET/data/eclipse.sqlite"
printf 'Restore verification passed: %s\n' "$RESTORE_TARGET/data/eclipse.sqlite"
