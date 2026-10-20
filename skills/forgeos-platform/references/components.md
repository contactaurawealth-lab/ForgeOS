# ForgeOS Components Reference

## Purpose & Component Registry
This reference documents the 12 core accessible UI components registered in `@forgeos/ui-kit` and how to register custom components.

---

## The 12 Built-in Components

### 1. `Container`
- **Description**: Main layout container providing consistent width constraints and padding.
- **Props**:
  - `maxWidth` (string, default: `'1200px'`)
  - `padding` (string, default: `'24px'`)
  - `centered` (boolean, default: `true`)
- **Accessibility**: Default ARIA role `region`.

### 2. `Heading`
- **Description**: Semantic heading component.
- **Props**:
  - `level` (1 | 2 | 3 | 4 | 5 | 6, default: `1`)
  - `text` (string, default: `''`)
  - `subtitle` (string, optional)
- **Accessibility**: Default ARIA role `heading`.

### 3. `Text`
- **Description**: Accessible typography block.
- **Props**:
  - `text` (string, default: `''`)
  - `size` (`'sm'` | `'md'` | `'lg'`, default: `'md'`)
  - `variant` (`'primary'` | `'secondary'` | `'muted'`, default: `'primary'`)
- **Accessibility**: Default ARIA role `paragraph`.

### 4. `Grid`
- **Description**: Responsive CSS grid layout.
- **Props**:
  - `columns` (number, default: `2`)
  - `gap` (string, default: `'16px'`)
  - `responsive` (boolean, default: `true`)
- **Accessibility**: Default ARIA role `grid`.

### 5. `Card`
- **Description**: Surface container with elevation, borders, and padding.
- **Props**:
  - `title` (string, optional)
  - `subtitle` (string, optional)
  - `padding` (string, default: `'20px'`)
  - `elevation` (`'none'` | `'sm'` | `'md'`, default: `'sm'`)
- **Accessibility**: Default ARIA role `article`.

### 6. `StatCard`
- **Description**: High-impact metric card showing a KPI, label, and trend.
- **Props**:
  - `label` (string, required)
  - `value` (string | number, required)
  - `change` (string, optional)
  - `changeType` (`'positive'` | `'negative'` | `'neutral'`, default: `'neutral'`)
- **Accessibility**: Default ARIA role `status`.

### 7. `Button`
- **Description**: Interactive action trigger.
- **Props**:
  - `text` (string, default: `'Button'`)
  - `variant` (`'primary'` | `'secondary'` | `'outline'` | `'danger'`, default: `'primary'`)
  - `action` (string, optional - maps to an ActionDeclaration)
  - `disabled` (boolean, default: `false`)
- **Accessibility**: Default ARIA role `button`.

### 8. `Input`
- **Description**: Accessible form text input.
- **Props**:
  - `label` (string, default: `''`)
  - `name` (string, required)
  - `type` (`'text'` | `'email'` | `'password'` | `'number'`, default: `'text'`)
  - `placeholder` (string, default: `''`)
  - `required` (boolean, default: `false`)
  - `helpText` (string, optional)
- **Accessibility**: Default ARIA role `textbox`.

### 9. `ProgressBar`
- **Description**: Visual completion percentage indicator.
- **Props**:
  - `value` (number between 0 and 100, default: `0`)
  - `max` (number, default: `100`)
  - `label` (string, optional)
  - `color` (string, default: `'var(--forge-primary)'`)
- **Accessibility**: Default ARIA role `progressbar`.

### 10. `Badge`
- **Description**: Compact status indicator.
- **Props**:
  - `text` (string, default: `''`)
  - `variant` (`'info'` | `'success'` | `'warning'` | `'error'`, default: `'info'`)
- **Accessibility**: Default ARIA role `status`.

### 11. `List`
- **Description**: Itemized collection list with status badges.
- **Props**:
  - `items` (Array<{ title: string; subtitle?: string; status?: string }>, default: `[]`)
  - `emptyMessage` (string, default: `'No items to display'`)
- **Accessibility**: Default ARIA role `list`.

### 12. `BarChart`
- **Description**: Declarative SVG metric chart.
- **Props**:
  - `title` (string, optional)
  - `data` (Array<{ label: string; value: number }>, default: `[]`)
  - `height` (number, default: `160`)
- **Accessibility**: Default ARIA role `img` with aria-label.

---

## Registering Custom Components

To extend the catalog without touching core packages:
```javascript
import { defaultRegistry } from '@forgeos/ui-kit';
import { z } from 'zod';

defaultRegistry.register({
  type: 'NotificationBanner',
  propSchema: z.object({
    message: z.string().min(1),
    severity: z.enum(['info', 'warning', 'critical']).default('info'),
  }),
  defaultProps: { message: '', severity: 'info' },
  supportedEvents: ['onDismiss'],
  accessibility: { defaultAriaRole: 'alert' },
  description: 'Displays a prominent system notification banner.',
  render: (node) => {
    const { message, severity } = node.props;
    return `<div id="${node.id}" role="alert" class="forge-banner banner-${severity}">${message}</div>`;
  },
});
```

---

## Declarative Safe Rendering
The UI runtime (`@forgeos/ui-runtime`) renders trees using `renderAppToHtml(spec)` or `renderRoute(route, spec)`.
If a component throws or is unregistered, an Error Boundary traps the error and renders an inline fallback box, preserving the rest of the application interface.

---

## Related References
- [Application Schema](application-schema.md)
- [Code Generation](code-generation.md)
- [Studio and Preview](studio-and-preview.md)
