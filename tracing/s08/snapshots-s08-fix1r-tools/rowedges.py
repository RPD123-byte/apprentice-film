# per-row half-level transitions along x through a sequence of classes, on the source F0 average (or a render)
import numpy as np
def tproj(P, col, dark):
    d = np.array(dark, float); v = np.array(col, float) - d
    return ((P - d) @ v) / (v @ v)
def cross(t, x0, rising, lev=0.5):
    for i in range(x0, len(t) - 1):
        a, b = t[i], t[i + 1]
        if (rising and a < lev <= b) or (not rising and a >= lev > b): return i + (lev - a) / (b - a)
    return None
def row_edges(S, y, xstart, seq, dark, xend=2205, sig=None):
    """seq: list of (colour, rising) transitions in order; returns x of each (None if missing)"""
    P = S[y, :xend + 1].astype(float)
    out, x = [], xstart
    for col, rising in seq:
        t = tproj(P, col, dark)
        c = cross(t, int(x), rising)
        out.append(c)
        if c is None: break
        x = c + 1
    return out
