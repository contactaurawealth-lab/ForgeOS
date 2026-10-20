# ForgeOS Examples Reference

## Purpose
This reference provides verified, end-to-end code examples for the most common ForgeOS workflows.

---

## Example 1: Full Application Generation from Natural Language

```javascript
import { AIOrchestrator } from '@forgeos/ai-orchestrator';
import { MockProvider } from '@forgeos/provider-adapters';

const orchestrator = new AIOrchestrator({
  workspaceRoot: './projects',
  provider: new MockProvider(),
  maxRepairAttempts: 3,
});

const result = await orchestrator.executeWorkflow(
  'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.',
  { projectSlug: 'studyos-example' }
);

if (result.success) {
  console.log('Project generated at:', result.projectWorkspace);
  console.log('Generated Files:', result.files.map(f => f.path));
  console.log('Preview HTML size:', result.previewHtml.length);
}
```

---

## Example 2: Reverse-Engineering an Authorized Web Asset

```javascript
import { InvestigationManager } from '@forgeos/rea-adapter';
import { safeValidateAppSpecification } from '@forgeos/app-schema';

const manager = new InvestigationManager();

// 1. Initiate investigation with authorization gate
const dossier = await manager.createInvestigation({
  targetPath: 'https://cdn.example.com/web-app.js',
  targetType: 'javascript_bundle',
  authorizationConfirmed: true,
});

// 2. Approve all high-confidence findings
for (const finding of dossier.findings) {
  if (finding.confidence >= 0.8) {
    manager.approveFinding(dossier.investigationId, finding.id);
  }
}

// 3. Convert approved findings into ForgeOS specification
const spec = manager.convertToAppSpecification(dossier.investigationId);
const validation = safeValidateAppSpecification(spec);
console.log('Is Valid Specification:', validation.success);
```

---

## Example 3: Running a Verified Build & Local Preview Deployment

```javascript
import { BuildRunner, DeploymentManager } from '@forgeos/build-runner';

// 1. Build immutable production bundle
const runner = new BuildRunner();
const buildRecord = await runner.runBuild({
  projectId: 'studyos-example',
  workspacePath: './projects/studyos-example',
  spec,
});

console.log('Build Status:', buildRecord.status);
console.log('Source Checksum:', buildRecord.sourceChecksum);

// 2. Deploy to local preview
const deployer = new DeploymentManager();
const deployment = await deployer.deploy({
  buildRecord,
  projectId: 'studyos-example',
  provider: 'local_preview',
  targetEnvironment: 'preview',
  userApprovalConfirmed: true,
});

console.log('Preview URL:', deployment.url);
```

---

## Example 4: Authenticated Encryption with SecretManager

```javascript
import { SecretManager } from '@forgeos/integrations';

const secrets = new SecretManager();
const rawToken = 'sk-proj-9876543210abcdef';

const ciphertext = secrets.encryptSecret(rawToken);
const plaintext = secrets.decryptSecret(ciphertext);

console.log('Masked Token:', secrets.maskSecret(plaintext)); // 'sk-p********************'
```

---

## Related References
- [Getting Started](getting-started.md)
- [Application Schema](application-schema.md)
- [Reverse Engineering](reverse-engineering.md)
- [Builds and Deployment](builds-and-deployment.md)
