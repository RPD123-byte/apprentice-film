#!/usr/bin/env python3
"""Gate a full render before it is shared: frame count, black frames, error bars, regressions vs a previous render,
and per-shot distance to the source (mean abs diff after a sigma-4 blur, 8-bit levels, on 1/4-scale frames).

Usage: python3 tools/verify_render.py renders/new.mp4 [renders/old.mp4]

The per-shot distance needs your copy of the original film: set APPRENTICE_SOURCE (or REF) to its path.
Without it the script still checks frame count, black frames and error bars (and regressions if OLD is given).
"""
import os
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = os.environ.get("REF") or os.environ.get("APPRENTICE_SOURCE")
if SRC and not os.path.isfile(SRC):
    sys.exit(f"source film not found: {SRC}")
W, H = 552, 236  # 1/4 scale
FPS, DUR = 25, 140.8
PLAN = re.findall(r'\["(s\d+)",\s*([\d.]+),\s*([\d.]+)', (ROOT / "src/shots/index.js").read_text())


def frames(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)


def blur(f):
    return cv2.GaussianBlur(f.astype(np.float32), (0, 0), 1.0)  # sigma 4 at full res ~= 1 at 1/4 scale


if len(sys.argv) < 2:
    sys.exit(__doc__)
new = sys.argv[1]
old = sys.argv[2] if len(sys.argv) > 2 else None
if not SRC:
    print("APPRENTICE_SOURCE not set: skipping the distance to the source (checking frames and regressions only)\n")
refs = ([frames(SRC)] if SRC else []) + ([frames(old)] if old else [])
black, errbar, rows = [], [], []
nan = float("nan")
for i, fs in enumerate(zip(frames(new), *refs)):
    n = fs[0]
    s = fs[1] if SRC else None
    o = fs[-1] if old else None
    # A correct render never goes fully black (the grade's grain keeps every frame above mean 2).
    if n.mean() < 1.0 and (s is None or s.mean() > 8):
        black.append(i)
    top = n[1:20].astype(float)
    b_, g_, r_ = top[..., 0].mean(), top[..., 1].mean(), top[..., 2].mean()
    if r_ > 25 and g_ < 0.45 * r_ and b_ < 0.45 * r_:  # the red error bar a failing shot paints (src/main.js)
        errbar.append(i)
    bn = blur(n)
    if s is not None:
        bs = blur(s)
        d_new = float(np.abs(bn - bs).mean())
        d_old = float(np.abs(blur(o) - bs).mean()) if old else nan
    else:  # no source: the old render is the reference, so "new" is the change from it
        d_new = float(np.abs(bn - blur(o)).mean()) if old else nan
        d_old = nan
    rows.append((i / FPS, d_new, d_old))

expected = int(round(DUR * FPS))
print(f"frames: {len(rows)} (expected {expected})   black: {len(black)}   error-bar: {len(errbar)}")
if black:
    print("  first black frames at", [round(i / FPS, 2) for i in black[:10]])
if errbar:
    print("  first error-bar frames at", [round(i / FPS, 2) for i in errbar[:10]])
worse = []
if rows and (SRC or old):
    arr = np.array(rows)
    if SRC:
        print(f"\n{'shot':5s} {'span':>15s}  {'new':>6s}  {'old':>6s}  change   (mean abs diff to the source, 8-bit levels)")
    else:
        print(f"\n{'shot':5s} {'span':>15s}  {'diff':>6s}   (mean abs diff to the old render, 8-bit levels)")
    for sid, a, b in PLAN:
        m = (arr[:, 0] >= float(a)) & (arr[:, 0] < float(b))
        if not m.any():
            continue
        dn, do = arr[m, 1].mean(), arr[m, 2].mean()
        if SRC:
            flag = ""
            if old and dn > do + 0.5:
                flag = "WORSE"
                worse.append(sid)
            elif old and dn < do - 0.5:
                flag = "better"
            print(f"{sid:5s} {float(a):7.2f}-{float(b):7.2f}  {dn:6.2f}  {do:6.2f}  {flag}")
        else:
            print(f"{sid:5s} {float(a):7.2f}-{float(b):7.2f}  {dn:6.2f}")
ok = len(rows) == expected and not black and not errbar and not worse
print("\nGATE:", "PASS" if ok else "FAIL",
      "" if ok else f"(frames={len(rows)}/{expected}, black={len(black)}, errbar={len(errbar)}, worse={worse})")
sys.exit(0 if ok else 1)
