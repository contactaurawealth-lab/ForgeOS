import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { AIOrchestrator, ToolRegistry } from '@forgeos/ai-orchestrator';
import { safeValidateAppSpecification, CURRENT_SCHEMA_VERSION } from '@forgeos/app-schema';
import { defaultRegistry } from '@forgeos/ui-kit';
import { renderAppToHtml } from '@forgeos/ui-runtime';
import { MockProvider } from '@forgeos/provider-adapters';
import { computeUnifiedDiff, writeGeneratedProject, generateSourceFiles } from '@forgeos/codegen';
import { ReaAdapter, InvestigationManager, validateTargetUrl } from '@forgeos/rea-adapter';
import { BuildRunner, DeploymentManager } from '@forgeos/build-runner';
import { runInstaller } from '../../scripts/install-skill.js';
import { validateDocs } from '../../scripts/validate-docs.js';

describe('ForgeOS Agent Acceptance Test Suite (Tests A through F)', () => {

  // ---------------------------------------------------------------------------
  // Test A: Build an application
  // ---------------------------------------------------------------------------
  test('Test A — Build an application: discovers framework, generates valid spec, source, and preview', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-a-'));

    try {
      // 1. Framework discovery
      assert.equal(CURRENT_SCHEMA_VERSION, '1.0.0');
      const componentTypes = defaultRegistry.list();
      assert.ok(componentTypes.includes('Container'));
      assert.ok(componentTypes.includes('Card'));
      assert.ok(componentTypes.includes('Button'));
      assert.ok(componentTypes.includes('List'));
      assert.ok(componentTypes.includes('Input'));

      // 2. Autonomous generation from user prompt
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
        maxRepairAttempts: 3,
      });

      const userPrompt =
        'Create a responsive dashboard with a form, a list, loading and error states, and light and dark themes.';

      const result = await orchestrator.executeWorkflow(userPrompt, {
        projectSlug: 'agent-app-demo',
      });

      assert.equal(result.success, true);
      assert.ok(result.requirements);
      assert.ok(result.plan);
      assert.ok(result.spec);

      // Validate specification against schema
      const validation = safeValidateAppSpecification(result.spec);
      assert.equal(validation.success, true);

      // Verify files generated
      assert.ok(result.files.length >= 4);
      const manifestPath = path.join(result.projectWorkspace, 'forgeos-manifest.json');
      const manifestExists = await fs.stat(manifestPath).then(s => s.isFile()).catch(() => false);
      assert.equal(manifestExists, true);

      // Verify preview HTML
      assert.ok(result.previewHtml.includes('<!DOCTYPE html>'));
      assert.ok(result.previewHtml.includes('forge-container'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Test B: Modify an existing project & preserve user modifications
  // ---------------------------------------------------------------------------
  test('Test B — Modify existing project: preserves user-authored files and computes diffs', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-b-'));

    try {
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
      });

      // 1. Initial generation
      const initialResult = await orchestrator.executeWorkflow('Initial Dashboard', {
        projectSlug: 'mod-project',
      });
      assert.equal(initialResult.success, true);

      const appFile = path.join(initialResult.projectWorkspace, 'src/App.tsx');
      const originalAppCode = await fs.readFile(appFile, 'utf8');

      // 2. User edits the file manually on disk
      const userCustomizedCode = originalAppCode + '\n// Custom user logic added manually\nexport const userHelper = () => true;\n';
      await fs.writeFile(appFile, userCustomizedCode, 'utf8');

      // 3. New generation with added feature
      const updatedSpec = JSON.parse(JSON.stringify(initialResult.spec));
      updatedSpec.metadata.title = 'Updated Dashboard with Extra Analytics';

      const updatedFiles = generateSourceFiles(updatedSpec);
      const writeResult = await writeGeneratedProject(initialResult.projectWorkspace, updatedFiles);

      // 4. Verify user file was preserved
      const diskContentAfter = await fs.readFile(appFile, 'utf8');
      assert.ok(diskContentAfter.includes('Custom user logic added manually'));
      assert.ok(writeResult.preserved.includes('src/App.tsx'));

      // 5. Verify update sidecar was written
      const sidecarFile = path.join(initialResult.projectWorkspace, 'src/App.tsx.generated');
      const sidecarExists = await fs.stat(sidecarFile).then(s => s.isFile()).catch(() => false);
      assert.equal(sidecarExists, true);

      // 6. Verify unified diff computation
      const diff = computeUnifiedDiff(originalAppCode, userCustomizedCode, 'src/App.tsx');
      assert.ok(diff.includes('+export const userHelper = () => true;'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Test C: Diagnose a failure within bounded self-repair budget
  // ---------------------------------------------------------------------------
  test('Test C — Diagnose failure: diagnoses unknown component and heals within repair budget', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-c-'));

    try {
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
        maxRepairAttempts: 3,
      });

      // Spec with deliberate error (unsupported component)
      const brokenSpec = {
        schemaVersion: '1.0.0',
        metadata: { id: 'broken-app', name: 'broken-app', title: 'Broken App' },
        theme: { mode: 'light' },
        routes: [
          {
            id: 'r_broken',
            path: '/',
            title: 'Broken Route',
            layout: 'default',
            rootComponent: {
              id: 'c_fail',
              type: 'NonExistentBrokenComponent123',
              props: {},
              children: [],
            },
          },
        ],
      };

      // 1. Initial check fails
      const tools = new ToolRegistry(tmpDir);
      const initialChecks = tools.runChecks(brokenSpec);
      assert.equal(initialChecks.componentsValid, false);
      assert.ok(initialChecks.errors.some(e => e.includes('NonExistentBrokenComponent123')));

      // 2. Perform bounded repair (Cycle 1)
      const repairedSpec = await orchestrator.attemptRepair(brokenSpec, initialChecks.errors, 1);
      assert.notEqual(repairedSpec.routes[0].rootComponent.type, 'NonExistentBrokenComponent123');

      // 3. Post-repair check passes
      const healedChecks = tools.runChecks(repairedSpec);
      assert.equal(healedChecks.schemaValid, true);
      assert.equal(healedChecks.componentsValid, true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Test D: Reverse-engineering integration
  // ---------------------------------------------------------------------------
  test('Test D — Reverse engineering: checks capabilities, enforces SSRF, and converts dossier', async () => {
    // 1. Check capability discovery
    const rea = new ReaAdapter();
    const capabilities = await rea.discoverCapabilities();
    assert.equal(capabilities.available, true);
    assert.ok(capabilities.supportedTargets.includes('javascript_bundle'));

    // 2. Enforce SSRF protection
    assert.equal(validateTargetUrl('http://127.0.0.1:8080/bundle.js').valid, false);
    assert.equal(validateTargetUrl('http://169.254.169.254/metadata').valid, false);
    assert.equal(validateTargetUrl('http://192.168.1.10/app.js').valid, false);
    assert.equal(validateTargetUrl('https://example.com/assets/app.js').valid, true);

    // 3. Investigation workflow with mandatory authorization & SSRF enforcement
    const manager = new InvestigationManager();
    await assert.rejects(
      async () => {
        await manager.createInvestigation({
          targetPath: 'https://example.com/app.js',
          targetType: 'javascript_bundle',
          authorizationConfirmed: false,
        });
      },
      /Authorization Denied/
    );

    await assert.rejects(
      async () => {
        await manager.createInvestigation({
          targetPath: 'http://127.0.0.1:8080/app.js',
          targetType: 'javascript_bundle',
          authorizationConfirmed: true,
        });
      },
      /SSRF Blocked/
    );

    const dossier = await manager.createInvestigation({
      targetPath: 'https://example.com/app.js',
      targetType: 'javascript_bundle',
      authorizationConfirmed: true,
    });
    assert.ok(dossier.findings.length > 0);

    // Approve finding and convert to valid AppSpecification
    manager.approveFinding(dossier.investigationId, dossier.findings[0].id);
    const generatedSpec = manager.convertToAppSpecification(dossier.investigationId);
    const validation = safeValidateAppSpecification(generatedSpec);
    assert.equal(validation.success, true);
  });

  // ---------------------------------------------------------------------------
  // Test E: Deployment gates and verified rollback
  // ---------------------------------------------------------------------------
  test('Test E — Deployment: enforces approval gate, deploys preview, and rolls back', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-e-'));

    try {
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
      });

      const genResult = await orchestrator.executeWorkflow('Deployment App', {
        projectSlug: 'deploy-app',
      });
      assert.equal(genResult.success, true);

      // 1. Build runner generates immutable build record
      const builder = new BuildRunner();
      const buildRecord = await builder.runBuild({
        projectId: genResult.projectSlug,
        workspacePath: genResult.projectWorkspace,
        spec: genResult.spec,
      });
      assert.equal(buildRecord.status, 'success');
      assert.ok(buildRecord.sourceChecksum);

      // 2. Deployment Manager enforces production approval gate
      const deployer = new DeploymentManager();
      await assert.rejects(
        async () => {
          await deployer.deploy({
            buildRecord,
            projectId: genResult.projectSlug,
            provider: 'cloudflare_pages',
            targetEnvironment: 'production',
            userApprovalConfirmed: false,
          });
        },
        /explicit user approval/
      );

      // 3. Local preview deploy succeeds
      const previewDeploy = await deployer.deploy({
        buildRecord,
        projectId: genResult.projectSlug,
        provider: 'local_preview',
        targetEnvironment: 'preview',
        userApprovalConfirmed: true,
      });
      assert.equal(previewDeploy.status, 'active');
      assert.ok(previewDeploy.url.includes('/preview/'));

      // 4. Rollback verified
      const rollback = await deployer.rollback({
        deploymentId: previewDeploy.deploymentId,
        targetBuildRecord: buildRecord,
        actorId: 'admin',
      });
      assert.equal(rollback.status, 'active');
      assert.equal(rollback.buildId, buildRecord.buildId);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Test F: Skill installation lifecycle
  // ---------------------------------------------------------------------------
  test('Test F — Skill installation: handles dry-run, install, repeat, and uninstall cleanly', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-f-'));

    try {
      // 1. Dry run produces planned actions with zero disk changes
      const dryRunRes = await runInstaller(['--dry-run', '--target', tmpDir]);
      assert.equal(dryRunRes.success, true);
      assert.ok(dryRunRes.plannedActions.length > 0);
      const filesAfterDryRun = await fs.readdir(tmpDir);
      assert.equal(filesAfterDryRun.length, 0); // No files written

      // 2. Real installation writes files and lockfile
      const installRes = await runInstaller(['--target', tmpDir]);
      assert.equal(installRes.success, true);

      const skillFile = path.join(tmpDir, '.agents/skills/forgeos-platform/SKILL.md');
      const skillStat = await fs.stat(skillFile).then(s => s.isFile()).catch(() => false);
      assert.equal(skillStat, true);

      const lockFile = path.join(tmpDir, '.forgeos-skill-lock.json');
      const lockStat = await fs.stat(lockFile).then(s => s.isFile()).catch(() => false);
      assert.equal(lockStat, true);

      // 3. Repeat installation (idempotency check)
      const repeatRes = await runInstaller(['--target', tmpDir]);
      assert.equal(repeatRes.success, true);

      // 4. Uninstall cleanly removes ForgeOS managed files
      const uninstallRes = await runInstaller(['--uninstall', '--target', tmpDir]);
      assert.equal(uninstallRes.success, true);

      const skillAfterUninstall = await fs.stat(skillFile).then(s => s.isFile()).catch(() => false);
      assert.equal(skillAfterUninstall, false);
      const lockAfterUninstall = await fs.stat(lockFile).then(s => s.isFile()).catch(() => false);
      assert.equal(lockAfterUninstall, false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Documentation Validator Integration
  // ---------------------------------------------------------------------------
  test('Documentation & Skill Validator: zero broken links or schema discrepancies', async () => {
    const valResult = await validateDocs();
    assert.equal(valResult.success, true);
    assert.equal(valResult.issues.length, 0);
    assert.ok(valResult.checks.length >= 5);
  });
});
