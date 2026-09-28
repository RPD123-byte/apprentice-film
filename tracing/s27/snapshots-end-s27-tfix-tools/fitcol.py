# end-s27-tfix: fitted colour gains for the end-orbit room keys (numbers only). For key frame F: the low-frequency difference
# between the source and our render on the room (sigma 12, both un-graded with ungrade.py, room pixels only: our room-mask
# render eroded 12 px), filled into the holes by normalised convolution; every trace region's colour is moved by the mean
# difference over its own pixels (clamped to +-14 levels). Edits tr/o_<t>.js in place (run export.py after).
# Usage: fitcol.py RENDERDIR F1,F2,...
import sys, os, json, re; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cv2, numpy as np
from tio import dec, hexc
from ungrade import ungrade
WORK = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work'
RD = sys.argv[1]; FS = list(map(int, sys.argv[2].split(',')))
for F in FS:
    t = F / 25; n = '%.2f' % t; n = n.replace('.', '_')
    path = f'{WORK}/tr/o_{n}.js'; txt = open(path).read()
    mR = re.search(r'export const (\w+_REGIONS) = (.*?);\n', txt, re.S); REG = json.loads(mR.group(2))
    s = cv2.imread(f'{WORK}/src/s{F}.png').astype(np.float32); r = cv2.imread(f'{WORK}/{RD}/r{F}.png').astype(np.float32)
    m = cv2.imread(f'{WORK}/mask/v0_r{F}.png'); bg = ((m[..., 2] > 240) & (m[..., 1] < 20) & (m[..., 0] > 240)).astype(np.uint8)
    bg = cv2.erode(bg, np.ones((25, 25), np.uint8)).astype(np.float32)
    us = ungrade(cv2.GaussianBlur(s, (0, 0), 12), t) * 255; ur = ungrade(cv2.GaussianBlur(r, (0, 0), 12), t) * 255
    D = (us - ur) * bg[..., None]
    num = cv2.GaussianBlur(D, (0, 0), 40); den = cv2.GaussianBlur(bg, (0, 0), 40)
    Df = np.where(bg[..., None] > 0, D, num / np.maximum(den, 1e-3)[..., None])
    Df[den < 0.02] = 0
    # label raster (regions painted largest first, as the canvas does)
    L = np.full((946, 2206), -1, np.int32)
    for i, reg in enumerate(REG):
        p = np.array(dec(reg[1]), np.float64).reshape(-1, 2) / 2
        cv2.fillPoly(L, [np.int32(np.round(p * 16))], i, cv2.LINE_8, 4)
    ok = L >= 0; lab = L[ok]
    cnt = np.bincount(lab, minlength=len(REG)).astype(np.float64)
    moved = 0
    for c in range(3):
        sm = np.bincount(lab, weights=Df[..., c][ok], minlength=len(REG))
        mean = np.where(cnt > 0, sm / np.maximum(cnt, 1), 0)
        for i, reg in enumerate(REG):
            if cnt[i] == 0: continue
            col = list(hexc(reg[0]))[::-1]   # rgb
            d = float(np.clip(mean[i][()] if np.ndim(mean[i]) else mean[i], -14, 14))
            col[2 - c] = int(np.clip(round(col[2 - c] + d), 0, 255))   # D is BGR, col is RGB
            reg[0] = '#%02x%02x%02x' % tuple(col)
    txt = txt[:mR.start(2)] + json.dumps(REG, separators=(',', ':')) + txt[mR.end(2):]
    open(path, 'w').write(txt)
    print(F, 'bias BGR', np.round(D.sum((0, 1)) / max(bg.sum(), 1), 2).tolist())
