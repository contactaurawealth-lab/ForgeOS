# ForgeOS Environment Configuration

This document specifies all configuration options and environment variables supported by ForgeOS.

> [!CAUTION]
> **NEVER store actual secret values, API keys, or production passwords in this file or in source control.**

---

## Environment Variables

| Variable Name | Purpose | Required? | Default Value | Example Values |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application runtime environment (`development`, `test`, `production`) | No | `development` | `development`, `production`, `test` |
| `PORT` | HTTP port for the ForgeOS API & Studio server | No | `3000` | `3000`, `8080` |
| `FORGEOS_WORKSPACE_ROOT` | Absolute path to the directory where user projects are created and managed | No | `./projects` | `/root/forgeos/projects` |
| `FORGEOS_LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | No | `info` | `info`, `debug` |
| `AI_PROVIDER` | Selected LLM provider adapter (`mock`, `openai`, `anthropic`, `gemini`) | No | `mock` | `mock`, `openai`, `gemini` |
| `OPENAI_API_KEY` | API secret key for OpenAI provider | Only if `AI_PROVIDER=openai` | *None* | `sk-...` |
| `OPENAI_MODEL` | OpenAI model identifier | No | `gpt-4o` | `gpt-4o`, `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | API secret key for Anthropic provider | Only if `AI_PROVIDER=anthropic` | *None* | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Anthropic model identifier | No | `claude-3-5-sonnet-latest` | `claude-3-5-sonnet-20241022` |
| `GEMINI_API_KEY` | API secret key for Google Gemini provider | Only if `AI_PROVIDER=gemini` | *None* | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model identifier | No | `gemini-1.5-pro-latest` | `gemini-1.5-pro` |
| `FORGEOS_MAX_REPAIR_ATTEMPTS` | Maximum allowed bounded self-repair iterations | No | `3` | `3`, `5` |
| `FORGEOS_TOOL_TIMEOUT_MS` | Timeout per tool execution in milliseconds | No | `30000` | `30000`, `60000` |
