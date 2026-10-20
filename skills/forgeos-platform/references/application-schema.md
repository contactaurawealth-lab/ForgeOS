# ForgeOS Application Schema Reference

## Purpose & Overview
This reference documents `@forgeos/app-schema`, the formal data contract defining applications built on ForgeOS.

Schema Version: **`1.0.0`** (`CURRENT_SCHEMA_VERSION = '1.0.0'`)

---

## Core Schema Structures

### 1. AppMetadataSchema
```typescript
{
  id: string;          // Alphanumeric project ID
  name: string;        // URL-safe project name (e.g., 'study-app')
  title: string;       // User-facing application title
  description: string; // Brief description
  version: string;     // Semver string (e.g., '1.0.0')
  author: string;      // Author attribution
  tags: string[];      // Categorization tags
  createdAt: string;   // ISO 8601 timestamp
  updatedAt: string;   // ISO 8601 timestamp
}
```

### 2. ThemeTokensSchema
```typescript
{
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;    // Modern blue default: '#2563eb'
  accentColor: string;     // Teal default: '#0d9488'
  neutralColor: string;    // Slate default: '#0f172a'
  backgroundColor: string; // Default: '#ffffff'
  surfaceColor: string;    // Default: '#f8fafc'
  borderRadius: string;    // Default: '8px'
  fontFamily: string;      // Modern system font stack
}
```

### 3. ComponentNodeSchema (Recursive)
```typescript
{
  id: string;              // Unique component ID (e.g., 'c_header')
  type: string;            // Must match registered component in @forgeos/ui-kit
  props: Record<string, unknown>; // Validated props according to component schema
  children: ComponentNodeSchema[]; // Nested child components
  responsive?: {
    mobile?: Record<string, unknown>;
    tablet?: Record<string, unknown>;
    desktop?: Record<string, unknown>;
  };
  accessibility?: {
    ariaLabel?: string;
    ariaDescription?: string;
    role?: string;
    tabIndex?: number;
    focusIndicator?: boolean;
  };
  events?: Record<string, string>; // e.g. { onClick: 'addTask' }
  conditions?: string;     // e.g. 'state.tasks.length > 0'
  style?: Record<string, string>;
}
```

### 4. RouteDefinitionSchema
```typescript
{
  id: string;              // Route ID (e.g., 'r_home')
  path: string;            // Must begin with '/' (e.g., '/', '/settings')
  title: string;           // Route title
  description?: string;
  layout: 'default' | 'sidebar' | 'fullscreen' | 'centered';
  rootComponent: ComponentNodeSchema;
}
```

### 5. State & Action Declarations
```typescript
// State
{
  key: string;             // e.g. 'tasks'
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  initialValue: unknown;
  description?: string;
}

// Actions
{
  name: string;            // e.g. 'addTask'
  type: 'set_state' | 'toggle_state' | 'append_list' | 'remove_list' | 'navigate' | 'submit_form' | 'custom';
  target?: string;
  payload?: unknown;
  description?: string;
}
```

---

## Validation & Migration Methods

### Validating a Specification
```javascript
import { validateAppSpecification, safeValidateAppSpecification } from '@forgeos/app-schema';

// 1. Throws ZodError on failure
const spec = validateAppSpecification(rawJson);

// 2. Safe parse returning structured diagnostics
const result = safeValidateAppSpecification(rawJson);
if (!result.success) {
  for (const err of result.errors) {
    console.error(`Error at ${err.path}: ${err.message}`);
  }
}
```

### Migrating Older Specifications
To upgrade a legacy 0.9.0 or unversioned specification to 1.0.0:
```javascript
import { migrateSpecification } from '@forgeos/app-schema';

const upgradedSpec = migrateSpecification(legacySpec);
console.log(upgradedSpec.schemaVersion); // '1.0.0'
```

---

## Common Failures & Recovery

1. **`Path must begin with "/"`**: Ensure all route paths have a leading slash (e.g. `path: '/'`).
2. **`Invalid schemaVersion`**: Set `schemaVersion: '1.0.0'`.
3. **`Application must declare at least one route`**: Ensure the `routes` array has at least one entry.

---

## Related References
- [Components](components.md)
- [Code Generation](code-generation.md)
- [Architecture](architecture.md)
