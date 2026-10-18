import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderNode, renderRoute, renderAppToHtml } from '../src/index.js';
import { defaultRegistry } from '@forgeos/ui-kit';

describe('ForgeOS UI Runtime', () => {
  const sampleSpec = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'proj_preview_1',
      name: 'preview-test',
      title: 'Preview Test Application',
    },
    theme: {
      mode: 'light',
    },
    routes: [
      {
        id: 'r_dash',
        path: '/',
        title: 'Dashboard',
        rootComponent: {
          id: 'container_main',
          type: 'Container',
          props: { maxWidth: '1000px' },
          children: [
            {
              id: 'h1',
              type: 'Heading',
              props: { level: 1, text: 'Welcome to Preview' },
              children: [],
            },
            {
              id: 'btn1',
              type: 'Button',
              props: { text: 'Click Me', action: 'doAction' },
              children: [],
            },
          ],
        },
      },
    ],
    state: [
      { key: 'count', type: 'number', initialValue: 0 },
    ],
    actions: [
      { name: 'doAction', type: 'set_state', target: 'count', payload: 1 },
    ],
  };

  test('renders component nodes hierarchically', () => {
    const { html, errors } = renderRoute(sampleSpec, '/');
    assert.equal(errors.length, 0);
    assert.ok(html.includes('Welcome to Preview'));
    assert.ok(html.includes('data-forge-action="doAction"'));
    assert.ok(html.includes('forge-container'));
  });

  test('contains failures in an Error Boundary when encountering unsupported components', () => {
    const badSpec = {
      ...sampleSpec,
      routes: [
        {
          id: 'r_bad',
          path: '/',
          title: 'Bad Route',
          rootComponent: {
            id: 'c_nonexistent',
            type: 'UnicornComponent',
            props: {},
            children: [],
          },
        },
      ],
    };

    const { html, errors } = renderRoute(badSpec, '/');
    assert.equal(errors.length, 1);
    assert.ok(errors[0].error.includes('Unsupported component type: "UnicornComponent"'));
    assert.ok(html.includes('forge-error-boundary'));
    assert.ok(html.includes('Component Error'));
  });

  test('generates valid standalone HTML page with theme CSS and viewport', () => {
    const fullHtml = renderAppToHtml(sampleSpec, { path: '/' });
    assert.ok(fullHtml.includes('<!DOCTYPE html>'));
    assert.ok(fullHtml.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0"'));
    assert.ok(fullHtml.includes('--forge-primary'));
    assert.ok(fullHtml.includes('forge-app-root'));
    assert.ok(fullHtml.includes('window.forgeRuntime'));
  });

  test('safely escapes malicious HTML/XSS in props', () => {
    const xssSpec = {
      ...sampleSpec,
      routes: [
        {
          id: 'r_xss',
          path: '/',
          title: 'XSS Test',
          rootComponent: {
            id: 'c_xss',
            type: 'Heading',
            props: { level: 2, text: '<script>alert("pwned")</script>' },
            children: [],
          },
        },
      ],
    };

    const { html } = renderRoute(xssSpec, '/');
    assert.ok(!html.includes('<script>alert("pwned")</script>'));
    assert.ok(html.includes('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;'));
  });
});
