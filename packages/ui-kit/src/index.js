import { z } from 'zod';

/**
 * Component definition interface representation
 * @typedef {Object} ComponentDefinition
 * @property {string} type
 * @property {z.ZodTypeAny} propSchema
 * @property {Record<string, unknown>} defaultProps
 * @property {string[]} supportedEvents
 * @property {{ role?: string; defaultAriaRole?: string }} accessibility
 * @property {string} description
 * @property {(node: any, context: any) => string} render
 */

export class ComponentRegistry {
  constructor() {
    /** @type {Map<string, ComponentDefinition>} */
    this.definitions = new Map();
  }

  /**
   * Register a new component definition
   * @param {ComponentDefinition} definition
   */
  register(definition) {
    if (!definition.type) {
      throw new Error('Component type is required for registration');
    }
    this.definitions.set(definition.type, definition);
  }

  /**
   * Retrieve a registered component definition
   * @param {string} type
   * @returns {ComponentDefinition | undefined}
   */
  get(type) {
    return this.definitions.get(type);
  }

  /**
   * Check if a component type is registered
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    return this.definitions.has(type);
  }

  /**
   * List all registered component types
   * @returns {string[]}
   */
  list() {
    return Array.from(this.definitions.keys());
  }

  /**
   * Validates a component node's properties against its registered schema
   * @param {string} type
   * @param {unknown} props
   */
  validateProps(type, props) {
    const def = this.get(type);
    if (!def) {
      throw new Error(`Unknown component type: "${type}"`);
    }
    return def.propSchema.parse(props);
  }
}

// Global registry instance
export const defaultRegistry = new ComponentRegistry();

// 1. Container
defaultRegistry.register({
  type: 'Container',
  propSchema: z.object({
    maxWidth: z.string().default('1200px'),
    padding: z.string().default('24px'),
    centered: z.boolean().default(true),
  }).passthrough(),
  defaultProps: { maxWidth: '1200px', padding: '24px', centered: true },
  supportedEvents: [],
  accessibility: { defaultAriaRole: 'region' },
  description: 'Main layout container providing consistent width constraints and padding.',
  render: (node, { renderChildren }) => {
    const { maxWidth = '1200px', padding = '24px', centered = true } = node.props || {};
    const margin = centered ? '0 auto' : '0';
    return `<div id="${node.id}" class="forge-container" style="max-width: ${maxWidth}; padding: ${padding}; margin: ${margin}; box-sizing: border-box;">${renderChildren(node.children)}</div>`;
  },
});

// 2. Heading
defaultRegistry.register({
  type: 'Heading',
  propSchema: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).default(1),
    text: z.string().default(''),
    subtitle: z.string().optional(),
  }).passthrough(),
  defaultProps: { level: 1, text: '' },
  supportedEvents: [],
  accessibility: { defaultAriaRole: 'heading' },
  description: 'Semantic hierarchical heading.',
  render: (node) => {
    const { level = 1, text = '', subtitle } = node.props || {};
    const tag = `h${level}`;
    const fontSizes = { 1: '1.875rem', 2: '1.5rem', 3: '1.25rem', 4: '1.125rem', 5: '1rem', 6: '0.875rem' };
    const style = `font-size: ${fontSizes[level] || '1.5rem'}; font-weight: 700; color: var(--forge-text-primary); margin: 0 0 8px 0; line-height: 1.25;`;
    const subtitleHtml = subtitle ? `<p style="color: var(--forge-text-secondary); margin: 0 0 16px 0; font-size: 0.875rem;">${escapeHtml(subtitle)}</p>` : '';
    return `<div id="${node.id}"><${tag} style="${style}">${escapeHtml(text)}</${tag}>${subtitleHtml}</div>`;
  },
});

// 3. Text
defaultRegistry.register({
  type: 'Text',
  propSchema: z.object({
    text: z.string().default(''),
    variant: z.enum(['primary', 'secondary', 'muted', 'error']).default('primary'),
    size: z.enum(['sm', 'base', 'lg']).default('base'),
  }).passthrough(),
  defaultProps: { text: '', variant: 'primary', size: 'base' },
  supportedEvents: [],
  accessibility: {},
  description: 'Body text with semantic theme colors.',
  render: (node) => {
    const { text = '', variant = 'primary', size = 'base' } = node.props || {};
    const colorMap = {
      primary: 'var(--forge-text-primary)',
      secondary: 'var(--forge-text-secondary)',
      muted: 'var(--forge-text-muted)',
      error: 'var(--forge-error)',
    };
    const sizeMap = { sm: '0.875rem', base: '1rem', lg: '1.125rem' };
    return `<p id="${node.id}" style="color: ${colorMap[variant] || colorMap.primary}; font-size: ${sizeMap[size] || '1rem'}; margin: 0 0 12px 0; line-height: 1.5;">${escapeHtml(text)}</p>`;
  },
});

