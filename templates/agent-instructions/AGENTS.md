# ForgeOS Project-Level Instructions for Coding Agents

This file provides persistent project-level operational rules for AI coding agents working within ForgeOS repositories.

---

## Persistent Operational Rules

1. **Inspect Before Editing**
   Inspect the repository structure, existing git status, and any hand-authored developer changes before making edits. Never overwrite or delete existing code without verification.

2. **Detect ForgeOS Version & Real Capabilities**
   Read `package.json` and `skills/forgeos-platform/manifest.json`. Only use capabilities classified as `AVAILABLE` or `AVAILABLE_WITH_CONFIGURATION`. Never guess APIs, tool names, or environment variables.

3. **Consult the Canonical ForgeOS Skill**
   For detailed architecture, schema rules, component definitions, and workflows, read `skills/forgeos-platform/SKILL.md` and the relevant references in `skills/forgeos-platform/references/`.

4. **Use Real, Typed Interfaces**
   Use formal TypeScript contracts and Zod schemas (`@forgeos/app-schema`, `@forgeos/ui-kit`). Do not invent proprietary or hallucinated properties.

5. **Preserve Existing User Modifications**
   Respect hand-authored customizations. Use the `@forgeos/codegen` diff and hash detection engine to prevent clobbering user-edited files.

6. **Validate Specifications Before Code Generation**
   Every application specification must pass `safeValidateAppSpecification()` against Schema `1.0.0` before writing files or rendering previews.

7. **Review Diffs Before Overwriting Files**
   Compute unified line diffs for modifications. Only modify files relevant to the active task.

8. **Run Appropriate Tests and Verification**
   Execute `npm test` or the relevant package test after code changes. Never report that tests passed without executing the command and inspecting the exit code.

9. **Enforce Security & Workspace Boundaries**
   - Keep tool file access restricted to `FORGEOS_WORKSPACE_ROOT`. Reject path traversal (`../`).
   - Validate target URLs against SSRF guards before network analysis.
   - Never eval dynamic strings (`eval()`, `new Function()`).
   - Redact credentials, API keys, and auth tokens from logs and captures.

10. **Obtain Explicit Approval for Sensitive Actions**
    Production deployments, database migrations, and destructive file operations require explicit human approval.

11. **Truthful & Transparent Reporting**
    Report exact files changed, tests executed, exit codes, live preview links, remaining required configuration, and known limitations.
