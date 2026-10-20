# ForgeOS Studio and Preview Reference

## Purpose & Interface Architecture
This reference documents the developer studio interface (`apps/studio/index.html`) and the sandboxed preview host (`/preview/:id`).

---

## Studio Workspaces & Tabs

The ForgeOS Studio provides an integrated single-page IDE organized into 6 tabs:

### 1. Live Preview Tab
- **Isolated Sandbox Iframe**: Mounts `/preview/:id` with strict iframe sandboxing (`allow-scripts allow-forms`).
- **Responsive Viewport Controls**:
  - Desktop: `1200px` max-width.
  - Tablet: `768px` width.
  - Mobile: `375px` width.
- **Theme Switcher**: Instant toggling between Light and Dark themes via CSS custom properties.
- **Reload & Inspect Controls**: Refreshes iframe or inspects runtime DOM nodes.

### 2. Requirements & Plan Tab
- **Real-Time Task Progression**: Visualizes DAG task status (`pending`, `in_progress`, `completed`, `failed`).
- **Requirements Breakdown**: Displays goals, target users, pages, core features, and data entities extracted by the AI orchestrator.

### 3. Source Explorer Tab
- **Interactive File Tree**: Displays all emitted project files (`src/App.tsx`, `src/types.ts`, `package.json`, `forgeos-manifest.json`).
- **Code Viewer**: Formatted syntax display.
- **Diff Inspector**: Shows line-by-line unified diffs when modifying existing projects.

### 4. Reverse-Engineering Hub Tab
- **Target Analysis Input**: Form for entering target URLs or uploaded bundles.
- **Authorization Gate**: Mandatory checkbox confirming authorization to inspect the target.
- **Findings Dossier**: Visual cards for discovered routes, components, and data models.
- **Approval Actions**: Approve or reject individual findings.
- **Export & Convert**: Export structured JSON report or convert approved findings directly to a new project.

### 5. Build & Release Tab
- **Trigger Build**: Runs `BuildRunner` multi-stage verification.
- **Artifact Manifest**: Displays generated bundles in `dist/` and SHA-256 hashes.
- **Deployment Control**: Select provider (`local_preview`, `cloudflare_pages`, `vercel`).
- **Production Approval Gate**: Mandatory confirmation modal before deploying to production.
- **Instant Rollback**: Select prior build record and restore workspace atomically.

### 6. Execution Logs Tab
- **Structured Log Streaming**: Real-time log terminal displaying timestamps, levels (`info`, `warn`, `error`), and state transitions.

---

## Sandboxed Preview Host (`/preview/:id`)

When an iframe requests `/preview/:id`:
1. The server loads the project's validated `spec.json`.
2. The UI runtime renders the application using `renderAppToHtml(spec)`.
3. Injected script listens for postMessage events:
   - `{ type: 'SET_THEME', theme: 'light' | 'dark' }`
   - `{ type: 'NAVIGATE', path: '/' }`
4. The preview communicates user actions (clicks, inputs) back to the parent studio via `window.parent.postMessage`.

---

## Related References
- [Components](components.md)
- [Reverse Engineering](reverse-engineering.md)
- [Builds and Deployment](builds-and-deployment.md)
