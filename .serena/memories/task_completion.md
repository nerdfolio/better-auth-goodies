# Task Completion Checklist

Run from repo root when a coding task is done:

1. `pnpm exec biome check --write .` — lint + format (must pass clean)
2. `pnpm -r build` — tsup build incl. type declarations (catches type errors; tsc is noEmit-only)
3. `pnpm test` — vitest run (currently no test files; still must not error)

No CI exists — these local checks are the only gate.