// 4. Responsive Grid & GridItem
defaultRegistry.register({
  type: 'Grid',
  propSchema: z.object({
    columns: z.number().int().min(1).max(12).default(3),
    gap: z.string().default('16px'),
    responsive: z.object({
      mobileColumns: z.number().int().min(1).default(1).optional(),
      tabletColumns: z.number().int().min(1).default(2).optional(),
    }).optional(),
  }).passthrough(),
  defaultProps: { columns: 3, gap: '16px' },
  supportedEvents: [],
  accessibility: {},
  description: 'Responsive CSS Grid layout container.',
  render: (node, { renderChildren }) => {
    const { columns = 3, gap = '16px' } = node.props || {};
    return `<div id="${node.id}" class="forge-grid" data-columns="${columns}" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: ${gap}; margin-bottom: 24px;">${renderChildren(node.children)}</div>`;
  },
});

// 5. Card
defaultRegistry.register({
  type: 'Card',
  propSchema: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    variant: z.enum(['default', 'outline', 'elevated']).default('default'),
    padding: z.string().default('20px'),
  }).passthrough(),
  defaultProps: { variant: 'default', padding: '20px' },
  supportedEvents: ['onClick'],
  accessibility: { defaultAriaRole: 'article' },
  description: 'Surface card container for content grouping.',
  render: (node, { renderChildren }) => {
    const { title, subtitle, padding = '20px' } = node.props || {};
    const titleHtml = title ? `<div style="margin-bottom: 12px;"><h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--forge-text-primary);">${escapeHtml(title)}</h3>${subtitle ? `<p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: var(--forge-text-secondary);">${escapeHtml(subtitle)}</p>` : ''}</div>` : '';
    return `<div id="${node.id}" class="forge-card" style="background: var(--forge-surface); border: 1px solid var(--forge-border); border-radius: var(--forge-radius-md); padding: ${padding}; box-shadow: var(--forge-shadow-sm); transition: transform 0.15s ease, box-shadow 0.15s ease;">${titleHtml}${renderChildren(node.children)}</div>`;
  },
});

// 6. StatCard
defaultRegistry.register({
  type: 'StatCard',
  propSchema: z.object({
    label: z.string().default('Metric'),
    value: z.union([z.string(), z.number()]).default('0'),
    change: z.string().optional(),
    changeType: z.enum(['positive', 'negative', 'neutral']).default('neutral'),
    icon: z.string().optional(),
  }).passthrough(),
  defaultProps: { label: 'Metric', value: '0', changeType: 'neutral' },
  supportedEvents: [],
  accessibility: { defaultAriaRole: 'status' },
  description: 'Metric statistic card showing KPI values and trends.',
  render: (node) => {
    const { label = '', value = '0', change, changeType = 'neutral' } = node.props || {};
    const changeColor = changeType === 'positive' ? 'var(--forge-success)' : changeType === 'negative' ? 'var(--forge-error)' : 'var(--forge-text-muted)';
    const changeBadge = change ? `<span style="font-size: 0.75rem; font-weight: 600; color: ${changeColor};">${escapeHtml(change)}</span>` : '';
    return `
      <div id="${node.id}" class="forge-stat-card" style="background: var(--forge-surface); border: 1px solid var(--forge-border); border-radius: var(--forge-radius-md); padding: 18px; box-shadow: var(--forge-shadow-sm);">
        <div style="font-size: 0.8125rem; font-weight: 500; color: var(--forge-text-secondary); margin-bottom: 6px;">${escapeHtml(label)}</div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <div style="font-size: 1.75rem; font-weight: 700; color: var(--forge-text-primary);">${escapeHtml(String(value))}</div>
          ${changeBadge}
        </div>
      </div>
    `.trim();
  },
});

