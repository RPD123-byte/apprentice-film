# Trace every s20 layer from the measurement composites (composite2.py) and write the data modules the film loads
# (src/shots/s20/data/*.js). Control points only: value-band outlines + ink centre-lines — no pixels.
#   python3 src/shots/s20/trace/trace_all.py [room behind grimy b2 hold]
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import trace_room as T
import composite2 as C
OUT = C.OUT
DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
M = C.M
LV = [0.05, 0.07, 0.09, 0.11, 0.135, 0.16, 0.19, 0.22, 0.255, 0.29, 0.33, 0.37, 0.415, 0.46, 0.51, 0.56, 0.61, 0.66, 0.71,
      0.76, 0.81, 0.86, 0.91, 0.95]
RES_ITERS, RES_THR = 2, 0.06
P = dict(mode='close', C=5, use_bright=True,
         bright=dict(hi=0.045, lo=0.022, cmin=0.018, minlen=4, sigs=(0.9, 1.6)),
         reg=dict(levels=LV, eps=0.9, minarea=12, blur=0.6),
         dark=dict(hi=0.05, lo=0.025, cmin=0.03, minlen=4, sigs=(0.9, 1.6)))

def enc_rings(rings, dx, dy):
    # rings are stored in half pixels (x2) so the +0.5 centre shift is exact
    out = []
    for r in rings:
        a = np.round((np.array(r, np.float64) + [dx, dy]) * 2).astype(np.int64)
        d = np.vstack([a[:1], np.diff(a, axis=0)]).ravel()
        out.append(','.join(str(int(v)) for v in d))
    return out

def enc_strokes(strokes, dx, dy):
    out = []
    for s in strokes:
        vals = []
        px = py = 0
        for (x, y, w, v, b) in s:
            X = int(round((x + dx) * 2)); Y = int(round((y + dy) * 2))
            vals += [X - px, Y - py, int(round(w * 10)), int(round(v * 100)), int(round(b * 100))]
            px, py = X, Y
        out.append(','.join(str(v) for v in vals))
    return out

def calibrate(name, tr):
    p = os.path.join(OUT, 'calib_%s.json' % name)
    if not os.path.exists(p): p = os.path.join(OUT, 'calib_roomA.json')
    if not os.path.exists(p): return tr
    c = json.load(open(p))
    if len(c) != len(tr['levels']): return tr
    for L, dv in zip(tr['levels'], c): L['v'] = round(min(1, max(0, L['v'] + dv)), 4)
    return tr

def write_js(name, var, tr, dx=-M + 0.5, dy=-M + 0.5, extra=None, calib=True):
    # +0.5: array indices are pixel centres, canvas pixel centres sit at +0.5
    if calib: tr = calibrate(name, tr)
    """dx,dy: shift from composite (margin) coords to the frame the film draws in."""
    os.makedirs(DATA, exist_ok=True)
    L = [{'v': L['v'], 'r': enc_rings(L['rings'], dx, dy)} for L in tr['levels']]
    lines = [f"// {var}: traced from the source (s20/trace/trace_all.py) — value bands + ink centre-lines, no pixels.",
             "// levels: [{v, r: [ring...]}] rings = delta-coded x2,y2 (half px); strokes: delta-coded x2,y2 (half px),",
             "// width x10, value x100, surface value x100 per point. Decode with s20/tracedata.js.",
             f"export const {var} = {{"]
    lines.append(" levels: [")
    for l in L:
        lines.append(f"  {{ v: {l['v']}, r: [" + ','.join('"' + r + '"' for r in l['r']) + "] },")
    lines.append(" ],")
    for k in ('dark', 'bright'):
        lines.append(f" {k}: [" + ','.join('"' + s + '"' for s in enc_strokes(tr[k], dx, dy)) + "],")
    if extra:
        for k, v in extra.items(): lines.append(f" {k}: {json.dumps(v)},")
    lines.append("};")
    p = os.path.join(DATA, name + '.js')
    open(p, 'w').write('\n'.join(lines) + '\n')
    import pack; pack.main_one(p)
    print(name, 'rings', sum(len(l['r']) for l in L), 'dark', len(tr['dark']), 'bright', len(tr['bright']), '%.0f KB' % (os.path.getsize(p) / 1024))

