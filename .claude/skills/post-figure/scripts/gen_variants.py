#!/usr/bin/env python3
"""
Generate N reference bitmap variants for a post figure.

Writes them to:
    .claude/skills/post-figure/references/<slug>/ref-00.png
    .claude/skills/post-figure/references/<slug>/ref-01.png
    ...

Each call to GPT Image 2 is independent, so variants will differ in
composition, color mix, and arrangement. This is the "diverse candidate"
step of the skill pipeline — later scripts trace each to SVG and select
the best one.

Usage:
    python3 gen_variants.py --slug <slug> --prompt "<subject>" [--n 10]

If a given ref-NN.png already exists it is not regenerated, so you can
re-run to fill in any variants lost to transient API errors.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
SKILL_DIR = HERE.parent
REFS_DIR = SKILL_DIR / "references"
PROJECT_ROOT = SKILL_DIR.parent.parent.parent
ENV_PATH = PROJECT_ROOT / ".env"


STYLE_PREAMBLE = (
    "Minimal flat vector-style sketch on a pure solid white background "
    "(#FFFFFF). Exactly 3 to 6 bold simple shapes, no fine detail, no "
    "texture, no gradient background, no drop shadows. Strong silhouette-"
    "first composition that would read clearly as a 32px icon. Thick "
    "charcoal (#2C2C2C) outlines on every shape, rounded corners, no "
    "hatching. Large flat fills from a small palette of muted teal "
    "(#5FA8A0), warm yellow (#F2C94C), soft violet (#B79CD9), cool blue "
    "(#6C8EBF), or warm coral (#E57373). Avoid photorealism, avoid "
    "painterly brushwork. No text, no letters, no numbers, no logos, no "
    "watermarks, no borders. Square 1024x1024 composition, subject "
    "centered with generous empty space around the edges. This is a "
    "reference sketch — simpler is better, think children's book "
    "illustration, not magazine illustration."
)


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


def call_openrouter(prompt: str, api_key: str, nudge: str = "") -> bytes:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://whiting.me",
        "X-Title": "whiting.me post figure variant",
    }
    full = STYLE_PREAMBLE + "\n\nSubject:\n" + prompt
    if nudge:
        full += "\n\nVariation note: " + nudge
    body = {
        "model": "openai/gpt-5.4-image-2",
        "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": full}],
    }
    r = requests.post(url, headers=headers, data=json.dumps(body), timeout=240)
    if r.status_code != 200:
        raise RuntimeError(f"OpenRouter {r.status_code}: {r.text[:300]}")
    data = r.json()
    msg = data["choices"][0]["message"]

    for img in msg.get("images") or []:
        u = (img.get("image_url") or {}).get("url") or img.get("url")
        if u and u.startswith("data:"):
            return base64.b64decode(u.split(",", 1)[1])

    content = msg.get("content")
    if isinstance(content, list):
        for part in content:
            u = None
            if isinstance(part.get("image_url"), dict):
                u = part["image_url"].get("url")
            elif isinstance(part.get("image_url"), str):
                u = part["image_url"]
            if isinstance(u, str) and u.startswith("data:"):
                return base64.b64decode(u.split(",", 1)[1])

    raise RuntimeError("No image in response: " + json.dumps(data)[:500])


# Per-variant nudges steer the model to explore different compositions.
# They are short hints appended after the main subject.
NUDGES = [
    "",  # baseline
    "Use a tight diagonal composition.",
    "Place the subject slightly off-center with asymmetric negative space.",
    "Use primarily two colors from the palette, sparingly.",
    "Use a horizontal composition with two focal zones.",
    "Use a vertical stacked composition with a single strong accent.",
    "Use a radial / circular arrangement around a central element.",
    "Favor geometric shapes over organic curves.",
    "Favor organic curves and soft shapes.",
    "Use one large dominant shape plus 2-3 small supporting shapes.",
]


def generate_one(slug_dir: Path, idx: int, prompt: str, key: str) -> str:
    """Generate one variant; returns a short status string."""
    out = slug_dir / f"ref-{idx:02d}.png"
    if out.exists():
        return f"exists {out.name}"
    nudge = NUDGES[idx % len(NUDGES)]
    last_err = None
    for tries in range(3):
        try:
            data = call_openrouter(prompt, key, nudge=nudge)
            out.write_bytes(data)
            return f"wrote {out.name}  ({len(data):>7} bytes)  nudge={nudge[:40]!r}"
        except Exception as e:
            last_err = e
            time.sleep(2 + tries * 2)
    return f"FAILED {out.name}: {last_err}"


def main() -> int:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--force", action="store_true")
    ap.add_argument(
        "--concurrency",
        type=int,
        default=5,
        help="number of parallel generation requests",
    )
    args = ap.parse_args()

    env = load_env()
    key = env.get("OPENROUTER_API_KEY")
    if not key:
        print("OPENROUTER_API_KEY missing", file=sys.stderr)
        return 2

    out_dir = REFS_DIR / args.slug
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "_prompt.txt").write_text(args.prompt + "\n")

    if args.force:
        for i in range(args.n):
            p = out_dir / f"ref-{i:02d}.png"
            if p.exists():
                p.unlink()

    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {
            pool.submit(generate_one, out_dir, i, args.prompt, key): i
            for i in range(args.n)
        }
        for fut in as_completed(futures):
            print("  " + fut.result())

    return 0


if __name__ == "__main__":
    sys.exit(main())
