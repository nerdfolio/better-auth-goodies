# Project
- pnpm workspace monorepo (Node >=22, ESM). Use pnpm only; dep versions pinned via `catalog:` in `pnpm-workspace.yaml` — bump versions there.
- Build: `pnpm -r build` (tsup). Test: `pnpm test` from root (vitest) — package-level test scripts are placeholders that exit 1.
- Lint/format: `pnpm exec biome check --write .` (Biome, no eslint/prettier; not an npm script).
- Serena is onboarded: read `mem:core` for the source map before re-exploring.
