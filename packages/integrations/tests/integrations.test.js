import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  SecretManager,
  AuthService,
  StructuredDatabase,
  AuditLogger,
} from '../src/index.js';

describe('Phase 6: Integrations, Database & Auth Framework', () => {
  describe('SecretManager', () => {
    test('encrypts and decrypts secret strings reversibly', () => {
      const sm = new SecretManager('test-key-entropy-12345');
      const secret = 'sk-proj-test-super-secret-key-123';
      const encrypted = sm.encrypt(secret);
      assert.notEqual(encrypted, secret);
      assert.ok(encrypted.includes(':'));

      const decrypted = sm.decrypt(encrypted);
      assert.equal(decrypted, secret);
    });

    test('masks secrets safely for logs and UI display', () => {
      const sm = new SecretManager();
      assert.equal(sm.mask('sk-proj-abcdef1234567890'), 'sk-...890');
      assert.equal(sm.mask('short'), '******');
      assert.equal(sm.mask(''), '******');
    });
  });

  describe('AuthService & RBAC', () => {
    test('registers users and handles session tokens', () => {
      const auth = new AuthService();
      const user = auth.registerUser({
        email: 'dev@forgeos.local',
        name: 'Developer Alice',
        role: 'developer',
      });
      assert.equal(user.email, 'dev@forgeos.local');
      assert.equal(user.role, 'developer');

      const session = auth.createSession(user.id);
      assert.ok(session.token.startsWith('fst_'));

      const verified = auth.validateSession(session.token);
      assert.equal(verified.id, user.id);

      auth.revokeSession(session.token);
      assert.equal(auth.validateSession(session.token), null);
    });

    test('enforces RBAC permissions correctly', () => {
      const auth = new AuthService();
      assert.equal(auth.canPerform('owner', 'deploy'), true);
      assert.equal(auth.canPerform('owner', 'delete'), true);

      assert.equal(auth.canPerform('developer', 'build'), true);
      assert.equal(auth.canPerform('developer', 'write'), true);
      assert.equal(auth.canPerform('developer', 'deploy'), false);
      assert.equal(auth.canPerform('developer', 'delete'), false);

      assert.equal(auth.canPerform('viewer', 'read'), true);
      assert.equal(auth.canPerform('viewer', 'write'), false);
    });
  });

  describe('StructuredDatabase & AuditLogger', () => {
    test('performs ACID CRUD operations with filesystem persistence', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forgeos-db-'));
      const dbPath = path.join(tmpDir, 'test-db.json');

      try {
        const db = new StructuredDatabase(dbPath);
        await db.load();

        const project = await db.insert('projects', {
          title: 'StudyOS Platform',
          ownerId: 'usr_admin',
        });
        assert.ok(project.id);
        assert.equal(project.title, 'StudyOS Platform');

        const found = await db.findById('projects', project.id);
        assert.equal(found.title, 'StudyOS Platform');

        await db.update('projects', project.id, { title: 'StudyOS Re-architected' });
        const updated = await db.findById('projects', project.id);
        assert.equal(updated.title, 'StudyOS Re-architected');

        const logger = new AuditLogger(db);
        const event = await logger.record({
          actorId: 'usr_admin',
          action: 'project_updated',
          targetType: 'project',
          targetId: project.id,
          status: 'success',
        });
        assert.equal(event.status, 'success');

        const auditLogs = await db.find('audit_logs');
        assert.equal(auditLogs.length, 1);
        assert.equal(auditLogs[0].action, 'project_updated');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
