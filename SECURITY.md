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

- Significant security-sensitive events (project creation, code generation, file writes, plan approval, self-repair attempts) produce structured JSON audit records.
- Vulnerability reports should be submitted to the security maintainers.
