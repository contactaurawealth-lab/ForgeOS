# ForgeOS ⚡🛠️

> **The AI-Native Application Engineering Platform**  
> *Transform natural-language intent into validated, production-grade applications with declarative component frameworks, autonomous orchestration, and bounded self-repair.*

---

## 1. Project Overview & Value Proposition

**ForgeOS** is an original, production-oriented AI application development platform inspired by modern developer platforms (such as AppDeploy), reverse-engineering static analysis, reusable AI-native component systems, autonomous multi-step planning, and verified build pipelines.

Unlike naive LLM code-generation chatbots that spit out unverified code snippets or hallucinate APIs:
- **ForgeOS enforces structured specifications**: Applications are defined by a strictly typed, versioned application schema (`@forgeos/app-schema`) validated at runtime by Zod.
- **Predictable Declarative Rendering**: UI components are rendered through an accessible, tokenized component library (`@forgeos/ui-kit` & `@forgeos/ui-runtime`) without dangerous string evaluation (`eval`).
- **Autonomous Multi-Step Orchestration**: Converts natural language into formal requirements documents, dependency-aware task graphs, and executable plans (`@forgeos/ai-orchestrator`).
- **Deterministic Code Generation**: Emits clean, maintainable TypeScript and React source files while generating diffs and preserving hand-written developer modifications (`@forgeos/codegen`).
- **Bounded Self-Repair**: Detects validation, lint, or type errors during build and performs targeted, bounded repair cycles (capped at 3 iterations) before presenting a verified live preview.

---

## 2. Features: Implemented vs Planned

| Feature Area | Status | Details |
| :--- | :--- | :--- |
| **Monorepo & Foundation (Phase 1)** | ✅ **Implemented** | TypeScript npm workspaces, structured error handling, environment validation, health check endpoints, smoke tests. |
| **Typed Application Schema (Phase 2)** | ✅ **Implemented** | Versioned Zod schema (`v1.0.0`) supporting metadata, routes, nested components, state, events, tokens, and responsive layouts. |
| **Component Registry & UI Kit (Phase 2)** | ✅ **Implemented** | 11+ core accessible components (containers, grids, navbars, forms, cards, stats, tabs, dialogs, tables, progress, charts). |
| **Design System & Tokens (Phase 2)** | ✅ **Implemented** | Light and dark themes, semantic surface tokens, typography scales, spacing, WCAG-compliant contrast. |
| **Declarative UI Runtime (Phase 2)** | ✅ **Implemented** | Safe DOM renderer, state store, event dispatching, error boundary containment, zero `eval`. |
| **Deterministic Code Generator (Phase 2)** | ✅ **Implemented** | Converts `AppSpecification` to real TypeScript/React source files; diff engine; user file protection. |
| **StudyOS Demo Application (Phase 2)** | ✅ **Implemented** | Fully featured responsive study dashboard with subject cards, progress metrics, task list, task form, and light/dark mode. |
| **AI Provider Abstraction (Phase 3)** | ✅ **Implemented** | Provider interface supporting `MockProvider` (deterministic offline tests) alongside OpenAI, Anthropic, and Gemini adapters. |
| **Requirements Analyser & Planner (Phase 3)** | ✅ **Implemented** | Analyzes natural language into structured user goals, routes, and entities; creates dependency-ordered task graphs. |
| **Controlled Tool Registry (Phase 3)** | ✅ **Implemented** | Sandboxed tools for file inspection, schema validation, code generation, linting, and diff inspection. |
| **Workflow State Machine & Self-Repair (Phase 3)** | ✅ **Implemented** | State machine driving generation from request to verified preview; bounded 3-attempt diagnostic repair loop. |
| **Studio UI & Preview Integration (Phase 3)** | ✅ **Implemented** | Interactive web studio interface showing requirement breakdowns, task execution logs, file diffs, and live application preview. |
| **Reverse-Engineering Integration (Phase 4)** | 📋 *Planned* | Adapter interface to `morluto/rea` (MCP & CLI) to extract application structures from existing bundles. |
| **Visual Builder Canvas (Phase 5)** | 📋 *Planned* | Drag-and-drop component positioning and bi-directional schema synchronization. |
| **Production Backend & Database (Phase 6)** | 📋 *Planned* | PostgreSQL / Supabase migrations, authentication, storage, and external API connectors. |
| **Secure Container Builds & CI/CD (Phase 7)**| 📋 *Planned* | Containerized build runners, release versioning, one-click hosting deployment, and rollback. |
| **Hardening & Verification (Phase 8)** | 📋 *Planned* | Comprehensive penetration testing, WCAG 2.1 AA accessibility compliance audit, stress testing. |

