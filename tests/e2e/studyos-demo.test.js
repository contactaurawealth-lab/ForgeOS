import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  AIOrchestrator,
  RequirementsDocumentSchema,
  ExecutionPlanSchema,
} from '@forgeos/ai-orchestrator';
import { safeValidateAppSpecification } from '@forgeos/app-schema';
import { renderAppToHtml, renderRoute } from '@forgeos/ui-runtime';
import { MockProvider } from '@forgeos/provider-adapters';

describe('Final Integration Scenario: StudyOS Demo End-to-End', () => {
  const userRequest =
    'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.';

  test('executes all 10 steps of the scenario successfully', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-final-scenario-'));

    try {
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
        maxRepairAttempts: 3,
      });

      // Step 1 & 2: Analyse request into structured requirements
      const rawReq = await orchestrator.provider.generateStructured({
        prompt: `Analyse the user application request and produce a structured requirements document:\n${userRequest}`,
      });
      const requirements = RequirementsDocumentSchema.parse(rawReq);
      assert.ok(requirements.goal.includes('study dashboard'));
      assert.ok(requirements.coreFeatures.length >= 3);
      assert.ok(requirements.uiComponents.includes('Card'));
      assert.ok(requirements.uiComponents.includes('ProgressBar'));
      assert.ok(requirements.uiComponents.includes('List'));

      // Step 3: Create dependency-aware plan
      const rawPlan = await orchestrator.provider.generateStructured({
        prompt: `Create a dependency-aware execution plan for:\nGoal: ${requirements.goal}`,
      });
      const plan = ExecutionPlanSchema.parse(rawPlan);
      assert.ok(plan.tasks.length >= 3);
      assert.ok(plan.tasks[1].dependencies.length > 0);

      // Step 4: Execute full workflow to generate valid spec and source files
      const result = await orchestrator.executeWorkflow(userRequest, {
        projectSlug: 'studyos-final-demo',
      });

      assert.equal(result.success, true);
      assert.equal(result.spec.schemaVersion, '1.0.0');

      // Step 5: Render application using component framework
      const routeRender = renderRoute(result.spec, '/');
      assert.equal(routeRender.errors.length, 0);
      assert.ok(routeRender.html.includes('Study Dashboard'));

      // Step 6: Verify maintainable source code files were generated
      const generatedFilePaths = result.files.map(f => f.filePath);
      assert.ok(generatedFilePaths.includes('src/App.tsx'));
      assert.ok(generatedFilePaths.includes('src/types.ts'));
      assert.ok(generatedFilePaths.includes('src/components/ForgeComponents.tsx'));
      assert.ok(generatedFilePaths.includes('package.json'));
      assert.ok(generatedFilePaths.includes('forgeos-manifest.json'));

      // Step 7: Run schema validation, type check syntax
      const schemaCheck = safeValidateAppSpecification(result.spec);
      assert.equal(schemaCheck.success, true);

      // Verify generated App.tsx is non-empty, contains React imports and valid structure
      const appFile = result.files.find(f => f.filePath === 'src/App.tsx');
      assert.ok(appFile.content.includes("import React, { useState } from 'react';"));
      assert.ok(appFile.content.includes('export default function App'));

      // Step 8: Verify bounded repair parameters
      assert.ok(result.repairAttempts <= 3);

      // Step 9: Open functional preview (Desktop and Mobile Viewports)
      const previewDesktop = renderAppToHtml(result.spec, { theme: 'light' });
      assert.ok(previewDesktop.includes('<!DOCTYPE html>'));
      assert.ok(previewDesktop.includes('max-width: 1200px'));
      assert.ok(previewDesktop.includes('forge-grid'));
      assert.ok(previewDesktop.includes('Study Dashboard'));

      // Verify Mobile Responsiveness meta tag and CSS rules
      assert.ok(previewDesktop.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0"'));
      assert.ok(previewDesktop.includes('grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))'));

      // Verify Dark Theme support
      const previewDark = renderAppToHtml(result.spec, { theme: 'dark' });
      assert.ok(previewDark.includes('data-theme="dark"'));
      assert.ok(previewDark.includes('--forge-bg: #090d16'));

      // Step 10: Verify disk persistence in workspace
      const onDiskApp = await fs.readFile(path.join(result.projectWorkspace, 'src/App.tsx'), 'utf8');
      assert.equal(onDiskApp, appFile.content);

      console.log('✅ Final Integration Test PASSED: All 10 steps verified.');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
