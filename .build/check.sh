#!/usr/bin/env bash
# Full gate. Runs the syntax check on every lesson first so a template-literal
# break is reported against its own file, then the render suite for each
# course. Exits non-zero on any failure — never pipe this into grep, which
# would mask the status.
set -euo pipefail
cd "$(dirname "$0")/.."

for f in assets/js/*.js courses/*/curriculum.js courses/*/lessons/*/*.js; do
  node --check "$f"
done
echo "syntax: all files parse"

for course in python practice maths data sql ml dl adk; do
  node .build/sync-published.js "courses/$course" > /dev/null
done
echo "published lists synced"

echo
echo "=== python ==="
node .build/rendertest.js | tail -4

echo
echo "=== practice ==="
TH_COURSE=practice node .build/rendertest.js | tail -4

echo
echo "=== maths ==="
TH_COURSE=maths node .build/rendertest.js | tail -4

echo
echo "=== data ==="
TH_COURSE=data node .build/rendertest.js | tail -4

echo
echo "=== sql ==="
TH_COURSE=sql node .build/rendertest.js | tail -4

echo
echo "=== ml ==="
TH_COURSE=ml node .build/rendertest.js | tail -4

echo
echo "=== dl ==="
TH_COURSE=dl node .build/rendertest.js | tail -4

echo
echo "=== adk ==="
TH_COURSE=adk node .build/rendertest.js | tail -4

echo "=== blocks that would render empty ==="
node .build/check-blocks.js