---

## 3. Architecture Overview

```
apps/
  studio/          -> Web interface for prompt entry, plan tracking, diff inspection, preview
  api/             -> HTTP server managing project lifecycles, orchestration, and health checks
  preview/         -> Sandboxed iframe runtime rendering declarative component trees
packages/
  app-schema/      -> Versioned Zod schemas and static TypeScript contracts
  design-system/   -> Design tokens, palettes (light/dark), typography, layout metrics
  ui-kit/          -> Accessible UI component catalog with typed property definitions
  ui-runtime/      -> Safe declarative element renderer, state engine, error boundaries
  codegen/         -> Deterministic source-code emitter, diff calculator, conflict resolver
  ai-orchestrator/ -> Multi-agent planner, requirements analyzer, tool sandbox, self-repair
  provider-adapters/-> Pluggable LLM interfaces (Mock, OpenAI, Anthropic, Gemini)
  rea-adapter/     -> Typed interface for Reverse Engineer Anything integration (Phase 4)
  build-runner/    -> Sandboxed build and test execution runner (Phase 7)
  integrations/    -> Database and auth service connectors (Phase 6)
  testing/         -> Shared testing fixtures, assertion helpers, and mocks
```

---

## 4. Prerequisites & Installation

### Prerequisites
- **Node.js**: `>= 20.19.0 LTS`
- **npm**: `>= 9.2.0`
- **Git**: `>= 2.30.0`
- **Python**: `>= 3.10` (for optional build scripts)

### Installation
Clone the repository and install workspace dependencies:

```bash
cd /root/forgeos
npm install
```

---

## 5. Configuration & Environment Variables

Copy the sample environment template:
```bash
cp .env.example .env
```

Key environment variables:
- `AI_PROVIDER`: `mock` (default for offline deterministic testing), `openai`, `anthropic`, or `gemini`.
- `PORT`: Server port (default: `3000`).
- `FORGEOS_WORKSPACE_ROOT`: Directory for generated projects (default: `./projects`).
- `FORGEOS_MAX_REPAIR_ATTEMPTS`: Maximum self-repair loops (default: `3`).
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`: API keys (required only when not using `mock`).

See [ENVIRONMENT.md](file:///root/forgeos/ENVIRONMENT.md) for full configuration details.

---

## 6. Local Development Instructions

Start the ForgeOS API server and Studio:
```bash
npm run dev
```

Visit the local Studio interface in your browser:
```
http://localhost:3000
```

---

## 7. Testing Commands

Run all unit, integration, and end-to-end tests across the monorepo:
```bash
npm test
```

Run type-checking across all packages:
```bash
npm run typecheck
```

Run schema validation tests:
```bash
npm run test:schema
```

Run the end-to-end StudyOS demo generation test:
```bash
npm run test:e2e
```

---

## 8. Security Policy

- **No Secrets in Bundles**: API keys and secrets are server-only. They are never sent to browser clients or stored in project memory.
- **Workspace Containment**: Tool file access is locked to the designated project folder; directory traversal (`..`) is rejected.
- **Safe Rendering**: Declarative component rendering completely avoids `eval()` and unsanitized script tags.
- Read [SECURITY.md](file:///root/forgeos/SECURITY.md) for our full threat model and guidelines.

---

## 9. Current Limitations & Roadmap

- **Phases 1, 2, and 3 are implemented**: Core framework, schema validation, codegen, orchestration engine, and Studio preview are operational.
- **Phases 4–8 are planned**: Reverse-engineering integration (REA adapter), visual canvas editor, cloud deployment pipelines, and Supabase database integrations are scheduled for subsequent phases.
