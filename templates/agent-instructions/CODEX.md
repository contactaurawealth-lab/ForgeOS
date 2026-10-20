# Codex Operating Guide for ForgeOS

- Operating environment: Node.js >= 20.19.0 LTS with npm workspaces.
- Always validate application specifications using `safeValidateAppSpecification` from `@forgeos/app-schema`.
- When modifying applications, calculate unified line diffs using `@forgeos/codegen`.
- If an application component defect occurs, engage bounded self-repair capped at 3 iterations.
- Read `skills/forgeos-platform/SKILL.md` for complete API and schema contracts.
- Always execute `npm test` to verify code changes.
