# ForgeOS Code Generation Reference

## Purpose & Architecture
This reference outlines `@forgeos/codegen`, which converts formal `AppSpecification` objects into deterministic, maintainable TypeScript and React source code while preserving hand-written developer edits.

---

## Output File Structure
When code generation runs for a project (e.g., `studyos`), it produces:
```
projects/studyos/
├── package.json               # Standalone React + TypeScript package manifest
├── tsconfig.json              # Standard strict TypeScript configuration
├── forgeos-manifest.json      # Immutable manifest containing spec metadata and file hashes
└── src/
    ├── types.ts               # Generated TypeScript interfaces for state, entities, and props
    ├── ForgeComponents.tsx    # Declarative component implementations matching @forgeos/ui-kit
    └── App.tsx                # Root React application component with routes and state bindings
```

---

## Core Functions

### 1. `generateSourceFiles(spec)`
Takes a validated `AppSpecification` and returns an array of file representations:
```javascript
import { generateSourceFiles } from '@forgeos/codegen';

const files = generateSourceFiles(spec);
// files: Array<{ path: string; content: string }>
```

### 2. `computeUnifiedDiff(oldContent, newContent, filePath)`
Computes a standard line-by-line unified diff between two file versions:
```javascript
import { computeUnifiedDiff } from '@forgeos/codegen';

const diff = computeUnifiedDiff(existingContent, newContent, 'src/App.tsx');
console.log(diff);
// --- a/src/App.tsx
// +++ b/src/App.tsx
// @@ -1,4 +1,4 @@
```

### 3. `writeGeneratedProject(workspacePath, files)`
Writes generated files to disk while protecting user modifications:
- Computes SHA-256 hash of each file before writing.
- Checks if existing files on disk have been edited by the user since the last generation.
- If a user modification is detected, the user's edits are preserved and changes are written to a `.forgeos-update` sidecar file rather than clobbering the file.
- Rejects any file path containing directory traversal (`../`).

```javascript
import { writeGeneratedProject } from '@forgeos/codegen';

const result = await writeGeneratedProject('./projects/my-app', files);
console.log(`Created: ${result.created.length}, Preserved: ${result.preserved.length}`);
```

---

## Conflict Detection & Sidecar Policy
1. When a project is generated, file hashes are written into `forgeos-manifest.json`.
2. On subsequent generations:
   - If `currentDiskHash === manifestHash`: The file is safely replaced with the new generation.
   - If `currentDiskHash !== manifestHash`: The user has modified the file. The original file is preserved on disk, and the new generated version is written to `<filename>.forgeos-update`. A warning is recorded in the generation log.

---

## Related References
- [Application Schema](application-schema.md)
- [Components](components.md)
- [AI Orchestration](ai-orchestration.md)
