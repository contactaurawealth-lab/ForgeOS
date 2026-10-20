# Supported Coding Agents & Environments

ForgeOS provides tailored agent integration packages and instructions across multiple AI coding agent environments.

---

## Supported Agent Environments

| Agent / Environment | Integration Mechanism | Configuration Path | Status |
| :--- | :--- | :--- | :--- |
| **Open Agent Skills** | Canonical `SKILL.md` with YAML frontmatter | `.agents/skills/forgeos-platform/` or `~/.agents/skills/` | `VERIFIED` |
| **Claude Code** | Project instructions & CLI conventions | `./CLAUDE.md` or `.claude/config.json` | `VERIFIED` |
| **Cursor** | Custom project rules | `.cursorrules` or `.cursor/rules/forgeos.mdc` | `VERIFIED` |
| **Codex / OpenAI** | Repository-level instructions | `CODEX.md` or system prompt injection | `VERIFIED` |
| **Generic Agents** | Standard project instructions | `AGENTS.md` in repository root | `VERIFIED` |

---

## Integration Details by Agent

### 1. Open Agent Skills Standard
- **Location**: `.agents/skills/forgeos-platform/SKILL.md` (project-local) or `~/.agents/skills/forgeos-platform/SKILL.md` (user-global).
- **Format**: Valid YAML frontmatter (`name: forgeos-platform`, `description: ...`) followed by Markdown instructions and relative links to `references/`.
- **Discovery**: Automatically discovered by skills-compatible harnesses (including Google Antigravity, OpenCode, and Agent Skills runners).

### 2. Claude Code
- **Location**: `CLAUDE.md` in the project root.
- **Format**: Concise Markdown with development commands, architectural rules, and pointers to the canonical skill.
- **Activation**: Automatically loaded into Claude Code context at the beginning of each session.

### 3. Cursor
- **Location**: `.cursorrules` in project root or `.cursor/rules/forgeos.mdc`.
- **Format**: Plaintext rules specifying Zod schema v1.0.0, registered component constraints, and security requirements.
- **Activation**: Applied by Cursor across chat, composer, and inline edits.

### 4. Codex & Generic Coding Agents
- **Location**: `AGENTS.md` in project root.
- **Format**: Standardized persistent engineering instructions adhered to by autonomous agents and PR bots.

---

## Verification & Limitations
- Placing `SKILL.md` in a directory only enables agents that implement the Open Agent Skills specification or read project Markdown instructions.
- Agents without skill support require the relevant adapter file (`CLAUDE.md`, `.cursorrules`, or `AGENTS.md`).
- The automated installer (`scripts/install-skill.js`) detects installed agents and deploys the appropriate files.
