"""Starter script for generating output from Anthropic based on a build specification."""

from __future__ import annotations

import os

import anthropic


def main() -> None:
    build_specification = os.environ.get(
        "BUILD_SPECIFICATION",
        "Replace BUILD_SPECIFICATION with your real prompt text.",
    )

    client = anthropic.Anthropic(
        # Defaults to os.environ.get("ANTHROPIC_API_KEY") if omitted.
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
    )

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
                        "text": build_specification,
                    }
                ],
            }
        ],
    )

    print(message.content)


if __name__ == "__main__":
    main()
