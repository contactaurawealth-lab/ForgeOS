import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Metadata defining the application identity and classification
 */
export const AppMetadataSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').regex(/^[a-z0-9-_]+$/i, 'Name must contain only alphanumeric characters, dashes, and underscores'),
  title: z.string().min(1, 'Application title is required'),
  description: z.string().default(''),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver (e.g. 1.0.0)').default('1.0.0'),
  author: z.string().default('ForgeOS Developer'),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime().or(z.string()).default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().or(z.string()).default(() => new Date().toISOString()),
});

/**
 * Design system tokens and active theme configuration
 */
export const ThemeTokensSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']).default('light'),
  primaryColor: z.string().default('#2563eb'), // Accessible modern blue
  accentColor: z.string().default('#0d9488'),  // Teal accent
  neutralColor: z.string().default('#0f172a'), // Slate neutral
  backgroundColor: z.string().default('#ffffff'),
  surfaceColor: z.string().default('#f8fafc'),
  borderRadius: z.string().default('8px'),
  fontFamily: z.string().default('system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'),
});

/**
 * Accessibility standards and ARIA attributes
 */
export const AccessibilityMetadataSchema = z.object({
  ariaLabel: z.string().optional(),
  ariaDescription: z.string().optional(),
  role: z.string().optional(),
  tabIndex: z.number().int().optional(),
  focusIndicator: z.boolean().default(true),
}).default({});

/**
 * Responsive breakpoint overrides
 */
export const ResponsiveBreakpointsSchema = z.object({
  mobile: z.record(z.unknown()).optional(),
  tablet: z.record(z.unknown()).optional(),
  desktop: z.record(z.unknown()).optional(),
}).default({});

// Lazy recursive component schema to support arbitrarily nested layout trees
export const ComponentNodeSchema = z.lazy(() =>
  z.object({
    id: z.string().min(1, 'Component ID is required'),
    type: z.string().min(1, 'Component type is required'),
    props: z.record(z.unknown()).default({}),
    children: z.array(ComponentNodeSchema).default([]),
    responsive: ResponsiveBreakpointsSchema.optional(),
    accessibility: AccessibilityMetadataSchema.optional(),
    events: z.record(z.string()).default({}),
    conditions: z.string().optional(),
    style: z.record(z.string()).default({}),
  })
);

/**
 * Global and page-level state declarations
 */
export const StateDeclarationSchema = z.object({
  key: z.string().min(1, 'State key is required'),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  initialValue: z.unknown(),
  description: z.string().optional(),
});

/**
 * Declarative state transitions and user action handlers
 */
export const ActionDeclarationSchema = z.object({
  name: z.string().min(1, 'Action name is required'),
  type: z.enum(['set_state', 'toggle_state', 'append_list', 'remove_list', 'navigate', 'submit_form', 'custom']),
  target: z.string().optional(),
  payload: z.unknown().optional(),
  description: z.string().optional(),
});

/**
 * Route definition and root page layout
 */
export const RouteDefinitionSchema = z.object({
  id: z.string().min(1, 'Route ID is required'),
  path: z.string().min(1, 'Route path is required').regex(/^\//, 'Path must begin with "/"'),
  title: z.string().min(1, 'Route title is required'),
  description: z.string().optional(),
  layout: z.enum(['default', 'sidebar', 'fullscreen', 'centered']).default('default'),
  rootComponent: ComponentNodeSchema,
});

/**
 * Local or remote data collection definition
 */
export const DataSourceSchema = z.object({
  id: z.string().min(1, 'Data source ID is required'),
  name: z.string().min(1, 'Data source name is required'),
  type: z.enum(['memory', 'local_storage', 'rest_api', 'supabase']).default('memory'),
  collection: z.string().min(1, 'Collection name is required'),
  schema: z.record(z.string()).default({}),
  initialData: z.array(z.record(z.unknown())).default([]),
});

/**
 * Complete top-level ForgeOS Application Specification
 */
export const AppSpecificationSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  metadata: AppMetadataSchema,
  theme: ThemeTokensSchema.default({}),
  routes: z.array(RouteDefinitionSchema).min(1, 'Application must declare at least one route'),
  state: z.array(StateDeclarationSchema).default([]),
  actions: z.array(ActionDeclarationSchema).default([]),
  dataSources: z.array(DataSourceSchema).default([]),
  integrations: z.array(z.record(z.unknown())).default([]),
});

/**
 * Validates an application specification, throwing formatted errors on failure.
 * @param {unknown} data
 * @returns {z.infer<typeof AppSpecificationSchema>}
 */
export function validateAppSpecification(data) {
  return AppSpecificationSchema.parse(data);
}

/**
 * Safely validates an application specification, returning detailed structured errors.
 * @param {unknown} data
 * @returns {{ success: true; data: z.infer<typeof AppSpecificationSchema> } | { success: false; errors: Array<{ path: string; message: string }> }}
 */
export function safeValidateAppSpecification(data) {
  const result = AppSpecificationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
  return { success: false, errors };
}

/**
 * Migrates legacy specifications to the current schema version.
 * @param {Record<string, unknown>} rawSpec
 * @returns {Record<string, unknown>}
 */
export function migrateSpecification(rawSpec) {
  if (!rawSpec || typeof rawSpec !== 'object') {
    throw new Error('Specification must be a valid object');
  }

  const spec = { ...rawSpec };

  // Handle unversioned or 0.x legacy formats
  if (!spec.schemaVersion || spec.schemaVersion === '0.9.0') {
    spec.schemaVersion = CURRENT_SCHEMA_VERSION;
    if (!spec.theme) {
      spec.theme = {
        mode: 'light',
        primaryColor: '#2563eb',
        accentColor: '#0d9488',
        neutralColor: '#0f172a',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
      };
    }
    if (!spec.state) spec.state = [];
    if (!spec.actions) spec.actions = [];
    if (!spec.dataSources) spec.dataSources = [];
  }

  return spec;
}
