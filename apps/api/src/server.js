import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { AIOrchestrator } from '@forgeos/ai-orchestrator';
import { safeValidateAppSpecification } from '@forgeos/app-schema';
import { renderAppToHtml } from '@forgeos/ui-runtime';
import { defaultRegistry } from '@forgeos/ui-kit';
import { createProvider } from '@forgeos/provider-adapters';
import { InvestigationManager, ReaAdapter } from '@forgeos/rea-adapter';
import { AuthService, StructuredDatabase, AuditLogger, SecretManager } from '@forgeos/integrations';
import { BuildRunner, DeploymentManager } from '@forgeos/build-runner';

const PORT = parseInt(process.env.PORT || '3000', 10);
const WORKSPACE_ROOT = path.resolve(process.env.FORGEOS_WORKSPACE_ROOT || './projects');

/**
 * Creates and initializes the ForgeOS API HTTP server
 */
export function createServer(options = {}) {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const provider = options.provider || createProvider();

  // Core service singletons
  const authService = new AuthService();
  const db = new StructuredDatabase(path.join(workspaceRoot, '.forgeos-db.json'));
  const auditLogger = new AuditLogger(db);
  const secretManager = new SecretManager();
  const investigationManager = new InvestigationManager();
  const buildRunner = new BuildRunner();
  const deploymentManager = new DeploymentManager();

  // In-memory project cache with filesystem/database backing
  const projectsCache = new Map();

  const server = http.createServer(async (req, res) => {
    // Enable CORS and security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname || '/';

    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const sendHtml = (statusCode, html) => {
      res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    };

    // Helper: Authenticate request (extracts user from Bearer token or defaults to system admin)
    const getAuthenticatedUser = () => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = authService.validateSession(token);
        if (user) return user;
      }
      // Default to standard local developer/owner if no token provided in local mode
      return {
        id: 'usr_admin',
        email: 'admin@forgeos.local',
        name: 'System Administrator',
        role: 'owner',
      };
    };

    try {
      // =========================================================================
      // 1. Health check endpoint (Phase 1)
      // =========================================================================
      if (pathname === '/health' && req.method === 'GET') {
        return sendJson(200, {
          status: 'ok',
          platform: 'ForgeOS',
          version: '1.0.0',
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          provider: provider.name,
          workspace: workspaceRoot,
          timestamp: new Date().toISOString(),
        });
      }

      // =========================================================================
      // 2. Studio Web App UI & Sandboxed Preview Host (Phases 1 & 5)
      // =========================================================================
      if ((pathname === '/' || pathname === '/studio') && req.method === 'GET') {
        const studioHtml = await getStudioHtml();
        return sendHtml(200, studioHtml);
      }

      // Isolated iframe preview route
      const previewHostMatch = pathname.match(/^\/preview\/([a-zA-Z0-9-_]+)$/);
      if (previewHostMatch && req.method === 'GET') {
        const id = previewHostMatch[1];
        const project = projectsCache.get(id);
        if (!project || !project.spec) {
          return sendHtml(404, '<h1>No preview available for this project</h1>');
        }
        const theme = parsedUrl.query.theme || project.spec.theme?.mode || 'light';
        const html = renderAppToHtml(project.spec, { theme });
        return sendHtml(200, html);
      }

      // =========================================================================
      // 3. Authentication & RBAC APIs (Phase 6)
      // =========================================================================
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const user = authService.registerUser(body);
        const session = authService.createSession(user.id);
        await auditLogger.record({
          actorId: user.id,
          action: 'user_registered',
          targetType: 'user',
          targetId: user.id,
        });
        return sendJson(201, { user, session });
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        let user = null;
        for (const u of authService.users.values()) {
          if (u.email === body.email) {
            user = u;
            break;
          }
        }
        if (!user) return sendJson(401, { error: 'Invalid credentials' });
        const session = authService.createSession(user.id);
        return sendJson(200, { user, session });
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const user = getAuthenticatedUser();
        return sendJson(200, { user });
      }

      // =========================================================================
      // 4. Reverse-Engineering APIs (Phase 4)
      // =========================================================================
      if (pathname === '/api/investigations/capabilities' && req.method === 'GET') {
        const caps = await investigationManager.adapter.detectCapabilities();
        return sendJson(200, { capabilities: caps });
      }

      if (pathname === '/api/investigations' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const user = getAuthenticatedUser();

        try {
          const dossier = await investigationManager.createInvestigation({
            targetPath: body.targetPath,
            targetType: body.targetType,
            authorizationConfirmed: body.authorizationConfirmed === true,
            notes: body.notes,
          });

          await auditLogger.record({
            actorId: user.id,
            action: 'investigation_created',
            targetType: 'investigation',
            targetId: dossier.investigationId,
            details: { targetPath: body.targetPath, targetType: body.targetType },
          });

          return sendJson(201, { investigation: dossier });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      const invMatch = pathname.match(/^\/api\/investigations\/([a-zA-Z0-9-_]+)$/);
      if (invMatch && req.method === 'GET') {
        try {
          const dossier = investigationManager.getInvestigation(invMatch[1]);
          return sendJson(200, { investigation: dossier });
        } catch (err) {
          return sendJson(404, { error: err.message });
        }
      }

      const approveFindingMatch = pathname.match(/^\/api\/investigations\/([a-zA-Z0-9-_]+)\/findings\/([a-zA-Z0-9-_]+)\/approve$/);
      if (approveFindingMatch && req.method === 'POST') {
        try {
          const finding = investigationManager.approveFinding(approveFindingMatch[1], approveFindingMatch[2]);
          return sendJson(200, { finding });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      const rejectFindingMatch = pathname.match(/^\/api\/investigations\/([a-zA-Z0-9-_]+)\/findings\/([a-zA-Z0-9-_]+)\/reject$/);
      if (rejectFindingMatch && req.method === 'POST') {
        try {
          const finding = investigationManager.rejectFinding(rejectFindingMatch[1], rejectFindingMatch[2]);
          return sendJson(200, { finding });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      const exportReportMatch = pathname.match(/^\/api\/investigations\/([a-zA-Z0-9-_]+)\/export$/);
      if (exportReportMatch && req.method === 'GET') {
        try {
          const format = parsedUrl.query.format === 'markdown' ? 'markdown' : 'json';
          const report = investigationManager.exportReport(exportReportMatch[1], format);
          if (format === 'markdown') {
            res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
            return res.end(report);
          }
          return sendJson(200, { report });
        } catch (err) {
          return sendJson(404, { error: err.message });
        }
      }

      const convertReaMatch = pathname.match(/^\/api\/investigations\/([a-zA-Z0-9-_]+)\/convert-to-project$/);
      if (convertReaMatch && req.method === 'POST') {
        try {
          const user = getAuthenticatedUser();
          const spec = investigationManager.convertToAppSpecification(convertReaMatch[1]);
          const projectId = spec.metadata.id;

          const orchestrator = new AIOrchestrator({
            workspaceRoot,
            provider,
          });

          const projectWorkspace = path.join(workspaceRoot, projectId);
          const generatedFiles = orchestrator.tools.generateCode(spec);
          const writeResult = await orchestrator.tools.writeProject(generatedFiles);
          const previewHtml = renderAppToHtml(spec);

          const project = {
            id: projectId,
            name: spec.metadata.name,
            title: spec.metadata.title,
            prompt: `Derived from REA investigation ${convertReaMatch[1]}`,
            spec,
            requirements: null,
            plan: null,
            files: generatedFiles,
            previewHtml,
            status: 'active',
            ownerId: user.id,
            updatedAt: new Date().toISOString(),
          };

          projectsCache.set(projectId, project);

          await auditLogger.record({
            actorId: user.id,
            action: 'investigation_converted_to_project',
            targetType: 'project',
            targetId: projectId,
          });

          return sendJson(201, { project });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      // =========================================================================
      // 5. Component Registry Catalog API (Phase 2)
      // =========================================================================
      if (pathname === '/api/components' && req.method === 'GET') {
        const components = defaultRegistry.list().map(type => {
          const def = defaultRegistry.get(type);
          return {
            type,
            description: def.description,
            defaultProps: def.defaultProps,
            supportedEvents: def.supportedEvents,
            accessibility: def.accessibility,
          };
        });
        return sendJson(200, { components });
      }

      // =========================================================================
      // 6. Project Management APIs (Phase 5)
      // =========================================================================
      if (pathname === '/api/projects' && req.method === 'GET') {
        const search = (parsedUrl.query.search || '').toString().toLowerCase();
        const filterStatus = (parsedUrl.query.status || 'active').toString();

        const list = Array.from(projectsCache.values())
          .filter(p => {
            const matchesStatus = filterStatus === 'all' || (p.status || 'active') === filterStatus;
            const matchesSearch = !search || p.name.toLowerCase().includes(search) || p.title.toLowerCase().includes(search);
            return matchesStatus && matchesSearch;
          })
          .map(p => ({
            id: p.id,
            name: p.name,
            title: p.title,
            status: p.status || 'active',
            updatedAt: p.updatedAt,
          }));
        return sendJson(200, { projects: list });
      }

      if (pathname === '/api/projects' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const user = getAuthenticatedUser();
        const id = body.id || `proj_${Date.now()}`;
        const project = {
          id,
          name: body.name || id,
          title: body.title || 'Untitled Application',
          prompt: body.prompt || '',
          spec: null,
          files: [],
          requirements: null,
          plan: null,
          previewHtml: '',
          status: 'active',
          ownerId: user.id,
          updatedAt: new Date().toISOString(),
        };
        projectsCache.set(id, project);

        await auditLogger.record({
          actorId: user.id,
          action: 'project_created',
          targetType: 'project',
          targetId: id,
        });

        return sendJson(201, { project });
      }

      const projectMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)$/);
      if (projectMatch && req.method === 'GET') {
        const id = projectMatch[1];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });
        return sendJson(200, { project });
      }

      // Rename / update project (Phase 5.1)
      if (projectMatch && req.method === 'PUT') {
        const id = projectMatch[1];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });

        const body = await parseJsonBody(req);
        if (body.title) project.title = body.title;
        if (body.name) project.name = body.name;
        project.updatedAt = new Date().toISOString();

        return sendJson(200, { project });
      }

      // Archive project (Phase 5.1)
      const archiveMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/archive$/);
      if (archiveMatch && req.method === 'POST') {
        const id = archiveMatch[1];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });

        project.status = 'archived';
        project.updatedAt = new Date().toISOString();
        return sendJson(200, { project });
      }

      // Delete project (Phase 5.1 + Phase 6 RBAC)
      if (projectMatch && req.method === 'DELETE') {
        const id = projectMatch[1];
        const user = getAuthenticatedUser();
        if (!authService.canPerform(user.role, 'delete')) {
          return sendJson(403, { error: 'Permission Denied: Only project owners can delete projects.' });
        }

        const deleted = projectsCache.delete(id);
        if (!deleted) return sendJson(404, { error: `Project "${id}" not found` });

        await auditLogger.record({
          actorId: user.id,
          action: 'project_deleted',
          targetType: 'project',
          targetId: id,
        });

        return sendJson(200, { success: true, message: `Project ${id} deleted` });
      }

      // =========================================================================
      // 7. Generate Project from Prompt (Phase 3 Orchestration)
      // =========================================================================
      const generateMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/generate$/);
      if (generateMatch && req.method === 'POST') {
        const id = generateMatch[1];
        const body = await parseJsonBody(req);
        const userPrompt = body.prompt;

        if (!userPrompt || typeof userPrompt !== 'string') {
          return sendJson(400, { error: 'A valid "prompt" string is required' });
        }

        const orchestrator = new AIOrchestrator({
          workspaceRoot,
          provider,
          maxRepairAttempts: 3,
        });

        const logs = [];
        orchestrator.on('log', (entry) => logs.push(entry));

        const result = await orchestrator.executeWorkflow(userPrompt, {
          projectSlug: id,
        });

        if (!result.success) {
          return sendJson(500, { error: result.error, logs });
        }

        const project = {
          id,
          name: id,
          title: result.spec.metadata.title,
          prompt: userPrompt,
          spec: result.spec,
          requirements: result.requirements,
          plan: result.plan,
          files: result.files,
          previewHtml: result.previewHtml,
          repairAttempts: result.repairAttempts,
          status: 'active',
          logs,
          updatedAt: new Date().toISOString(),
        };

        projectsCache.set(id, project);
        return sendJson(200, { project, logs });
      }

      // Standalone Preview endpoint
      const previewMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/preview$/);
      if (previewMatch && req.method === 'GET') {
        const id = previewMatch[1];
        const project = projectsCache.get(id);
        if (!project || !project.spec) {
          return sendHtml(404, '<h1>No preview available for this project</h1>');
        }
        const theme = parsedUrl.query.theme || project.spec.theme?.mode || 'light';
        const html = renderAppToHtml(project.spec, { theme });
        return sendHtml(200, html);
      }

      // =========================================================================
      // 8. Build Runner & Deployment APIs (Phase 7)
      // =========================================================================
      const buildMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/build$/);
      if (buildMatch && req.method === 'POST') {
        const id = buildMatch[1];
        const project = projectsCache.get(id);
        if (!project || !project.spec) {
          return sendJson(400, { error: `Project "${id}" has no specification to build.` });
        }

        const projectWorkspace = path.join(workspaceRoot, id);
        const record = await buildRunner.runBuild({
          projectId: id,
          workspacePath: projectWorkspace,
          spec: project.spec,
        });

        project.latestBuild = record;
        project.buildHistory = project.buildHistory || [];
        project.buildHistory.push(record);

        return sendJson(record.status === 'success' ? 200 : 500, { build: record });
      }

      const listBuildsMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/builds$/);
      if (listBuildsMatch && req.method === 'GET') {
        const id = listBuildsMatch[1];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });
        return sendJson(200, { builds: project.buildHistory || [] });
      }

      const deployMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/deploy$/);
      if (deployMatch && req.method === 'POST') {
        const id = deployMatch[1];
        const project = projectsCache.get(id);
        if (!project || !project.latestBuild) {
          return sendJson(400, { error: `Project "${id}" has no successful build to deploy. Run a build first.` });
        }

        const body = await parseJsonBody(req);
        const user = getAuthenticatedUser();

        try {
          const deployment = await deploymentManager.deploy({
            buildRecord: project.latestBuild,
            projectId: id,
            provider: body.provider || 'local_preview',
            targetEnvironment: body.environment || 'preview',
            userApprovalConfirmed: body.userApprovalConfirmed === true,
            actorId: user.id,
          });

          await auditLogger.record({
            actorId: user.id,
            action: 'deployment_created',
            targetType: 'deployment',
            targetId: deployment.deploymentId,
            details: { environment: deployment.targetEnvironment, url: deployment.url },
          });

          return sendJson(200, { deployment });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      const rollbackMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)\/deployments\/([a-zA-Z0-9-_]+)\/rollback$/);
      if (rollbackMatch && req.method === 'POST') {
        const id = rollbackMatch[1];
        const depId = rollbackMatch[2];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });

        const body = await parseJsonBody(req);
        const user = getAuthenticatedUser();
        const targetBuildId = body.targetBuildId;

        const targetBuild = (project.buildHistory || []).find(b => b.buildId === targetBuildId) || project.latestBuild;
        if (!targetBuild) {
          return sendJson(400, { error: `Target build "${targetBuildId}" not found in project build history.` });
        }

        try {
          const rollbackRecord = await deploymentManager.rollback({
            deploymentId: depId,
            targetBuildRecord: targetBuild,
            actorId: user.id,
          });

          await auditLogger.record({
            actorId: user.id,
            action: 'deployment_rolled_back',
            targetType: 'deployment',
            targetId: depId,
            details: { rollbackDeploymentId: rollbackRecord.deploymentId },
          });

          return sendJson(200, { rollback: rollbackRecord });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      }

      // =========================================================================
      // 404 Catch-All
      // =========================================================================
      return sendJson(404, { error: `Route not found: ${req.method} ${pathname}` });
    } catch (err) {
      console.error('[API Server Error]', err);
      return sendJson(500, { error: 'Internal Server Error', message: err.message });
    }
  });

  return server;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

async function getStudioHtml() {
  const studioFile = path.resolve(import.meta.dirname, '../../studio/index.html');
  try {
    return await fs.readFile(studioFile, 'utf8');
  } catch {
    return '<h1>ForgeOS Studio</h1><p>Studio frontend is loading...</p>';
  }
}

// Automatically start if run as script
if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ ForgeOS API & Studio listening on http://0.0.0.0:${PORT}`);
  });
}
