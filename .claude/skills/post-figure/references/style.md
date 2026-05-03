# Post figure style guide

Read this before composing any SVG. Every post figure on whiting.me should be consistent with this spec so the archive and home page read as one family.

## Canvas

- `viewBox="0 0 1024 1024"`
- `width="1024" height="1024"`
- **No background**. Do not include a full-canvas `<rect>` at any opacity. The PNG rasterization must end up with >15% transparent pixels or the `rasterize.py` validator will refuse to write it.
- Subject centered with ≥64px of breathing room on every side.

## Palette

Use these exact tokens. Pick 2–4 colors per figure — not all six.

| Role | Hex | Notes |
|---|---|---|
| Teal (primary) | `#5FA8A0` | the house color; most figures include at least one teal element |
| Yellow (accent) | `#F2C94C` | for highlights, "selected", "anomalous", or focal elements |
| Violet (accent) | `#B79CD9` | pairs well with teal; often used for the other half of a duo |
| Blue (accent) | `#6C8EBF` | structural / infrastructural feel |
| Coral (accent) | `#E57373` | organic / biological / cautionary |
| Charcoal (line work) | `#2C2C2C` | all outlines; sometimes flat fills (hair, silhouettes) |

For soft washes behind a subject, use the same palette hexes with `fill-opacity="0.18"`. Do not use pure black or pure white.

## Line work

- Stroke color: always `#2C2C2C`.
- Stroke width: `4` at 1024px canvas (so it reads as ~1px at the 220px home-page thumbnail).
- `stroke-linecap="round"` and `stroke-linejoin="round"` on every stroked element.
- No dashed strokes as primary line work; reserve dashing for secondary arrows/connectors at `stroke-dasharray="6 8"`.
- No double strokes, no inner glow, no shadows.

## Composition

- 3–8 distinct elements total. Fewer is better.
- Prefer symbolic/iconographic over literal. A "team" is 3 circles, not 3 detailed human figures. A "brain" is a curvy outline, not a medical diagram.
- High contrast between adjacent fills. Avoid placing yellow on coral, teal on blue, etc. — separate similar-value colors with charcoal outlines or whitespace.
- No text, no labels, no numerals, no logos, no framing borders.

## Primitives and patterns

Prefer native SVG primitives. In rough order of preference:

- `<circle cx="" cy="" r="" />` — nodes, heads, dots
- `<rect x="" y="" width="" height="" rx="" />` — cards, panels, screens
- `<ellipse>` — soft background washes
- `<line>` / `<polyline>` — connectors, axes, arrows (without arrowheads)
- `<polygon>` — simple geometric shapes
- `<path d="..." />` — only when a curve is really needed

For arrows with heads, define `<defs><marker>` once at the top and reference with `marker-end="url(#arrow)"`.

## Example patterns

**Soft color wash behind a subject:**

```svg
<ellipse cx="512" cy="512" rx="360" ry="280" fill="#5FA8A0" fill-opacity="0.18"/>
```

**Standard node (circle with outline and flat fill):**

```svg
<circle cx="512" cy="512" r="48" fill="#F2C94C" stroke="#2C2C2C" stroke-width="4"/>
```

**Connector line:**

```svg
<line x1="300" y1="300" x2="700" y2="700"
      stroke="#2C2C2C" stroke-width="4"
      stroke-linecap="round"/>
```

**Arrow marker (define once, reuse):**

```svg
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="#2C2C2C"/>
  </marker>
</defs>
<line x1="200" y1="512" x2="800" y2="512"
      stroke="#2C2C2C" stroke-width="4"
      marker-end="url(#arrow)"/>
```

## Anti-patterns

- ❌ Full-canvas background rect (blocks transparency).
- ❌ Realistic faces, detailed anatomy, painterly shading.
- ❌ More than 8 distinct shapes.
- ❌ Text. The post title does the talking.
- ❌ Drop shadows, blurs, gradients heavier than a single `fill-opacity` wash.
- ❌ Corners that touch the 1024×1024 edge. Always leave breathing room.
