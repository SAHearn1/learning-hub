# Configs

Credentials documentation and configuration templates.

**No actual API keys or secrets are stored in this directory.**

## Files

- `.mcp.json.example` — Template for n8n-MCP server configuration. Copy to `.mcp.json` and fill in your values.

## Required Credentials

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| n8n Cloud | Workflow automation platform | `N8N_API_URL`, `N8N_API_KEY` |
| Anthropic Claude | AI reasoning engine | `ANTHROPIC_API_KEY` |
| Telegram Bot | Command interface & approval | `TELEGRAM_BOT_TOKEN` |
| Google Workspace | Drive, Docs, Calendar, Gmail | OAuth credentials |
| Notion | Operational databases | `NOTION_API_KEY` |
| YouTube Data API v3 | Video publishing | `YOUTUBE_API_KEY` |
| InVideo AI | Video generation | `INVIDEO_API_KEY` |
| ElevenLabs | AI voiceover | `ELEVENLABS_API_KEY` |
| Stripe | Payments | `STRIPE_API_KEY` |

## Setup

1. Copy `.mcp.json.example` to `.mcp.json`
2. Create a `.env` file from your provider credentials
3. Never commit actual keys to version control
