# Suggested Commands

Run from repo root unless noted. Use pnpm, never npm/yarn.

- Install: `pnpm install`
- Build all packages: `pnpm -r build` (per package: `pnpm --filter @nerdfolio/ba-guest-list build` → tsup-node)
- Test: `pnpm test` (root, `vitest run`; package-level test script is a placeholder that exits 1 — don't use)
- Lint: `pnpm exec biome check .` (fix: `pnpm exec biome check --write .`)
- Format: `pnpm exec biome format --write .`

Note: `prepare` script in ba-guest-list runs build on install.
No Linux-specific command quirks; standard GNU coreutils.
