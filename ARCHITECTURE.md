# ForgeOS Architecture

**System:** ForgeOS  
**Category:** AI-Native Application Engineering Platform  
**Status:** In Active Development (Phases 1, 2, 3 Implemented; Phases 4–8 Planned)  

---

## 1. Architectural Vision

ForgeOS is an end-to-end AI-native application development platform inspired by AppDeploy's developer experience, reverse-engineering inspection tools, reusable component frameworks, autonomous development workflows, and secure build-and-deployment pipelines.

Unlike shallow chatbots that merely return isolated code snippets, ForgeOS is a structured software engineering system. It operates on a formal, versioned, typed application specification (`@forgeos/app-schema`), coordinates multi-step agentic workflows with bounded self-repair (`@forgeos/ai-orchestrator`), renders live previews declaratively (`@forgeos/ui-runtime`), and deterministically generates maintainable, production-ready source code (`@forgeos/codegen`).

---

## 2. Monorepo Organization & Packages

ForgeOS is organized as a clean TypeScript monorepo using npm workspaces:

```
forgeos/
├── apps/
│   ├── studio/             # Developer IDE, visual builder, requirements & plan reviewer
│   ├── api/                # Core backend server, orchestration runner, health checks
│   └── preview/            # Isolated sandboxed application preview host
├── packages/
│   ├── app-schema/         # Versioned typed Zod schemas for application specifications
│   ├── design-system/      # Design tokens (colors, typography, spacing, radii, light/dark)
│   ├── ui-kit/             # Typed component catalog and accessible UI primitives
│   ├── ui-runtime/         # Declarative schema-to-DOM renderer and event coordinator
│   ├── codegen/            # Deterministic TypeScript/React source code generator & diff engine
│   ├── ai-orchestrator/    # Requirements analyzer, planning engine, tool execution, bounded repair
│   ├── provider-adapters/  # Pluggable LLM adapters (Mock, OpenAI, Anthropic, Gemini)
│   ├── rea-adapter/        # Typed adapter interface for Reverse Engineer Anything (Phase 4)
│   ├── build-runner/       # Build, test, and typecheck execution sandbox (Phase 7)
│   ├── integrations/       # Database, auth, and external service connectors (Phase 6)
│   └── testing/            # Shared test utilities, mocks, and assertion helpers
├── research/
│   └── upstream/           # Upstream candidate clones (audited, isolated from runtime)
├── AGENTS.md
├── ARCHITECTURE.md
├── DECISIONS.md
├── ENVIRONMENT.md
├── IMPLEMENTATION_PLAN.md
├── PROGRESS.md
├── README.md
├── REPOSITORY_AUDIT.md
├── SECURITY.md
└── TECH_STACK.md
```

---

## 3. Dependency Direction & Boundaries

To preserve architectural integrity, package dependencies flow strictly unidirectionally:

```mermaid
flowchart TD
    Apps["apps/ (studio, api, preview)"] --> Orchestrator["packages/ai-orchestrator"]
    Apps --> Runtime["packages/ui-runtime"]
    Orchestrator --> Provider["packages/provider-adapters"]
    Orchestrator --> Codegen["packages/codegen"]
    Orchestrator --> Schema["packages/app-schema"]
    Orchestrator --> REA["packages/rea-adapter"]
    Codegen --> Schema
    Runtime --> UIKit["packages/ui-kit"]
    Runtime --> Schema
    UIKit --> DesignSystem["packages/design-system"]
    UIKit --> Schema
```

### Dependency Rules:
1. `packages/app-schema` is the leaf data contract and has no internal dependencies.
2. `packages/design-system` has no internal dependencies.
3. `packages/ui-kit` depends only on `design-system` and `app-schema`.
4. `packages/ui-runtime` depends on `app-schema` and `ui-kit`.
5. `packages/codegen` depends on `app-schema`. It has no UI or DOM dependencies.
6. `packages/ai-orchestrator` orchestrates planning, tools, and code generation. It communicates via typed schemas.
7. `apps/*` depend on packages, but packages never depend on apps.

---

## 4. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / User
    participant Studio as apps/studio
    participant API as apps/api
    participant Orch as ai-orchestrator
    participant LLM as provider-adapters
    participant Schema as app-schema
    participant Codegen as codegen
    participant Runtime as ui-runtime
    participant Preview as apps/preview

    User->>Studio: Enter Natural Language Prompt
    Studio->>API: POST /api/projects/:id/generate
    API->>Orch: Start Generation Workflow
    Orch->>LLM: Requirements Analysis
    LLM-->>Orch: Structured Requirements (Routes, Entities, Components)
    Orch->>LLM: Create Execution Plan
    LLM-->>Orch: Dependency-Aware Plan
    Orch->>Schema: Validate Schema Spec
    Schema-->>Orch: Validated AppSpecification
    Orch->>Codegen: Generate Source Files
    Codegen-->>Orch: Generated Files & Diffs
    Orch->>Orch: Run Verification (Schema, Types, Lints)
    alt Verification Failure
        Orch->>Orch: Bounded Self-Repair (Max 3 attempts)
    end
    Orch-->>API: Verified Application Artifacts
    API-->>Studio: Stream Progress & Final Plan
    Studio->>Preview: Load Application Specification
    Preview->>Runtime: Render App via UI Runtime
    Runtime-->>User: Interactive Live Application Preview
```

---

## 5. Trust Boundaries & Security Model

1. **Client / Browser Boundary**:
   - The Studio and Preview run in browser contexts.
   - Private LLM keys, database credentials, and server secrets are never transmitted to or executed in client bundles.
2. **AI Provider Boundary**:
   - External LLM providers receive prompt context and output JSON/text.
   - Responses are strictly validated by Zod schemas before being accepted.
   - Raw model responses are never evaluated via `eval()` or unconstrained shell execution.
3. **Generated Code Execution Sandbox**:
   - Live preview rendering operates via a declarative runtime (`packages/ui-runtime`) that resolves pre-registered, safe components.
   - No dynamic `eval` or untrusted script injection is permitted in the preview environment.
4. **Filesystem Boundary**:
   - File creation and edits by code generators and tools are strictly confined to the project root (`FORGEOS_WORKSPACE_ROOT`). Path traversal (`../`) is blocked by path sanitizers.

---

## 6. Reverse-Engineering Integration Strategy (Phase 4)

In Phase 4, ForgeOS connects to reverse-engineering capabilities (`morluto/rea`) via `packages/rea-adapter`:
- The adapter communicates with REA over the Model Context Protocol (MCP) or JSON-RPC CLI sub-processes.
- Reverse-engineered facts (extracted routes, UI component hierarchies, API endpoints, and schemas) are translated into ForgeOS `AppSpecification` format.
- The developer can inspect, edit, and approve extracted specifications before source code generation.
