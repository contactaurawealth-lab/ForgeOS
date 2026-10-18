import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { AIOrchestrator } from '@forgeos/ai-orchestrator';
import { safeValidateAppSpecification } from '@forgeos/app-schema';
import { renderAppToHtml } from '@forgeos/ui-runtime';
import { defaultRegistry } from '@forgeos/ui-kit';
import { createProvider } from '@forgeos/provider-adapters';

const PORT = parseInt(process.env.PORT || '3000', 10);
const WORKSPACE_ROOT = path.resolve(process.env.FORGEOS_WORKSPACE_ROOT || './projects');

// In-memory project cache with filesystem backing
const projectsCache = new Map();

/**
 * Creates and initializes the ForgeOS API HTTP server
 */
export function createServer(options = {}) {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const provider = options.provider || createProvider();

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

    try {
      // 1. Health check endpoint
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

      // 2. Studio Web App UI
      if ((pathname === '/' || pathname === '/studio') && req.method === 'GET') {
        const studioHtml = await getStudioHtml();
        return sendHtml(200, studioHtml);
      }

      // 3. Components Catalog API
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

      // 4. List Projects
      if (pathname === '/api/projects' && req.method === 'GET') {
        const list = Array.from(projectsCache.values()).map(p => ({
          id: p.id,
          name: p.name,
          title: p.title,
          updatedAt: p.updatedAt,
        }));
        return sendJson(200, { projects: list });
      }

      // 5. Create Project
      if (pathname === '/api/projects' && req.method === 'POST') {
        const body = await parseJsonBody(req);
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
          updatedAt: new Date().toISOString(),
        };
        projectsCache.set(id, project);
        return sendJson(201, { project });
      }

      // 6. Get Project by ID
      const projectMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9-_]+)$/);
      if (projectMatch && req.method === 'GET') {
        const id = projectMatch[1];
        const project = projectsCache.get(id);
        if (!project) return sendJson(404, { error: `Project "${id}" not found` });
        return sendJson(200, { project });
      }

      // 7. Generate Project from Prompt (Workflow Execution)
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
          logs,
          updatedAt: new Date().toISOString(),
        };

        projectsCache.set(id, project);
        return sendJson(200, { project, logs });
      }

      // 8. Standalone Preview endpoint
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

      // 404 Catch-All
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
