# ForgeOS Agent Integration Architecture

## Overview
This document describes the architectural mechanism used by ForgeOS to interface with autonomous coding agents, IDE assistants, and MCP clients.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   Coding Agent Session                 │
│  (Open Agent Skills, Claude Code, Cursor, Codex, etc.) │
└───────────────────────────┬────────────────────────────┘
                            │
               Reads instructions & schemas
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              ForgeOS Agent Enablement Layer            │
│                                                        │
│  ├── Canonical Skill (skills/forgeos-platform/SKILL.md)│
│  ├── References (references/*.md)                      │
│  ├── Templates (AGENTS.md, CLAUDE.md, .cursorrules)    │
│  └── Manifest (manifest.json - Capabilities & Versions)│
└───────────────────────────┬────────────────────────────┘
                            │
               Invokes CLI / APIs / Packages
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   ForgeOS Core Engine                  │
│                                                        │
│  ├── @forgeos/app-schema       (v1.0.0 Zod contracts)  │
│  ├── @forgeos/ui-kit           (12 UI primitives)      │
│  ├── @forgeos/ui-runtime       (Zero-eval DOM engine)  │
│  ├── @forgeos/codegen          (Deterministic emitter) │
│  ├── @forgeos/ai-orchestrator  (Multi-agent DAG plan)  │
│  ├── @forgeos/rea-adapter      (SSRF-safe REA bridge)  │
│  ├── @forgeos/integrations     (ACID JSON db, auth)    │
│  └── @forgeos/build-runner     (Verify, build, roll)   │
└────────────────────────────────────────────────────────┘
```

---

## Design Principles

1. **Portable Standard**: Uses the Open Agent Skills YAML frontmatter format so skills run unmodified across modern agent platforms.
2. **Layered Documentation**:
   - `SKILL.md`: Concise root entry point providing high-level mental model and workflow steps.
   - `references/*.md`: Deep technical references loaded on demand, preventing context window bloat.
3. **No Hallucinated Tools**: Agents are provided with real, verified APIs and CLI commands. Where an external capability is partial or planned (e.g. native REA binary toolchains or WYSIWYG canvas), it is explicitly marked as such.
4. **Deterministic Testing**: All agent acceptance tests run against local fixtures and `MockProvider`, ensuring 100% repeatability without external API dependencies.
