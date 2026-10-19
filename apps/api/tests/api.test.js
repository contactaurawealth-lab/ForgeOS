import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createServer } from '../src/server.js';
import { MockProvider } from '@forgeos/provider-adapters';

describe('ForgeOS Full API & Server Integration Suite (Phases 1–7)', () => {
  let server;
  let baseUrl;
  let tmpWorkspace;

  before(async () => {
    tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-full-api-test-'));
    server = createServer({
      workspaceRoot: tmpWorkspace,
      provider: new MockProvider(),
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(tmpWorkspace, { recursive: true, force: true });
  });

  // =========================================================================
  // Phase 1: Foundation & Health
  // =========================================================================
  test('GET /health returns platform metadata and status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.platform, 'ForgeOS');
    assert.equal(data.version, '1.0.0');
    assert.equal(data.provider, 'mock');
  });

  test('GET / serves Studio web application', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('ForgeOS Studio'));
  });

  // =========================================================================
  // Phase 2: Component Registry Catalog
  // =========================================================================
  test('GET /api/components returns catalog of UI components', async () => {
    const res = await fetch(`${baseUrl}/api/components`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.components));
    const types = data.components.map(c => c.type);
    assert.ok(types.includes('Container'));
    assert.ok(types.includes('Card'));
    assert.ok(types.includes('Button'));
  });

  // =========================================================================
  // Phase 6: Auth & Sessions
  // =========================================================================
  test('POST /api/auth/register and /api/auth/login manage sessions', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eng@forgeos.local', name: 'Software Engineer' }),
    });
    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.user.email, 'eng@forgeos.local');
    assert.ok(regData.session.token);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eng@forgeos.local' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.session.token);

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.session.token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, 'eng@forgeos.local');
  });

  // =========================================================================
  // Phase 5: Project Management & Lifecycle (Create, Rename, Archive, Search)
  // =========================================================================
  test('manages project lifecycle: create, rename, archive, search', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'proj_lifecycle', title: 'Initial Project Title' }),
    });
    assert.equal(createRes.status, 201);

    // 2. Rename
    const updateRes = await fetch(`${baseUrl}/api/projects/proj_lifecycle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed Project Title' }),
    });
    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.project.title, 'Renamed Project Title');

    // 3. Search
    const searchRes = await fetch(`${baseUrl}/api/projects?search=Renamed`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.equal(searchData.projects.length, 1);
    assert.equal(searchData.projects[0].id, 'proj_lifecycle');

    // 4. Archive
    const archiveRes = await fetch(`${baseUrl}/api/projects/proj_lifecycle/archive`, {
      method: 'POST',
    });
    assert.equal(archiveRes.status, 200);
    const archiveData = await archiveRes.json();
    assert.equal(archiveData.project.status, 'archived');
  });

  // =========================================================================
  // Phase 4: Reverse-Engineering Investigations
  // =========================================================================
  test('manages REA investigations: capabilities, SSRF guard, approve findings, convert', async () => {
    // 1. Capabilities
    const capRes = await fetch(`${baseUrl}/api/investigations/capabilities`);
    assert.equal(capRes.status, 200);
    const capData = await capRes.json();
    assert.equal(capData.capabilities.available, true);

    // 2. SSRF check blocks loopback URL
    const ssrfRes = await fetch(`${baseUrl}/api/investigations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPath: 'http://127.0.0.1:8080/evil.js',
        targetType: 'javascript_bundle',
        authorizationConfirmed: true,
      }),
    });
    assert.equal(ssrfRes.status, 400);
    const ssrfData = await ssrfRes.json();
    assert.ok(ssrfData.error.includes('SSRF Blocked'));

    // 3. Valid Investigation Creation
    const createInvRes = await fetch(`${baseUrl}/api/investigations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPath: 'https://example.com/app.js',
        targetType: 'javascript_bundle',
        authorizationConfirmed: true,
        notes: 'Authorized audit',
      }),
    });
    assert.equal(createInvRes.status, 201);
    const invData = await createInvRes.json();
    const invId = invData.investigation.investigationId;
    assert.ok(invId);

    // 4. Approve finding
    const findingId = invData.investigation.findings[0].id;
    const approveRes = await fetch(`${baseUrl}/api/investigations/${invId}/findings/${findingId}/approve`, {
      method: 'POST',
    });
    assert.equal(approveRes.status, 200);

    // 5. Export Markdown report
    const exportRes = await fetch(`${baseUrl}/api/investigations/${invId}/export?format=markdown`);
    assert.equal(exportRes.status, 200);
    const md = await exportRes.text();
    assert.ok(md.includes('ForgeOS Investigation Report'));
    assert.ok(md.includes('[APPROVED]'));

    // 6. Convert to ForgeOS project
    const convertRes = await fetch(`${baseUrl}/api/investigations/${invId}/convert-to-project`, {
      method: 'POST',
    });
    assert.equal(convertRes.status, 201);
    const convertedData = await convertRes.json();
    assert.ok(convertedData.project.id);
    assert.ok(convertedData.project.spec);
  });

  // =========================================================================
  // Phase 3 & 7: Generation, Build Runner, and Deployment Pipeline
  // =========================================================================
  test('runs generation, build runner, and deployment workflow with rollback', async () => {
    const projectId = 'proj_full_flow';

    // 1. Generate Application (Phase 3)
    const genRes = await fetch(`${baseUrl}/api/projects/${projectId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.',
      }),
    });
    assert.equal(genRes.status, 200);

    // 2. Build Pipeline (Phase 7.1)
    const buildRes = await fetch(`${baseUrl}/api/projects/${projectId}/build`, {
      method: 'POST',
    });
    assert.equal(buildRes.status, 200);
    const buildData = await buildRes.json();
    assert.equal(buildData.build.status, 'success');
    assert.ok(buildData.build.artifacts.length >= 4);

    // 3. List Builds
    const listBuildsRes = await fetch(`${baseUrl}/api/projects/${projectId}/builds`);
    assert.equal(listBuildsRes.status, 200);
    const listBuildsData = await listBuildsRes.json();
    assert.equal(listBuildsData.builds.length, 1);

    // 4. Deploy to Local Preview (Phase 7.4)
    const deployRes = await fetch(`${baseUrl}/api/projects/${projectId}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'local_preview',
        environment: 'preview',
      }),
    });
    assert.equal(deployRes.status, 200);
    const deployData = await deployRes.json();
    assert.equal(deployData.deployment.status, 'active');
    assert.ok(deployData.deployment.url.includes('/preview/'));

    // 5. Test isolated preview host route (Phase 5.4)
    const previewHostRes = await fetch(`${baseUrl}/preview/${projectId}`);
    assert.equal(previewHostRes.status, 200);
    const previewHtml = await previewHostRes.text();
    assert.ok(previewHtml.includes('Study Dashboard'));
  });
});
