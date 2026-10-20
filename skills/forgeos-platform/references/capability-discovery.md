# ForgeOS Capability Discovery Reference

## Purpose & Scope
This reference defines how coding agents must discover the installed capabilities, packages, runtime versions, and configuration boundaries of a ForgeOS installation before initiating work.

---

## The 7-Step Discovery Protocol

Before performing code changes, generation, or tool calls, execute this discovery checklist:

1. **Detect Project Identity**:
   Verify whether the target directory contains `forgeos-manifest.json` or `@forgeos/app-schema`.
2. **Inspect Monorepo Packages**:
   Verify linked packages in `node_modules/@forgeos/*`:
   - `@forgeos/app-schema`
   - `@forgeos/design-system`
   - `@forgeos/ui-kit`
   - `@forgeos/ui-runtime`
   - `@forgeos/codegen`
   - `@forgeos/provider-adapters`
   - `@forgeos/ai-orchestrator`
   - `@forgeos/rea-adapter`
   - `@forgeos/integrations`
   - `@forgeos/build-runner`
3. **Discover Available UI Components**:
   Import `defaultRegistry` from `@forgeos/ui-kit` and query `defaultRegistry.list()`. Do not assume components that are not registered.
4. **Discover AI Provider Mode**:
   Check `process.env.AI_PROVIDER`.
   - `mock`: Default offline mode, zero external API costs, 100% deterministic outputs.
   - `openai`: Requires `OPENAI_API_KEY`.
5. **Discover REA Capabilities**:
   Call `ReaAdapter.discoverCapabilities()` to verify supported analysis engines.
6. **Discover Persistence Engine**:
   Verify `StructuredDatabase` path. Default is `.forgeos-db.json` inside the workspace root.
7. **Read the Applicable Reference**:
   Never guess API signatures. Consult the relevant markdown reference in `skills/forgeos-platform/references/`.

---

## Capability Status Classification Matrix

| Capability | Status | Notes |
| :--- | :--- | :--- |
| **Monorepo Foundation** | `AVAILABLE` | TypeScript workspaces, health check, logging |
| **Application Schema v1.0.0** | `AVAILABLE` | Zod validation & migration |
| **UI Kit (12 Primitives)** | `AVAILABLE` | Fully registered & accessible |
| **Zero-Eval UI Runtime** | `AVAILABLE` | Safe DOM rendering with Error Boundaries |
| **Deterministic Codegen** | `AVAILABLE` | Sidecar diffing & user preservation |
| **AI Orchestration & DAG** | `AVAILABLE` | Multi-step state machine |
| **Bounded Self-Repair** | `AVAILABLE` | Capped at 3 cycles (`FORGEOS_MAX_REPAIR_ATTEMPTS`) |
| **Mock LLM Provider** | `AVAILABLE` | Offline deterministic testing |
| **Live OpenAI Provider** | `AVAILABLE_WITH_CONFIGURATION` | Requires `OPENAI_API_KEY` |
| **REA Investigation Adapter**| `AVAILABLE` | SSRF guards, redaction, dossier, approval |
| **REA Native Binary C/Swift**| `PARTIAL` | Host runs Node 20.19; REA core decoupled via adapter |
| **Studio Web IDE** | `AVAILABLE` | Full tabbed UI and live preview |
| **Sandboxed Preview Host** | `AVAILABLE` | Iframe `/preview/:id` with postMessage |
| **ACID JSON Database** | `AVAILABLE` | Transactional filesystem writes |
| **RBAC Authentication** | `AVAILABLE` | 3 roles: `owner`, `developer`, `viewer` |
| **SecretManager** | `AVAILABLE` | Authenticated AES-256-GCM encryption |
| **BuildRunner** | `AVAILABLE` | Multi-stage verification & SHA-256 hashing |
| **Local Preview Deployment**| `AVAILABLE` | Local preview serving |
| **Cloudflare / Vercel Deploy**| `AVAILABLE_WITH_CONFIGURATION` | Validates credentials, requires active tokens |
| **Verified Rollback** | `AVAILABLE` | Restores previous build records |
| **Visual WYSIWYG Canvas** | `PLANNED` | Scheduled for future release |
| **Dynamic String `eval`** | `UNSUPPORTED` | Strictly prohibited for security |

---

## Programmatic Discovery Example

```javascript
import { defaultRegistry } from '@forgeos/ui-kit';
import { CURRENT_SCHEMA_VERSION } from '@forgeos/app-schema';
import { ReaAdapter } from '@forgeos/rea-adapter';

// 1. Check supported schema version
console.log('Supported Schema Version:', CURRENT_SCHEMA_VERSION); // '1.0.0'

// 2. Discover registered UI components
console.log('Registered Components:', defaultRegistry.list());
// ['Container', 'Heading', 'Text', 'Grid', 'Card', 'StatCard', 'Button', 'Input', 'ProgressBar', 'Badge', 'List', 'BarChart']

// 3. Discover REA adapter capabilities
const rea = new ReaAdapter();
const capabilities = await rea.discoverCapabilities();
console.log('REA Version:', capabilities.version);
console.log('Supported Target Types:', capabilities.supportedTargetTypes);
```

---

## Related References
- [Getting Started](getting-started.md)
- [Architecture](architecture.md)
- [Application Schema](application-schema.md)
- [Components](components.md)
