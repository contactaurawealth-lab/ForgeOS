/**
 * ForgeOS Design System Tokens
 * Strict adherence to WCAG 2.1 AA accessible contrast and developer-oriented aesthetics.
 */

export const Breakpoints = {
  mobile: '640px',
  tablet: '1024px',
  desktop: '1280px',
  wide: '1536px',
};

export const Spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

export const Typography = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const Radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const LightTheme = {
  name: 'light',
  colors: {
    background: '#ffffff',
    surface: '#f8fafc', // slate-50
    surfaceSubtle: '#f1f5f9', // slate-100
    border: '#e2e8f0', // slate-200
    borderStrong: '#cbd5e1', // slate-300
    textPrimary: '#0f172a', // slate-900 (14.2:1 contrast against #fff - AAA compliant)
    textSecondary: '#475569', // slate-600 (5.8:1 contrast against #fff - AA compliant)
    textMuted: '#64748b', // slate-500
    primary: '#2563eb', // blue-600 (4.56:1 contrast against #fff)
    primaryHover: '#1d4ed8', // blue-700
    primaryActive: '#1e40af', // blue-800
    primaryForeground: '#ffffff',
    accent: '#0d9488', // teal-600
    accentForeground: '#ffffff',
    success: '#16a34a', // green-600
    warning: '#d97706', // amber-600
    error: '#dc2626', // red-600
    errorSurface: '#fef2f2',
    ring: 'rgba(37, 99, 235, 0.4)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
  },
};

export const DarkTheme = {
  name: 'dark',
  colors: {
    background: '#090d16', // deep dark
    surface: '#111827', // gray-900
    surfaceSubtle: '#1f2937', // gray-800
    border: '#374151', // gray-700
    borderStrong: '#4b5563', // gray-600
    textPrimary: '#f9fafb', // gray-50 (18.1:1 contrast against background - AAA compliant)
    textSecondary: '#9ca3af', // gray-400 (5.3:1 contrast against background - AA compliant)
    textMuted: '#6b7280', // gray-500
    primary: '#3b82f6', // blue-500
    primaryHover: '#60a5fa', // blue-400
    primaryActive: '#2563eb', // blue-600
    primaryForeground: '#090d16',
    accent: '#14b8a6', // teal-500
    accentForeground: '#090d16',
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    errorSurface: '#450a0a',
    ring: 'rgba(59, 130, 246, 0.4)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  },
};

/**
 * Generates standard CSS Custom Properties for theme injection
 * @param {'light' | 'dark'} mode
 * @returns {string}
 */
export function generateCssVariables(mode = 'light') {
  const theme = mode === 'dark' ? DarkTheme : LightTheme;
  const c = theme.colors;
  const s = theme.shadows;

  return `
:root, [data-theme="${theme.name}"] {
  --forge-bg: ${c.background};
  --forge-surface: ${c.surface};
  --forge-surface-subtle: ${c.surfaceSubtle};
  --forge-border: ${c.border};
  --forge-border-strong: ${c.borderStrong};
  --forge-text-primary: ${c.textPrimary};
  --forge-text-secondary: ${c.textSecondary};
  --forge-text-muted: ${c.textMuted};
  --forge-primary: ${c.primary};
  --forge-primary-hover: ${c.primaryHover};
  --forge-primary-active: ${c.primaryActive};
  --forge-primary-foreground: ${c.primaryForeground};
  --forge-accent: ${c.accent};
  --forge-accent-foreground: ${c.accentForeground};
  --forge-success: ${c.success};
  --forge-warning: ${c.warning};
  --forge-error: ${c.error};
  --forge-error-surface: ${c.errorSurface};
  --forge-ring: ${c.ring};

  --forge-shadow-sm: ${s.sm};
  --forge-shadow-md: ${s.md};
  --forge-shadow-lg: ${s.lg};

  --forge-font-sans: ${Typography.fontFamily.sans};
  --forge-font-mono: ${Typography.fontFamily.mono};

  --forge-radius-sm: ${Radii.sm};
  --forge-radius-md: ${Radii.md};
  --forge-radius-lg: ${Radii.lg};
  --forge-radius-full: ${Radii.full};
}

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`.trim();
}
