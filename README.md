# AI Work Agent Factory

An AI work agent factory powered by n8n-MCP. Build, deploy, and orchestrate autonomous AI agents through n8n workflows with Model Context Protocol integration.

## Overview

This project provides a framework for managing a team of 9 specialized AI work agents, each configured as n8n AI Agent nodes with dedicated system prompts, tools, and workflow triggers.

## Agents

| Agent | Role |
|-------|------|
| Research | Web research, data gathering, and source analysis |
| Document | Document creation, formatting, and management |
| Compliance | Regulatory checks, policy validation, and audit support |
| Content | Content writing, editing, and publishing |
| Financial | Financial analysis, reporting, and forecasting |
| Outreach | Communications, email campaigns, and stakeholder engagement |
| Scheduler | Calendar management, task scheduling, and deadline tracking |
| Verification | QA, fact-checking, and output validation |
| Media Production | Image, video, and multimedia content generation |

## Project Structure

```
├── CLAUDE.md              # Claude Code instructions
├── README.md              # This file
├── .gitignore             # Git ignore rules
├── workflows/             # Exported n8n workflow JSON files
├── agents/                # Agent roster and configuration docs
├── configs/               # Credentials docs and config templates
│   └── .mcp.json.example  # n8n-MCP server config template
├── prompts/               # System prompts for n8n AI Agent nodes
├── docs/                  # Architecture documentation
└── scripts/               # Utility scripts
```

## Getting Started

### Prerequisites

- [n8n](https://n8n.io/) instance (self-hosted or cloud)
- LLM API key (OpenAI or Anthropic)
- n8n API key for MCP integration

### Setup

1. Clone this repository
2. Copy `configs/.mcp.json.example` to `configs/.mcp.json`
3. Add your n8n API key to the config
4. Import workflows from `workflows/` into your n8n instance
5. Configure agent system prompts from `prompts/`

## License

Private - All Rights Reserved
