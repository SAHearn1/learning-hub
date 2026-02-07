#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"
WORKFLOW_FILE="${ROOT_DIR}/scripts/n8n-workflow.json"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "❌ Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

upsert_env() {
  local key="$1"
  local value="$2"
  if [[ -f "$ENV_FILE" ]] && rg -q "^${key}=" "$ENV_FILE"; then
    python - "$ENV_FILE" "$key" "$value" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
text = path.read_text()
text = re.sub(rf"^{re.escape(key)}=.*$", f"{key}={value}", text, flags=re.M)
path.write_text(text)
PY
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

require_var OPENAI_API_KEY
require_var PINECONE_API_KEY
require_var N8N_WEBHOOK_URL
require_var N8N_WEBHOOK_SECRET
require_var CURRICULUM_REPO

touch "$ENV_FILE"
upsert_env OPENAI_API_KEY "$OPENAI_API_KEY"
upsert_env PINECONE_API_KEY "$PINECONE_API_KEY"
upsert_env N8N_WEBHOOK_URL "$N8N_WEBHOOK_URL"
upsert_env N8N_WEBHOOK_SECRET "$N8N_WEBHOOK_SECRET"

echo "✅ Updated ${ENV_FILE} with required RAG + n8n variables."

if [[ "${SKIP_INDEX_CREATE:-0}" != "1" ]]; then
  echo "▶ Running npm run rag:create-index"
  (cd "$ROOT_DIR" && npm run rag:create-index)
else
  echo "⚠️ SKIP_INDEX_CREATE=1 set; skipping npm run rag:create-index"
fi

echo "\n📥 n8n import"
echo "1) In n8n, open Workflows → Import from File."
echo "2) Select: ${WORKFLOW_FILE}"
echo "3) Edit node 'Fetch File from GitHub' and attach your GitHub credential."

echo "\n🔐 GitHub secrets"
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    gh secret set N8N_WEBHOOK_URL --repo "$CURRICULUM_REPO" --body "$N8N_WEBHOOK_URL"
    gh secret set N8N_WEBHOOK_SECRET --repo "$CURRICULUM_REPO" --body "$N8N_WEBHOOK_SECRET"
    echo "✅ Set N8N_WEBHOOK_URL and N8N_WEBHOOK_SECRET on ${CURRICULUM_REPO}."
  else
    echo "⚠️ gh CLI is installed but not authenticated. Run manually after 'gh auth login':"
    echo "   gh secret set N8N_WEBHOOK_URL --repo ${CURRICULUM_REPO} --body \"${N8N_WEBHOOK_URL}\""
    echo "   gh secret set N8N_WEBHOOK_SECRET --repo ${CURRICULUM_REPO} --body \"${N8N_WEBHOOK_SECRET}\""
  fi
else
  echo "⚠️ gh CLI not installed. Run manually:"
  echo "   gh secret set N8N_WEBHOOK_URL --repo ${CURRICULUM_REPO} --body \"${N8N_WEBHOOK_URL}\""
  echo "   gh secret set N8N_WEBHOOK_SECRET --repo ${CURRICULUM_REPO} --body \"${N8N_WEBHOOK_SECRET}\""
fi
