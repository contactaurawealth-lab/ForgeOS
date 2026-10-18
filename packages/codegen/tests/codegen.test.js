import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  generateSourceFiles,
  computeUnifiedDiff,
  writeGeneratedProject,
} from '../src/index.js';

describe('ForgeOS Code Generation Engine', () => {
  const sampleSpec = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'proj_codegen_1',
      name: 'codegen-test',
      title: 'Codegen Test App',
      version: '1.0.0',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    },
    theme: { mode: 'light' },
    routes: [
      {
        id: 'r_main',
        path: '/',
        title: 'Home',
        rootComponent: {
          id: 'c_root',
          type: 'Container',
          props: {},
          children: [],
        },
      },
    ],
    state: [
      { key: 'status', type: 'string', initialValue: 'ready' },
    ],
    actions: [],
  };

  test('generates source files deterministically', () => {
    const run1 = generateSourceFiles(sampleSpec);
    const run2 = generateSourceFiles(sampleSpec);

    assert.equal(run1.length, run2.length);
    for (let i = 0; i < run1.length; i++) {
      assert.equal(run1[i].filePath, run2[i].filePath);
      assert.equal(run1[i].hash, run2[i].hash);
      assert.equal(run1[i].content, run2[i].content);
    }
  });

  test('computes unified line diff correctly', () => {
    const oldText = 'line 1\nline 2\nline 3';
    const newText = 'line 1\nline 2 modified\nline 3\nline 4';
    const diff = computeUnifiedDiff(oldText, newText, 'test.txt');

    assert.ok(diff.includes('--- a/test.txt'));
    assert.ok(diff.includes('+++ b/test.txt'));
    assert.ok(diff.includes('-line 2'));
    assert.ok(diff.includes('+line 2 modified'));
    assert.ok(diff.includes('+line 4'));
  });

  test('writes project files to disk and preserves user modifications', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-test-'));

    try {
      const files = generateSourceFiles(sampleSpec);
      // Initial write
      const writeResult1 = await writeGeneratedProject(tmpDir, files);
      assert.ok(writeResult1.created.length > 0);
      assert.ok(writeResult1.created.includes('src/App.tsx'));

      // Simulate user editing src/App.tsx
      const appPath = path.join(tmpDir, 'src/App.tsx');
      await fs.writeFile(appPath, '// User-authored custom edits\nexport default function App() {}', 'utf8');

      // Re-run code generation with preserve_user strategy
      const writeResult2 = await writeGeneratedProject(tmpDir, files, { conflictStrategy: 'preserve_user' });
      assert.ok(writeResult2.preserved.includes('src/App.tsx'));

      // Check user edits were kept intact
      const diskContent = await fs.readFile(appPath, 'utf8');
      assert.ok(diskContent.includes('User-authored custom edits'));

      // Check that a .generated sidecar was written for inspection
      const generatedSidecar = await fs.readFile(`${appPath}.generated`, 'utf8');
      assert.ok(generatedSidecar.includes('Main Application Component'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('rejects path traversal attempts outside workspace', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-traversal-'));
    try {
      const maliciousFiles = [
        {
          filePath: '../../evil.txt',
          content: 'malicious',
          hash: '123',
          isUserEditable: false,
        },
      ];
      await assert.rejects(
        async () => {
          await writeGeneratedProject(tmpDir, maliciousFiles);
        },
        /Security Violation/
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
