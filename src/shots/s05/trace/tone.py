#!/usr/bin/env python3
# The print texture: the source's lit areas carry a fine screentone (a crosshatch at 45°/135°, period ~2.95 px, measured
# by FFT on the settled frame). Per layer, its local amplitude is measured on what the drawing does not already have
# (target minus the simulated layer, Gabor energy at that period and those angles, against the 0°/90° energy) and
# stored as nested iso-amplitude outlines (lay['tone']); ../ink.js adds amp × the crosshatch. Run after build.py.
import numpy as np, cv2, pickle, sys, os, frames
from sim import layer_canvas
from build import iso_regions, dil, ero, LAYERS, CACHE
PERIOD, ANGLES, GAIN = 2.95, (45, 135), 0.4495      # GAIN: tone-map value of a unit-amplitude pattern (calibrated)
def gabor(theta, lam=PERIOD, sigma=1.6):
    k = cv2.getGaborKernel((15, 15), sigma, np.radians(theta), lam, 1.0, 0, ktype=cv2.CV_32F); k -= k.mean(); k /= np.abs(k).sum()
    return k
def tone_levels(lay, step=0.006):
    img, _ = layer_canvas(lay)
    res = (lay['T'] - img).astype(np.float32)
    E = {th: cv2.GaussianBlur(cv2.filter2D(res, -1, gabor(th)) ** 2, (0, 0), 12) for th in (45, 135, 0, 90)}
    tone = np.sqrt(np.maximum(0, (E[45] + E[135]) - (E[0] + E[90]))) / GAIN
    vis = ero(lay['vis'], 4)
    num = cv2.GaussianBlur(tone * vis, (0, 0), 6); den = cv2.GaussianBlur(vis.astype(np.float32), (0, 0), 6)
    amp = np.where(den > 0.3, num / np.maximum(den, 1e-3), 0).astype(np.float32) * vis
    return iso_regions(amp, lay['ext'], step, eps=1.5), float(amp.max())
if __name__ == '__main__':
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else LAYERS
    for n in names:
        p = f'{CACHE}/layer_{n}.pkl'; lay = pickle.load(open(p, 'rb'))
        lay['tone'], mx = tone_levels(lay)
        pickle.dump(lay, open(p, 'wb'))
        print(n, 'tone levels', len(lay['tone']), 'max amp', round(mx * 255, 1), flush=True)
