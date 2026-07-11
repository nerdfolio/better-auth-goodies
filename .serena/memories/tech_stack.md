# Tech Stack

- TypeScript 5.8.x, strict, target/module ESNext, moduleResolution bundler, noEmit (root `tsconfig.json`); build emits via tsup.
- Runtime: Node >=22 (engines); tsup target node22.
- Package manager: pnpm >=11 (pinned `packageManager: pnpm@11.11.0` in root package.json); workspaces + version catalog in `pnpm-workspace.yaml`.
- Build: tsup 8.x (`tsup-node`), outputs ESM+CJS+dts, clean+splitting on.
- Tests: Vitest 4.x (root script only; no tests written yet).
- Lint/format: Biome 2.x (`biome.jsonc`) — replaces eslint/prettier.
- Key deps: better-auth 1.4.x (peer), zod 4.x, lodash-es.
