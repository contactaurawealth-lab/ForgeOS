---
name: forgeos-platform
description: Comprehensive agent skill for building, modifying, inspecting, and deploying AI-native applications on ForgeOS using declarative schemas, multi-agent orchestration, REA reverse engineering, and verified pipelines.
---

# ForgeOS Platform Agent Skill

This skill teaches coding agents how to build, modify, inspect, test, and deploy applications using **ForgeOS**, an AI-native application engineering platform.

---

## 1. Identity & Activation

### What ForgeOS Does
ForgeOS converts user intent and authorized reverse-engineered software into production-grade applications. It replaces unverified code generation with:
- **Typed Application Specifications**: Versioned Zod schemas (`v1.0.0`) in `@forgeos/app-schema`.
- **Accessible Component Framework**: 12 registered UI primitives with zero dynamic `eval()` rendering.
- **Autonomous Multi-Agent Orchestration**: Requirements analysis, DAG planning, and bounded self-repair (capped at 3 cycles).
- **Evidence-Backed Reverse Engineering**: REA integration with SSRF guards and user review gates.
- **Enterprise Integrations**: Transactional ACID JSON storage, RBAC auth, and AES-256-GCM secrets.
- **Verified Build & Deployment**: Deterministic SHA-256 checksums, production approval gates, and verified rollback.

### When to Activate This Skill
Activate this skill whenever:
- Creating, generating, or modifying a ForgeOS application.
- Analyzing authorized software or web assets via REA.
- Designing or registering declarative components.
- Inspecting or fixing build, schema, or runtime errors.
- Running verified builds, previews, or deployment rollbacks.

### Project Detection
A project is a ForgeOS project if any of the following exist:
- `forgeos-manifest.json` in the project root.
- A specification file adhering to `@forgeos/app-schema` (`CURRENT_SCHEMA_VERSION = '1.0.0'`).
- A dependency on `@forgeos/*` packages in `package.json`.
- The ForgeOS monorepo structure (`packages/*`, `apps/api`, `apps/studio`).

Detailed onboarding: [Getting Started Reference](references/getting-started.md).

---

## 2. Capability Discovery

Before modifying code or invoking tools, the agent **MUST** discover actual environment capabilities:

1. **Check ForgeOS Version**: Read `package.json` and `skills/forgeos-platform/manifest.json`.
2. **Inspect Workspace**: Inspect existing files to preserve hand-authored modifications.
3. **Verify Provider Configuration**: Inspect `process.env.AI_PROVIDER`. Fall back to `MockProvider` if no live API keys are provided.
4. **Discover Component Registry**: Query `defaultRegistry.list()` from `@forgeos/ui-kit` rather than guessing component names.
5. **Classify Requested Capability**:
   - `AVAILABLE`: Core monorepo packages, schema validation, codegen, orchestrator, REA adapter, studio, database, auth, build runner.
   - `AVAILABLE_WITH_CONFIGURATION`: OpenAI live provider (`OPENAI_API_KEY`), Cloudflare/Vercel deployments.
   - `PARTIAL`: Native REA C/Swift binary tools (decoupled via adapter).
   - `PLANNED`: Drag-and-drop WYSIWYG canvas, Supabase cloud sync.
   - `UNSUPPORTED`: Dynamic string `eval()`, unrestricted SSRF requests.

Full discovery protocol: [Capability Discovery Reference](references/capability-discovery.md).

---

## 3. Canonical Application-Development Workflow

The complete end-to-end engineering workflow follows 10 verified steps:

