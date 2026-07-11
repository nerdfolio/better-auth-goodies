#!/bin/bash
# PreToolUse reminder: prefer graphify/Serena over raw grep/rg/Read for CODE search.
# Scoped to source dirs (packages/ apps/ core/ src/) so it stays SILENT on logs,
# config, docs, and other non-code text searches — the over-firing that trained us
# to ignore the old always-on reminder. Non-blocking (additionalContext only).
# Handles Bash (grep/rg/…), the built-in Grep tool, and Read/Glob.

INPUT=$(cat)
[ -f graphify-out/graph.json ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')

case "$TOOL" in
  Bash)
    TARGET=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
    # Only code-search commands, not every bash line.
    printf '%s' "$TARGET" | grep -qE '(^|[^[:alnum:]_])(grep|rg|ripgrep|ack|ag)([[:space:]]|$)' || exit 0
    ;;
  Grep)
    TARGET=$(printf '%s' "$INPUT" | jq -r '[.tool_input.pattern, .tool_input.path, .tool_input.glob] | map(select(. != null)) | join(" ")')
    ;;
  Read|Glob)
    TARGET=$(printf '%s' "$INPUT" | jq -r '[.tool_input.file_path, .tool_input.pattern, .tool_input.path] | map(select(. != null)) | join(" ")')
    ;;
  *) exit 0 ;;
esac

[ -n "$TARGET" ] || exit 0

# Lowercase and turn backslashes into slashes for uniform matching.
NORM=$(printf '%s' "$TARGET" | tr 'A-Z\\' 'a-z/')

# Must reference a source directory to count as a code search (segment boundary,
# so `mypackages/` does NOT match but `./src/` and `apps/jobguild` do).
printf '%s' "$NORM" | grep -qE '(^|[^[:alnum:]_])(packages|apps|core|src)/' || exit 0
# Never nag on the graph output or scratch area.
printf '%s' "$NORM" | grep -qE 'graphify-out/|zztemp/' && exit 0

# For Read/Glob, only nag on actual code files — not .md/.json/.yaml under src/.
case "$TOOL" in
  Read|Glob)
    printf '%s' "$NORM" | grep -qE '\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|astro|svelte)($|[^a-z])' || exit 0
    ;;
esac

MSG='graphify-out/graph.json exists. For CODE search in this repo, prefer `graphify query "<question>"` (scoped subgraph) or Serena'"'"'s symbol tools over raw grep/rg/Read. Use grep/rg only as a fallback, or for non-code text (logs, config, docs). Applies to subagents too.'

jq -cn --arg m "$MSG" '{hookSpecificOutput:{hookEventName:"PreToolUse", additionalContext:$m}}'
exit 0