// 7. Button
defaultRegistry.register({
  type: 'Button',
  propSchema: z.object({
    text: z.string().default('Click'),
    variant: z.enum(['primary', 'secondary', 'outline', 'danger']).default('primary'),
    size: z.enum(['sm', 'md', 'lg']).default('md'),
    disabled: z.boolean().default(false),
    action: z.string().optional(),
  }).passthrough(),
  defaultProps: { text: 'Click', variant: 'primary', size: 'md', disabled: false },
  supportedEvents: ['onClick'],
  accessibility: { defaultAriaRole: 'button' },
  description: 'Accessible interactive trigger button.',
  render: (node) => {
    const { text = 'Click', variant = 'primary', size = 'md', disabled = false, action } = node.props || {};
    const actionAttr = action ? `data-forge-action="${escapeHtml(action)}"` : (node.events?.onClick ? `data-forge-action="${escapeHtml(node.events.onClick)}"` : '');
    const sizes = {
      sm: 'padding: 6px 12px; font-size: 0.8125rem;',
      md: 'padding: 8px 16px; font-size: 0.875rem;',
      lg: 'padding: 12px 24px; font-size: 1rem;',
    };
    const styles = {
      primary: 'background: var(--forge-primary); color: #ffffff; border: 1px solid transparent;',
      secondary: 'background: var(--forge-surface-subtle); color: var(--forge-text-primary); border: 1px solid var(--forge-border);',
      outline: 'background: transparent; color: var(--forge-primary); border: 1px solid var(--forge-primary);',
      danger: 'background: var(--forge-error); color: #ffffff; border: 1px solid transparent;',
    };
    return `<button id="${node.id}" type="button" class="forge-btn forge-btn-${variant}" ${actionAttr} ${disabled ? 'disabled' : ''} style="cursor: pointer; border-radius: var(--forge-radius-md); font-weight: 500; font-family: inherit; transition: opacity 0.15s ease, background 0.15s ease; ${sizes[size] || sizes.md} ${styles[variant] || styles.primary}">${escapeHtml(text)}</button>`;
  },
});

// 8. Input & FormField
defaultRegistry.register({
  type: 'Input',
  propSchema: z.object({
    name: z.string().default('input'),
    label: z.string().optional(),
    placeholder: z.string().default(''),
    type: z.enum(['text', 'number', 'email', 'password', 'date']).default('text'),
    required: z.boolean().default(false),
    value: z.string().optional(),
    stateKey: z.string().optional(),
  }).passthrough(),
  defaultProps: { name: 'input', placeholder: '', type: 'text', required: false },
  supportedEvents: ['onChange', 'onInput', 'onBlur'],
  accessibility: {},
  description: 'Text input field with label and validation support.',
  render: (node) => {
    const { name = 'input', label, placeholder = '', type = 'text', required = false, value = '', stateKey } = node.props || {};
    const stateAttr = stateKey ? `data-forge-bind="${escapeHtml(stateKey)}"` : '';
    const labelHtml = label ? `<label for="${node.id}_field" style="display: block; font-size: 0.8125rem; font-weight: 500; color: var(--forge-text-secondary); margin-bottom: 6px;">${escapeHtml(label)}${required ? ' *' : ''}</label>` : '';
    return `
      <div id="${node.id}" style="margin-bottom: 14px;">
        ${labelHtml}
        <input id="${node.id}_field" name="${escapeHtml(name)}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" ${required ? 'required' : ''} ${stateAttr} style="width: 100%; box-sizing: border-box; padding: 8px 12px; font-size: 0.875rem; border: 1px solid var(--forge-border); border-radius: var(--forge-radius-md); background: var(--forge-background); color: var(--forge-text-primary); font-family: inherit;" />
      </div>
    `.trim();
  },
});

// 9. ProgressBar
defaultRegistry.register({
  type: 'ProgressBar',
  propSchema: z.object({
    value: z.number().min(0).max(100).default(0),
    label: z.string().optional(),
    color: z.string().default('var(--forge-primary)'),
    height: z.string().default('8px'),
  }).passthrough(),
  defaultProps: { value: 0, height: '8px', color: 'var(--forge-primary)' },
  supportedEvents: [],
  accessibility: { defaultAriaRole: 'progressbar' },
  description: 'Linear progress indicator with percentage representation.',
  render: (node) => {
    const { value = 0, label, height = '8px', color = 'var(--forge-primary)' } = node.props || {};
    const clamped = Math.max(0, Math.min(100, Number(value)));
    const labelHtml = label ? `<div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--forge-text-secondary); margin-bottom: 4px;"><span>${escapeHtml(label)}</span><span style="font-weight: 600;">${clamped}%</span></div>` : '';
    return `
      <div id="${node.id}" style="margin-bottom: 14px;">
        ${labelHtml}
        <div role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100" style="width: 100%; height: ${height}; background: var(--forge-surface-subtle); border-radius: var(--forge-radius-full); overflow: hidden;">
          <div style="width: ${clamped}%; height: 100%; background: ${color}; border-radius: var(--forge-radius-full); transition: width 0.3s ease;"></div>
        </div>
      </div>
    `.trim();
  },
});

