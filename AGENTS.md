# Persistent Engineering Instructions for AI Agents & Developers

This document defines the persistent architectural, engineering, and operational standards for all agents, subagents, and human engineers contributing to **ForgeOS**.

---

## 1. Core Operating Principles

1. **Inspect Before Editing**
   - Always read and analyze existing files, interfaces, and dependencies before modifying code.
   - Never assume file contents or directory structures without verification.

2. **Strict Typed Interfaces & Modular Architecture**
   - All modules, packages, APIs, tools, and schemas must be strictly typed using TypeScript and validated at runtime using Zod schemas.
   - Maintain clear separation of concerns across monorepo packages (`apps/*` vs `packages/*`).
   - Circular package dependencies are forbidden.

3. **Prefer Reusable Components Over Duplicated Implementations**
   - Centralize shared UI primitives, utilities, and validation logic into dedicated packages (`@forgeos/ui-kit`, `@forgeos/design-system`, `@forgeos/app-schema`).
   - Do not copy-paste code across applications or services.

4. **Validate AI-Generated Output Before Execution**
   - Every AI-generated output (application specifications, plans, code patches) must pass structural validation, AST parsing, and security boundary checks before any disk write or execution.
   - Never use `eval()`, `new Function()`, or unconstrained subshell execution for generated code.

5. **Never Expose Credentials or Secrets**
   - Credentials, API keys, and auth tokens must only be accessed through server-side environment variables or secure secret managers.
   - Never bundle secrets into client-facing bundles, preview runtimes, project memory, or commit history.
   - Always sanitize logs to redact tokens and sensitive credentials.

6. **Evidence-Based Reporting**
   - Never claim a build, test, repair, or deployment succeeded without direct command output and verified exit codes.
   - Truthful error reporting is mandatory. Do not disguise test failures or mock away test assertions to manufacture green results.

7. **Preserve Existing and Unrelated User Changes**
   - When modifying files, preserve user-authored modifications, comments, and structure.
   - Generate diffs and verify conflict boundaries before overwriting files.
   - Never delete or overwrite files outside the target workspace.

8. **Run Relevant Verification After Every Modification**
   - Execute formatting checks, type-checks (`tsc --noEmit`), and automated tests after making changes.
   - Record test commands and execution outputs in `PROGRESS.md`.

9. **Document Architectural Decisions**
   - Any architectural shift, new dependency, or interface alteration must be recorded in `DECISIONS.md` (ADR format).
   - Keep `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, and `TECH_STACK.md` synchronized with the actual codebase.

10. **Approval Boundaries & Safety**
    - Destructive actions (dropping database tables, recursive deletion of directories, pushing to production) require explicit human approval.
    - Sandboxes must enforce path-traversal prevention and execution timeouts.
