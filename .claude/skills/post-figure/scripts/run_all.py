#!/usr/bin/env python3
"""
Run the full post-figure pipeline for every post that currently needs a
generated figure. One-shot driver: generate 10 variants, trace and score
them, let a VLM pick a winner, install as assets/<slug>.{svg,png}.

Edit PROMPTS below if you add or change posts.

Usage:
    python3 run_all.py                 # all slugs, skip anything already done
    python3 run_all.py --slug forecasting   # just one
    python3 run_all.py --force         # regenerate even if refs exist
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent


PROMPTS: dict[str, str] = {
    "biological-grammars": (
        "A branching tree of blood vessels whose branches narrow into a "
        "small parse tree of 5 circles below, joined by a connecting "
        "arrow. Coral vessels, teal circles."
    ),
    "online-learning": (
        "An open book or laptop in the center with 4 small circular "
        "learner nodes arranged around it, connected by thin lines. A "
        "couple of small stars scattered between the nodes suggest peer "
        "feedback. Teal, yellow, violet, and blue nodes."
    ),
    "online-ambiguity": (
        "Two simple profile silhouettes facing each other across a gap, "
        "one violet and one teal. Between them, three small ambiguous "
        "signals drift: a speech bubble, a heart, and a question mark."
    ),
    "empirica": (
        "A 3x3 grid of small teal circular nodes, one highlighted yellow, "
        "each node a tiny group of three dots, connected by thin "
        "charcoal lines into a lattice. Conveys many parallel experiments "
        "in a shared lab."
    ),
    "task-space": (
        "A 2D scatter of 5 to 6 distinct iconic shapes (a speech bubble, "
        "a lightbulb, a balance scale, a diamond, a triangle, a star) "
        "on subtle x and y axes. A soft teal ellipse washes behind three "
        "of them to suggest a grouping."
    ),
    "forecasting": (
        "A teal crystal ball with a jagged line chart inside. Three "
        "dashed charcoal forecast lines fan out to the right from the "
        "ball, and one solid line — the actual outcome — departs in a "
        "different direction toward a small coral dot."
    ),
    "common-sense-llms": (
        "A simple human head silhouette on the left (teal) and a boxy "
        "robot head on the right (violet), both facing each other. "
        "Between them, three floating cards with simple check or cross "
        "marks showing where knowledge overlaps and where it doesn't."
    ),
    "ai-and-teamwork": (
        "Three small colored figures seated around a round teal table. "
        "A larger translucent outlined 'AI' figure stands slightly "
        "behind the group — present but not central. Thin dashed lines "
        "connect the humans to each other and one to the AI."
    ),
}


def run(cmd: list[str]) -> None:
    print("  $", " ".join(cmd))
    r = subprocess.run(cmd, check=False)
    if r.returncode != 0:
        raise SystemExit(f"subprocess failed: {' '.join(cmd)}")


def process_slug(
    slug: str, prompt: str, force: bool, n: int, top_k: int, no_vlm: bool
) -> None:
    print(f"\n=== {slug} ===")
    t0 = time.time()

    cmd = [
        sys.executable,
        str(HERE / "gen_variants.py"),
        "--slug",
        slug,
        "--prompt",
        prompt,
        "--n",
        str(n),
    ]
    if force:
        cmd.append("--force")
    run(cmd)

    run([sys.executable, str(HERE / "trace_batch.py"), "--slug", slug])

    select_cmd = [
        sys.executable,
        str(HERE / "select_best.py"),
        "--slug",
        slug,
        "--top-k",
        str(top_k),
    ]
    if no_vlm:
        select_cmd.append("--no-vlm")
    run(select_cmd)

    dt = time.time() - t0
    print(f"  {slug} done in {dt:.0f}s")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slug", help="only run for this slug")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--top-k", type=int, default=5)
    ap.add_argument("--force", action="store_true", help="regenerate refs from scratch")
    ap.add_argument(
        "--no-vlm", action="store_true", help="skip VLM, use heuristic winner"
    )
    args = ap.parse_args()

    slugs = [args.slug] if args.slug else list(PROMPTS.keys())
    for slug in slugs:
        if slug not in PROMPTS:
            print(f"unknown slug: {slug}", file=sys.stderr)
            return 2
        try:
            process_slug(
                slug,
                PROMPTS[slug],
                force=args.force,
                n=args.n,
                top_k=args.top_k,
                no_vlm=args.no_vlm,
            )
        except SystemExit as e:
            print(f"  {slug}: FAILED -- {e}", file=sys.stderr)

    print("\nAll done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
