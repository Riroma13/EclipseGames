#!/usr/bin/env bash
set -euo pipefail

source_dir=${1:?Usage: local-restore-drill.sh SOURCE_DIR TARGET_DIR}
target_dir=${2:?Usage: local-restore-drill.sh SOURCE_DIR TARGET_DIR}
test -d "$source_dir"
rm -rf "$target_dir"
mkdir -p "$target_dir"
tar -C "$source_dir" -cf - . | tar -C "$target_dir" -xf -
test -s "$target_dir/eclipse.sqlite"
printf 'Local private-volume restore verification passed: %s\n' "$target_dir/eclipse.sqlite"
