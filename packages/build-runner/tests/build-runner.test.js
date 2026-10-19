import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  BuildRunner,
  DeploymentManager,
  CloudflarePagesDeploymentAdapter,
} from '../src/index.js';

describe('Phase 7: Secure Build Runner & Deployment Pipeline', () => {
  const validSpec = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'proj_build_test',
      name: 'build-test-app',
      title: 'Build Test Application',
      version: '1.0.0',
    },
    theme: { mode: 'light' },
    routes: [
      {
        id: 'r_main',
        path: '/',
        title: 'Home',
        rootComponent: {
          id: 'c_container',
          type: 'Container',
          props: { padding: '24px' },
          children: [
            {
              id: 'h1',
              type: 'Heading',
              props: { level: 1, text: 'Build Pipeline App' },
              children: [],
            },
          ],
        },
      },
    ],
    state: [],
    actions: [],
  };

  test('executes full build pipeline and generates immutable build record', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-build-'));
    try {
      const runner = new BuildRunner();
      const record = await runner.runBuild({
        projectId: 'proj_build_test',
        workspacePath: tmpDir,
        spec: validSpec,
      });

      assert.equal(record.status, 'success');
      assert.ok(record.buildId.startsWith('bld_'));
      assert.ok(record.artifacts.length >= 4);
      assert.equal(record.testResults.failed, 0);
      assert.ok(record.testResults.checks.includes('schema_validation'));
      assert.ok(record.testResults.checks.includes('static_analysis'));
      assert.ok(record.testResults.checks.includes('runtime_smoke_test'));

      // Verify production bundle was generated
      const distHtml = await fs.readFile(path.join(tmpDir, 'dist/index.html'), 'utf8');
      assert.ok(distHtml.includes('Build Pipeline App'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('fails build safely when specification is defective', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-build-fail-'));
    try {
      const runner = new BuildRunner();
      const brokenSpec = {
        schemaVersion: '1.0.0',
        metadata: { id: 'bad' },
        // missing routes and required fields
      };
      const record = await runner.runBuild({
        projectId: 'bad_proj',
        workspacePath: tmpDir,
        spec: brokenSpec,
      });

      assert.equal(record.status, 'failed');
      assert.ok(record.error.includes('Schema validation failed'));
      assert.equal(record.artifacts.length, 0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Deployment Management & Rollback', () => {
    test('enforces user approval gate for production deployments', async () => {
      const dm = new DeploymentManager();
      const dummyBuild = { buildId: 'bld_1', status: 'success' };

      await assert.rejects(
        async () => {
          await dm.deploy({
            buildRecord: dummyBuild,
            projectId: 'proj_1',
            provider: 'local_preview',
            targetEnvironment: 'production',
            userApprovalConfirmed: false,
          });
        },
        /Security Violation: Production deployment requires explicit user approval/
      );
    });

    test('validates external provider credentials without inventing success responses', async () => {
      const cfAdapter = new CloudflarePagesDeploymentAdapter({});
      await assert.rejects(
        async () => {
          await cfAdapter.deploy({ buildRecord: { buildId: 'bld_1', status: 'success' } });
        },
        /Cloudflare Pages deployment requires CLOUDFLARE_API_TOKEN/
      );
    });

    test('deploys local preview and performs verified rollback', async () => {
      const dm = new DeploymentManager();
      const buildV1 = { buildId: 'bld_v1', status: 'success' };
      const buildV2 = { buildId: 'bld_v2', status: 'success' };

      // Deploy v1
      const dep1 = await dm.deploy({
        buildRecord: buildV1,
        projectId: 'p_study',
        provider: 'local_preview',
        targetEnvironment: 'preview',
      });
      assert.equal(dep1.status, 'active');
      assert.equal(dep1.buildId, 'bld_v1');

      // Deploy v2
      const dep2 = await dm.deploy({
        buildRecord: buildV2,
        projectId: 'p_study',
        provider: 'local_preview',
        targetEnvironment: 'preview',
      });
      assert.equal(dep2.status, 'active');
      assert.equal(dep2.buildId, 'bld_v2');

      // Verify v1 is now superseded
      assert.equal(dm.getDeployment(dep1.deploymentId).status, 'superseded');

      // Rollback to v1
      const rolledBack = await dm.rollback({
        deploymentId: dep2.deploymentId,
        targetBuildRecord: buildV1,
        actorId: 'usr_admin',
      });

      assert.equal(rolledBack.status, 'active');
      assert.equal(rolledBack.buildId, 'bld_v1');
      assert.equal(dm.getDeployment(dep2.deploymentId).status, 'rolled_back');
    });
  });
});
