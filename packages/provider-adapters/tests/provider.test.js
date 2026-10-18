import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockProvider,
  createProvider,
  ProviderError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
} from '../src/index.js';

describe('ForgeOS Provider Adapters', () => {
  test('creates MockProvider by default', () => {
    const provider = createProvider();
    assert.equal(provider.name, 'mock');
    assert.equal(provider.isMock, true);
  });

  test('MockProvider generates structured requirements document', async () => {
    const provider = new MockProvider();
    const result = await provider.generateStructured({
      prompt: 'Analyse requirements for a study dashboard application',
    });

    assert.ok(result.goal);
    assert.ok(result.coreFeatures.length > 0);
    assert.ok(result.uiComponents.length > 0);
    assert.ok(result.targetUsers.length > 0);
  });

  test('MockProvider generates dependency-aware execution plan', async () => {
    const provider = new MockProvider();
    const plan = await provider.generateStructured({
      prompt: 'Create execution plan for application',
    });

    assert.ok(plan.planId);
    assert.ok(plan.tasks.length >= 3);
    assert.equal(plan.tasks[0].status, 'pending');
    assert.ok(plan.tasks[1].dependencies.includes('task_1'));
  });

  test('MockProvider generates valid application specification', async () => {
    const provider = new MockProvider();
    const spec = await provider.generateStructured({
      prompt: 'Generate complete application specification',
    });

    assert.equal(spec.schemaVersion, '1.0.0');
    assert.equal(spec.metadata.title, 'StudyOS — Responsive Study Dashboard');
    assert.ok(spec.routes.length > 0);
  });

  test('handles cancellation via AbortSignal', async () => {
    const provider = new MockProvider();
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      async () => {
        await provider.generateStructured({
          prompt: 'test',
          signal: controller.signal,
        });
      },
      (err) => err instanceof TimeoutError
    );
  });

  test('error classes have correct prototype and attributes', () => {
    const authErr = new AuthenticationError('Unauthorized', { statusCode: 401 });
    assert.equal(authErr.name, 'AuthenticationError');
    assert.equal(authErr.statusCode, 401);
    assert.equal(authErr.isRetryable, false);

    const rateErr = new RateLimitError('Rate limit', { statusCode: 429 });
    assert.equal(rateErr.name, 'RateLimitError');
    assert.equal(rateErr.isRetryable, true);
  });
});
