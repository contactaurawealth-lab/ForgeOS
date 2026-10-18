import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { defaultRegistry, ComponentRegistry } from '../src/index.js';

describe('ForgeOS UI Kit & Component Registry', () => {
  test('has core components registered by default', () => {
    assert.ok(defaultRegistry.has('Container'));
    assert.ok(defaultRegistry.has('Heading'));
    assert.ok(defaultRegistry.has('Grid'));
    assert.ok(defaultRegistry.has('Card'));
    assert.ok(defaultRegistry.has('StatCard'));
    assert.ok(defaultRegistry.has('Button'));
    assert.ok(defaultRegistry.has('Input'));
    assert.ok(defaultRegistry.has('ProgressBar'));
    assert.ok(defaultRegistry.has('Badge'));
    assert.ok(defaultRegistry.has('List'));
    assert.ok(defaultRegistry.has('BarChart'));
  });

  test('validates component props against schema', () => {
    const validProps = defaultRegistry.validateProps('Heading', { level: 2, text: 'Hello ForgeOS' });
    assert.equal(validProps.level, 2);
    assert.equal(validProps.text, 'Hello ForgeOS');

    // Invalid prop (level 99)
    assert.throws(() => {
      defaultRegistry.validateProps('Heading', { level: 99, text: 'Bad' });
    });
  });

  test('allows registering custom components without modifying core runtime', () => {
    const registry = new ComponentRegistry();
    registry.register({
      type: 'CustomAlert',
      propSchema: z.object({
        message: z.string(),
        severity: z.enum(['info', 'critical']).default('info'),
      }),
      defaultProps: { message: '', severity: 'info' },
      supportedEvents: ['onDismiss'],
      accessibility: { defaultAriaRole: 'alert' },
      description: 'A custom alert banner',
      render: (node) => `<div role="alert">${node.props.message}</div>`,
    });

    assert.ok(registry.has('CustomAlert'));
    const def = registry.get('CustomAlert');
    assert.equal(def.accessibility.defaultAriaRole, 'alert');
    const html = def.render({ props: { message: 'Deployment completed' } });
    assert.equal(html, '<div role="alert">Deployment completed</div>');
  });

  test('renders Button with safe attributes and events', () => {
    const btn = defaultRegistry.get('Button');
    const html = btn.render({
      id: 'btn_1',
      props: { text: 'Create Task', variant: 'primary', action: 'addTask' },
    });
    assert.ok(html.includes('data-forge-action="addTask"'));
    assert.ok(html.includes('Create Task'));
    assert.ok(html.includes('forge-btn-primary'));
  });
});
