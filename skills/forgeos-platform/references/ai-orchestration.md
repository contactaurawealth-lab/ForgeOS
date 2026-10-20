# ForgeOS AI Orchestration Reference

## Purpose & State Machine
This reference documents `@forgeos/ai-orchestrator` and `@forgeos/provider-adapters`, governing multi-agent planning, tool sandboxing, provider abstractions, and bounded self-repair.

---

## Workflow State Machine
The generation lifecycle progresses through discrete, observable states:

```
WorkflowState.IDLE
       │
       ▼
WorkflowState.ANALYSE_REQUIREMENTS
  - Parses user prompt into RequirementsDocument
  - Identifies target users, pages, features, data entities, and UI kit components
       │
       ▼
WorkflowState.CREATE_PLAN
  - Generates DAG ExecutionPlan with ordered TaskItem entries and explicit dependencies
       │
       ▼
WorkflowState.VALIDATE_PLAN
  - Verifies task dependencies and tool assignments
       │
       ▼
WorkflowState.GENERATE_SPECIFICATION
  - Synthesizes formal AppSpecification matching Schema v1.0.0
       │
       ▼
WorkflowState.RUN_CHECKS
  - Runs schema validation and component registry resolution
       │
       ├─► (Checks Fail) ➔ WorkflowState.REPAIR_IF_NECESSARY
       │                   Bounded repair loop (Max 3 attempts)
       │                   Re-runs checks
       ▼
WorkflowState.GENERATE_SOURCE_CODE
  - Calls codegen engine to emit App.tsx, types.ts, etc.
  - Computes diffs and writes files to workspace
       │
       ▼
WorkflowState.PRESENT_VERIFIED_PREVIEW
  - Generates verified declarative HTML preview
       │
       ▼
WorkflowState.COMPLETED (or FAILED on terminal error)
```

---

## AI Provider Adapters (`@forgeos/provider-adapters`)

### 1. `MockProvider` (Default)
- **Use Case**: Offline deterministic testing, continuous integration, regression suites.
- **Behavior**: Generates realistic, fully populated specifications without network access or API credentials.
- **Limitations**: Returns structured mock templates; does not comprehend novel natural language outside supported patterns.

### 2. `OpenAIProvider`
- **Use Case**: Live production generation using GPT-4o / GPT-4o-mini.
- **Requirements**: `AI_PROVIDER=openai` and `OPENAI_API_KEY`.
- **Error Handling**: Normalizes network and provider errors into typed ForgeOS errors (`ProviderError`, `AuthenticationError`, `RateLimitError`, `TimeoutError`).

### Provider Creation
```javascript
import { createProvider, MockProvider, OpenAIProvider } from '@forgeos/provider-adapters';

// Automatically selects provider from process.env.AI_PROVIDER
const provider = createProvider();
```

---

## Sandboxed Tool Registry (`ToolRegistry`)
Tools executed by the orchestrator are isolated within the target workspace:
- `validate_schema`: Runs `safeValidateAppSpecification(spec)`.
- `generate_code`: Executes `@forgeos/codegen`.
- `read_file`: Reads files strictly within workspace; rejects `../`.
- `list_directory`: Lists directory contents within workspace.
- `run_checks`: Validates schema and component resolution.

---

## Bounded Self-Repair Protocol
When verification finds defects (e.g., unregistered component or invalid route path):
1. `checks.errors` aggregates all failure messages.
2. The orchestrator increments `repairAttempt`.
3. If `repairAttempt <= maxRepairAttempts` (default: 3):
   - The orchestrator invokes `attemptRepair(spec, errors, repairAttempt)`.
   - The repair prompt feeds the exact error diagnostics back to the provider.
   - Fallback logic safely patches invalid component nodes into safe `Container` components.
4. If `repairAttempt > maxRepairAttempts`:
   - Halts immediately with `Self-repair budget exhausted after 3 attempts`.
   - Never enters an infinite loop.

---

## Related References
- [Application Schema](application-schema.md)
- [Testing & Debugging](testing-and-debugging.md)
- [Code Generation](code-generation.md)
