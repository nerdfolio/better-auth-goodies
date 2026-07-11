#!/bin/bash
# SubagentStop hook. A subagent just finished; its work may be entirely UNTRACKED
# files that no commit protects yet. This is exactly what was lost on 2026-07-06
# when a stray `git clean` ran before the slice work was committed.
#
# Non-destructive: it NEVER modifies the working tree. It (1) backs up untracked
# files to a timestamped tarball under zztemp/wip-backups/ so a later clean/reset
# is recoverable, and (2) nudges toward a real checkpoint commit. Only fires when
# there are enough untracked files to be worth protecting, to avoid noise.

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Untracked, non-ignored files (this is what `git clean -fd` would delete).
# Exclude our own backup area so snapshots don't snowball. NUL-delimited list to
# a temp file — bash 3.2 (macOS default) has no `mapfile`, and NUL survives paths
# with spaces/newlines.
LIST=$(mktemp)
trap 'rm -f "$LIST"' EXIT
git ls-files --others --exclude-standard -z 2>/dev/null \
  | grep -zv '^zztemp/' > "$LIST"
COUNT=$(tr -cd '\0' < "$LIST" | wc -c | tr -d ' ')

# Threshold: a couple of stray files aren't worth a backup; a slice's worth is.
[ "$COUNT" -lt 5 ] && exit 0

BACKUP_DIR="zztemp/wip-backups"
mkdir -p "$BACKUP_DIR" 2>/dev/null
TARBALL="$BACKUP_DIR/untracked-$(date +%Y%m%d-%H%M%S).tar.gz"
if ! tar czf "$TARBALL" --null -T "$LIST" 2>/dev/null; then
  echo "⚠️  ${COUNT} untracked files exist and are protected by no commit. (Automatic backup failed — run /checkpoint to commit them before continuing.)"
  exit 0
fi

echo "⚠️  ${COUNT} untracked files exist and are protected by no commit. Backed up to ${TARBALL} (non-destructive; recover with: tar xzf ${TARBALL}). Run /checkpoint to test + stage + commit this work before continuing, so a session limit or stray command can't lose it."
exit 0
