# ForgeOS Technical Stack & Architecture Rationale

## 1. Runtime & Package Management
- **Node.js**: `v20.19.2 LTS`. Established, stable, and widely supported across CI/CD and deployment platforms.
- **Package Manager**: `npm workspaces` (npm `9.2.0`). Native to Node.js, eliminates external binary installation requirements and ensures fast, predictable dependency resolution across monorepo packages.
- **Language**: `TypeScript 5.x`. Strict type checking (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: false`) across all packages.

## 2. Monorepo Organization & Build System
- **Structure**: Multi-package monorepo separating `apps/` from reusable `packages/`.
- **Module Format**: ECMAScript Modules (`"type": "module"`), aligned with modern JavaScript standards and Node LTS.
- **Testing**: `Vitest` / Node.js test runner for fast, native TypeScript unit, integration, and property tests.

## 3. Schema & Data Contracts
- **Schema Validation**: `Zod 3.x`.
  - Runtime validation of all application definitions, AI provider responses, and tool arguments.
  - Generates static TypeScript types directly from schemas (`z.infer<typeof Schema>`).
  - Strict schema versioning with explicit migration paths (`v1.0.0` specification).

## 4. UI Framework & Component Architecture
- **Rendering Architecture**: React-compatible declarative UI runtime (`@forgeos/ui-runtime`).
  - No unsafe `eval()` or `new Function()`.
  - Safe AST/element mapping with React-like tree reconciliation.
  - Component registry with standard props, events, responsive breakpoints, and accessibility attributes.
- **Design Tokens**: Standard CSS Custom Properties (`@forgeos/design-system`) for light and dark themes, spacing, typography scales, and neutral surface palettes.
- **Web Applications**:
  - `apps/studio`: Single-Page Application (HTML/CSS/TS) for prompt submission, requirements inspection, plan execution tracking, and file preview.
  - `apps/api`: Fastify / Express-compatible HTTP API server for project persistence, AI orchestration, and health checks.
  - `apps/preview`: Isolated iframe host rendering the declarative UI runtime.

## 5. AI Provider Abstraction
- Unified model provider interface (`@forgeos/provider-adapters`):
  - `MockProvider`: High-speed, deterministic offline provider for unit tests, CI pipelines, and environments without API credentials.
  - `OpenAIProvider`: Support for GPT-4o / GPT-4o-mini with structured JSON outputs.
  - `AnthropicProvider`: Support for Claude 3.5 Sonnet with tool use.
  - `GeminiProvider`: Support for Gemini 1.5 / 2.0 with native structured schema validation.
- All providers normalize outputs into ForgeOS typed schemas (`RequirementsDocument`, `ExecutionPlan`, `AppSpecification`).

## 6. Code Generation Engine
- `@forgeos/codegen`:
  - Generates real, maintainable TypeScript / React code files (`App.tsx`, `components/*.tsx`, `types.ts`, `package.json`).
  - Generates unified diffs before writing changes.
  - Tracks file checksums to preserve user-authored modifications and prevent overwriting manual customizations.

## 7. Storage, Auth & Integrations Strategy
- **`@forgeos/integrations`**:
  - `StructuredDatabase`: Transactional ACID filesystem-backed JSON store with atomic writes, collection indexing, and safe querying without requiring external database processes.
  - `AuthService`: Session management with RBAC permission levels (`owner`, `developer`, `viewer`).
  - `SecretManager`: Cryptographic key-value store using authenticated AES-256-GCM encryption with safe secret display masking (`****...`).
  - `AuditLogger`: Tamper-evident structured audit trail capturing security-critical lifecycle operations.

## 8. Build, Release & Reverse-Engineering Architecture
- **`@forgeos/rea-adapter`**:
  - Strict SSRF protection denying loopback, private IPv4/IPv6, and cloud metadata access.
  - Automatic credential redaction for static/runtime evidence.
  - Provenance-aware feature dossiers mapping findings to `AppSpecification`.
- **`@forgeos/build-runner`**:
  - Multi-stage verification pipeline (static analysis, schema compliance, component validation, runtime smoke checks).
  - SHA-256 deterministic source and artifact checksum hashing.
  - Deployment gatekeepers requiring human approval for production.
  - Instant verified rollback mechanism.

