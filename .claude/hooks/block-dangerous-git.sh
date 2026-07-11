#!/bin/bash
# Blocks irreversible, work-destroying commands before they run (PreToolUse:Bash).
# Bias is intentionally toward OVER-blocking: a false positive costs one retry,
# a false negative cost 5 recovery sessions (the `git clean -fd packages/rats/src`
# incident on 2026-07-06 that deleted all untracked work).
#
# Patterns are ERE and match anywhere in the command string. That means the guard
# can trip on the literal text inside an `echo`/comment — accept that; safety wins.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  # --- git: history / remote ---
  "git[[:space:]]+push"
  "push[[:space:]]+--?f"                       # push --force / push -f / --force-with-lease
  "git[[:space:]]+reset[[:space:]]+--hard"
  "reset[[:space:]]+--hard"
  "git[[:space:]]+branch[[:space:]]+-D"
  # --- git: working-tree destroyers (flag-order-insensitive) ---
  "git[[:space:]]+clean[[:space:]]+-[[:alnum:]]*f"   # -fd, -df, -fdx, -xdf, -f ...
  "git[[:space:]]+checkout[[:space:]]+(--[[:space:]]+)?\\."
  "git[[:space:]]+restore[[:space:]]+\\."
  # --- rm: recursive + force in either flag order (rm -rf, -fr, -Rf, -fR) ---
  "rm[[:space:]]+-[[:alnum:]]*[rR][[:alnum:]]*f"
  "rm[[:space:]]+-[[:alnum:]]*f[[:alnum:]]*[rR]"
  "rm[[:space:]]+--recursive[[:space:]]+--force"
  "rm[[:space:]]+--force[[:space:]]+--recursive"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this. If this is genuinely needed, ask the user to run it themselves." >&2
    exit 2
  fi
done

exit 0
