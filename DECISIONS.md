# ForgeOS Architecture Decision Records (ADRs)

## ADR-001: Monorepo Organization with npm Workspaces
- **Status**: Accepted
- **Context**: ForgeOS requires tight cohesion between schema definitions, design tokens, UI runtime, code generation, and the orchestration engine, while keeping clean package boundaries.
- **Decision**: Adopt a monorepo structure with `npm workspaces`.
- **Alternatives Considered**:
  - *Multiple separate repositories*: Would introduce cross-repo versioning friction, slower CI cycles, and coordination overhead.
  - *pnpm workspaces*: While fast, pnpm is not pre-installed in all target environments (as observed during initialisation). `npm workspaces` works natively with Node.js v20.
- **Consequences**: Single source of truth, synchronized versioning, clear dependency rules, zero-install workspace linking.

---

## ADR-002: Typed, Versioned Declarative Schema (`@forgeos/app-schema`)
- **Status**: Accepted
- **Context**: Converting natural language directly into free-form React/Vue code string snippets leads to hallucinated dependencies, syntax errors, and untestable previews.
- **Decision**: Define a formal, versioned JSON/TypeScript application schema (`AppSpecification`) validated at runtime by Zod. The AI models target this schema first; the renderer and code generator consume the schema second.
- **Alternatives Considered**:
  - *Direct source code generation*: High error rates, difficult to validate programmatically before build, no safe live preview without full compilation.
  - *Proprietary AST formats*: Overly complex for rapid rendering and harder for LLMs to generate reliably.
- **Consequences**: Deterministic validation, instant visual preview without node/vite compilation in the browser, verifiable structure, schema evolution via versioning.

---

## ADR-003: Decoupled Adapter Architecture for REA (`packages/rea-adapter`)
- **Status**: Accepted
- **Context**: The audited upstream repository (`morluto/rea`) is a large multi-language reverse engineering platform requiring Node ^22.19.0, native C/Swift/Java bridges, and deep OS toolchains (Ghidra, Hopper, Frida).
- **Decision**: Do not vendor or directly depend on REA in ForgeOS core packages. Provide `packages/rea-adapter` which communicates with REA via standard MCP (Model Context Protocol) or CLI JSON-RPC boundaries.
- **Alternatives Considered**:
  - *Vendoring REA source into ForgeOS packages*: Would introduce massive dependencies, C++ compilation failures on unsupported environments, and engine mismatches.
- **Consequences**: Clean separation of concerns; ForgeOS remains lightweight, portable, and secure; REA can be executed in an isolated environment.

---

## ADR-004: Unified AI Provider Abstraction with Deterministic Mock Provider
- **Status**: Accepted
- **Context**: ForgeOS must function across multiple LLM providers (OpenAI, Anthropic, Gemini) and run reliable, deterministic automated tests without requiring live API keys or incurring API costs during CI.
- **Decision**: Implement `@forgeos/provider-adapters` with a common interface (`AIProvider`) and a built-in `MockProvider` alongside live provider implementations.
- **Alternatives Considered**:
  - *Direct SDK calls in orchestrator*: Hardcoded provider logic creates vendor lock-in and breaks offline testing.
- **Consequences**: Fast, 100% repeatable offline tests; clean provider switching via environment variables (`AI_PROVIDER=mock|openai|anthropic|gemini`).

---

## ADR-005: AST-Aware Deterministic Source Code Generator
- **Status**: Accepted
- **Context**: Converting `AppSpecification` to real disk files must produce clean, readable TypeScript/React code, support deterministic re-generation, and avoid clobbering user modifications.
- **Decision**: Implement `@forgeos/codegen` producing idiomatic React components, routes, types, and styles. Generate unified diffs before disk writes and record file hashes to detect user edits.
- **Alternatives Considered**:
  - *Template-only string interpolation*: Brittle, easily breaks indentation and imports.
- **Consequences**: Clean code output that can be inspected, edited, or committed into standard Git workflows.

---

## ADR-006: Bounded Self-Repair Loop
- **Status**: Accepted
- **Context**: AI generation may occasionally encounter validation, typing, or linting issues. The system needs to self-heal without entering infinite, costly retry loops.
- **Decision**: Implement a bounded repair mechanism capped at 3 attempts with structured error feedback (error code, message, failing lines).
- **Alternatives Considered**:
  - *Unbounded retry*: High risk of infinite loops and runaway API costs.
  - *No retry (fail immediately)*: Poor developer experience for trivial syntax or schema mismatches.
- **Consequences**: Resilient generation with guaranteed termination and transparent diagnostic reporting.

---

## ADR-007: Strict SSRF Protection and Credential Redaction in REA Adapter
- **Status**: Accepted
- **Context**: Allowing users to target external URLs or binaries for reverse-engineering creates potential Server-Side Request Forgery (SSRF) vulnerabilities targeting internal cloud metadata services, loopback interfaces, or local private networks, and can inadvertently capture credentials.
- **Decision**: Validate target URLs against a strict SSRF deny-list blocking loopback (`127.0.0.1`, `localhost`, `::1`), link-local (`169.254.0.0/16`), cloud metadata (`169.254.169.254`, `metadata.google.internal`), and RFC 1918 private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). Redact all API keys, bearer tokens, and secrets via regex sanitization before storing evidence.
- **Consequences**: Prevents internal network scanning and credential leakage in investigation dossiers.

---

## ADR-008: Zero-Eval Declarative Runtime & Sandboxed Iframe Isolation
- **Status**: Accepted
- **Context**: Previewing generated code in the developer's browser presents Cross-Site Scripting (XSS) risks if arbitrary strings or user inputs are evaluated via `eval()` or unconstrained DOM injection.
- **Decision**: The preview runtime (`@forgeos/ui-runtime`) renders only pre-registered, typed component trees using a safe DOM constructor with zero `eval` calls. The preview window is hosted inside an isolated `iframe` with explicit sandbox attributes and postMessage communication.
- **Consequences**: Complete containment of untrusted code, elimination of dynamic script execution vulnerabilities, and graceful component error containment using Error Boundaries.

---

## ADR-009: Transactional ACID JSON Persistence and AES-256-GCM Secret Storage
- **Status**: Accepted
- **Context**: ForgeOS requires local and production data persistence for projects, users, investigations, and credentials without enforcing a mandatory external database installation in lightweight environments.
- **Decision**: Implement `StructuredDatabase` providing ACID atomic filesystem writes, indexing, querying, and schema checks; pair with `SecretManager` utilizing authenticated AES-256-GCM encryption with safe secret masking in logs and UI.
- **Consequences**: Zero external database dependency for local workflows, atomic file updates preventing corruption, reversible encryption for secrets, and clear upgrade path to Postgres/Supabase.

---

## ADR-010: Immutable Build Verification with SHA-256 Checksums and Deployment Approval Gates
- **Status**: Accepted
- **Context**: Deploying AI-generated code directly to production without verification or user consent introduces stability and security risks. Additionally, deployment rollbacks must be deterministic.
- **Decision**: The `BuildRunner` performs multi-stage verification (static analysis, schema compliance, runtime smoke checks), computes deterministic SHA-256 source and artifact checksums, writes immutable build records in `dist/`, requires explicit human approval for production deployments, and enables atomic rollbacks to verified build records.
- **Consequences**: Tamper-evident build artifacts, guaranteed verification before release, human-in-the-loop production safety, and instant zero-downtime rollback capability.

