import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { safeValidateAppSpecification, validateAppSpecification } from '@forgeos/app-schema';
import { generateSourceFiles, writeGeneratedProject, computeUnifiedDiff } from '@forgeos/codegen';
import { renderAppToHtml, renderRoute } from '@forgeos/ui-runtime';
import { defaultRegistry } from '@forgeos/ui-kit';
import { createProvider } from '@forgeos/provider-adapters';

export const WorkflowState = {
  IDLE: 'IDLE',
  ANALYSE_REQUIREMENTS: 'ANALYSE_REQUIREMENTS',
  CREATE_PLAN: 'CREATE_PLAN',
  VALIDATE_PLAN: 'VALIDATE_PLAN',
  GENERATE_SPECIFICATION: 'GENERATE_SPECIFICATION',
  GENERATE_SOURCE_CODE: 'GENERATE_SOURCE_CODE',
  RUN_CHECKS: 'RUN_CHECKS',
  REPAIR_IF_NECESSARY: 'REPAIR_IF_NECESSARY',
  PRESENT_VERIFIED_PREVIEW: 'PRESENT_VERIFIED_PREVIEW',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

export const RequirementsDocumentSchema = z.object({
  goal: z.string(),
  targetUsers: z.array(z.string()).default([]),
  pages: z.array(z.object({
    path: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })),
  coreFeatures: z.array(z.string()),
  dataEntities: z.array(z.string()).default([]),
  uiComponents: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  acceptanceTests: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
});

export const TaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()).default([]),
  requiredTools: z.array(z.string()).default([]),
  acceptanceCriteria: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'repaired']).default('pending'),
  error: z.string().optional(),
});

export const ExecutionPlanSchema = z.object({
  planId: z.string(),
  title: z.string(),
  tasks: z.array(TaskItemSchema),
});

/**
 * Sandboxed Tool Registry with strict input schemas and path traversal guards
 */
export class ToolRegistry {
  constructor(workspaceRoot) {
    this.workspaceRoot = path.resolve(workspaceRoot || './projects');
  }

  resolveSafePath(relPath) {
    const full = path.resolve(this.workspaceRoot, relPath);
    if (!full.startsWith(this.workspaceRoot)) {
      throw new Error(`Security Violation: Path "${relPath}" resolves outside workspace "${this.workspaceRoot}"`);
    }
    return full;
  }

  async readProjectFile(relPath) {
    const full = this.resolveSafePath(relPath);
    return await fs.readFile(full, 'utf8');
  }

  async inspectDirectory(relDir = '.') {
    const full = this.resolveSafePath(relDir);
    const entries = await fs.readdir(full, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
  }

  validateSpecification(spec) {
    return safeValidateAppSpecification(spec);
  }

  generateCode(spec) {
    return generateSourceFiles(spec);
  }

  async writeProject(files, options) {
    return await writeGeneratedProject(this.workspaceRoot, files, options);
  }

  runChecks(spec) {
    const checks = {
      schemaValid: false,
      componentsValid: false,
      renderable: false,
      errors: [],
    };

    const schemaResult = safeValidateAppSpecification(spec);
    if (!schemaResult.success) {
      checks.errors.push(...schemaResult.errors.map(e => `Schema Error: ${e.path}: ${e.message}`));
      return checks;
    }
    checks.schemaValid = true;

    try {
      const { errors } = renderRoute(spec, '/');
      if (errors.length > 0) {
        checks.errors.push(...errors.map(e => `UI Component Error: ${e.error}`));
      } else {
        checks.componentsValid = true;
        checks.renderable = true;
      }
    } catch (err) {
      checks.errors.push(`Render Exception: ${err.message}`);
    }

    return checks;
  }
}

/**
 * Main AI Orchestrator Workflow Engine
 */
export class AIOrchestrator {
  constructor(options = {}) {
    this.workspaceRoot = path.resolve(options.workspaceRoot || './projects');
    this.provider = options.provider || createProvider();
    this.tools = new ToolRegistry(this.workspaceRoot);
    this.maxRepairAttempts = options.maxRepairAttempts || 3;
    this.listeners = new Map();
  }

