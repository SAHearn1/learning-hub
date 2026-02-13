# Agent Roster

AI work agents managed through n8n-MCP. 9 agents in the target architecture.

## Agents

| # | Agent | n8n Workflow Pattern | Status |
|---|-------|---------------------|--------|
| 1 | Research Agent | Trigger → Web Search → Drive Search → AI Synthesize → Deliver | Not Started |
| 2 | Document Agent | Trigger → AI Draft → Template Format → QA → Approve → Save | Not Started |
| 3 | Compliance Agent | Schedule → Notion Query → AI Analyze Deadlines → Alert | Not Started |
| 4 | Content Agent | Trigger → AI Concept → AI Draft → QA → Approve → Publish | Not Started |
| 5 | Financial Agent | Schedule → Fetch Data → AI Analyze → Report → Notify | Not Started |
| 6 | Outreach Agent | Trigger → AI Draft Email → QA → Approve → Send | Not Started |
| 7 | Scheduler Agent | Trigger → Calendar Check → AI Schedule → Confirm | Not Started |
| 8 | Verification Agent | Receive Deliverable → AI Review → Pass/Fail → Return | Not Started |
| 9 | Media Production Agent | Trigger → Research → Script → Review → InVideo → QA → Approve → Upload | Not Started |

## Notes

Each agent is configured as an n8n AI Agent node with dedicated system prompts, tool access, and workflow triggers. See `prompts/` for system prompt files and `workflows/` for exported workflow JSON.
