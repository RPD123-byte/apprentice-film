#!/usr/bin/env python3
# jsdata.py: read the s06 data modules (src/shots/s06/data/*.js) and the polygons of the s06 helper modules into
# python (measurement helper only).
import json, os, re, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '../data')
S06 = os.path.join(HERE, '..')


def _js2json(body):
    body = re.sub(r'//[^\n]*', '', body)
    body = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', body)
    body = re.sub(r',\s*([\]}])', r'\1', body)
    return json.loads(body)


def load(name):
    """all `export const NAME = <json-ish>;` of data/<name>.js"""
    txt = open(os.path.join(DATA, name + '.js')).read()
    out = {}
    for m in re.finditer(r'export const (\w+)\s*=\s*', txt):
        start = m.end(); depth = 0; i = start
        while i < len(txt):
            c = txt[i]
            if c in '[{': depth += 1
            elif c in ']}':
                depth -= 1
                if depth == 0: i += 1; break
            i += 1
        try: out[m.group(1)] = _js2json(txt[start:i])
        except Exception: pass
    return out


def poly_const(module, name):
    """a literal polygon `export const NAME = [[x,y],...]` from a helper module (face.js, head.js, ...)."""
    txt = open(os.path.join(S06, module)).read()
    m = re.search(r'(?:export )?const ' + name + r'\s*=\s*(\[\[[^;]*?\]\]);', txt, re.S)
    return _js2json(m.group(1)) if m else None


def mass_mask(items, shape, levels=None):
    """rasterise mass items [v, ring, ...] (even-odd per item) -> union mask (optionally only items with v < levels)."""
    m = np.zeros(shape, np.uint8)
    for it in items:
        v, rings = it[0], it[1:]
        if levels is not None and v >= levels: continue
        mm = np.zeros(shape, np.uint8)
        pp = [np.round(np.asarray(r, np.float64).reshape(-1, 2) * 8).astype(np.int32) for r in rings]
        cv2.fillPoly(mm, pp, 1, shift=3)
        m |= mm
    return m.astype(bool)


def poly_mask(P, shape):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.round(np.asarray(P, np.float64) * 8).astype(np.int32)], 1, shift=3)
    return m.astype(bool)
