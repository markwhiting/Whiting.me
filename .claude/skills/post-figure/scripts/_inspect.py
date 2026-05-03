#!/usr/bin/env python3
"""Quick color fingerprint for a PNG (debug helper)."""

import sys

import numpy as np
from PIL import Image

im = Image.open(sys.argv[1]).convert("RGB")
a = np.array(im).reshape(-1, 3)
idx = np.random.RandomState(0).choice(a.shape[0], min(5000, a.shape[0]), replace=False)
s = a[idx]
tests = {
    "coral/red-ish (E57373)": ((s[:, 0] > 200) & (s[:, 1] < 150) & (s[:, 2] < 150)),
    "yellow-ish (F2C94C)": ((s[:, 0] > 220) & (s[:, 1] > 170) & (s[:, 2] < 120)),
    "teal-ish (5FA8A0)": ((s[:, 0] < 130) & (s[:, 1] > 140) & (s[:, 2] > 140)),
    "violet-ish (B79CD9)": ((s[:, 0] > 140) & (s[:, 2] > 180) & (s[:, 1] < 180)),
    "blue-ish (6C8EBF)": ((s[:, 0] < 150) & (s[:, 1] > 120) & (s[:, 2] > 170)),
    "charcoal": ((s[:, 0] < 80) & (s[:, 1] < 80) & (s[:, 2] < 80)),
    "white": ((s[:, 0] > 240) & (s[:, 1] > 240) & (s[:, 2] > 240)),
    "skin-tone-ish": (
        (s[:, 0] > 180)
        & (s[:, 1] > 130)
        & (s[:, 2] < 170)
        & (s[:, 0] > s[:, 1])
        & (s[:, 1] > s[:, 2])
    ),
}
for name, mask in tests.items():
    print(f"{name:30s}  {mask.mean():6.1%}")
