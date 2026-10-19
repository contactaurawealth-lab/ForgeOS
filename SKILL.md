---
name: forgeos
description: Enterprise AI-native application engineering platform with declarative component frameworks, REA reverse-engineering, autonomous orchestration, deterministic code generation, verified builds, and secure deployment pipelines.
---

# ForgeOS Agent Skill & Operating Guide

Use this skill when developing, inspecting, repairing, building, or deploying applications using **ForgeOS**.

---

## 1. System Capabilities & Architecture

ForgeOS provides an end-to-end software engineering platform structured as an 8-phase system:
- **Phase 1: Foundation & APIs**: TypeScript monorepo, structured error handling, health checks (`GET /health`), project management.
- **Phase 2: Component Framework**: Typed Zod schema (`@forgeos/app-schema`), 12 core accessible UI components (`@forgeos/ui-kit`), design tokens (`@forgeos/design-system`), zero-eval declarative renderer (`@forgeos/ui-runtime`), deterministic code generator (`@forgeos/codegen`).
- **Phase 3: AI Orchestration Engine**: Requirements analysis, DAG planning, sandboxed tool execution, and bounded self-repair (max 3 cycles) (`@forgeos/ai-orchestrator`).
- **Phase 4: Reverse-Engineering Integration**: REA adapter (`@forgeos/rea-adapter`) for inspecting authorized JavaScript bundles, web apps, APKs, generating evidence dossiers, and converting approved findings to specifications.
- **Phase 5: Studio & Live Preview**: Real-time IDE (`apps/studio`), multi-viewport preview host, and project lifecycle management.
- **Phase 6: Enterprise Backend & Integrations**: Database (`StructuredDatabase`), RBAC auth (`AuthService`), secret encryption (`SecretManager`), and audit logging (`AuditLogger`).
- **Phase 7: Build & Deployment Pipeline**: Sandboxed build runner (`BuildRunner`), immutable build records, static analysis, test checks, and deployment rollback (`DeploymentManager`).
- **Phase 8: Release Quality & Hardening**: Full regression coverage and security policies.

---

## 2. Standard Agent Workflows

### 2.1 Generating an Application from Intent
To generate a new application from natural language intent:

```javascript
import { AIOrchestrator } from '@forgeos/ai-orchestrator';

const orchestrator = new AIOrchestrator({
  workspaceRoot: './projects',
  maxRepairAttempts: 3,
});

const result = await orchestrator.executeWorkflow(
  'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.',
  { projectSlug: 'studyos-dashboard' }
);

if (result.success) {
  console.log('Project created at:', result.projectWorkspace);
  console.log('Preview available in result.previewHtml');
}
```

### 2.2 Reverse-Engineering Software with REA
To analyze authorized software artifacts and convert findings to an application:

```javascript
import { InvestigationManager } from '@forgeos/rea-adapter';

const manager = new InvestigationManager();
const dossier = await manager.createInvestigation({
  targetPath: 'https://cdn.example.com/app-bundle.js',
  targetType: 'javascript_bundle',
  authorizationConfirmed: true, // Mandatory legal authorization gate
});

// Review and approve findings
for (const finding of dossier.findings) {
  manager.approveFinding(dossier.investigationId, finding.id);
}

// Convert approved findings to a ForgeOS AppSpecification
const spec = manager.convertToAppSpecification(dossier.investigationId);
```

### 2.3 Running Verified Builds & Deployments
To produce an immutable production artifact and deploy:

```javascript
import { BuildRunner, DeploymentManager } from '@forgeos/build-runner';

const runner = new BuildRunner();
const buildRecord = await runner.runBuild({
  projectId: 'my-project',
  workspacePath: './projects/my-project',
  spec: validatedSpec,
});

if (buildRecord.status === 'success') {
  const deployer = new DeploymentManager();
  const deployment = await deployer.deploy({
    buildRecord,
    projectId: 'my-project',
    provider: 'local_preview',
    targetEnvironment: 'preview',
    userApprovalConfirmed: true,
  });
  console.log('Active at:', deployment.url);
}
```

---

## 3. Agent Safety Constraints

1. **Never Bypass Authorization**: REA investigations require `authorizationConfirmed: true`.
2. **SSRF Protection**: Never configure URLs targeting private subnets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`).
3. **No Dynamic Eval**: Declarative components must render via `@forgeos/ui-runtime`.
4. **Preserve User Code**: Do not overwrite hand-written modifications; use `@forgeos/codegen` diff detection.