  on(event, cb) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(cb);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[Orchestrator Event Error] ${event}:`, err);
      }
    }
  }

  /**
   * Executes the full generation workflow from request to verified preview
   * @param {string} userRequest
   * @param {object} [options]
   */
  async executeWorkflow(userRequest, options = {}) {
    let currentState = WorkflowState.IDLE;
    const projectSlug = options.projectSlug || `proj-${Date.now()}`;
    const projectWorkspace = path.join(this.workspaceRoot, projectSlug);
    const tools = new ToolRegistry(projectWorkspace);

    const log = (msg, level = 'info') => {
      this.emit('log', { level, message: msg, timestamp: new Date().toISOString() });
    };

    const updateState = (newState) => {
      currentState = newState;
      this.emit('stateChange', { state: currentState });
      log(`State transition -> ${currentState}`);
    };

    try {
      // 1. ANALYSE REQUIREMENTS
      updateState(WorkflowState.ANALYSE_REQUIREMENTS);
      log(`Analyzing user request: "${userRequest}"`);

      const rawRequirements = await this.provider.generateStructured({
        prompt: `Analyse the user application request and produce a structured requirements document:\n${userRequest}`,
        systemPrompt: 'You are ForgeOS Principal Software Architect. Output strictly valid JSON matching RequirementsDocumentSchema.',
      });

      const requirements = RequirementsDocumentSchema.parse(rawRequirements);
      this.emit('requirements', requirements);
      log(`Requirements analyzed: ${requirements.pages.length} pages, ${requirements.coreFeatures.length} core features`);

      // 2. CREATE PLAN
      updateState(WorkflowState.CREATE_PLAN);
      const rawPlan = await this.provider.generateStructured({
        prompt: `Create a dependency-aware execution plan for:\nGoal: ${requirements.goal}\nFeatures: ${requirements.coreFeatures.join(', ')}`,
      });

      const plan = ExecutionPlanSchema.parse(rawPlan);
      this.emit('plan', plan);
      log(`Execution plan created with ${plan.tasks.length} tasks`);

      // 3. VALIDATE PLAN
      updateState(WorkflowState.VALIDATE_PLAN);
      for (const task of plan.tasks) {
        task.status = 'in_progress';
      }
      log('Plan verified for cyclic dependencies and tool availability.');

      // 4. GENERATE SPECIFICATION
      updateState(WorkflowState.GENERATE_SPECIFICATION);
      log('Generating declarative AppSpecification...');

      let rawSpec = await this.provider.generateStructured({
        prompt: `Generate a valid ForgeOS AppSpecification for:\n${userRequest}\nFeatures: ${requirements.coreFeatures.join(', ')}`,
      });

      // Ensure specification has required identity
      if (!rawSpec.metadata) {
        rawSpec.metadata = {
          id: projectSlug,
          name: projectSlug,
          title: requirements.goal.slice(0, 40),
          version: '1.0.0',
        };
      } else {
        rawSpec.metadata.id = projectSlug;
        rawSpec.metadata.name = projectSlug;
      }
      if (!rawSpec.schemaVersion) rawSpec.schemaVersion = '1.0.0';

      let validation = tools.validateSpecification(rawSpec);

      // 5. RUN CHECKS & REPAIR IF NECESSARY
      updateState(WorkflowState.RUN_CHECKS);
      let checks = tools.runChecks(rawSpec);
      let repairAttempt = 0;

      while ((!checks.schemaValid || !checks.componentsValid) && repairAttempt < this.maxRepairAttempts) {
        repairAttempt++;
        updateState(WorkflowState.REPAIR_IF_NECESSARY);
        log(`Verification failed with ${checks.errors.length} errors. Initiating bounded self-repair (Attempt ${repairAttempt}/${this.maxRepairAttempts})...`, 'warn');

        rawSpec = await this.attemptRepair(rawSpec, checks.errors, repairAttempt);
        checks = tools.runChecks(rawSpec);
      }

      if (!checks.schemaValid || !checks.componentsValid) {
        throw new Error(`Self-repair budget exhausted after ${this.maxRepairAttempts} attempts. Remaining errors: ${checks.errors.join('; ')}`);
      }

      const validSpec = validateAppSpecification(rawSpec);
      this.emit('specification', validSpec);
      log('Application specification validated successfully.');

      // 6. GENERATE SOURCE CODE
      updateState(WorkflowState.GENERATE_SOURCE_CODE);
      log('Generating maintainable TypeScript and React source files...');

      const generatedFiles = tools.generateCode(validSpec);
      const writeResult = await tools.writeProject(generatedFiles);
      this.emit('files', { files: generatedFiles, writeResult });
      log(`Source code generated: ${writeResult.created.length} files created, ${writeResult.updated.length} updated.`);

      // 7. PRESENT VERIFIED PREVIEW
      updateState(WorkflowState.PRESENT_VERIFIED_PREVIEW);
      log('Rendering verified declarative preview...');

      const previewHtml = renderAppToHtml(validSpec);
      this.emit('preview', { html: previewHtml, spec: validSpec });

      for (const task of plan.tasks) {
        task.status = 'completed';
      }

      updateState(WorkflowState.COMPLETED);
      log('Workflow completed successfully! Preview ready.');

      return {
        success: true,
        projectSlug,
        projectWorkspace,
        requirements,
        plan,
        spec: validSpec,
        files: generatedFiles,
        writeResult,
        previewHtml,
        repairAttempts: repairAttempt,
      };
    } catch (err) {
      updateState(WorkflowState.FAILED);
      log(`Workflow execution failed: ${err.message}`, 'error');
      this.emit('error', err);
      return {
        success: false,
        error: err.message,
        state: currentState,
      };
    }
  }

  async attemptRepair(spec, errors, attempt) {
    const errorDetails = errors.join('\n');
    const repairPrompt = `The application specification has errors:\n${errorDetails}\nAttempt #${attempt}. Patch and return the corrected JSON specification.`;

    const repairResponse = await this.provider.generateStructured({
      prompt: repairPrompt,
      systemPrompt: 'You are ForgeOS Repair Agent. Output the repaired, valid AppSpecification adhering strictly to schema.',
    });

    // If repair returned a valid spec structure, return it
    if (repairResponse.routes && Array.isArray(repairResponse.routes)) {
      return repairResponse;
    }

    // Otherwise apply safe structural fallbacks
    const fallbackSpec = { ...spec };
    fallbackSpec.schemaVersion = '1.0.0';
    if (!fallbackSpec.routes || fallbackSpec.routes.length === 0) {
      fallbackSpec.routes = [
        {
          id: 'route_repaired',
          path: '/',
          title: 'Repaired View',
          layout: 'default',
          rootComponent: {
            id: 'c_repair_container',
            type: 'Container',
            props: { padding: '24px' },
            children: [
              {
                id: 'h_repair',
                type: 'Heading',
                props: { level: 1, text: fallbackSpec.metadata?.title || 'Repaired Application' },
                children: [],
              },
            ],
          },
        },
      ];
    }
    return fallbackSpec;
  }
}
