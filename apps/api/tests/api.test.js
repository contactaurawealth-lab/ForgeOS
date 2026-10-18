import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createServer } from '../src/server.js';
import { MockProvider } from '@forgeos/provider-adapters';

describe('ForgeOS API & Server Endpoints', () => {
  let server;
  let baseUrl;
  let tmpWorkspace;

  before(async () => {
    tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-api-test-'));
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
    assert.ok(html.includes('btnGenerate'));
  });

  test('GET /api/components returns catalog of UI components', async () => {
    const res = await fetch(`${baseUrl}/api/components`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.components));
    const types = data.components.map(c => c.type);
    assert.ok(types.includes('Container'));
    assert.ok(types.includes('Card'));
    assert.ok(types.includes('Button'));
    assert.ok(types.includes('ProgressBar'));
  });

  test('POST /api/projects creates new project record', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test App', prompt: 'Sample prompt' }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.project.id);
    assert.equal(data.project.title, 'Test App');
  });

  test('POST /api/projects/:id/generate runs autonomous workflow and renders preview', async () => {
    const projectId = 'proj_integration_slice';
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create a responsive study dashboard with subject cards, progress indicators, a task list and a form to add tasks. Include light and dark themes.',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.project);
    assert.equal(data.project.id, projectId);
    assert.ok(data.project.spec);
    assert.ok(data.project.requirements);
    assert.ok(data.project.plan);
    assert.ok(data.project.files.length >= 4);

    // Verify preview endpoint works
    const previewRes = await fetch(`${baseUrl}/api/projects/${projectId}/preview`);
    assert.equal(previewRes.status, 200);
    const previewHtml = await previewRes.text();
    assert.ok(previewHtml.includes('<!DOCTYPE html>'));
    assert.ok(previewHtml.includes('Study Dashboard'));
  });
});
