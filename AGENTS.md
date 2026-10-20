# Persistent Engineering Instructions for AI Agents & Developers

This document defines the persistent architectural, engineering, and operational standards for all agents, subagents, and human engineers contributing to **ForgeOS**.

---

## 1. Core Operating Principles

1. **Inspect Before Editing**
   - Always read and analyze existing files, git changes, and dependencies before modifying code.
   - Never assume file contents or directory structures without verification.

2. **Detect Version & Real Capabilities**
   - Check `package.json` and `skills/forgeos-platform/manifest.json` before selecting tools or APIs.
   - For specialized platform tasks, activate and read `skills/forgeos-platform/SKILL.md`.

3. **Strict Typed Interfaces & Modular Architecture**
   - All modules, packages, APIs, tools, and schemas must be strictly typed using TypeScript and validated at runtime using Zod schemas (`@forgeos/app-schema`).
   - Maintain unidirectional dependency flow (`apps/*` -> `packages/*`).
   - Circular package dependencies are forbidden.

4. **Prefer Reusable Components Over Duplicated Implementations**
   - Use the 12 core accessible primitives registered in `@forgeos/ui-kit`.
   - Never hallucinate unregistered UI primitives.

5. **Validate AI-Generated Output Before Execution**
   - Every AI-generated output (specifications, plans, code patches) must pass structural validation (`safeValidateAppSpecification`).
   - Never use `eval()`, `new Function()`, or unconstrained subshell execution for generated code.

6. **Never Expose Credentials or Secrets**
   - Secrets and API keys (`OPENAI_API_KEY`, `FORGEOS_SECRET_KEY`) must only be accessed through server-side environment variables or `SecretManager`.
   - Never bundle secrets into client-facing bundles, preview runtimes, or git commits.
   - All captured evidence and logs must undergo regex sanitization (`redactSensitiveData`).

7. **Preserve User Code & Inspect Diffs**
   - When modifying files, preserve user-authored modifications.
   - Use `@forgeos/codegen` hash tracking to detect edits and output to sidecar files (`.forgeos-update`) when conflicts exist.
   - Review unified line diffs before applying changes.

8. **Evidence-Based Verification**
   - Never claim a build, test, repair, or deployment succeeded without direct command output and verified exit code 0.
   - Run `npm test` after modifying code.

9. **Security Boundaries & SSRF Prevention**
   - Keep file access constrained within `FORGEOS_WORKSPACE_ROOT`. Reject path traversal (`../`).
   - Target inspection URLs must be validated against `validateTargetUrl()` to block loopback, private subnets, and cloud metadata.

10. **Approval Boundaries & Safety**
    - Production deployments strictly require `userApprovalConfirmed: true`.
    - Destructive operations require human consent.

11. **Truthful Reporting**
    - Report actual files changed, test results, preview URLs, and any remaining configuration or limitations.
