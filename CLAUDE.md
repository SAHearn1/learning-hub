# CLAUDE.md — Agent N8N Build

## What This Environment Is

This is a Claude Code environment for **building AI work agents** using n8n workflow automation. Dr. Shawn A. Hearn provides agent prompts and specifications; Claude uses the **n8n-MCP server** (20 tools, 1,084 nodes) and **7 n8n-skills** to create, validate, deploy, and manage automated AI agent workflows in Dr. Hearn's n8n instance.

**Your role:** You are an expert n8n workflow builder. When Dr. Hearn gives you a prompt describing an agent he wants, you translate that into working, validated n8n workflows. You do not just describe what to build. You build it.

---

## n8n-MCP Server — Tool Reference

**Source:** [github.com/czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
**Coverage:** 1,084 nodes (537 core + 547 community), 2,709 templates, 2,646 pre-extracted configs

### Core Documentation Tools (7 Tools)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `tools_documentation` | Get documentation for any MCP tool | **START HERE** on every new build |
| `search_nodes` | Full-text search across all 1,084 nodes; use `includeExamples: true` for configs, `source: 'community'\|'verified'` for community nodes | Finding the right node for a task |
| `get_node` | Unified node info — modes: `standard` (default), `minimal`, `full`, `docs`, `search_properties`, `versions`, `compare`, `breaking`, `migrations` | Getting node properties and configuration details |
| `validate_node` | Validate node config — modes: `minimal` (quick required fields) or `full` (with profiles: `minimal`, `runtime`, `ai-friendly`, `strict`) | Before deploying any node |
| `validate_workflow` | Complete workflow validation including AI Agent validation, connections, and expressions | Before any deployment |
| `search_templates` | Unified template search — modes: `keyword` (default), `by_nodes`, `by_task`, `by_metadata` (filter by complexity, requiredService, targetAudience) | **ALWAYS check templates first before building from scratch** |
| `get_template` | Get complete workflow JSON — modes: `nodes_only`, `structure`, `full` | When adapting a template |

### n8n Management Tools (13 Tools — Connected to Dr. Hearn's Instance)

#### Workflow Management

| Tool | Purpose |
|------|---------|
| `n8n_create_workflow` | Create new workflows with nodes and connections |
| `n8n_get_workflow` | Retrieve workflow — modes: `full`, `details`, `structure`, `minimal` |
| `n8n_update_full_workflow` | Replace entire workflow |
| `n8n_update_partial_workflow` | **Preferred** — Update via diff operations (batch multiple changes in one call) |
| `n8n_delete_workflow` | Delete workflows permanently |
| `n8n_list_workflows` | List workflows with filtering and pagination |
| `n8n_validate_workflow` | Validate deployed workflow by ID |
| `n8n_autofix_workflow` | Auto-fix common errors in deployed workflows |
| `n8n_workflow_versions` | Manage version history and rollback |
| `n8n_deploy_template` | Deploy templates from n8n.io directly to instance with auto-fix |

#### Execution & System

| Tool | Purpose |
|------|---------|
| `n8n_test_workflow` | Test/trigger workflow execution (auto-detects trigger type) |
| `n8n_executions` | List, get, or delete execution records |
| `n8n_health_check` | Check n8n API connectivity and features |

### Critical MCP Usage Rules

- **nodeType format:** Use `n8n-nodes-base.` prefix for core nodes, `@n8n/n8n-nodes-langchain.` for LangChain/AI nodes
- **Never trust defaults.** Default parameter values are the #1 source of runtime failures. Always explicitly configure ALL parameters.
- **Batch operations.** Use `n8n_update_partial_workflow` with multiple operations in a single call — never make separate calls for each change.
- **addConnection syntax:** Requires four separate string parameters: `source`, `target`, `sourcePort`, `targetPort` (and `branch` for IF nodes)
- **IF node routing:** Always specify `branch: "true"` or `branch: "false"` — without this, both connections end up on the same output

---

## n8n-Skills — 7 Expert Skills

**Source:** [github.com/czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)

These skills teach you how to build production-ready n8n workflows. They activate automatically based on task context and work together.

### Skill 1: n8n Expression Syntax

**Activates when:** Writing expressions, using `{{}}` syntax, accessing `$json`/`$node` variables.

Key knowledge:
- Core variables: `$json`, `$node`, `$now`, `$env`, `$input`, `$execution`
- **Critical:** Webhook data is under `$json.body`, not `$json` directly
- Never use expressions inside Code nodes — use plain JavaScript/Python instead

### Skill 2: n8n MCP Tools Expert (HIGHEST PRIORITY)

**Activates when:** Searching for nodes, validating configs, managing workflows.

Key knowledge:
- Tool selection guide (which tool for which task)
- nodeType format differences (`nodes-base.*` vs `n8n-nodes-base.*`)
- Validation profiles: `minimal` → `runtime` → `ai-friendly` → `strict`
- Smart parameters (`branch="true"` for IF nodes)
- Auto-sanitization system behavior

### Skill 3: n8n Workflow Patterns

**Activates when:** Creating workflows, connecting nodes, designing automation.

5 proven patterns:
1. **Webhook Processing** — Receive → Process → Respond
2. **HTTP API Integration** — Trigger → Call API → Transform → Output
3. **Database Pipeline** — Trigger → Query → Process → Store
4. **AI Agent** — Trigger → AI Agent (w/ tools, memory, output parser) → Action
5. **Scheduled Automation** — Schedule → Fetch → Analyze → Act

### Skill 4: n8n Validation Expert

**Activates when:** Validation fails, debugging errors, handling false positives.

Validation loop: `validate_node(minimal)` → `validate_node(full, runtime)` → fix errors → `validate_workflow` → deploy → `n8n_validate_workflow(id)` → `n8n_autofix_workflow(id)`

### Skill 5: n8n Node Configuration

**Activates when:** Configuring nodes, understanding property dependencies, setting up AI workflows.

Key knowledge:
- Property dependency rules (e.g., `sendBody` → `contentType` required)
- Operation-specific requirements per node
- 8 AI connection types for AI Agent workflows (language model, tools, memory, output parser, etc.)

### Skill 6: n8n Code JavaScript

**Activates when:** Writing JavaScript in Code nodes.

Key knowledge:
- Data access: `$input.all()`, `$input.first()`, `$input.item`
- **Critical:** Webhook data under `$json.body`
- Return format: `[{json: {...}}]`
- Built-in: `$helpers.httpRequest()`, `DateTime`, `$jmespath()`
- Top 5 error patterns covering 62%+ of failures

### Skill 7: n8n Code Python

**Activates when:** Writing Python in Code nodes.

Key knowledge:
- Use JavaScript for 95% of use cases — Python is limited
- **No external libraries** (no requests, pandas, numpy)
- Standard library only: json, datetime, re, math, etc.

---

## Standard Build Process

Follow this sequence for every agent Dr. Hearn requests:

### Step 1: Call `tools_documentation()` First

Always start here. Get current best practices.

### Step 2: Template Discovery (ALWAYS Before Building)

```
search_templates({searchMode: 'by_task', task: 'relevant_task'})
search_templates({searchMode: 'by_metadata', requiredService: 'slack', complexity: 'simple'})
search_templates({query: 'specific search'})
```

Execute these in **parallel** when searching multiple categories.

### Step 3: Node Discovery (If No Template Fits)

```
search_nodes({query: 'keyword', includeExamples: true})  // Parallel for multiple nodes
get_node({nodeType: 'n8n-nodes-base.xxx', detail: 'standard', includeExamples: true})
```

### Step 4: Multi-Level Validation

```
validate_node({nodeType, config, mode: 'minimal'})       // Quick check
validate_node({nodeType, config, mode: 'full', profile: 'runtime'})  // Full validation
validate_workflow(workflowJson)                           // Complete workflow check
```

### Step 5: Deploy and Post-Validate

```
n8n_create_workflow(workflow)          // Deploy
n8n_validate_workflow({id})           // Post-deployment check
n8n_autofix_workflow({id})            // Auto-fix if needed
n8n_test_workflow({workflowId})       // Test execution
```

### Step 6: Document

Provide Dr. Hearn with: workflow name/ID, trigger type, expected inputs, outputs, required credentials, and modification guidance.

### Critical: Silent Execution

Execute tools without commentary between calls. Only respond AFTER all tools complete. Execute independent operations in parallel.

---

## Most Popular n8n Nodes (Quick Reference)

| Node | nodeType | Use |
|------|----------|-----|
| Code | `n8n-nodes-base.code` | JavaScript/Python scripting |
| HTTP Request | `n8n-nodes-base.httpRequest` | API calls |
| Webhook | `n8n-nodes-base.webhook` | Event triggers |
| Set | `n8n-nodes-base.set` | Data transformation |
| IF | `n8n-nodes-base.if` | Conditional routing |
| Manual Trigger | `n8n-nodes-base.manualTrigger` | Manual execution |
| Schedule Trigger | `n8n-nodes-base.scheduleTrigger` | Time-based triggers |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | AI agents |
| Google Sheets | `n8n-nodes-base.googleSheets` | Spreadsheet ops |
| Merge | `n8n-nodes-base.merge` | Data merging |
| Switch | `n8n-nodes-base.switch` | Multi-branch routing |
| Telegram | `n8n-nodes-base.telegram` | Telegram bot |
| OpenAI Chat | `@n8n/n8n-nodes-langchain.lmChatOpenAi` | OpenAI models |
| Gmail | `n8n-nodes-base.gmail` | Email automation |
| Split In Batches | `n8n-nodes-base.splitInBatches` | Batch processing |
| Sticky Note | `n8n-nodes-base.stickyNote` | Workflow documentation |
| Execute Workflow | `n8n-nodes-base.executeWorkflowTrigger` | Sub-workflow calls |

---

## Additional Environment Tools

These tools are also available and can be combined with n8n agent workflows:

| Tool | Use For |
|------|---------|
| **Notion MCP** | Create/update databases and pages for agent task tracking |
| **InVideo MCP** | Generate videos from scripts (media production agents) |
| **Google Drive** | Search/fetch documents for agent knowledge bases |
| **Google Calendar** | Schedule events, find free time (scheduler agents) |
| **Gmail** | Search/read emails (outreach agents) |
| **Web Search** | Real-time information retrieval (research agents) |

---

## Absolute Rules for All Agent Workflows

Non-negotiable. Apply to every workflow built in this environment.

1. **Never fabricate data, citations, or statistics.** Every factual claim must be verifiable.
2. **Never auto-publish.** All external-facing content requires Dr. Hearn's Telegram approval.
3. **Never expose credentials.** Use n8n credentials manager — never hardcode in nodes.
4. **Always include verification/QA.** No deliverable bypasses quality check.
5. **Always log actions.** Record to Notion, Google Sheets, or execution log.
6. **Always comply with FERPA, IDEA, HIPAA.** No student PII in logs or external outputs.

---

## Organizational Context

**Organization:** Community Exceptional Children's Services (CECS) — 501(c)(3), Savannah, GA
**Owner:** Dr. Shawn A. Hearn, J.D., Ed.D.
**Programs:** RootWork Framework (5Rs: Root, Regulate, Reflect, Restore, Reconnect), Saturday Enrichment Programs, Garden & Art Club, Professional Development, Publications

### Brands

- **CECS** — Professional, compliance-forward, community-centered
- **RootWork Framework** — Warm, evidence-based, trauma-informed, STEAM-integrated
- **Safe First Solutions** — Safety-focused consulting

### 5Rs Icon Files

| Phase | File | Visual |
|-------|------|--------|
| Root | `Root_Icon.png` | Gold sprout with spreading roots on dark green |
| Regulate | `REgulate_Icon.png` | Gold leaves with radiating lines and cupped hands on dark green |
| Reflect | `Reflect_Icon.png` | Gold head profile with leaf inside and thought bubbles on dark green |
| Restore | `Restore_ICON.png` | Gold open hands cradling a sprout with roots on dark green |
| Reconnect | `Reconnect_icon_image_v1.png` | Gold silhouette of two faces with sprouting heart/roots on dark green |

---

## Infrastructure

### n8n Instance

- **Platform:** n8n Cloud
- **URL:** `https://sahearn.app.n8n.cloud`
- **MCP Endpoint:** `https://sahearn.app.n8n.cloud/mcp-server/http`

### n8n-MCP Server Configuration

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://sahearn.app.n8n.cloud",
        "N8N_API_KEY": "<stored-in-credentials>"
      }
    }
  }
}
```

### n8n-Skills Installation

```bash
# Claude Code plugin (recommended)
/plugin install czlonkowski/n8n-skills

