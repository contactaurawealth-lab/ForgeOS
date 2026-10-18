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

## 7. Storage & Persistence Strategy
- **Phase 1–3 (Local & Development)**:
  - Filesystem-backed storage (`.forgeos/projects/<id>/spec.json`).
  - In-memory event bus for orchestration state and plan execution.
- **Phase 6 (Production Backend)**:
  - PostgreSQL / Supabase for relational project metadata, user authentication, and multi-tenant persistence.
  - S3-compatible object storage for project builds and asset bundles.

## 8. Build Isolation & Security
- **Workspace Sandboxing**: All tool operations are restricted to `FORGEOS_WORKSPACE_ROOT`. Directory traversal attacks (`../`) are actively rejected.
- **Process Isolation**: External tools and compilers execute in child processes with strict timeouts and resource limits.
- **Secret Redaction**: Logging pipelines automatically sanitize tokens, keys, and authorization headers.
