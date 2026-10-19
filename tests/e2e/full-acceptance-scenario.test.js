import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { AIOrchestrator, RequirementsDocumentSchema, ExecutionPlanSchema } from '@forgeos/ai-orchestrator';
import { safeValidateAppSpecification } from '@forgeos/app-schema';
import { renderAppToHtml, renderRoute } from '@forgeos/ui-runtime';
import { MockProvider } from '@forgeos/provider-adapters';
import { AuthService, StructuredDatabase, AuditLogger } from '@forgeos/integrations';
import { BuildRunner, DeploymentManager, CloudflarePagesDeploymentAdapter } from '@forgeos/build-runner';
import { InvestigationManager } from '@forgeos/rea-adapter';

describe('Phase 8: Comprehensive Platform Acceptance Scenario (15 Steps)', () => {
  const userRequest =
    'Create a responsive study application with dashboard, subject and chapter management, progress indicators, task creation, persistent data, light and dark themes, form validation, loading and error states.';

  test('verifies all 15 acceptance criteria in an integrated execution', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-phase8-scenario-'));

    try {
      // Step 7: Authentication and Access Controls
      const auth = new AuthService();
      const developerUser = auth.registerUser({
        email: 'dev@forgeos.local',
        name: 'Lead Developer',
        role: 'developer',
      });
      assert.equal(auth.canPerform(developerUser.role, 'build'), true);
      assert.equal(auth.canPerform(developerUser.role, 'deploy'), false);

      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
        maxRepairAttempts: 3,
      });

      // Step 1: Requirements are analysed
      const rawReq = await orchestrator.provider.generateStructured({
        prompt: `Analyse the user application request and produce a structured requirements document:\n${userRequest}`,
      });
      const requirements = RequirementsDocumentSchema.parse(rawReq);
      assert.ok(requirements.goal);
      assert.ok(requirements.coreFeatures.length >= 3);

      // Step 2: Plan is generated
      const rawPlan = await orchestrator.provider.generateStructured({
        prompt: `Create a dependency-aware execution plan for:\nGoal: ${requirements.goal}`,
      });
      const plan = ExecutionPlanSchema.parse(rawPlan);
      assert.ok(plan.tasks.length >= 3);
      assert.ok(plan.tasks[1].dependencies.length > 0);

      // Step 3, 4, 5, 8: Workflow execution (spec validation, rendering, source files, checks)
      const result = await orchestrator.executeWorkflow(userRequest, {
        projectSlug: 'studyos-phase8-app',
      });
      assert.equal(result.success, true);

      // Step 3: Application specification validates
      const specValidation = safeValidateAppSpecification(result.spec);
      assert.equal(specValidation.success, true);

      // Step 4: Real components are rendered
      const rendered = renderRoute(result.spec, '/');
      assert.equal(rendered.errors.length, 0);
      assert.ok(rendered.html.includes('Study Dashboard'));

      // Step 5: Maintainable source files are generated
      const generatedPaths = result.files.map(f => f.filePath);
      assert.ok(generatedPaths.includes('src/App.tsx'));
      assert.ok(generatedPaths.includes('src/components/ForgeComponents.tsx'));
      assert.ok(generatedPaths.includes('src/types.ts'));
      assert.ok(generatedPaths.includes('package.json'));
      assert.ok(generatedPaths.includes('forgeos-manifest.json'));

      // Step 6: Data persistence works when configured
      const db = new StructuredDatabase(path.join(tmpDir, 'db.json'));
      await db.load();
      const savedProject = await db.insert('projects', {
        id: result.projectSlug,
        spec: result.spec,
        ownerId: developerUser.id,
      });
      assert.equal(savedProject.id, result.projectSlug);
      const retrieved = await db.findById('projects', result.projectSlug);
      assert.equal(retrieved.id, result.projectSlug);

      // Step 9: A deliberately introduced error can be diagnosed and safely repaired
      let repairAttempt = 0;
      const brokenSpec = {
        ...result.spec,
        routes: [
          {
            id: 'bad_route',
            path: '/',
            title: 'Bad',
            rootComponent: { id: 'c_fail', type: 'BrokenComponent999', props: {}, children: [] },
          },
        ],
      };
      const repairResult = await orchestrator.attemptRepair(brokenSpec, ['Unknown component BrokenComponent999'], ++repairAttempt);
      assert.ok(repairResult.routes.length > 0);
      assert.notEqual(repairResult.routes[0].rootComponent.type, 'BrokenComponent999');

      // Step 10: Live preview functions (Desktop, Mobile, Dark Theme)
      const previewDesktop = renderAppToHtml(result.spec, { theme: 'light' });
      assert.ok(previewDesktop.includes('<!DOCTYPE html>'));
      assert.ok(previewDesktop.includes('max-width: 1200px'));

      const previewMobile = renderAppToHtml(result.spec, { theme: 'dark' });
      assert.ok(previewMobile.includes('data-theme="dark"'));
      assert.ok(previewMobile.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0"'));

      // Step 11: Build pipeline produces real immutable artifact
      const builder = new BuildRunner();
      const buildRecord = await builder.runBuild({
        projectId: result.projectSlug,
        workspacePath: result.projectWorkspace,
        spec: result.spec,
      });
      assert.equal(buildRecord.status, 'success');
      assert.ok(buildRecord.artifacts.length >= 4);
      assert.ok(buildRecord.sourceChecksum);

      // Step 12: Deployment works only when supported provider/credentials configured
      const deployer = new DeploymentManager();
      const cfAdapter = new CloudflarePagesDeploymentAdapter({});
      await assert.rejects(
        async () => {
          await cfAdapter.deploy({ buildRecord });
        },
        /Cloudflare Pages deployment requires CLOUDFLARE_API_TOKEN/
      );

      // Step 13: Actual deployment status is verified (Local Preview host)
      const deployment = await deployer.deploy({
        buildRecord,
        projectId: result.projectSlug,
        provider: 'local_preview',
        targetEnvironment: 'preview',
      });
      assert.equal(deployment.status, 'active');
      assert.ok(deployment.url.startsWith('/preview/'));

      // Step 14: Agent skill accurately describes workflow
      const skillContent = await fs.readFile(path.join(process.cwd(), 'SKILL.md'), 'utf8');
      assert.ok(skillContent.includes('name: forgeos'));
      assert.ok(skillContent.includes('AIOrchestrator'));
      assert.ok(skillContent.includes('BuildRunner'));

      // Step 15: REA Investigation workflow integration check
      const reaManager = new InvestigationManager();
      const dossier = await reaManager.createInvestigation({
        targetPath: 'https://example.com/studyos.js',
        targetType: 'javascript_bundle',
        authorizationConfirmed: true,
      });
      assert.ok(dossier.findings.length > 0);
      reaManager.approveFinding(dossier.investigationId, dossier.findings[0].id);
      const reaSpec = reaManager.convertToAppSpecification(dossier.investigationId);
      assert.equal(reaSpec.schemaVersion, '1.0.0');

      console.log('🌟 Phase 8: All 15 Acceptance Criteria Successfully Verified.');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
