# ForgeOS Security Policy & Threat Model

## 1. Threat Model Assumptions

1. **Untrusted User Inputs**: Prompts submitted by users may contain adversarial instructions, prompt injections, or attempts to induce path traversal or arbitrary code execution.
2. **Untrusted AI Outputs**: Code, JSON specifications, and plans produced by LLMs cannot be trusted blindly. They must be validated against strict schemas and sanitized before storage or compilation.
3. **Multi-Tenant Isolation**: Generated code must not access or compromise the host environment, host environment variables, or other tenants' projects.

---

## 2. Secret Handling & Protection

- **Server-Side Only**: All API credentials (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, database credentials) are stored exclusively in server environment variables.
- **Client Zero-Exposure**: No secret keys are ever injected into client-side bundles, preview iframes, or generated application code.
- **Project Memory Isolation**: Project context and history stores never store API keys or user authentication tokens.
- **Log Redaction**: Structured logging utilities automatically mask sensitive patterns (`sk-.*`, `Bearer .*`, password fields) with `[REDACTED]`.

---

## 3. Sandbox Boundaries & Filesystem Security

- **Restricted Workspace Root**: Every project is allocated a dedicated workspace path. All filesystem tool actions (`readFile`, `writeFile`, `listDirectory`) verify that resolved paths reside strictly within the permitted workspace directory.
- **Path Traversal Prevention**: Any file path containing `..` or leading slashes that resolve outside the workspace root is rejected with a typed `PathTraversalError`.
- **No Dynamic Code Evaluation**: The UI preview runtime (`@forgeos/ui-runtime`) renders components through pre-defined, typed catalog mappings. Neither `eval()`, `Function()`, nor unescaped `innerHTML` is utilized.

---

## 4. Input Validation & Schema Enforcement

- Every public API endpoint, tool invocation, and AI output is validated using `Zod` schemas.
- Payloads exceeding maximum size limits or containing unexpected extra fields are rejected.
- Specifications must adhere to versioned schemas (`ForgeOS-Schema-v1.0.0`).

---

## 5. Rate Limiting & Resource Constraints

- **Execution Timeouts**: All agent planning and tool execution operations are bound by timeouts (default: 30 seconds for tool tasks; 120 seconds for end-to-end generation).
- **Bounded Self-Repair**: The self-repair engine is capped at a maximum of 3 repair iterations to eliminate infinite loops and resource exhaustion.
- **Usage Budgets**: The orchestrator tracks estimated tokens and tool invocation counts per request.

---

## 6. Audit Logging & Reporting

- Significant security-sensitive events (project creation, code generation, file writes, plan approval, self-repair attempts, builds, deployments, rollbacks) produce structured JSON audit records.
- Audit records include timestamp, actor, action, target entity, status, and client IP.

---

## 7. SSRF Protection & Reverse-Engineering Boundaries (Phase 4)

- **Target URL Validation**: The REA adapter rejects any investigation target attempting to reach loopback addresses (`127.0.0.1`, `localhost`, `::1`), link-local IPs (`169.254.0.0/16`), cloud instance metadata endpoints (`169.254.169.254`, `metadata.google.internal`), and RFC 1918 private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Protocol Restriction**: Only public `http://` and `https://` schemes are permitted. Internal schemes (`file://`, `gopher://`, `dict://`, etc.) are rejected immediately.
- **Evidence Sanitization**: Captured evidence undergoes automated regex redaction to strip authentication headers, API keys, and sensitive tokens prior to dossier creation.
- **Explicit Authorization**: Any investigation requires positive confirmation from the developer that they own or are authorized to inspect the target software.

---

## 8. Cryptographic Secret Storage & Role-Based Access Control (Phase 6)

- **Authenticated Encryption**: The `SecretManager` protects credentials using AES-256-GCM authenticated encryption with unique initialization vectors (IVs) and authentication tags.
- **Display Masking**: Secrets retrieved for display or logging are masked to prevent inadvertent exposure in terminal or web logs.
- **Role-Based Access Control (RBAC)**: Enforces three distinct permission tiers:
  - `owner`: Full privileges, including production deployment and secret modification.
  - `developer`: Allowed to create projects, run investigations, and execute builds.
  - `viewer`: Read-only access to projects and live previews.

---

## 9. Deployment Gates & Rollback Verification (Phase 7)

- **Approval Gate**: Production deployments strictly require explicit human approval; automated or unapproved releases are blocked.
- **Tamper-Evident Hashing**: Builds compute SHA-256 hashes of all source code files and emitted bundles (`forgeos-manifest.json` and build records).
- **Rollback Verification**: Rollbacks atomically restore previously verified build records, preventing partial states or rollout of defective builds.

