import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LightTheme,
  DarkTheme,
  Breakpoints,
  Spacing,
  Typography,
  Radii,
  generateCssVariables,
} from '../src/index.js';

describe('ForgeOS Design System', () => {
  test('defines complete light theme tokens', () => {
    assert.equal(LightTheme.name, 'light');
    assert.ok(LightTheme.colors.background);
    assert.ok(LightTheme.colors.textPrimary);
    assert.ok(LightTheme.colors.primary);
  });

  test('defines complete dark theme tokens', () => {
    assert.equal(DarkTheme.name, 'dark');
    assert.ok(DarkTheme.colors.background);
    assert.ok(DarkTheme.colors.textPrimary);
    assert.ok(DarkTheme.colors.primary);
  });

  test('generates valid CSS custom properties string for light and dark', () => {
    const lightCss = generateCssVariables('light');
    assert.ok(lightCss.includes('--forge-bg'));
    assert.ok(lightCss.includes('--forge-primary'));
    assert.ok(lightCss.includes('prefers-reduced-motion'));

    const darkCss = generateCssVariables('dark');
    assert.ok(darkCss.includes('[data-theme="dark"]'));
  });

  test('has verified breakpoints and spacing scales', () => {
    assert.equal(Breakpoints.mobile, '640px');
    assert.equal(Breakpoints.desktop, '1280px');
    assert.equal(Spacing[4], '16px');
    assert.equal(Radii.md, '8px');
  });
});
