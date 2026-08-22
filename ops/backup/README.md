# Encrypted SQLite backups

The production policy is encrypted restic storage with daily retention of 30 snapshots and monthly retention of 12 snapshots.

## Configure

1. Install `restic` on the private EU VPS host.
2. Copy `restic.env.example` to a host-only location.
3. Store the repository password in the path named by `RESTIC_PASSWORD_FILE`; never commit it.
4. Initialize the repository once with `restic init`.
5. Schedule `backup.sh` daily.

## Backup

```bash
set -a; . /etc/protocole-eclipse/restic.env; set +a
/path/to/backup.sh
```

`backup.sh` backs up the private Docker volume and prunes to `daily-30/monthly-12`.

## Restore verification

Use an empty temporary directory and never restore over the live volume:

```bash
target=$(mktemp -d)
set -a; . /etc/protocole-eclipse/restic.env; set +a
RESTORE_TARGET="$target" /path/to/restore-drill.sh
rm -rf "$target"
```

The drill restores the latest snapshot and requires a non-empty `data/eclipse.sqlite` file. Run it quarterly before production data is enabled. When restic is unavailable, `local-restore-drill.sh` provides a deterministic private-volume copy check but is not a substitute for encrypted restic verification.