# Or manual
git clone https://github.com/czlonkowski/n8n-skills.git
cp -r n8n-skills/skills/* ~/.claude/skills/
```

### Hostinger VPS (Future/Parallel Deployment)

- **Provider:** Hostinger VPS, Ubuntu 24.04 + n8n Docker
- **Domain:** `agent.cecs-savannah.org` or `n8n.rootworkframework.com`
- **Stack:** n8n, Telegram bot, orchestrator, Caddy, PostgreSQL

### Connected Services

| Service | Use |
|---------|-----|
| Anthropic Claude API | AI reasoning engine |
| Telegram Bot API | Command interface & approval |
| Google Workspace | Drive, Docs, Calendar, Gmail |
| Notion | Operational databases |
| YouTube Data API v3 | Video publishing |
| InVideo AI | Video generation |
| ElevenLabs | AI voiceover |
| Stripe | Payments |

---

## Sub-Agent Roster (Target Architecture)

| # | Agent | n8n Workflow Pattern |
|---|-------|---------------------|
| 1 | Research Agent | Trigger → Web Search → Drive Search → AI Synthesize → Deliver |
| 2 | Document Agent | Trigger → AI Draft → Template Format → QA → Approve → Save |
| 3 | Compliance Agent | Schedule → Notion Query → AI Analyze Deadlines → Alert |
| 4 | Content Agent | Trigger → AI Concept → AI Draft → QA → Approve → Publish |
| 5 | Financial Agent | Schedule → Fetch Data → AI Analyze → Report → Notify |
| 6 | Outreach Agent | Trigger → AI Draft Email → QA → Approve → Send |
| 7 | Scheduler Agent | Trigger → Calendar Check → AI Schedule → Confirm |
| 8 | Verification Agent | Receive Deliverable → AI Review → Pass/Fail → Return |
| 9 | Media Production Agent | Trigger → Research → Script → Review → InVideo → QA → Approve → Upload |

---

## Workflow Naming Convention

```
[Agent Type] — [Function] — [Version]
```

Examples: `Research Agent — Web + Drive Brief — v1`, `YouTube Pipeline — Full Production — v1`

---

## When Dr. Hearn Says...

| Says | Do |
|------|----|
| "Build me an agent that..." | Design and deploy the n8n workflow |
| "Here's the prompt for..." | Use as system prompt in the AI Agent node |
| "Connect this to..." | Wire to specified service |
| "Test this workflow" | Execute with sample inputs, report results |
| "Show me my workflows" | `n8n_list_workflows` |
| "What does [workflow] do?" | `n8n_get_workflow` and explain |
| "Fix this workflow" | Get details → diagnose → `n8n_autofix_workflow` or manual fix |
| "Add approval to this" | Insert Telegram approval with Wait + Webhook resume |

---

## Template Attribution Requirement

When using any n8n.io template, always include:

> "Based on template by **[author.name]** (@[username]). View at: [url]"

---

*Last Updated: February 13, 2026*
*Version: 3.0*
*Environment: Agent N8N Build — Claude Code*
*Dependencies: n8n-MCP v2.33.4+, n8n-skills v1.0+*