```
User Request
  ▼
[1. Requirements Analysis] ➔ RequirementsDocument (Goal, Features, Components)
  ▼
[2. Execution Planning]    ➔ ExecutionPlan (DAG Tasks, Dependencies)
  ▼
[3. Schema Validation]     ➔ AppSpecification v1.0.0 (Validated via Zod)
  ▼
[4. Component Selection]   ➔ 12 Accessible UI Kit Primitives
  ▼
[5. Code Generation]       ➔ TypeScript/React Files & Diffs (Preserves User Edits)
  ▼
[6. Integrity Checks]      ➔ Schema, Types, Smoke Checks (Bounded Repair if defect)
  ▼
[7. Verified Live Preview] ➔ Safe HTML Rendering (Desktop / Tablet / Mobile Viewports)
  ▼
[8. Production Build]      ➔ Immutable Dist Artifacts & SHA-256 Checksums
  ▼
[9. Approved Deployment]   ➔ Local Preview / Cloud (Requires Human Approval Gate)
  ▼
[10. Verification/Rollback]➔ Audit Log Recorded & Instant Rollback Ready
```

Workflow guide: [Architecture Reference](references/architecture.md).

---

## 4. Application Framework

### Application Specification (`@forgeos/app-schema`)
Applications are defined by `AppSpecificationSchema`:
- `schemaVersion`: Must match `1.0.0`.
- `metadata`: `id`, `name`, `title`, `description`, `version`, `author`, `tags`.
- `theme`: `mode` (`light` | `dark`), `primaryColor`, `accentColor`, `neutralColor`, `borderRadius`, `fontFamily`.
- `routes`: Array of route definitions (`id`, `path`, `title`, `layout`, `rootComponent`).
- `state`: Global state keys with typed initial values.
- `actions`: Declarative event actions (`set_state`, `toggle_state`, `append_list`, `submit_form`).
- `dataSources`: Data collections with local/memory persistence.

Schema rules: [Application Schema Reference](references/application-schema.md).

### Component Registry (`@forgeos/ui-kit`)
ForgeOS provides 12 built-in accessible components:
`Container`, `Heading`, `Text`, `Grid`, `Card`, `StatCard`, `Button`, `Input`, `ProgressBar`, `Badge`, `List`, `BarChart`.

Custom components can be registered using `defaultRegistry.register({ type, propSchema, defaultProps, render })`.

Component catalog: [Components Reference](references/components.md).

### Deterministic Code Generation (`@forgeos/codegen`)
The codegen engine converts `AppSpecification` to real disk files (`src/App.tsx`, `src/types.ts`, `package.json`, `forgeos-manifest.json`).
It calculates SHA-256 hashes of files before writing to preserve user-edited sidecars.

Codegen details: [Code Generation Reference](references/code-generation.md).

---

## 5. AI Orchestration & Self-Repair

The `@forgeos/ai-orchestrator` manages multi-agent workflows using `AIOrchestrator`:
- **Requirements Analysis**: Maps free-form text to `RequirementsDocument`.
- **Planning Engine**: Generates topological DAG tasks with dependency resolution.
- **Sandboxed Tool Registry**: Restricts tool execution to `FORGEOS_WORKSPACE_ROOT` with path-traversal prevention.
- **Bounded Self-Repair**: Detects validation or component errors and passes structured error logs to the repair agent. Strictly capped at 3 cycles (`FORGEOS_MAX_REPAIR_ATTEMPTS`).
- **Provider Adapters**: Uses `MockProvider` for deterministic offline testing and `OpenAIProvider` for live generation.

Orchestration details: [AI Orchestration Reference](references/ai-orchestration.md).

---

## 6. Reverse-Engineering Workflow

ForgeOS integrates `morluto/rea` via `@forgeos/rea-adapter`:
1. **Target Verification**: User supplies software they own or are authorized to inspect.
2. **SSRF Guard**: Target URLs are validated against `validateTargetUrl()`, rejecting private subnets, loopback, and cloud metadata.
3. **Credential Redaction**: `redactSensitiveData()` strips API keys and bearer tokens from captures.
4. **Evidence Dossier**: Captured facts are classified into observations and hypotheses with confidence scores.
5. **Approval Gate**: User reviews findings and marks them approved.
6. **Spec Conversion**: Approved findings are converted into a valid `AppSpecification`.

REA integration guide: [Reverse Engineering Reference](references/reverse-engineering.md).

---

## 7. Studio & Live Preview

