#!/usr/bin/env bash
# Gate, then commit. Runs check.sh WITHOUT a pipe so its exit status is real --
# piping into tail/grep makes the pipeline report the filter's status, which is
# how a broken lesson got committed twice.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! bash .build/check.sh > /tmp/ea-gate.log 2>&1; then
  echo "GATE FAILED — nothing committed"
  tail -25 /tmp/ea-gate.log
  exit 1
fi
tail -3 /tmp/ea-gate.log

git add -A
git -c user.email="venukiran.sankar@gmail.com" -c user.name="venukiran004" \
    commit -q -m "$1

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
echo "committed: $1"
