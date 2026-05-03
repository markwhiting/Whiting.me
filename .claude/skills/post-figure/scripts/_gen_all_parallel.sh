#!/bin/bash
# Parallel variant generation across all slugs. Each slug runs with its
# own concurrency-5 pool; we also run up to 4 slugs concurrently.
# Only used as an accelerator; run_all.py still works sequentially.
set -u
cd "$(dirname "$0")/../../../.."

SLUGS=(
  "online-learning|An open book or laptop in the center with 4 small circular learner nodes arranged around it, connected by thin lines. A couple of small stars scattered between the nodes suggest peer feedback. Teal, yellow, violet, and blue nodes."
  "online-ambiguity|Two simple profile silhouettes facing each other across a gap, one violet and one teal. Between them, three small ambiguous signals drift: a speech bubble, a heart, and a question mark."
  "empirica|A 3x3 grid of small teal circular nodes, one highlighted yellow, each node a tiny group of three dots, connected by thin charcoal lines into a lattice. Conveys many parallel experiments in a shared lab."
  "task-space|A 2D scatter of 5 to 6 distinct iconic shapes (a speech bubble, a lightbulb, a balance scale, a diamond, a triangle, a star) on subtle x and y axes. A soft teal ellipse washes behind three of them to suggest a grouping."
  "forecasting|A teal crystal ball with a jagged line chart inside. Three dashed charcoal forecast lines fan out to the right from the ball, and one solid line — the actual outcome — departs in a different direction toward a small coral dot."
  "common-sense-llms|A simple human head silhouette on the left (teal) and a boxy robot head on the right (violet), both facing each other. Between them, three floating cards with simple check or cross marks showing where knowledge overlaps and where it doesn't."
  "ai-and-teamwork|Three small colored figures seated around a round teal table. A larger translucent outlined 'AI' figure stands slightly behind the group — present but not central. Thin dashed lines connect the humans to each other and one to the AI."
)

SCRIPT=".claude/skills/post-figure/scripts/gen_variants.py"

pids=()
for entry in "${SLUGS[@]}"; do
  slug="${entry%%|*}"
  prompt="${entry#*|}"
  echo "== launching $slug =="
  python3 "$SCRIPT" --slug "$slug" --prompt "$prompt" --n 10 --concurrency 3 > ".claude/skills/post-figure/references/${slug}.log" 2>&1 &
  pids+=($!)
  # Stagger slightly to avoid all starting at the exact same moment
  sleep 2
done

echo "waiting for ${#pids[@]} slug generators..."
for pid in "${pids[@]}"; do
  wait "$pid"
done
echo "all generation done"