# the typed line on the card is redrawn with the font (s20.js drawCardText): its pixels are inpainted as paper here
TEXT_BOX = {'room': [(1300, 364), (1456, 360), (1456, 394), (1300, 398)], 'b2': [(1286, 351), (1432, 347), (1432, 381), (1286, 385)]}
def clean_text(f, which):
    m = C.poly_mask([TEXT_BOX[which]]) & (cv2.GaussianBlur(f, (0, 0), 0.8) < 0.86)
    m = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8))
    u = np.clip(f * 255, 0, 255).astype(np.uint8)
    g = cv2.inpaint(u, m, 4, cv2.INPAINT_TELEA).astype(np.float32) / 255
    return np.where(m > 0, g, f)

def render_raw(name, out_png):
    # the film's own painter (dev harness page, raw = pre-grade) on a data module: margin canvas 2326 x 1066
    import subprocess
    for attempt in range(4):                                   # the headless harness times out now and then
        if os.path.exists(out_png): os.remove(out_png)
        subprocess.run(['node', 'snapshots/s20-f2-dev/dev.mjs', 'snapshots/s20-f2-dev/rawroom.built.html', out_png,
                        'f=%s&dir=/src/shots/s20/data/' % name], capture_output=True, cwd='/Users/computer/rootline/apprentice-film')
        im = cv2.imread(out_png, 0)
        if im is not None: return im.astype(np.float32) / 255
    raise RuntimeError('raw render failed: ' + name)

def finalize(name, var, tr, f, mask, extra=None):
    # residual refinement: redraw the trace with the film's painter, then trace the ink lines it still misses (dark
    # where the redraw is too light, white where it is too dark) and add them; RES_ITERS rounds
    for it in range(RES_ITERS):
        write_js(name, var, json.loads(json.dumps(tr)), extra=extra)
        r = render_raw(name, OUT + '/_res_%s.png' % name)
        tr['dark'] += T.strokes(f, r, mask, -1, hi=RES_THR * 2, lo=RES_THR, cmin=RES_THR, minlen=4, sigs=(0.8, 1.4))
        tr['bright'] += T.strokes(f, r, mask, +1, hi=RES_THR * 2, lo=RES_THR, cmin=RES_THR, minlen=4, sigs=(0.8, 1.4))
    write_js(name, var, tr, extra=extra)

def full_mask(f):
    return np.ones(f.shape, np.uint8)

def run(which):
    if 'room' in which:
        f = clean_text(np.load(OUT + '/Afull.npy'), 'room'); tr, _ = T.trace(f, full_mask(f), **P); finalize('roomA', 'ROOM_A', tr, f, full_mask(f))
    if 'behind' in which:
        f = np.load(OUT + '/behind.npy'); m = C.poly_mask([C.CARD_Q1], 16).astype(np.uint8)
        tr, _ = T.trace(f, m, **P); finalize('behind', 'BEHIND', tr, f, m)
    if 'grimy' in which:
        f = np.load(OUT + '/grimy.npy'); m = C.poly_mask([C.SC_POLY], 2).astype(np.uint8)
        tr, _ = T.trace(f, m, **P); finalize('grimy', 'GRIMY', tr, f, m)
    if 'b2' in which:
        f = clean_text(np.load(OUT + '/B2room.npy'), 'b2'); tr, _ = T.trace(f, full_mask(f), **P); finalize('roomB2', 'ROOM_B2', tr, f, full_mask(f))
    if 'hold' in which:
        f = np.load(OUT + '/B2full.npy'); m = np.load(OUT + '/holdmask.npy').astype(np.uint8)
        md = cv2.dilate(m, np.ones((5, 5), np.uint8))
        tr, _ = T.trace(f, md, **P)
        cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rings = [(cv2.approxPolyDP(c, 0.8, True)[:, 0, :] - M + 0.5).ravel().tolist() for c in cs if cv2.contourArea(c) > 30]
        finalize('hold', 'HOLD', tr, f, md, extra={'mask': rings})

if __name__ == '__main__':
    run(sys.argv[1:] or ['room', 'behind', 'grimy', 'b2', 'hold'])
