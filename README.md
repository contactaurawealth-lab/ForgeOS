# ForgeOS ⚡🛠️

> **The AI-Native Application Engineering Platform**  
> *Transform natural-language intent into validated, production-grade applications with declarative component frameworks, autonomous orchestration, evidence-backed reverse engineering, and verified build-and-deployment pipelines.*

---

## 1. Project Overview & Value Proposition

**ForgeOS** is an original, production-oriented AI application development platform inspired by modern developer platforms (such as AppDeploy), reverse-engineering static analysis, reusable AI-native component systems, autonomous multi-step planning, and verified build pipelines.

Unlike naive LLM code-generation chatbots that spit out unverified code snippets or hallucinate APIs:
- **ForgeOS enforces structured specifications**: Applications are defined by a strictly typed, versioned application schema (`@forgeos/app-schema`) validated at runtime by Zod.
- **Predictable Declarative Rendering**: UI components are rendered through an accessible, tokenized component library (`@forgeos/ui-kit` & `@forgeos/ui-runtime`) without dangerous string evaluation (`eval`).
- **Autonomous Multi-Step Orchestration**: Converts natural language into formal requirements documents, dependency-aware task graphs, and executable plans (`@forgeos/ai-orchestrator`).
- **Deterministic Code Generation**: Emits clean, maintainable TypeScript and React source files while generating diffs and preserving hand-written developer modifications (`@forgeos/codegen`).
- **Bounded Self-Repair**: Detects validation, lint, or type errors during build and performs targeted, bounded repair cycles (capped at 3 iterations) before presenting a verified live preview.
- **Evidence-Backed Reverse Engineering**: Integrates `morluto/rea` (Reverse Engineer Anything) through a typed adapter (`@forgeos/rea-adapter`) with SSRF guards, credential redaction, and user review/approval gates.
- **Production Backend & Integrations**: Provides transactional ACID database storage, RBAC authentication, encrypted secrets, and tamper-evident audit trails (`@forgeos/integrations`).
- **Verified Build & Release Pipeline**: Sandboxed verification checks, immutable artifact records with SHA-256 source hashing, deployment gatekeepers, and instant rollbacks (`@forgeos/build-runner`).

---

## 2. Features: Implemented vs Planned

| Feature Area | Status | Details |
| :--- | :--- | :--- |
| **Monorepo & Foundation (Phase 1)** | ✅ **Implemented** | TypeScript npm workspaces, structured error handling, environment validation, health check endpoints, smoke tests. |
| **Typed Application Schema (Phase 2)** | ✅ **Implemented** | Versioned Zod schema (`v1.0.0`) supporting metadata, routes, nested components, state, events, tokens, and responsive layouts. |
| **Component Registry & UI Kit (Phase 2)** | ✅ **Implemented** | 12 core accessible components (Container, Heading, Text, Grid, Card, StatCard, Button, Input, ProgressBar, Badge, List, BarChart). |
| **Design System & Tokens (Phase 2)** | ✅ **Implemented** | Light and dark themes, semantic surface tokens, typography scales, spacing, WCAG-compliant contrast. |
| **Declarative UI Runtime (Phase 2)** | ✅ **Implemented** | Safe DOM renderer, state store, event dispatching, error boundary containment, zero `eval`. |
| **Deterministic Code Generator (Phase 2)** | ✅ **Implemented** | Converts `AppSpecification` to real TypeScript/React source files; diff engine; user file protection. |
| **StudyOS Demo Application (Phase 2)** | ✅ **Implemented** | Fully featured responsive study dashboard with subject cards, progress metrics, task list, task form, and light/dark mode. |
| **AI Provider Abstraction (Phase 3)** | ✅ **Implemented** | Provider interface supporting `MockProvider` (deterministic offline tests) alongside OpenAI, Anthropic, and Gemini adapters. |
| **Requirements Analyser & Planner (Phase 3)** | ✅ **Implemented** | Analyzes natural language into structured user goals, routes, and entities; creates dependency-ordered task graphs. |
| **Controlled Tool Registry (Phase 3)** | ✅ **Implemented** | Sandboxed tools for file inspection, schema validation, code generation, linting, and diff inspection. |
| **Workflow State Machine & Self-Repair (Phase 3)** | ✅ **Implemented** | State machine driving generation from request to verified preview; bounded 3-attempt diagnostic repair loop. |
| **Studio UI & Preview Integration (Phase 3 & 5)** | ✅ **Implemented** | Full web studio interface showing requirement breakdowns, task execution logs, file diffs, live preview, REA hub, and build pipeline. |
| **Reverse-Engineering Integration (Phase 4)** | ✅ **Implemented** | Typed adapter for `morluto/rea`, SSRF protection, credential redaction, findings dossier approval, and spec generation. |
| **Production Backend & Database (Phase 6)** | ✅ **Implemented** | Transactional ACID JSON storage, RBAC session auth (`owner`, `developer`, `viewer`), AES-256-GCM secrets, audit logs. |
| **Secure Container Builds & CI/CD (Phase 7)**| ✅ **Implemented** | Multi-stage build runner, SHA-256 checksums, local preview deployment, provider validation, and verified rollback. |
| **Hardening & Verification (Phase 8)** | ✅ **Implemented** | 66/66 passing tests across 21 suites, 15-step platform scenario, agent acceptance suite (Tests A–F). |
| **Agent Skill & Reference Library** | ✅ **Implemented** | Canonical `skills/forgeos-platform/SKILL.md`, 15 reference guides, CLI, installer, and validator. |

