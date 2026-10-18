import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAppSpecification,
  safeValidateAppSpecification,
  migrateSpecification,
  CURRENT_SCHEMA_VERSION,
} from '../src/index.js';

describe('AppSpecificationSchema', () => {
  const validSpec = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      id: 'proj_123',
      name: 'study-os',
      title: 'StudyOS Demo',
      description: 'Study tracking platform',
      version: '1.0.0',
    },
    theme: {
      mode: 'light',
      primaryColor: '#2563eb',
    },
    routes: [
      {
        id: 'route_home',
        path: '/',
        title: 'Dashboard',
        layout: 'default',
        rootComponent: {
          id: 'root_container',
          type: 'Container',
          props: { padding: '24px' },
          children: [
            {
              id: 'header_heading',
              type: 'Heading',
              props: { level: 1, text: 'Study Dashboard' },
              children: [],
            },
          ],
        },
      },
    ],
    state: [
      {
        key: 'activeSubject',
        type: 'string',
        initialValue: 'Computer Science',
      },
    ],
    actions: [
      {
        name: 'setActiveSubject',
        type: 'set_state',
        target: 'activeSubject',
      },
    ],
  };

  test('validates a complete, compliant specification', () => {
    const validated = validateAppSpecification(validSpec);
    assert.equal(validated.schemaVersion, '1.0.0');
    assert.equal(validated.metadata.title, 'StudyOS Demo');
    assert.equal(validated.routes.length, 1);
  });

  test('rejects specifications with missing required fields', () => {
    const invalidSpec = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: { id: 'test' },
      // missing routes and name/title
    };
    const result = safeValidateAppSpecification(invalidSpec);
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  test('rejects invalid schema version', () => {
    const invalidVersionSpec = {
      ...validSpec,
      schemaVersion: '99.0.0',
    };
    const result = safeValidateAppSpecification(invalidVersionSpec);
    assert.equal(result.success, false);
  });

  test('rejects routes with invalid paths', () => {
    const invalidPathSpec = {
      ...validSpec,
      routes: [
        {
          id: 'route_bad',
          path: 'invalid-path-without-slash',
          title: 'Bad Route',
          rootComponent: {
            id: 'root_c',
            type: 'Container',
            props: {},
            children: [],
          },
        },
      ],
    };
    const result = safeValidateAppSpecification(invalidPathSpec);
    assert.equal(result.success, false);
  });

  test('migrates legacy 0.9.0 specifications to 1.0.0', () => {
    const legacySpec = {
      schemaVersion: '0.9.0',
      metadata: {
        id: 'legacy_1',
        name: 'legacy-app',
        title: 'Legacy App',
      },
      routes: validSpec.routes,
    };
    const migrated = migrateSpecification(legacySpec);
    assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
    assert.ok(migrated.theme);
  });
});
