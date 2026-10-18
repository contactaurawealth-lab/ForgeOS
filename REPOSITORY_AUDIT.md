# Upstream Repository Audit & Integration Strategy

**Date of Audit:** October 18, 2026  
**Auditor:** ForgeOS Principal Architect & AI Infrastructure Engineer  
**Workspace:** `/root/forgeos/research/upstream`  

## 1. Executive Summary

As part of Part A (Initialisation), we conducted an evidence-based audit of candidate repositories identified for reverse-engineering and application reconstruction capabilities. 

All 5 candidates share the same core upstream history originating from `morluto/rea`. The upstream repository (`morluto/rea`) is actively maintained (latest commit on October 19, 2026), holds version 6.7.0, and already incorporates the individual pull requests and commits found in the forks (`coraspirin/ReverseEngineerAnything` and `ChristopherLarsen/ReverseEngineerAnything`).

Given the scale and dependency footprint of REA (native C/Swift/Java bindings for Ghidra, Hopper, Frida, Cutter, and Node engine requirement `^22.19.0`), ForgeOS will not vendor REA directly into the application packages. Instead, we establish a clean **adapter architecture** (`packages/rea-adapter`) interfacing with REA over standard Model Context Protocol (MCP) and CLI boundaries for Phase 4.

---

## 2. Repository Audit Matrix

| Repository & URL | Upstream Relationship | Main Language & Framework | Actual Useful Capabilities | License | Dependency & Security Concerns | Safe Test Status | Decision | Rationale & Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **morluto/rea**<br>`https://github.com/morluto/rea` | **Authoritative Upstream** (v6.7.0) | TypeScript, Node.js, Python, Swift, Java | Full reverse-engineering suite: JS/bundle decompilation, AST extraction, Electron unpacking, Android APK analysis, native binary disassembly (Ghidra, Hopper, Frida), MCP server (`io.github.morluto/rea`). | MIT (Third-party licenses for bundled Ghidra, Frida, MinGW noted in `/licenses`) | Requires Node `^22.19.0` or `>=26.0.0` and npm `11.16.0`. Heavy native compilation tools. Blind execution risks executing untrusted binary analysis bridges. | Git tree and manifest verified. Shallow inspection completed without executing unverified binary scripts. | **Adapter** (`packages/rea-adapter`) | Official upstream repository containing all latest patches (including #3833 and #3867). Will be interfaced via typed adapter in Phase 4. |
| **coraspirin/ReverseEngineerAnything**<br>`https://github.com/coraspirin/ReverseEngineerAnything` | **Fork** of `morluto/rea` | TypeScript | Contributed commit `e9a71ef` (PR #3867): `fix(javascript): declare owned analysis worker effects` by Ysopwnable on Oct 15 2026. | MIT | Same heavy native toolchain requirements as upstream. | Inspected commit diff and git log. PR #3867 is already merged into `morluto/rea`. | **Reference Only** | Redundant with upstream `morluto/rea`. All improvements are already present in `morluto/rea`. |
| **ChristopherLarsen/ReverseEngineerAnything**<br>`https://github.com/ChristopherLarsen/ReverseEngineerAnything` | **Fork** of `morluto/rea` | TypeScript | Contributed commit `f09f454` (PR #3833): `fix(native): retain valid Objective-C properties beside a malformed record` by Kaoru0822 on Oct 14 2026. | MIT | Same toolchain requirements as upstream. | Inspected commit diff and git log. PR #3833 is already merged into `morluto/rea`. | **Reference Only** | Redundant with upstream `morluto/rea`. All improvements are already present in `morluto/rea`. |
| **NabilRFG12/Reverse-Engineer-anything**<br>`https://github.com/NabilRFG12/Reverse-Engineer-anything` | **Fork** of `morluto/rea` | TypeScript | Older snapshot of `morluto/rea` at commit `e762e32` (Oct 9 2026). Added localized READMEs. | MIT | Outdated fork lacking subsequent bug fixes. | Inspected git log and tree structure. | **Exclude** | Subsumed entirely by upstream `morluto/rea`. No unique functional code. |
| **fabwebdev/reverse-engineering-anything**<br>`https://github.com/fabwebdev/reverse-engineering-anything` | **Fork** of `morluto/rea` | TypeScript | Older snapshot of `morluto/rea` at commit `405732a` (Oct 4 2026). | MIT | Outdated fork lacking subsequent bug fixes. | Inspected git log and tree structure. | **Exclude** | Subsumed entirely by upstream `morluto/rea`. No unique functional code. |

---

## 3. Detailed Technical Analysis

### 3.1 Lineage and Git Commit Analysis
- Upstream `morluto/rea`: HEAD `36d156ff0` ("fix(native): retain UI interruption source through final cleanup") dated Mon Oct 19 01:41:52 2026 +0800.
- `coraspirin/ReverseEngineerAnything`: Branch commit `e9a71ef` dated Oct 15 2026 was merged directly into `morluto/rea` as confirmed by `git log --grep="3867"`.
- `ChristopherLarsen/ReverseEngineerAnything`: Branch commit `f09f454` dated Oct 14 2026 was merged directly into `morluto/rea` as confirmed by `git log --grep="3833"`.
- Conclusion: The four forks do not represent independent branches of development; they are feature/bugfix branches of the single upstream project `morluto/rea`.

### 3.2 Compatibility and Runtime Considerations
- Host Runtime: Node.js `v20.19.2`, npm `9.2.0`, Python `3.13.5`.
- REA Package Constraint: `morluto-rea/package.json` specifies `"engines": { "node": "^22.19.0 || ^24.11.0 || >=26.0.0" }` and `"packageManager": "npm@11.16.0"`.
- Installing REA's full node_modules within this environment would require overriding engine flags and compiling numerous C++ / Swift / Java native extensions, which risks destabilizing the host environment.
- **Architectural Solution**: ForgeOS maintains clean isolation. In Phase 1–3, we build the core AI-native application platform, component registry, and AI orchestrator. In Phase 4, `packages/rea-adapter` connects to REA via standardized JSON/stdio or MCP IPC protocols, allowing REA to run in its own container or environment if desired.

---

## 4. Integration Strategy for ForgeOS

1. **Isolation in `research/upstream/`**: Research clones remain strictly in `research/upstream/` and are excluded from ForgeOS application packages and git tracking via `.gitignore`.
2. **Adapter Interface (`packages/rea-adapter`)**:
   - Define TypeScript interfaces: `ReaEvidenceCollector`, `ReaAnalysisResult`, `ReaComponentExtractor`.
   - Provide an MCP client connector and CLI spawn wrapper with strict timeout and input sanitization.
   - Parse reverse-engineered findings into standard ForgeOS application schemas (`packages/app-schema`).
3. **Phase Alignment**:
   - Phases 1, 2, 3: Implement core foundation, typed schema, component framework, codegen, and AI orchestrator with mock and live provider abstractions.
   - Phase 4: Wire the `rea-adapter` to ingest reverse-engineered specifications into the planning engine.