The developer studio (`apps/studio/index.html`) operates over HTTP API (`apps/api`):
- **Live Preview Tab**: Interactive preview rendered in an isolated sandbox iframe (`/preview/:id`). Toggles viewports (Desktop 1200px, Tablet 768px, Mobile 375px) and light/dark theme.
- **Requirements & Plan Tab**: Real-time DAG task progress tracking.
- **Source Explorer Tab**: File tree viewer with line-by-line unified diff calculation.
- **Reverse-Engineering Hub Tab**: Investigation creator, dossier reviewer, and converter.
- **Build & Release Tab**: Build runner trigger, artifact inspector, and deployment gatekeeper.

Studio guide: [Studio and Preview Reference](references/studio-and-preview.md).

---

## 8. Backend & Integrations

The platform backend is implemented in `@forgeos/integrations`:
- **`StructuredDatabase`**: Filesystem-backed transactional ACID JSON store with atomic file writes and indexed queries.
- **`AuthService`**: Session token management with 3 RBAC tiers:
  - `owner`: Full privileges, including production deployment.
  - `developer`: Project creation, builds, and investigations.
  - `viewer`: Read-only preview access.
- **`SecretManager`**: Authenticated AES-256-GCM encryption with masked display (`****...`).
- **`AuditLogger`**: Tamper-evident structured event logging.

Integrations guide: [Backend & Integrations Reference](references/backend-and-integrations.md).

---

## 9. Build & Deployment Pipeline

Implemented in `@forgeos/build-runner`:
- **`BuildRunner`**: Executes schema validation, component verification, static analysis, smoke tests, and production bundling in `dist/`. Generates immutable build records with SHA-256 source checksums.
- **`DeploymentManager`**: Manages releases across adapters:
  - `LocalPreviewDeploymentAdapter`: Local isolated preview URL serving.
  - `CloudflarePagesDeploymentAdapter` & `VercelDeploymentAdapter`: Validates external provider credentials without inventing success responses.
- **Production Approval Gate**: Releases to `production` strictly require `userApprovalConfirmed: true`.
- **Verified Rollback**: Restores previous build records atomically.

Pipeline guide: [Builds and Deployment Reference](references/builds-and-deployment.md).

---

## 10. Testing, Debugging & Self-Repair

### Error Classification & Diagnosis
When an error occurs, inspect logs and isolate the responsible layer:
1. `SchemaError`: Incompatible property or invalid route path ➔ run `safeValidateAppSpecification()`.
2. `ComponentError`: Unknown UI primitive ➔ check `defaultRegistry.has(type)`.
3. `SecurityError`: Path traversal (`../`) or SSRF address ➔ sanitize target.
4. `BuildError`: Defective bundle or missing dependency ➔ trigger bounded repair.

### Configurable Repair Budget
Do not enter infinite retry loops. Use a maximum of 3 repair iterations. If errors persist, halt and report the exact failure context.

Testing guide: [Testing and Debugging Reference](references/testing-and-debugging.md).

---

## 11. Security & Permissions

1. **Workspace Boundaries**: Never access files outside `FORGEOS_WORKSPACE_ROOT`. Reject path traversal.
2. **Untrusted Code**: Never use `eval()` or unescaped `innerHTML`. All UI components must resolve via `@forgeos/ui-kit`.
3. **SSRF Guard**: Target URLs for REA investigations must never resolve to loopback, link-local, cloud metadata, or private RFC 1918 subnets.
4. **Credential Isolation**: Provider API keys and database credentials remain server-side. Never commit secrets to git or emit them to browser clients.
5. **Production Approval Gate**: Never perform destructive operations or production deployments without explicit user confirmation.

Security policy: [Security Reference](references/security.md).

---

## 12. Completion Reporting

When completing an engineering task, provide a truthful report with:
- **Changes Made**: Specific components, schemas, or files modified.
- **Files Affected**: Exact paths of all created, updated, or preserved files.
- **Verification Performed**: Commands run (`npm test`, `node --test ...`) and exact exit codes.
- **Preview & Deployment Status**: URL of live preview or build record ID.
- **Required Configuration**: Environment variables or credentials needed for next steps.
- **Known Limitations**: Clear boundary of implemented vs planned capabilities.
