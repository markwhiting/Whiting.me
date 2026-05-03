#!/usr/bin/env python3
"""
Trace a reference bitmap to SVG.

Pipeline:
  1. Load the reference PNG.
  2. Knock out the near-white background (connected from every edge) to
     alpha=0 so the tracer doesn't waste paths on it.
  3. Snap the remaining colors to the site palette + transparent, so
     traced paths use the canonical tokens rather than off-palette
     model colors.
  4. Run vtracer to produce a color SVG.
  5. Post-process: strip paths with a fully-transparent fill, snap hex
     colors onto the palette (vtracer can drift), rewrite the opening
     <svg ...> tag so the output has proper viewBox and no width/height
     lock, and drop any stray background paths.

Usage:
    python3 trace.py <in.png> <out.svg>
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, deque
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image

# Palette (keep in sync with references/style.md)
PALETTE = {
    "teal": (0x5F, 0xA8, 0xA0),
    "yellow": (0xF2, 0xC9, 0x4C),
    "violet": (0xB7, 0x9C, 0xD9),
    "blue": (0x6C, 0x8E, 0xBF),
    "coral": (0xE5, 0x73, 0x73),
    "charcoal": (0x2C, 0x2C, 0x2C),
    "white": (
        0xFF,
        0xFF,
        0xFF,
    ),  # not a final output color, used as "stay transparent" anchor
}


def knockout_white(im: Image.Image, threshold: int = 220) -> Image.Image:
    """Flood-fill near-white pixels from the edges to alpha=0. Also zero
    alpha on any isolated near-white pixel regardless of connectivity, so
    anti-aliased white halos don't get snapped to yellow later."""
    a = np.array(im.convert("RGBA"))
    h, w = a.shape[:2]
    r, g, b = (
        a[:, :, 0].astype(np.int16),
        a[:, :, 1].astype(np.int16),
        a[:, :, 2].astype(np.int16),
    )
    whiteish = (r >= threshold) & (g >= threshold) & (b >= threshold)
    # Connected flood from edges
    visited = np.zeros((h, w), bool)
    q: deque = deque()
    for x in range(w):
        if whiteish[0, x]:
            q.append((0, x))
            visited[0, x] = True
        if whiteish[h - 1, x]:
            q.append((h - 1, x))
            visited[h - 1, x] = True
    for y in range(h):
        if whiteish[y, 0]:
            q.append((y, 0))
            visited[y, 0] = True
        if whiteish[y, w - 1]:
            q.append((y, w - 1))
            visited[y, w - 1] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and whiteish[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))
    # Aggressively also zero pure-near-white anywhere (anti-aliasing haze)
    pure_whiteish = (r >= 245) & (g >= 245) & (b >= 245)
    a[:, :, 3] = np.where(visited | pure_whiteish, 0, a[:, :, 3])
    return Image.fromarray(a, "RGBA")


