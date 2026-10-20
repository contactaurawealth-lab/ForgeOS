# ForgeOS Getting Started Reference

## Purpose & Prerequisites
This reference guides agents and developers on setting up, discovering, and executing initial workflows on the ForgeOS platform.

### Prerequisites
- **Node.js**: `>= 20.19.0 LTS`
- **npm**: `>= 9.2.0` (with `npm workspaces` support)
- **Git**: `>= 2.30.0`
- **Operating System**: Linux 64-bit, macOS, or Windows WSL2

---

## Workspace Layout
ForgeOS is an npm workspaces monorepo:
```
forgeos/
├── apps/
│   ├── api/        # REST API, Auth, Database, Orchestrator, REA routes
│   └── studio/     # Web IDE and Preview host
├── packages/
│   ├── app-schema/ # Zod schema v1.0.0
│   ├── design-system/ # Light/Dark design tokens
│   ├── ui-kit/     # 12 accessible UI primitives & registry
│   ├── ui-runtime/ # Declarative zero-eval renderer
│   ├── codegen/    # Deterministic TypeScript/React code generator
│   ├── provider-adapters/ # Mock & OpenAI LLM adapters
│   ├── ai-orchestrator/   # Multi-agent orchestrator & tool sandbox
│   ├── rea-adapter/       # Reverse Engineer Anything typed adapter
│   ├── integrations/      # ACID JSON database, RBAC auth, SecretManager
│   └── build-runner/      # Verification, production bundling & rollback
├── skills/
│   └── forgeos-platform/  # Canonical Agent Skill and Reference Library
└── projects/       # Target destination for generated applications
```

---

## Starting the Platform
To launch the API server and Studio web interface:
```bash
cd /root/forgeos
npm run dev
# or: node apps/api/src/server.js
```
The server binds to `http://localhost:3000` (or the port specified by `PORT`).

### Health Check Verification
Verify system readiness:
```bash
curl -s http://localhost:3000/health
```
Expected response:
```json
{
  "status": "ok",
  "platform": "ForgeOS",
  "version": "1.0.0",
  "uptimeSeconds": 12,
  "nodeVersion": "v20.19.2",
  "provider": "mock",
  "workspace": "/root/forgeos/projects"
}
```

---

## Core Environment Variables
Create a local `.env` from `.env.example`:
```bash
cp .env.example .env
```
Key configuration settings:
- `AI_PROVIDER`: `mock` (deterministic offline mode, default) or `openai` (live mode).
- `PORT`: HTTP port (default `3000`).
- `FORGEOS_WORKSPACE_ROOT`: Storage path for generated projects (default `./projects`).
- `FORGEOS_MAX_REPAIR_ATTEMPTS`: Bounded repair iterations (default `3`).
- `OPENAI_API_KEY`: Secret API key (required if `AI_PROVIDER=openai`).
- `FORGEOS_SECRET_KEY`: 32-byte hex key for encrypted secrets (auto-generated if omitted).

---

## Related References
- [Capability Discovery](capability-discovery.md)
- [Architecture](architecture.md)
- [Application Schema](application-schema.md)
- [AI Orchestration](ai-orchestration.md)
