import { defaultRegistry } from '@forgeos/ui-kit';
import { generateCssVariables } from '@forgeos/design-system';
import { safeValidateAppSpecification } from '@forgeos/app-schema';

/**
 * Render context containing active state, registry, and helpers
 * @typedef {Object} RenderContext
 * @property {import('@forgeos/ui-kit').ComponentRegistry} registry
 * @property {Record<string, unknown>} state
 * @property {(children: any[]) => string} renderChildren
 * @property {Array<{ componentId: string; error: string }>} errors
 */

/**
 * Renders a single component node with failure containment (Error Boundary)
 * @param {any} node
 * @param {RenderContext} context
 * @returns {string}
 */
export function renderNode(node, context) {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const registry = context.registry || defaultRegistry;
  const def = registry.get(node.type);

  if (!def) {
    const errorMsg = `Unsupported component type: "${node.type}"`;
    context.errors.push({ componentId: node.id || 'unknown', error: errorMsg });
    // Error boundary containment UI
    return `
      <div class="forge-error-boundary" role="alert" style="background: var(--forge-error-surface, #fef2f2); border: 1px solid var(--forge-error, #dc2626); border-radius: var(--forge-radius-md, 8px); padding: 12px 16px; margin: 8px 0; font-family: sans-serif;">
        <div style="font-size: 0.8125rem; font-weight: 600; color: var(--forge-error, #dc2626); margin-bottom: 4px;">Component Error</div>
        <div style="font-size: 0.75rem; color: var(--forge-text-secondary, #475569);">${escapeHtml(errorMsg)} (ID: ${escapeHtml(node.id || 'unknown')})</div>
      </div>
    `.trim();
  }

  try {
    const validatedProps = registry.validateProps(node.type, node.props || {});
    const nodeWithProps = { ...node, props: validatedProps };

    const childRenderer = (children) => {
      if (!Array.isArray(children)) return '';
      return children.map((c) => renderNode(c, context)).join('');
    };

    return def.render(nodeWithProps, {
      ...context,
      renderChildren: childRenderer,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    context.errors.push({ componentId: node.id || 'unknown', error: errorMsg });
    return `
      <div class="forge-error-boundary" role="alert" style="background: var(--forge-error-surface, #fef2f2); border: 1px solid var(--forge-error, #dc2626); border-radius: var(--forge-radius-md, 8px); padding: 12px; margin: 8px 0;">
        <span style="font-size: 0.75rem; color: var(--forge-error, #dc2626);">Failed to render "${node.type}": ${escapeHtml(errorMsg)}</span>
      </div>
    `.trim();
  }
}

/**
 * Renders an entire route within an application specification
 * @param {any} spec
 * @param {string} [currentPath='/']
 * @param {object} [options]
 */
export function renderRoute(spec, currentPath = '/', options = {}) {
  const validation = safeValidateAppSpecification(spec);
  if (!validation.success) {
    throw new Error(`Invalid application specification: ${validation.errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
  }

  const validSpec = validation.data;
  const route = validSpec.routes.find(r => r.path === currentPath) || validSpec.routes[0];

  const errors = [];
  const initialAppState = {};
  for (const s of validSpec.state || []) {
    initialAppState[s.key] = s.initialValue;
  }

  const context = {
    registry: options.registry || defaultRegistry,
    state: initialAppState,
    errors,
    renderChildren: (children) => (children || []).map(c => renderNode(c, context)).join(''),
  };

  const bodyHtml = renderNode(route.rootComponent, context);

  return {
    route,
    html: bodyHtml,
    errors,
    state: initialAppState,
  };
}

/**
 * Builds a standalone interactive HTML page with themes, styles, and safe reactive dispatcher
 * @param {any} spec
 * @param {object} [options]
 * @returns {string}
 */
export function renderAppToHtml(spec, options = {}) {
  const currentPath = options.path || '/';
  const initialMode = options.theme || spec.theme?.mode || 'light';
  const { route, html, errors, state } = renderRoute(spec, currentPath, options);

  const lightCss = generateCssVariables('light');
  const darkCss = generateCssVariables('dark');

  // Client-side lightweight reactive event dispatcher (zero eval, pure DOM events)
  const clientRuntimeScript = `
    (function() {
      const state = ${JSON.stringify(state)};
      const actions = ${JSON.stringify(spec.actions || [])};

      function updateTheme(mode) {
        document.documentElement.setAttribute('data-theme', mode);
      }

      window.forgeRuntime = {
        state,
        setTheme: updateTheme,
        dispatch: function(actionName, payload) {
          console.log('[ForgeOS Runtime] Action dispatched:', actionName, payload);
          const act = actions.find(a => a.name === actionName);
          if (!act) return;

          if (act.type === 'set_state' && act.target) {
            state[act.target] = payload !== undefined ? payload : act.payload;
            console.log('[ForgeOS Runtime] State updated:', act.target, state[act.target]);
          } else if (act.type === 'toggle_state' && act.target) {
            state[act.target] = !state[act.target];
            console.log('[ForgeOS Runtime] State toggled:', act.target, state[act.target]);
          }
        }
      };

      document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-forge-action]');
        if (target) {
          const action = target.getAttribute('data-forge-action');
          if (action) {
            e.preventDefault();
            window.forgeRuntime.dispatch(action);
          }
        }
      });
    })();
  `.trim();

  return `<!DOCTYPE html>
<html lang="en" data-theme="${initialMode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(spec.metadata?.title || 'ForgeOS Application')}</title>
  <style>
    ${lightCss}
    ${darkCss}
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--forge-bg);
      color: var(--forge-text-primary);
      font-family: var(--forge-font-sans);
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }
    a { color: var(--forge-primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div id="forge-app-root">
    ${html}
  </div>
  <script>
    ${clientRuntimeScript}
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
