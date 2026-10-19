import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ReaAdapter,
  InvestigationManager,
  validateTargetUrl,
  redactSensitiveData,
} from '../src/index.js';

describe('Phase 4: REA Adapter & Investigation Engine', () => {
  test('discovers supported capabilities and engine version', async () => {
    const adapter = new ReaAdapter({ engineVersion: '6.7.0' });
    const caps = await adapter.detectCapabilities();
    assert.equal(caps.available, true);
    assert.equal(caps.engineVersion, '6.7.0');
    assert.ok(caps.supportedTargets.includes('javascript_bundle'));
    assert.ok(caps.supportedTargets.includes('web_application'));
    assert.ok(caps.ssrfGuardsEnabled);
  });

  describe('SSRF Protection Guards', () => {
    test('blocks loopback and private networks', () => {
      assert.equal(validateTargetUrl('http://127.0.0.1:8080/bundle.js').valid, false);
      assert.equal(validateTargetUrl('http://localhost:3000/app.js').valid, false);
      assert.equal(validateTargetUrl('http://10.0.1.5/bundle.js').valid, false);
      assert.equal(validateTargetUrl('http://192.168.1.100/main.js').valid, false);
      assert.equal(validateTargetUrl('http://172.20.0.1/app.js').valid, false);
    });

    test('blocks cloud metadata endpoints', () => {
      assert.equal(validateTargetUrl('http://169.254.169.254/latest/meta-data').valid, false);
      assert.equal(validateTargetUrl('http://metadata.google.internal/computeMetadata/v1').valid, false);
    });

    test('blocks non-HTTP protocols', () => {
      assert.equal(validateTargetUrl('file:///etc/passwd').valid, false);
      assert.equal(validateTargetUrl('gopher://127.0.0.1/1').valid, false);
    });

    test('permits valid public HTTP/HTTPS URLs', () => {
      assert.equal(validateTargetUrl('https://example.com/assets/app.js').valid, true);
      assert.equal(validateTargetUrl('https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js').valid, true);
    });
  });

  describe('Credential Redaction', () => {
    test('redacts API keys and Bearer tokens from strings', () => {
      const raw = 'Config: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz and sk-abc12345678901234567890';
      const clean = redactSensitiveData(raw);
      assert.ok(!clean.includes('eyJhbGci'));
      assert.ok(clean.includes('Bearer [REDACTED_TOKEN]'));
      assert.ok(clean.includes('[REDACTED_API_KEY]'));
    });

    test('redacts sensitive fields in nested object graphs', () => {
      const payload = {
        app: 'Test',
        apiKey: 'secret_key_12345',
        nested: {
          authorization: 'Bearer token_abc123',
          normalData: 'Safe information',
        },
      };
      const clean = redactSensitiveData(payload);
      assert.equal(clean.apiKey, '[REDACTED]');
      assert.equal(clean.nested.authorization, '[REDACTED]');
      assert.equal(clean.nested.normalData, 'Safe information');
    });
  });

  describe('Investigation Lifecycle & Dossier Generation', () => {
    test('requires explicit authorization acknowledgment', async () => {
      const manager = new InvestigationManager();
      await assert.rejects(
        async () => {
          await manager.createInvestigation({
            targetPath: 'https://example.com/bundle.js',
            targetType: 'javascript_bundle',
            authorizationConfirmed: false,
          });
        },
        /Authorization Denied/
      );
    });

    test('creates investigation, approves findings, and converts to valid AppSpecification', async () => {
      const manager = new InvestigationManager();
      const dossier = await manager.createInvestigation({
        targetPath: 'https://example.com/app.js',
        targetType: 'javascript_bundle',
        authorizationConfirmed: true,
        notes: 'Authorized audit of frontend dashboard bundle',
      });

      assert.ok(dossier.investigationId);
      assert.ok(dossier.findings.length > 0);
      assert.ok(dossier.disclaimer.includes('ForgeOS does NOT extract proprietary backend source code'));

      // Approve route and component findings
      const f1 = dossier.findings[0];
      const f2 = dossier.findings[1];
      manager.approveFinding(dossier.investigationId, f1.id);
      manager.approveFinding(dossier.investigationId, f2.id);

      // Verify findings state
      const updatedDossier = manager.getInvestigation(dossier.investigationId);
      assert.equal(updatedDossier.findings.find(f => f.id === f1.id).approved, true);

      // Convert approved findings to AppSpecification
      const spec = manager.convertToAppSpecification(dossier.investigationId);
      assert.equal(spec.schemaVersion, '1.0.0');
      assert.ok(spec.metadata.id.startsWith('proj_rea_'));
      assert.ok(spec.routes.length > 0);

      // Export report in markdown
      const mdReport = manager.exportReport(dossier.investigationId, 'markdown');
      assert.ok(mdReport.includes('# ForgeOS Investigation Report'));
      assert.ok(mdReport.includes('[APPROVED]'));
    });

    test('rejects converting investigation with zero approved findings', async () => {
      const manager = new InvestigationManager();
      const dossier = await manager.createInvestigation({
        targetPath: 'bundle.js',
        targetType: 'javascript_bundle',
        authorizationConfirmed: true,
      });

      assert.throws(
        () => manager.convertToAppSpecification(dossier.investigationId),
        /No findings have been approved/
      );
    });
  });
});
