# Claude Code Project Guidelines for ForgeOS

## Common Commands
- Start dev server: `npm run dev`
- Run all tests: `npm test`
- Run schema tests: `npm run test:schema`
- Run codegen tests: `npm run test:codegen`
- Run orchestrator tests: `npm run test:orchestrator`
- Run E2E scenario: `npm run test:e2e`
- Install agent skill: `node scripts/install-skill.js`
- Validate docs: `node scripts/validate-docs.js`

## Engineering Standards
- Always consult `skills/forgeos-platform/SKILL.md` before implementing or debugging ForgeOS features.
- All application specifications must validate against `CURRENT_SCHEMA_VERSION = '1.0.0'` in `@forgeos/app-schema`.
- Use the 12 core accessible UI components registered in `@forgeos/ui-kit`.
- Zero dynamic string `eval()` in UI runtime.
- Prevent SSRF by validating all target URLs with `@forgeos/rea-adapter`.
- Keep tool file access strictly inside `FORGEOS_WORKSPACE_ROOT`.
- Preserve existing user-edited files via `@forgeos/codegen` diff and hash checks.
- Production deployments strictly require explicit user approval.
