# ForgeOS Testing and Debugging Reference

## Purpose & Testing Strategy
This reference details how to test applications, debug failures, run automated checks, and configure bounded self-repair on ForgeOS.

---

## Running Test Suites

ForgeOS provides built-in testing scripts defined in `package.json`:

```bash
# Run all unit, integration, and E2E tests across all packages
npm test

# Run schema validation tests
npm run test:schema

# Run code generator tests
npm run test:codegen

# Run AI orchestrator tests
npm run test:orchestrator

# Run end-to-end StudyOS demo scenario
npm run test:e2e

# Run 15-step platform acceptance scenario
node --test tests/e2e/full-acceptance-scenario.test.js
```

---

## Diagnosing Failures: Layer-by-Layer Guide

When an error occurs during generation, build, or preview, isolate the failure to one of the following layers:

### 1. Schema Validation Layer (`@forgeos/app-schema`)
- **Symptoms**: `ZodError` or `safeValidateAppSpecification` returns `success: false`.
- **Common Causes**:
  - Missing required `id`, `name`, or `title` in metadata.
  - Route path does not start with `/` (e.g. `path: 'dashboard'` instead of `path: '/dashboard'`).
  - No routes defined in `spec.routes`.
- **Resolution**: Call `safeValidateAppSpecification(spec)` and inspect `errors[i].path` and `message`.

### 2. Component Registry Layer (`@forgeos/ui-kit`)
- **Symptoms**: `Unknown component type: "X"`.
- **Common Causes**: Hallucinated component name (e.g., `Header`, `ButtonCard`, `DataGrid`).
- **Resolution**: Check `defaultRegistry.has(type)`. Replace unknown component with one of the 12 core primitives (`Container`, `Card`, `Grid`, etc.) or register the component via `defaultRegistry.register()`.

### 3. Rendering / DOM Layer (`@forgeos/ui-runtime`)
- **Symptoms**: Element does not render or falls back to an Error Boundary box.
- **Common Causes**: Missing required prop or nested array instead of node children.
- **Resolution**: Verify children are wrapped in arrays. Check console logs in the preview iframe.

### 4. Build & Checksum Layer (`@forgeos/build-runner`)
- **Symptoms**: Build status returns `'failed'` in build record.
- **Common Causes**: Component validation failed or missing source files.
- **Resolution**: Inspect `buildRecord.errors` array.

---

## Bounded Self-Repair Configuration

Bounded repair prevents runaway loops while fixing legitimate issues:
- **Environment Variable**: `FORGEOS_MAX_REPAIR_ATTEMPTS=3` (default).
- **Rule**: If a repair iteration does not fix the defect, the orchestrator attempts targeted structural fallbacks (e.g. replacing unknown nodes with safe `Container` nodes).
- **Hard Limit**: If errors persist after the maximum repair attempts, the orchestrator terminates with a typed diagnostic error. Never increase this limit beyond 5.

---

## Related References
- [Application Schema](application-schema.md)
- [Components](components.md)
- [Builds and Deployment](builds-and-deployment.md)
