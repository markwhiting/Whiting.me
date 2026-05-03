#!/bin/bash
# Trace and select best for every slug in parallel.
set -u
cd "$(dirname "$0")/../../../.."

SCRIPT_DIR=".claude/skills/post-figure/scripts"
REF_DIR=".claude/skills/post-figure/references"

SLUGS=(biological-grammars online-learning online-ambiguity empirica task-space forecasting common-sense-llms ai-and-teamwork)

pids=()
for slug in "${SLUGS[@]}"; do
  (
    echo "== $slug =="
    python3 "$SCRIPT_DIR/trace_batch.py" --slug "$slug"
    python3 "$SCRIPT_DIR/select_best.py" --slug "$slug" --top-k 5
  ) > "$REF_DIR/${slug}-select.log" 2>&1 &
  pids+=($!)
done

echo "waiting for ${#pids[@]} slug processors..."
for pid in "${pids[@]}"; do
  wait "$pid"
done
echo "all processing done"
