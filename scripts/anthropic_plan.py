"""Starter script that mirrors the requested Anthropic planning call."""

import os

import anthropic


client = anthropic.Anthropic(
    # Defaults to os.environ.get("ANTHROPIC_API_KEY")
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
)

# Replace placeholders like {{BUILD_SPECIFICATION}} with real values,
# because the SDK does not support variables.
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=20_000,
    temperature=1,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": os.environ.get("BUILD_SPECIFICATION", "{{BUILD_SPECIFICATION}}\n\n\n"),
                }
            ],
        }
    ],
)

print(message.content)
