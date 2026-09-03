#!/usr/bin/env bash
# Full gate. Runs the syntax check on every lesson first so a template-literal
# break is reported against its own file, then the render suite. Exits non-zero
# on any failure -- never pipe this into grep, which would mask the status.
set -euo pipefail
cd "$(dirname "$0")/.."

for f in assets/js/*.js courses/*/curriculum.js courses/*/lessons/*.js; do
  node --check "$f"
done
echo "syntax: all files parse"

node .build/sync-published.js
node .build/rendertest.js > /tmp/ea-test.log 2>&1 || { cat /tmp/ea-test.log; exit 1; }
tail -3 /tmp/ea-test.log
