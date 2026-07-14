#!/usr/bin/env bash
# Start StoryLens LLM proxy (port 18902)
cd "$(dirname "$0")"
python3 llm_proxy_server.py "$@"
