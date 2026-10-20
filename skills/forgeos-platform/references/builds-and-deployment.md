# ForgeOS Builds and Deployment Reference

## Purpose & Pipeline
This reference details `@forgeos/build-runner`, covering static checks, production bundling in `dist/`, SHA-256 artifact hashing, human-in-the-loop deployment approval, and atomic rollback.

---

## 1. Build Execution (`BuildRunner`)

`BuildRunner` performs a 5-stage verification process:
1. **Schema Check**: Calls `safeValidateAppSpecification(spec)`.
2. **Component Check**: Verifies that every component in the route tree exists in `defaultRegistry`.
3. **Static File Check**: Inspects emitted source files (`App.tsx`, `types.ts`, `package.json`).
4. **Smoke Check**: Verifies declarative rendering via `renderAppToHtml(spec)`.
5. **Artifact Bundling & Hashing**:
   - Generates production bundle in `<workspace>/dist/` (`index.html`, `bundle.js`, `style.css`, `manifest.json`).
   - Computes deterministic SHA-256 hashes of all source files and output artifacts.
   - Saves immutable `build-record.json`.

```javascript
import { BuildRunner } from '@forgeos/build-runner';

const runner = new BuildRunner();
const buildRecord = await runner.runBuild({
  projectId: 'studyos',
  workspacePath: './projects/studyos',
  spec: validatedSpec,
});

if (buildRecord.status === 'success') {
  console.log('Build ID:', buildRecord.buildId);
  console.log('Source Checksum:', buildRecord.sourceChecksum);
  console.log('Artifacts:', buildRecord.artifacts.map(a => a.path));
}
```

---

## 2. Deployment Management (`DeploymentManager`)

### Supported Deployment Adapters
1. **`local_preview`**: Serves production build locally under isolated preview routes.
2. **`cloudflare_pages`**: Integrates with Cloudflare Pages API. Validates API token and project name.
3. **`vercel`**: Integrates with Vercel REST API. Validates bearer token and project ID.

### The Production Approval Gate
Deploying to `production` **strictly requires** explicit human confirmation (`userApprovalConfirmed: true`):
```javascript
import { DeploymentManager } from '@forgeos/build-runner';

const deployer = new DeploymentManager();

// Attempting deploy without approval throws an Error
try {
  await deployer.deploy({
    buildRecord,
    projectId: 'studyos',
    provider: 'cloudflare_pages',
    targetEnvironment: 'production',
    userApprovalConfirmed: false, // Will throw!
  });
} catch (err) {
  console.error(err.message); // 'Production deployment requires explicit user approval confirmation.'
}
```

---

## 3. Atomic Rollback Engine

To revert an application to a prior verified build record:
```javascript
const rollbackResult = await deployer.rollback({
  deploymentId: 'dep_latest',
  projectId: 'studyos',
  workspacePath: './projects/studyos',
});

console.log('Rollback Successful:', rollbackResult.success);
console.log('Restored Build ID:', rollbackResult.restoredBuildId);
```
Rollback restores files from the prior build's `dist/` directory, updates the project manifest, and records an audit event.

---

## Related References
- [Backend & Integrations](backend-and-integrations.md)
- [Security](security.md)
- [Studio and Preview](studio-and-preview.md)
