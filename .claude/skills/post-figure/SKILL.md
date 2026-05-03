---
name: post-figure
description: Use when creating, updating, or regenerating a cover figure for a blog post on whiting.me. This skill produces a crisp transparent 1024×1024 PNG (plus editable SVG source) in the site's minimal, iconographic style. Under the hood it generates 10 low-detail candidate bitmaps with GPT Image 2 via OpenRouter, auto-traces each to a clean palette-snapped SVG with vtracer, rasterizes them, and then asks a vision-language model (claude-opus-4.6 via OpenRouter) to pick the candidate that best communicates the concept and matches the site style. Invoke this skill whenever a post needs new art, an existing image looks wrong, or the user asks for post figures to be refreshed.
---

# Post figure pipeline

The final artifact for each post is a 1024×1024 PNG with a **fully transparent** background, stored in `assets/<slug>.png`, and referenced from the post's front matter as `image: <slug>.png`. The source-of-truth is the SVG in `assets/<slug>.svg` — the PNG is just a rasterization of it. Commit both.

The site style is minimal, iconographic, flat-color, a bit playful, never photorealistic. A good figure is a **small number of confident shapes** (usually 5–15 paths), using 2–4 colors from the palette. The full style spec is in `references/style.md` — read it before running the pipeline.

## Pipeline

```
gen_variants.py ─→ trace_batch.py ─→ select_best.py ─→ assets/<slug>.{svg,png}
  (10 PNGs)      (10 SVGs + PNGs)   (VLM picks 1)
```

1. **Generate 10 variants.** Call GPT Image 2 ten times with the same subject prompt plus ten different composition "nudges" (diagonal, radial, two-color, etc.). Each variant is a 1024×1024 low-detail bitmap on a white background.
2. **Trace each to SVG.** For each variant: flood-fill white to transparent, run `vtracer` with aggressive color-clustering settings, post-process to snap surviving colors onto the site palette and drop any residual background paths.
3. **Rasterize and score.** Each SVG is rasterized back to PNG and scored heuristically (path count in [6, 40], non-transparent area in [15%, 55%], palette coverage, palette ratio).
4. **VLM picks the winner.** The top-5 heuristic candidates are sent to `anthropic/claude-opus-4.6` via OpenRouter along with the subject prompt and the full style guide. The model returns a JSON verdict with the chosen label and rationale.
5. **Install.** The winning SVG is copied to `assets/<slug>.svg` and rasterized to `assets/<slug>.png`.

All intermediate artifacts live under `.claude/skills/post-figure/references/<slug>/` — references, traces, scores, and VLM verdicts are kept there so you can inspect any step after the fact.

## Commands

### End-to-end for one slug

```bash
python3 .claude/skills/post-figure/scripts/gen_variants.py \
    --slug <slug> \
    --prompt "<short subject>" \
    --n 10

python3 .claude/skills/post-figure/scripts/trace_batch.py \
    --slug <slug>

python3 .claude/skills/post-figure/scripts/select_best.py \
    --slug <slug>
```

### End-to-end for all posts

```bash
python3 .claude/skills/post-figure/scripts/run_all.py
```

### Useful flags

- `gen_variants.py --force` — regenerate variants that already exist
- `trace_batch.py` is idempotent; rerun safely after tweaking `trace.py`
- `select_best.py --top-k 10` — show the VLM all variants, not just top 5
- `select_best.py --no-vlm` — skip VLM, install heuristic top-scorer

## Prompt design

For each slug, write a **short** subject prompt (1–2 sentences). The preamble in `gen_variants.py` supplies all the style constraints (palette, white bg, flat fills, no text, etc.), so the prompt should only carry the concept.

Good prompt:

> A crystal ball with a jagged line chart inside, three dashed forecast lines fanning out to the right, and one solid line — the actual outcome — departing in a different direction toward a coral dot.

Bad prompt (doubles up on the style preamble):

> A minimalist flat-style illustration in teal and yellow on a transparent background showing a crystal ball... [etc.]

## Style palette (quick reference)

| Role | Hex |
|---|---|
| Teal (primary) | `#5FA8A0` |
| Yellow (accent) | `#F2C94C` |
| Violet (accent) | `#B79CD9` |
| Blue (accent) | `#6C8EBF` |
| Coral (accent) | `#E57373` |
| Charcoal (line work) | `#2C2C2C` |

Every non-palette color that survives tracing is snapped to the nearest entry here by `trace.py`.

## Artifacts

After a full run for slug `forecasting` you will have:

```
.claude/skills/post-figure/references/forecasting/
    _prompt.txt              # prompt used
    ref-00.png               # 10 reference bitmaps from GPT Image 2
    ref-01.png
    ...
    ref-09.png
    trace-00.svg             # traced SVGs
    trace-00.png             # rasterized previews
    trace-01.svg
    trace-01.png
    ...
    scores.json              # heuristic scoring of all 10
    vlm_verdict.json         # VLM picks + per-candidate notes
    winner.json              # final record of what was installed
assets/
    forecasting.svg          # installed editable source
    forecasting.png          # installed transparent PNG
```

The references folder can be deleted at any time — it's regenerable from `_prompt.txt`. Or keep it: having 10 labeled alternatives makes it trivial to swap in a different one later without redoing the whole pipeline.

## Cost and time

- ~10 OpenRouter image-generation calls per slug (`openai/gpt-5.4-image-2`), ~30s each.
- ~1 VLM call per slug (`anthropic/claude-opus-4.6`) with 5 images attached.
- Full run for 8 posts: roughly 40–60 minutes wall-clock, sequential.

## Manual override

If the VLM picks poorly or you want a different variant, edit `scores.json`'s order (or pass `--no-vlm` and edit manually) and re-run `select_best.py --no-vlm`. All the traces are already on disk, so no regeneration is needed.

To hand-edit the winning SVG after installation: edit `assets/<slug>.svg` directly, then:

```bash
python3 .claude/skills/post-figure/scripts/rasterize.py \
    assets/<slug>.svg assets/<slug>.png
```

## Files

| Path | Purpose |
|---|---|
| `scripts/gen_variants.py` | Generate N reference bitmaps |
| `scripts/trace.py` | Single-bitmap → SVG tracer (used as library by trace_batch) |
| `scripts/trace_batch.py` | Trace + score all variants for a slug |
| `scripts/select_best.py` | VLM picks winner and installs |
| `scripts/rasterize.py` | SVG → transparent PNG via cairosvg/rsvg-convert |
| `scripts/run_all.py` | End-to-end for all 8 current posts |
| `scripts/_inspect.py` | Color fingerprint debug helper |
| `references/style.md` | Canonical style guide (read before composing) |
| `references/template.svg` | Starter SVG for manual figures |
