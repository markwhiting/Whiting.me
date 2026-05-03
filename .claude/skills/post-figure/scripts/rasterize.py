#!/usr/bin/env python3
"""
Rasterize an SVG to a transparent 1024x1024 PNG.

Prefers cairosvg (pure-python, deterministic). Falls back to rsvg-convert
if cairosvg is not available. Validates that the output PNG is RGBA and
has a meaningful proportion of transparent pixels (> 15%), failing
otherwise — usually that means a stray full-canvas <rect fill="white"/>
snuck into the SVG.

Usage:
    python3 rasterize.py <in.svg> <out.png> [--size 1024]
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def rasterize_cairosvg(svg: Path, png: Path, size: int) -> None:
    import cairosvg  # type: ignore

    cairosvg.svg2png(
        url=str(svg),
        write_to=str(png),
        output_width=size,
        output_height=size,
    )


def rasterize_rsvg(svg: Path, png: Path, size: int) -> None:
    if not shutil.which("rsvg-convert"):
        raise SystemExit(
            "Neither cairosvg nor rsvg-convert is available. "
            "Install one of them: `pip install cairosvg` or `brew install librsvg`."
        )
    subprocess.run(
        [
            "rsvg-convert",
            "-w",
            str(size),
            "-h",
            str(size),
            "-b",
            "none",
            "-o",
            str(png),
            str(svg),
        ],
        check=True,
    )


def validate(png: Path) -> None:
    import numpy as np
    from PIL import Image

    im = Image.open(png)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
        im.save(png)
    a = np.array(im)
    transparent_ratio = (a[:, :, 3] == 0).mean()
    if transparent_ratio < 0.15:
        raise SystemExit(
            f"Rasterized PNG has only {transparent_ratio:.1%} transparent "
            f"pixels — the SVG probably has an opaque background rect. "
            f"Remove any full-canvas <rect fill=...> element."
        )
    # Also warn if totally empty
    nontransparent = (a[:, :, 3] > 0).sum()
    if nontransparent < 1000:
        raise SystemExit(
            f"Rasterized PNG appears empty ({nontransparent} non-transparent pixels)."
        )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("svg", type=Path)
    ap.add_argument("png", type=Path)
    ap.add_argument("--size", type=int, default=1024)
    args = ap.parse_args()

    if not args.svg.exists():
        print(f"not found: {args.svg}", file=sys.stderr)
        return 2

    args.png.parent.mkdir(parents=True, exist_ok=True)

    try:
        import cairosvg  # noqa: F401

        backend = "cairosvg"
        rasterize_cairosvg(args.svg, args.png, args.size)
    except ImportError:
        backend = "rsvg-convert"
        rasterize_rsvg(args.svg, args.png, args.size)

    validate(args.png)
    print(f"[{backend}] {args.svg} -> {args.png} ({args.size}x{args.size}, RGBA)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
