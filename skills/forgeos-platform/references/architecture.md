# ForgeOS Architecture Reference

## Purpose & System Model
This reference outlines the internal architecture, package dependencies, trust boundaries, and end-to-end data flows governing ForgeOS.

---

## Package Structure & Dependency Direction
To prevent circular references and maintain strict isolation, ForgeOS packages adhere to a unidirectional dependency hierarchy:

```
apps/ (studio, api)
  │
  ├── packages/ai-orchestrator
  │     ├── packages/provider-adapters
  │     ├── packages/codegen
  │     └── packages/app-schema
  │
  ├── packages/build-runner
  │     ├── packages/codegen
  │     └── packages/ui-runtime
  │
  ├── packages/rea-adapter
  │     └── packages/app-schema
  │
  ├── packages/integrations
  │
  └── packages/ui-runtime
        ├── packages/ui-kit
        │     └── packages/design-system
        └── packages/app-schema
```

### Invariant Rules
1. `packages/app-schema` is the core data contract. It has **no** internal dependencies.
2. `packages/design-system` contains tokens only. It has **no** dependencies.
3. `packages/ui-kit` depends strictly on `design-system` and `app-schema`.
4. `packages/ui-runtime` performs declarative rendering. It never evaluates dynamic strings.
5. `packages/codegen` generates code deterministically from `AppSpecification`. It has no DOM dependencies.
6. `packages/ai-orchestrator` coordinates planning, code generation, and bounded repair.
7. `packages/rea-adapter` isolates reverse-engineering evidence collection behind an adapter.
8. `packages/integrations` provides independent ACID JSON persistence, RBAC auth, and secret encryption.
9. `packages/build-runner` encapsulates verification, SHA-256 hashing, build bundling, and rollback.
10. Apps (`apps/studio`, `apps/api`) consume packages; packages **never** import from `apps/`.

---

## End-to-End Data Flow Sequence

```
User Prompt
    │
    ▼
[AIOrchestrator]
    │── 1. Call Provider ➔ Requirements Analysis
    │── 2. Call Provider ➔ DAG Execution Plan
    │── 3. Call Provider ➔ AppSpecification (validated via Zod)
    │── 4. Codegen Engine ➔ Emits src/App.tsx, types.ts, etc.
    │── 5. Run Verification ➔ Check Schema & Components
    │       └─ (If defect detected: Trigger Bounded Repair, max 3 cycles)
    ▼
[UI Runtime]
    │── Safe DOM generation (Light & Dark theme CSS custom properties)
    ▼
[Sandboxed Preview Host]
    │── Isolated iframe (/preview/:id) with postMessage messaging
    ▼
[Build Runner]
    │── Static analysis, smoke check, production bundle in dist/
    │── SHA-256 source & artifact hashing
    ▼
[Deployment Manager]
    │── Enforces User Production Approval Gate
    │── Deploys to Local Preview or Verified Cloud Host
    └── Prepares Verified Rollback State
```

---

## Security & Trust Boundaries
1. **Host Isolation**: All tool file interactions are restricted to `FORGEOS_WORKSPACE_ROOT`. Directory traversal (`../`) is rejected with typed security exceptions.
2. **SSRF Guard**: Target URL analysis blocks localhost, private IPv4/IPv6 networks, and cloud instance metadata endpoints.
3. **Zero `eval()`**: Preview rendering produces safe HTML/CSS trees without dynamic execution.
4. **Secret Protection**: Server credentials remain exclusively on the server. Secret values in logs and UI are masked (`****...`).
5. **Approval Gates**: Production releases require explicit user confirmation.

---

## Related References
- [Getting Started](getting-started.md)
- [Capability Discovery](capability-discovery.md)
- [Application Schema](application-schema.md)
- [Security](security.md)
