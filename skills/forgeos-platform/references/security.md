# ForgeOS Security Reference

## Purpose & Threat Model
This reference outlines the security principles, isolation boundaries, SSRF safeguards, credential redaction, and access controls governing ForgeOS.

---

## 1. Threat Model & Invariants

1. **Untrusted User Inputs**: Prompts and imported specifications are treated as untrusted data. They are parsed and validated with Zod before being accepted.
2. **Untrusted AI Outputs**: Code emitted by LLMs is never executed with dynamic `eval()`. The UI runtime is declarative and resolves pre-registered, safe components.
3. **Multi-Tenant Workspace Containment**: All file operations in `ToolRegistry` and `writeGeneratedProject` verify that resolved file paths reside strictly within the project's workspace directory. Any path containing `..` or leading absolute paths outside the workspace is rejected.

---

## 2. Server-Side Request Forgery (SSRF) Guard

In `@forgeos/rea-adapter`, `validateTargetUrl` inspects every analysis target before making network requests:

```javascript
import { validateTargetUrl } from '@forgeos/rea-adapter';

// Rejects loopback addresses (127.0.0.1, localhost, ::1)
// Rejects link-local addresses (169.254.0.0/16)
// Rejects cloud metadata services (169.254.169.254, metadata.google.internal)
// Rejects RFC 1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
// Rejects non-HTTP schemes (file://, ftp://, gopher://)

validateTargetUrl('https://example.com/app.js'); // Passes
validateTargetUrl('http://169.254.169.254/latest/meta-data/'); // Throws SSRF Error
```

---

## 3. Credential Redaction & Sanitization

Static and runtime evidence captured by the REA adapter or logging utilities passes through `redactSensitiveData`:
- `sk-[a-zA-Z0-9_-]{20,}` ➔ `[REDACTED_API_KEY]`
- `Bearer [^"'\s]+` ➔ `Bearer [REDACTED_TOKEN]`
- Password, authorization, secret, and token object fields are masked.

---

## 4. Role-Based Access Control (RBAC)

ForgeOS enforces three role tiers in `AuthService`:
- `owner`: Can create projects, edit specs, run investigations, execute builds, deploy to production, and manage secrets.
- `developer`: Can create projects, edit specs, run investigations, and execute builds. Cannot deploy to production.
- `viewer`: Read-only access to projects and live previews.

---

## 5. Sandboxed Preview Execution

The preview runtime is rendered inside an `iframe` with explicit sandbox attributes:
```html
<iframe src="/preview/:id" sandbox="allow-scripts allow-forms" />
```
- No access to top-window cookies or storage.
- Communication with the host studio takes place solely via structured `postMessage` events.

---

## Related References
- [Reverse Engineering](reverse-engineering.md)
- [Backend & Integrations](backend-and-integrations.md)
- [Builds and Deployment](builds-and-deployment.md)