// 10. Badge
defaultRegistry.register({
  type: 'Badge',
  propSchema: z.object({
    text: z.string().default(''),
    variant: z.enum(['default', 'success', 'warning', 'error', 'accent']).default('default'),
  }).passthrough(),
  defaultProps: { text: '', variant: 'default' },
  supportedEvents: [],
  accessibility: {},
  description: 'Compact status tag or label.',
  render: (node) => {
    const { text = '', variant = 'default' } = node.props || {};
    const styles = {
      default: 'background: var(--forge-surface-subtle); color: var(--forge-text-secondary); border: 1px solid var(--forge-border);',
      success: 'background: rgba(34, 197, 94, 0.15); color: var(--forge-success); border: 1px solid rgba(34, 197, 94, 0.3);',
      warning: 'background: rgba(245, 158, 11, 0.15); color: var(--forge-warning); border: 1px solid rgba(245, 158, 11, 0.3);',
      error: 'background: rgba(239, 68, 68, 0.15); color: var(--forge-error); border: 1px solid rgba(239, 68, 68, 0.3);',
      accent: 'background: rgba(13, 148, 136, 0.15); color: var(--forge-accent); border: 1px solid rgba(13, 148, 136, 0.3);',
    };
    return `<span id="${node.id}" style="display: inline-block; padding: 2px 8px; border-radius: var(--forge-radius-sm); font-size: 0.75rem; font-weight: 600; line-height: 1.25; ${styles[variant] || styles.default}">${escapeHtml(text)}</span>`;
  },
});

// 11. List & ListItem
defaultRegistry.register({
  type: 'List',
  propSchema: z.object({
    items: z.array(z.record(z.unknown())).default([]),
    emptyText: z.string().default('No items found'),
  }).passthrough(),
  defaultProps: { items: [], emptyText: 'No items found' },
  supportedEvents: ['onItemClick'],
  accessibility: { defaultAriaRole: 'list' },
  description: 'Vertical list for tasks, records, or entities.',
  render: (node, { renderChildren }) => {
    const { items = [], emptyText = 'No items found' } = node.props || {};
    if (items.length === 0 && (!node.children || node.children.length === 0)) {
      return `<div id="${node.id}" style="padding: 24px; text-align: center; color: var(--forge-text-muted); font-size: 0.875rem; border: 1px dashed var(--forge-border); border-radius: var(--forge-radius-md);">${escapeHtml(emptyText)}</div>`;
    }
    const itemRows = items.map((item, idx) => {
      const title = item.title || item.name || item.text || `Item #${idx + 1}`;
      const statusBadge = item.status ? `<span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: var(--forge-surface-subtle); color: var(--forge-text-secondary);">${escapeHtml(item.status)}</span>` : '';
      return `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--forge-border); background: var(--forge-surface);">
          <span style="font-size: 0.875rem; color: var(--forge-text-primary); font-weight: 500;">${escapeHtml(String(title))}</span>
          ${statusBadge}
        </li>
      `;
    }).join('');

    return `
      <ul id="${node.id}" role="list" style="list-style: none; padding: 0; margin: 0; border: 1px solid var(--forge-border); border-radius: var(--forge-radius-md); overflow: hidden;">
        ${itemRows}
        ${renderChildren(node.children)}
      </ul>
    `.trim();
  },
});

// 12. BarChart (Adapter-based charting)
defaultRegistry.register({
  type: 'BarChart',
  propSchema: z.object({
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
    })).default([]),
    title: z.string().optional(),
    barColor: z.string().default('var(--forge-primary)'),
    height: z.string().default('160px'),
  }).passthrough(),
  defaultProps: { data: [], height: '160px', barColor: 'var(--forge-primary)' },
  supportedEvents: [],
  accessibility: { defaultAriaRole: 'img' },
  description: 'Accessible SVG-based bar chart.',
  render: (node) => {
    const { data = [], title, barColor = 'var(--forge-primary)', height = '160px' } = node.props || {};
    if (data.length === 0) {
      return `<div id="${node.id}" style="padding: 16px; text-align: center; color: var(--forge-text-muted); font-size: 0.8125rem;">No chart data available</div>`;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barsHtml = data.map((d) => {
      const percent = (d.value / maxValue) * 100;
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end;">
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--forge-text-secondary);">${d.value}</span>
          <div style="width: 100%; max-width: 32px; height: ${percent}%; background: ${barColor}; border-radius: 4px 4px 0 0; transition: height 0.3s ease;"></div>
          <span style="font-size: 0.75rem; color: var(--forge-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60px;">${escapeHtml(d.label)}</span>
        </div>
      `;
    }).join('');

    const titleHtml = title ? `<h4 style="margin: 0 0 12px 0; font-size: 0.875rem; font-weight: 600; color: var(--forge-text-primary);">${escapeHtml(title)}</h4>` : '';
    return `
      <div id="${node.id}" style="background: var(--forge-surface); border: 1px solid var(--forge-border); border-radius: var(--forge-radius-md); padding: 16px;">
        ${titleHtml}
        <div style="display: flex; gap: 12px; height: ${height}; align-items: flex-end; padding-top: 8px;">
          ${barsHtml}
        </div>
      </div>
    `.trim();
  },
});

// Helper for safe HTML escaping
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
