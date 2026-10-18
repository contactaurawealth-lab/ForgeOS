import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  AIOrchestrator,
  WorkflowState,
  ToolRegistry,
  RequirementsDocumentSchema,
  ExecutionPlanSchema,
} from '../src/index.js';
import { MockProvider } from '@forgeos/provider-adapters';

describe('ForgeOS AI Orchestration Engine', () => {
  test('ToolRegistry enforces path traversal protection', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-tools-'));
    try {
      const tools = new ToolRegistry(tmpDir);
      assert.throws(
        () => tools.resolveSafePath('../../etc/passwd'),
        /Security Violation/
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('executes complete autonomous workflow to verified preview', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-workflow-'));
    try {
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: new MockProvider(),
        maxRepairAttempts: 3,
      });

      const events = [];
      orchestrator.on('stateChange', ({ state }) => events.push(state));

      const result = await orchestrator.executeWorkflow(
        'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.',
        { projectSlug: 'studyos-test' }
      );

      assert.equal(result.success, true);
      assert.ok(result.requirements);
      assert.ok(result.plan);
      assert.ok(result.spec);
      assert.ok(result.files.length >= 4);
      assert.ok(result.previewHtml.includes('<!DOCTYPE html>'));
      assert.ok(result.previewHtml.includes('Study Dashboard'));

      // Check state transitions
      assert.ok(events.includes(WorkflowState.ANALYSE_REQUIREMENTS));
      assert.ok(events.includes(WorkflowState.CREATE_PLAN));
      assert.ok(events.includes(WorkflowState.GENERATE_SOURCE_CODE));
      assert.ok(events.includes(WorkflowState.PRESENT_VERIFIED_PREVIEW));
      assert.ok(events.includes(WorkflowState.COMPLETED));

      // Verify files were actually written to disk in project workspace
      const manifestPath = path.join(result.projectWorkspace, 'forgeos-manifest.json');
      const manifestStat = await fs.stat(manifestPath);
      assert.ok(manifestStat.isFile());

      const appPath = path.join(result.projectWorkspace, 'src/App.tsx');
      const appContent = await fs.readFile(appPath, 'utf8');
      assert.ok(appContent.includes('export default function App'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('successfully triggers bounded self-repair on failing specification', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-repair-'));
    try {
      // Custom provider that returns an initially broken spec (unsupported component), then fixes it on repair
      class DefectiveThenRepairedProvider extends MockProvider {
        constructor() {
          super();
          this.repairCalls = 0;
        }

        async generateStructured(params) {
          const lower = params.prompt.toLowerCase();
          if ((lower.includes('generate a valid') || lower.includes('appspecification')) && this.repairCalls === 0) {
            // Return initially defective spec with unsupported component
            return {
              schemaVersion: '1.0.0',
              metadata: { id: 'defect-app', name: 'defect-app', title: 'Defect App' },
              routes: [
                {
                  id: 'r_def',
                  path: '/',
                  title: 'Defect Route',
                  rootComponent: {
                    id: 'c_bad',
                    type: 'NonExistentComponent123',
                    props: {},
                    children: [],
                  },
                },
              ],
            };
          }
          if ((lower.includes('attempt #') || params.systemPrompt?.includes('Repair Agent')) && (lower.includes('repair') || lower.includes('patch'))) {
            this.repairCalls++;
            // Return repaired spec with standard Container & Heading
            return {
              schemaVersion: '1.0.0',
              metadata: { id: 'defect-app', name: 'defect-app', title: 'Defect App (Repaired)' },
              routes: [
                {
                  id: 'r_fixed',
                  path: '/',
                  title: 'Fixed Route',
                  rootComponent: {
                    id: 'c_container',
                    type: 'Container',
                    props: { padding: '24px' },
                    children: [
                      {
                        id: 'h_fixed',
                        type: 'Heading',
                        props: { level: 1, text: 'Successfully Repaired App' },
                        children: [],
                      },
                    ],
                  },
                },
              ],
            };
          }
          return super.generateStructured(params);
        }
      }

      const defectiveProvider = new DefectiveThenRepairedProvider();
      const orchestrator = new AIOrchestrator({
        workspaceRoot: tmpDir,
        provider: defectiveProvider,
        maxRepairAttempts: 3,
      });

      const result = await orchestrator.executeWorkflow(
        'Create a repaired app',
        { projectSlug: 'repaired-app' }
      );

      assert.equal(result.success, true);
      assert.equal(result.repairAttempts, 1);
      assert.ok(result.previewHtml.includes('Successfully Repaired App'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
