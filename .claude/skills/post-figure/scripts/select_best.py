#!/usr/bin/env python3
"""
Pick the best traced variant for a slug and install it as the canonical
post asset.

Combines:
  1. Heuristic score from `trace_batch.py` (filters out obviously broken
     traces: empty, too few paths, wrong palette).
  2. Visual evaluation by a VLM (anthropic/claude-opus-4.6 via OpenRouter)
     which looks at the top-scoring rasterizations and picks the one that
     best communicates the concept, matches the site style, and reads
     cleanly at thumbnail size.

Inputs:
    .claude/skills/post-figure/references/<slug>/trace-NN.{svg,png}
    .claude/skills/post-figure/references/<slug>/scores.json
    .claude/skills/post-figure/references/<slug>/_prompt.txt

Outputs:
    assets/<slug>.svg      (copy of chosen trace-NN.svg)
    assets/<slug>.png      (rasterization of chosen SVG)
    .claude/skills/post-figure/references/<slug>/winner.json
                           (chosen variant + VLM rationale)

Usage:
    python3 select_best.py --slug <slug> [--top-k 5] [--no-vlm]
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from rasterize import rasterize_cairosvg  # noqa: E402

SKILL_DIR = HERE.parent
REFS_DIR = SKILL_DIR / "references"
PROJECT_ROOT = SKILL_DIR.parent.parent.parent
ASSETS = PROJECT_ROOT / "assets"
ENV_PATH = PROJECT_ROOT / ".env"

STYLE_SPEC = (SKILL_DIR / "references" / "style.md").read_text()

VLM_MODEL = "anthropic/claude-opus-4.6"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    env.update(os.environ)
    return env


def img_to_data_url(p: Path) -> str:
    data = p.read_bytes()
    b64 = base64.b64encode(data).decode()
    return f"data:image/png;base64,{b64}"


def vlm_pick(subject: str, candidates: list[tuple[str, Path]], api_key: str) -> dict:
    """Ask the VLM to pick the best candidate.

    candidates: list of (label, png_path). label is how we refer to it in
    the prompt, e.g. 'A', 'B', etc.
    """
    parts: list[dict] = [
        {
            "type": "text",
            "text": (
                "You are picking the best cover figure for a blog post on "
                "whiting.me. The post concept is:\n\n"
                f"  {subject}\n\n"
                "The site style guide is:\n\n"
                f"{STYLE_SPEC}\n\n"
                f"Below are {len(candidates)} candidates, labeled "
                f"{', '.join(l for l, _ in candidates)}. Evaluate each "
                "on: (1) does it clearly communicate the concept, "
                "(2) does it match the style guide (minimal, iconographic, "
                "2-4 palette colors, clean composition), (3) does it read "
                "well as a small thumbnail.\n\n"
                "Respond with valid JSON ONLY, no prose outside the "
                "JSON object, with this shape:\n"
                "{\n"
                '  "winner": "<label>",\n'
                '  "rationale": "<one-sentence reason this one won>",\n'
                '  "ranked": [<labels from best to worst>],\n'
                '  "notes_per_candidate": {"A": "...", "B": "...", ...}\n'
                "}"
            ),
        }
    ]
    for label, png_path in candidates:
        parts.append({"type": "text", "text": f"Candidate {label}:"})
        parts.append(
            {
                "type": "image_url",
                "image_url": {"url": img_to_data_url(png_path)},
            }
        )

    body = {
        "model": VLM_MODEL,
        "messages": [{"role": "user", "content": parts}],
        "max_tokens": 2000,
    }

    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://whiting.me",
            "X-Title": "whiting.me variant selection",
        },
        data=json.dumps(body),
        timeout=240,
    )
    if r.status_code != 200:
        raise RuntimeError(f"VLM {r.status_code}: {r.text[:400]}")
    data = r.json()
    text = data["choices"][0]["message"]["content"]
    if isinstance(text, list):
        text = "".join(p.get("text", "") for p in text if isinstance(p, dict))

    # Pull the first JSON object out of the response text.
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise RuntimeError(f"VLM gave no JSON:\n{text}")
    return json.loads(text[start : end + 1])


def install_winner(slug: str, svg_src: Path) -> tuple[Path, Path]:
    dst_svg = ASSETS / f"{slug}.svg"
    dst_png = ASSETS / f"{slug}.png"
    shutil.copy2(svg_src, dst_svg)
    rasterize_cairosvg(dst_svg, dst_png, 1024)
    return dst_svg, dst_png


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slug", required=True)
    ap.add_argument(
        "--top-k",
        type=int,
        default=5,
        help="how many heuristic top candidates to show the VLM",
    )
    ap.add_argument(
        "--no-vlm", action="store_true", help="skip VLM, install heuristic winner"
    )
    args = ap.parse_args()

    slug_dir = REFS_DIR / args.slug
    scores_path = slug_dir / "scores.json"
    prompt_path = slug_dir / "_prompt.txt"
    if not scores_path.exists():
        print(
            f"no scores.json in {slug_dir}; run trace_batch.py first", file=sys.stderr
        )
        return 2

    scores = json.loads(scores_path.read_text())
    if not scores:
        print("no candidates", file=sys.stderr)
        return 2

    subject = prompt_path.read_text().strip() if prompt_path.exists() else args.slug

    # Top K by heuristic score
    top = scores[: max(1, args.top_k)]

    winner = None
    rationale = ""
    if args.no_vlm or len(top) == 1:
        winner = top[0]
        rationale = "heuristic top-scoring candidate"
    else:
        # Labels A, B, C, ...
        labels = [chr(ord("A") + i) for i in range(len(top))]
        candidates = [(lbl, slug_dir / c["png"]) for lbl, c in zip(labels, top)]
        env = load_env()
        api_key = env.get("OPENROUTER_API_KEY")
        if not api_key:
            raise SystemExit("OPENROUTER_API_KEY missing")
        print(f"Asking {VLM_MODEL} to pick among {len(candidates)} candidates...")
        verdict = vlm_pick(subject, candidates, api_key)
        winner_label = verdict["winner"]
        winner = top[labels.index(winner_label)]
        rationale = verdict.get("rationale", "")
        print(f"VLM picked {winner_label}: {rationale}")
        (slug_dir / "vlm_verdict.json").write_text(json.dumps(verdict, indent=2))

    svg_src = slug_dir / winner["svg"]
    dst_svg, dst_png = install_winner(args.slug, svg_src)

    (slug_dir / "winner.json").write_text(
        json.dumps(
            {
                "slug": args.slug,
                "source_svg": str(svg_src),
                "installed_svg": str(dst_svg),
                "installed_png": str(dst_png),
                "score": winner["score"],
                "rationale": rationale,
            },
            indent=2,
        )
    )
    print(f"Installed {dst_svg} and {dst_png}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
