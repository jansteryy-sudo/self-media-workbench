#!/bin/zsh
set -e
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo '请先安装 Node.js 22，再重新打开工作台。'
  read -r '?按回车退出'
  exit 1
fi
if ! [ -d node_modules ]; then npm ci; fi
npm run db:init
if curl --silent --fail http://127.0.0.1:3210/api/workbench >/dev/null 2>&1; then
  open 'http://127.0.0.1:3210'
  exit 0
fi
(sleep 3; open 'http://127.0.0.1:3210') &
npm run dev