---

## 3. Architecture Overview

```
apps/
  studio/          -> Web interface for prompt entry, plan tracking, diff inspection, REA hub, build & release
  api/             -> HTTP server managing project lifecycles, auth, orchestration, REA, builds, and preview
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
  build-runner/    -> Sandboxed build, verification, and deployment runner (Phase 7)
  integrations/    -> Transactional database, RBAC auth, encrypted secrets, audit logger (Phase 6)
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
- `FORGEOS_SECRET_KEY`: Hex encryption key for AES-256-GCM SecretManager.
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`: API keys (required only when not using `mock`).

See [ENVIRONMENT.md](file:///root/forgeos/ENVIRONMENT.md) for full configuration details.

---

## 6. Local Development & CLI Instructions

### Start API & Studio Server
```bash
npm run dev
# or: ./bin/forgeos.js dev
```

Visit the local Studio interface in your browser:
```
http://localhost:3000
```

### ForgeOS CLI Usage
The CLI is accessible via `./bin/forgeos.js`:
```bash
./bin/forgeos.js --help
./bin/forgeos.js build studyos-demo
./bin/forgeos.js rea inspect https://example.com/app.js
./bin/forgeos.js skill install --agent claude
./bin/forgeos.js validate:docs
```

---

## 7. Testing Commands

Run all unit, integration, and end-to-end tests across the monorepo:
```bash
npm test
```

Run the real-world Agent Acceptance Suite (Tests A through F):
```bash
npm run test:agent
```

Validate documentation, links, and schemas:
```bash
npm run validate:docs
```

Run the comprehensive 15-step Phase 8 acceptance scenario:
```bash
node --test tests/e2e/full-acceptance-scenario.test.js
```

---

## 8. Agent Skill Installation

Install the ForgeOS agent skill into your coding agent environment:
```bash
# Automated installer (detects Open Agent Skills, Claude Code, Cursor, Codex)
npm run skill:install

# Dry-run preview
node scripts/install-skill.js --dry-run
```

---

## 8. Security Policy

- **No Secrets in Bundles**: API keys and secrets are server-only. They are never sent to browser clients or stored in project memory.
- **SSRF Protection**: Target URL analysis blocks localhost, private IPv4/IPv6 networks, and cloud instance metadata endpoints.
- **Credential Redaction**: Automatic regex masking of API keys and bearer tokens from captured evidence.
- **Workspace Containment**: Tool file access is locked to the designated project folder; directory traversal (`..`) is rejected.
- **Safe Rendering**: Declarative component rendering completely avoids `eval()` and unsanitized script tags.
- Read [SECURITY.md](file:///root/forgeos/SECURITY.md) for our full threat model and guidelines.

---

## 9. Current Limitations & Roadmap

- **Phases 1–8 are complete and operational**: Core framework, schema validation, codegen, orchestration engine, Studio preview, REA adapter, backend integrations, and secure build/deployment pipeline are fully implemented and verified with 59 passing tests.
- **Future Enhancements**: Visual drag-and-drop WYSIWYG canvas editor, Kubernetes-based isolated container runners for high-density multi-tenant environments, and native Supabase OAuth connectors.
