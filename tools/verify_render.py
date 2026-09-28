#!/usr/bin/env python3
"""Gate a full render before it is shared: black frames, error bars, regressions vs a previous render, and
per-shot distance to the source (mean abs diff after a sigma-4 blur, 8-bit levels, on 1/4-scale frames).

Usage: python3 tools/verify_render.py renders/new.mp4 [renders/old.mp4]
"""
import re
import subprocess
import sys

import cv2
import numpy as np

SRC = "/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4"
W, H = 552, 236  # 1/4 scale
PLAN = re.findall(r'\["(s\d+)",\s*([\d.]+),\s*([\d.]+)', open("src/shots/index.js").read())


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


new = sys.argv[1]
old = sys.argv[2] if len(sys.argv) > 2 else None
gens = [frames(new), frames(SRC)] + ([frames(old)] if old else [])
black, errbar, rows = [], [], []
for i, fs in enumerate(zip(*gens)):
    n, s = fs[0], fs[1]
    if n.mean() < 1.0 and s.mean() > 8:
        black.append(i)
    top = n[1:20].astype(float)
    b_, g_, r_ = top[..., 0].mean(), top[..., 1].mean(), top[..., 2].mean()
    if r_ > 25 and g_ < 0.45 * r_ and b_ < 0.45 * r_:
        errbar.append(i)
    bn, bs = blur(n), blur(s)
    d_new = float(np.abs(bn - bs).mean())
    d_old = float(np.abs(blur(fs[2]) - bs).mean()) if old else float("nan")
    rows.append((i / 25, d_new, d_old))

print(f"frames: {len(rows)}   black: {len(black)}   error-bar: {len(errbar)}")
if black:
    print("  first black frames at", [round(i / 25, 2) for i in black[:10]])
if errbar:
    print("  first error-bar frames at", [round(i / 25, 2) for i in errbar[:10]])
arr = np.array(rows)
print(f"\n{'shot':5s} {'span':>15s}  {'new':>6s}  {'old':>6s}  change")
worse = []
for sid, a, b in PLAN:
    m = (arr[:, 0] >= float(a)) & (arr[:, 0] < float(b))
    dn, do = arr[m, 1].mean(), arr[m, 2].mean()
    flag = ""
    if old and dn > do + 0.5:
        flag = "WORSE"
        worse.append(sid)
    elif old and dn < do - 0.5:
        flag = "better"
    print(f"{sid:5s} {float(a):7.2f}-{float(b):7.2f}  {dn:6.2f}  {do:6.2f}  {flag}")
ok = not black and not errbar and not worse
print("\nGATE:", "PASS" if ok else "FAIL", "" if ok else f"(black={len(black)}, errbar={len(errbar)}, worse={worse})")
sys.exit(0 if ok else 1)
