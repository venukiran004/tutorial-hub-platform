#!/usr/bin/env bash
# Full gate. Runs the syntax check on every lesson first so a template-literal
# break is reported against its own file, then the render suite for each
# course. Exits non-zero on any failure — never pipe this into grep, which
# would mask the status.
#
# The course list is derived from courses/* rather than written out, because
# the hand-maintained version drifted: dsa, langchain and mcp were missing
# from it, so three courses were never rendered in CI.
set -euo pipefail
cd "$(dirname "$0")/.."

COURSES=()
for d in courses/*/; do
  COURSES+=("$(basename "$d")")
done
echo "courses: ${COURSES[*]}"
echo

for f in assets/js/*.js courses/*/curriculum.js courses/*/lessons/*/*.js; do
  node --check "$f"
done
echo "syntax: all files parse"

for course in "${COURSES[@]}"; do
  node .build/sync-published.js "courses/$course" > /dev/null
done
echo "published lists synced"

for course in "${COURSES[@]}"; do
  echo
  echo "=== $course ==="
  TH_COURSE="$course" node .build/rendertest.js | tail -4
done

echo
echo "=== blocks that would render empty ==="
node .build/check-blocks.js

echo "=== markdown emphasis that never renders ==="
node .build/check-emphasis.js

echo "=== diagram text that overflows its box ==="
for course in "${COURSES[@]}"; do
  printf '%-11s ' "$course"
  node .build/fitcheck.js "courses/$course" | tail -1
done
