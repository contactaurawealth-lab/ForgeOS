# ForgeOS Troubleshooting Reference

## Purpose & Quick Diagnostic Matrix
This reference guides agents and developers through common errors, root causes, and verified fixes across all ForgeOS layers.

---

## Diagnostic Matrix

| Error Message / Symptom | Root Cause | Verified Fix |
| :--- | :--- | :--- |
| `Unknown component type: "X"` | Component "X" is not registered in `@forgeos/ui-kit`. | Use one of the 12 core primitives (`Container`, `Card`, `Grid`, etc.) or call `defaultRegistry.register()`. |
| `Route path must begin with "/"` | Route definition missing leading `/` (e.g. `'dashboard'`). | Prepend `/` to the path: `path: '/dashboard'`. |
| `Path traversal attempt detected` | Tool or file write attempted to access `../` outside workspace. | Sanitize file path so it resolves within `FORGEOS_WORKSPACE_ROOT`. |
| `SSRF guard: target destination is prohibited` | Target URL resolved to loopback, private RFC 1918 subnet, or cloud metadata. | Use an authorized, public `https://` target URL. |
| `Production deployment requires explicit user approval confirmation` | Attempted deploy to `targetEnvironment: 'production'` without approval flag. | Set `userApprovalConfirmed: true` after obtaining developer consent. |
| `Missing required credentials for Cloudflare / Vercel` | Deployment adapter called without valid provider token or project name. | Supply real environment variables or deploy to `local_preview`. |
| `Self-repair budget exhausted after 3 attempts` | Bounded repair reached maximum cycles without resolving schema/type error. | Inspect `checks.errors` in build logs, fix root component or route definition manually. |
| `File modified by user: preserving ...` | Developer modified generated source code on disk. | ForgeOS safely preserves the user's edits and outputs new generated code to `.forgeos-update` sidecar. Review diffs. |

---

## Log Inspection Procedure
1. Check the Studio **Execution Logs** tab or terminal output.
2. Filter by log level: `[ERROR]`, `[WARN]`, `[INFO]`.
3. Note the active `WorkflowState` when failure occurred (`ANALYSE_REQUIREMENTS`, `CREATE_PLAN`, `GENERATE_SPECIFICATION`, `RUN_CHECKS`, `BUILD`).

---

## Related References
- [Testing & Debugging](testing-and-debugging.md)
- [Security](security.md)
- [Builds and Deployment](builds-and-deployment.md)
