#!/usr/bin/env bash
# 启动即梦 AI 生图代理（端口 18901）
cd "$(dirname "$0")"
if [ -f .env ]; then set -a; source .env; set +a; fi
python3 jimeng_proxy_server.py --port 18901