def snap_to_palette(im: Image.Image, max_dist2: int = 40000) -> Image.Image:
    """Snap every opaque pixel's RGB to the nearest palette entry, with
    *white included* as a transparent sink. Pixels whose nearest palette
    entry is white get alpha=0 (they were background or anti-aliasing
    haze). Pixels farther than sqrt(max_dist2) from any entry also get
    alpha=0.

    This is the key step that prevents cream-colored anti-aliasing halos
    between shapes from getting traced as large yellow/violet patches."""
    a = np.array(im.convert("RGBA")).astype(np.int16)
    names = list(PALETTE.keys())  # includes 'white'
    pal = np.array([PALETTE[n] for n in names], dtype=np.int16)
    white_idx = names.index("white")

    rgb = a[:, :, :3]
    diff = rgb[:, :, None, :] - pal[None, None, :, :]
    d2 = (diff * diff).sum(axis=-1)
    idx = d2.argmin(axis=-1)
    min_d2 = d2.min(axis=-1)

    snapped = pal[idx]
    out = a.copy()
    out[:, :, :3] = snapped

    # Alpha -> 0 where nearest is white, OR where nothing is close
    drop = (idx == white_idx) | (min_d2 > max_dist2)
    out[:, :, 3] = np.where(drop, 0, out[:, :, 3])
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def hex_of(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


PALETTE_HEX = {hex_of(v) for k, v in PALETTE.items() if k != "white"}


def postprocess_svg(svg_text: str) -> str:
    # Standardize opening tag so cairosvg/rsvg can render cleanly at any
    # size and the result has a proper viewBox.
    svg_text = re.sub(
        r"<svg[^>]*>",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" '
        'width="1024" height="1024">',
        svg_text,
        count=1,
    )

    # Drop paths that are white or near-white (background / empty space).
    def is_background(m: re.Match) -> bool:
        fill = m.group(1).upper()
        if fill.startswith("#") and len(fill) == 7:
            r = int(fill[1:3], 16)
            g = int(fill[3:5], 16)
            b = int(fill[5:7], 16)
            return r > 230 and g > 230 and b > 230
        return False

    # iterate path tags and remove those with white-ish fill
    path_re = re.compile(r'<path[^/>]*fill="([^"]+)"[^/>]*/>')
    keep = []
    last = 0
    for m in path_re.finditer(svg_text):
        chunk = svg_text[last : m.start()]
        keep.append(chunk)
        if not is_background(m):
            keep.append(m.group(0))
        last = m.end()
    keep.append(svg_text[last:])
    svg_text = "".join(keep)

    # Snap every remaining fill color to the nearest palette hex.
    def snap_color(m: re.Match) -> str:
        hx = m.group(1).upper()
        if len(hx) != 7:
            return m.group(0)
        r = int(hx[1:3], 16)
        g = int(hx[3:5], 16)
        b = int(hx[5:7], 16)
        best = None
        best_d = 10**9
        for name, rgb in PALETTE.items():
            if name == "white":
                continue
            d = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2
            if d < best_d:
                best_d = d
                best = rgb
        return f'fill="{hex_of(best)}"'  # type: ignore[arg-type]

    svg_text = re.sub(r'fill="(#[0-9a-fA-F]{6})"', snap_color, svg_text)
    return svg_text


def trace(src_png: Path, out_svg: Path, snap: bool = False) -> dict:
    im = Image.open(src_png)
    im = knockout_white(im)
    if snap:
        im = snap_to_palette(im)

    # vtracer needs a file on disk
    tmp_png = out_svg.with_suffix(".prep.png")
    im.save(tmp_png)

    tmp_svg = out_svg.with_suffix(".raw.svg")
    # filter_speckle: drop noisy micro-paths
    # color_precision=5 clusters RGB into 2^5=32 levels -> fewer colors
    # layer_difference high -> aggressive merging across colors
    vtracer.convert_image_to_svg_py(
        str(tmp_png),
        str(tmp_svg),
        colormode="color",
        mode="spline",
        filter_speckle=16,
        color_precision=5,
        layer_difference=32,
        corner_threshold=60,
        length_threshold=6.0,
    )

    raw = tmp_svg.read_text()
    cleaned = postprocess_svg(raw)
    out_svg.write_text(cleaned)

    # Cleanup temps
    try:
        tmp_png.unlink()
        tmp_svg.unlink()
    except OSError:
        pass

    # Stats for selection heuristics
    colors = Counter(re.findall(r'fill="(#[0-9A-Fa-f]{6})"', cleaned))
    return {
        "path_count": cleaned.count("<path"),
        "byte_size": len(cleaned),
        "colors": dict(colors),
        "palette_ratio": (
            sum(v for k, v in colors.items() if k.upper() in PALETTE_HEX)
            / max(1, sum(colors.values()))
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src", type=Path)
    ap.add_argument("dst", type=Path)
    ap.add_argument(
        "--snap",
        action="store_true",
        help="aggressively snap all pixels to the site palette before tracing",
    )
    args = ap.parse_args()

    if not args.src.exists():
        print(f"not found: {args.src}", file=sys.stderr)
        return 2

    args.dst.parent.mkdir(parents=True, exist_ok=True)
    stats = trace(args.src, args.dst, snap=args.snap)
    print(f"{args.src} -> {args.dst}")
    print(
        f"  paths={stats['path_count']}  bytes={stats['byte_size']}  palette_ratio={stats['palette_ratio']:.1%}"
    )
    print(f"  colors={stats['colors']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
