# Core

Monorepo of better-auth extensions (pnpm workspaces). Root package `better-auth-goodies` is private; publishable packages live under `packages/`.

## Source map
- `packages/ba-guest-list/` — only package: `@nerdfolio/ba-guest-list`, a better-auth plugin for fixed guest-list login (dev/demo, not production).
  - `src/index.ts` — re-exports only (no own symbols)
  - `src/server.ts` — `guestList` plugin (server), `GuestListOptions` interface, `GuestWithRole` schema var
  - `src/client.ts` — `guestListClient` plugin factory
  - `src/utils.ts` — `formatName`, `parseEmailDomain`
  - builds via tsup-node to `dist/` (ESM `.mjs` + CJS `.cjs` + `.d.ts`)

## Invariants
- ESM-only source (`"type": "module"` everywhere); dual ESM/CJS only in build output.
- Dependency versions pinned via pnpm catalog in `pnpm-workspace.yaml` (`catalog:` specifiers) — bump versions there, not in package.json.
- `better-auth` is a peerDependency of plugins, devDependency for local dev.
- No CI workflows. Tests: vitest projects — root `vitest.config.ts` (`projects: ["packages/*"]`) + per-package `vitest.config.ts`; tests colocated as `src/*.test.ts` (ba-guest-list: utils/server/client). Server plugin tests use `betterAuth` + `memoryAdapter` from `better-auth/adapters/memory` (NOT `getTestInstance` from better-auth/test — needs sqlite deps not installed).

Stack/versions: `mem:tech_stack`. Dev/build/test commands: `mem:suggested_commands`. Style and code patterns: `mem:conventions`. Definition-of-done checks: `mem:task_completion`.
