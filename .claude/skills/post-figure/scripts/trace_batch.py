#!/usr/bin/env python3
"""
Trace every reference variant for a slug to SVG, rasterize each to PNG,
and score them so a winner can be selected.

Input layout:
    .claude/skills/post-figure/references/<slug>/ref-NN.png

Output layout:
    .claude/skills/post-figure/references/<slug>/trace-NN.svg
    .claude/skills/post-figure/references/<slug>/trace-NN.png
    .claude/skills/post-figure/references/<slug>/scores.json

Score heuristic (higher = better):
  - All palette colors present in figure          (+2 per desired color)
  - Path count in the sweet spot [6, 40]          (+3)
  - Non-transparent area roughly 15%-55%          (+2)
  - Palette ratio 100% (post-snap)                (+1)
  - Penalize tiny/empty outputs                   (-5)
  - Penalize >120 paths (overly complex)          (-3)

Usage:
    python3 trace_batch.py --slug <slug>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from trace import trace  # noqa: E402

from rasterize import rasterize_cairosvg  # noqa: E402

SKILL_DIR = HERE.parent
REFS_DIR = SKILL_DIR / "references"

PALETTE_HEX = {"#5FA8A0", "#F2C94C", "#B79CD9", "#6C8EBF", "#E57373", "#2C2C2C"}


def score_variant(svg_path: Path, png_path: Path) -> dict:
    text = svg_path.read_text()
    colors = Counter(c.upper() for c in re.findall(r'fill="(#[0-9A-Fa-f]{6})"', text))
    path_count = text.count("<path")
    byte_size = len(text)

    # Rasterize stats
    im = Image.open(png_path)
    a = np.array(im.convert("RGBA"))
    nontransparent = (a[:, :, 3] > 0).mean()

    unique_palette = sum(1 for h in colors if h in PALETTE_HEX and h != "#2C2C2C")
    palette_total = sum(v for k, v in colors.items() if k in PALETTE_HEX)
    palette_ratio = palette_total / max(1, sum(colors.values()))

    score = 0.0
    score += 2.0 * unique_palette  # diversity of colors
    if 6 <= path_count <= 40:
        score += 3.0
    elif path_count > 120:
        score -= 3.0
    elif path_count < 3:
        score -= 5.0
    if 0.15 <= nontransparent <= 0.55:
        score += 2.0
    elif nontransparent < 0.05:
        score -= 5.0
    if palette_ratio >= 0.99:
        score += 1.0
    # Prefer slightly smaller SVGs
    if byte_size < 60_000:
        score += 0.5

    return {
        "svg": str(svg_path.name),
        "png": str(png_path.name),
        "path_count": path_count,
        "byte_size": byte_size,
        "nontransparent_ratio": round(float(nontransparent), 3),
        "colors": dict(colors),
        "unique_accent_colors": unique_palette,
        "palette_ratio": round(palette_ratio, 3),
        "score": round(score, 2),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slug", required=True)
    args = ap.parse_args()

    slug_dir = REFS_DIR / args.slug
    if not slug_dir.exists():
        print(f"no such slug dir: {slug_dir}", file=sys.stderr)
        return 2

    refs = sorted(slug_dir.glob("ref-*.png"))
    if not refs:
        print(f"no references in {slug_dir}", file=sys.stderr)
        return 2

    results = []
    for ref in refs:
        n = ref.stem.split("-")[1]
        svg = slug_dir / f"trace-{n}.svg"
        png = slug_dir / f"trace-{n}.png"
        try:
            trace(ref, svg, snap=False)
            rasterize_cairosvg(svg, png, 1024)
            s = score_variant(svg, png)
            results.append(s)
            print(
                f"  {ref.name} -> trace-{n}: paths={s['path_count']:>3} "
                f"colors={s['unique_accent_colors']} opaque={s['nontransparent_ratio']:.0%} "
                f"score={s['score']}"
            )
        except Exception as e:
            print(f"  {ref.name}: FAILED {e}", file=sys.stderr)

    results.sort(key=lambda r: -r["score"])
    (slug_dir / "scores.json").write_text(json.dumps(results, indent=2))
    print(f"\nTop 3 for {args.slug}:")
    for r in results[:3]:
        print(f"  {r['svg']:15s}  score={r['score']:<4}  paths={r['path_count']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
