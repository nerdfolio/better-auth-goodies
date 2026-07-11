# Conventions

- Biome-enforced style (`biome.jsonc`): lineWidth 120, semicolons `asNeeded` (omit unless required), tabs per Biome default; `noUnusedImports`/`noUnusedVariables` = error. VCS-aware, default branch `main`.
- ESM-only source; no `require` in src.
- Naming: camelCase symbols; kebab-case package dirs; published packages scoped `@nerdfolio/ba-<name>`.
- Plugin shape (better-auth pattern): server plugin exported as const factory (`guestList`) + options interface (`GuestListOptions`); client counterpart `<name>Client` in `client.ts`; `index.ts` only re-exports server+client entry points — keep it symbol-free.
- Validation with zod schemas (e.g. `GuestWithRole` in server.ts).
- Packages publish `dist/` only (`files: ["dist"]`), exports map with types/import/require conditions.
