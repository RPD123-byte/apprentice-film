#!/usr/bin/env python3
# s07 static plate tracer (not loaded by the film): WORK/T.npy (prep.py) -> WORK/plate.json + WORK/plate_py.png.
# Value zones (polygon + quadratic tone field), broad soft shading strokes and fine ink strokes (dark and white):
# measurements only — tracekit.js redraws them.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from layer import trace_layer
WORK = sys.argv[1]; NZ = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
T = np.load(WORK + "/T.npy"); g = (T.mean(axis=2) * 255).astype(np.float32)
KEYS = [(450, 690), (960, 545), (1045, 640), (600, 795)]   # keyboard area (frame px)
KNIT = [[(1628, 158), (1767, 150), (1885, 125), (1895, 200), (1880, 240), (1800, 280), (1665, 292), (1640, 230)],   # beanie cuff
        [(1722, 0), (1890, 0), (1893, 118), (1767, 146), (1705, 150)]]   # the crown's shaded right side
PLASTER = [[(1485, 280), (1575, 280), (1575, 356), (1485, 356)]]   # the owl's plaster (perforation dots)
L, R = trace_layer(g, NZ, keys=KEYS, cells=KNIT, dots=PLASTER)
cv2.imwrite(WORK + "/plate_py.png", np.clip(R, 0, 255).astype(np.uint8))
L["W"], L["H"] = g.shape[1], g.shape[0]
json.dump(L, open(WORK + "/plate.json", "w"))
