# Configs

Credentials documentation and configuration templates.

**No actual API keys or secrets are stored in this directory.**

## Files

- `.mcp.json.example` — Template for n8n-MCP server configuration. Copy to `.mcp.json` and fill in your values.

## Required Credentials

| Service | Purpose | Env Variable |
|---------|---------|-------------|
| n8n | Workflow automation platform | `N8N_API_KEY` |
| OpenAI / Anthropic | LLM provider for AI Agent nodes | `LLM_API_KEY` |

## Setup

1. Copy `.mcp.json.example` to `.mcp.json`
2. Create a `.env` file from your provider credentials
3. Never commit actual keys to version control
