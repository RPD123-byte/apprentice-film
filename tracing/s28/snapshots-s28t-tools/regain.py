# s28t: refit the orbit keys' low-frequency colour gains (src/shots/s28/keygain.js) after the re-trace: at each key's own
# frame, pre-grade source / render (room and figure layers separately, blurred 36 px, as keygain.py), multiplied into the
# current gain; figure gains are written on the new key boxes (silhouette bbox + 16 px). Usage: regain.py RENDER_DIR
import sys, os, re, json, glob, numpy as np, cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0, 'snapshots/s28t-tools/k'); sys.path.insert(0, 'snapshots/s28t-tools')
import grade28 as GR
from m import frame as vframe, SRC
from retrace_room import mugpoly
W, H = 2206, 946
D = sys.argv[1]
src = open('src/shots/s28/keygain.js').read()
KG = json.loads(src[src.index('export const KEYGAIN = ') + len('export const KEYGAIN = '):].rstrip().rstrip(';'))
def loadKey(name):
    s = open(f'src/shots/s28/keys/{name}.js').read(); return json.loads(s[s.index('{'):].rstrip().rstrip(';'))
def ringsMask(rings):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.int32(np.round(np.array(r))) for r in rings], 255); return m
LIDQ = json.load(open('snapshots/s28t-tools/t/lidquads.json'))
sc = 8; h8, w8 = H // sc + 1, W // sc + 1
def gainfield(pa, pb, valid, sig=36):
    V = cv2.resize(valid.astype(np.float32), (w8, h8), interpolation=cv2.INTER_AREA)
    A = cv2.resize(pa * valid[..., None], (w8, h8), interpolation=cv2.INTER_AREA)
    B = cv2.resize(pb * valid[..., None], (w8, h8), interpolation=cv2.INTER_AREA)
    s = sig / sc
    Vb = cv2.GaussianBlur(V, (0, 0), s)[..., None]
    g = (cv2.GaussianBlur(B, (0, 0), s) / np.maximum(Vb, 1e-4) + 0.01) / (cv2.GaussianBlur(A, (0, 0), s) / np.maximum(Vb, 1e-4) + 0.01)
    s2 = 4 * s
    Vb2 = cv2.GaussianBlur(V, (0, 0), s2)[..., None]
    g2 = cv2.GaussianBlur(g * Vb, (0, 0), s2) / np.maximum(cv2.GaussianBlur(Vb, (0, 0), s2), 1e-4)[..., None]
    a1 = np.clip(Vb / 0.3, 0, 1); a2 = np.clip(Vb2 / 0.05, 0, 1)
    g = a1 * g + (1 - a1) * (a2 * g2 + (1 - a2) * 1.0)
    return np.clip(g, 0.9, 1.12)
def grid_of(G):
    return (np.array(G['g'], np.float32).reshape(G['h'], G['w'], 3) / 255 + 0.5)
def resample(G, box):
    """G's gain (vertex convention over its box, as regain() in s28.js) at the texel grid of box -> (h, w, 3)"""
    bx, by, bw, bh = box; w = max(2, bw // 32 + 1); h = max(2, bh // 32 + 1)
    g = grid_of(G); out = np.zeros((h, w, 3), np.float32)
    for j in range(h):
        for i in range(w):
            X = bx + i * bw / (w - 1); Y = by + j * bh / (h - 1)
            fx = min(G['w'] - 1, max(0, (X - G['x0']) * (G['w'] - 1) / (G['x1'] - G['x0'])))
            fy = min(G['h'] - 1, max(0, (Y - G['y0']) * (G['h'] - 1) / (G['y1'] - G['y0'])))
            x0, y0 = int(fx), int(fy); x1, y1 = min(G['w'] - 1, x0 + 1), min(G['h'] - 1, y0 + 1); ax, ay = fx - x0, fy - y0
            out[j, i] = (g[y0, x0] * (1 - ax) + g[y0, x1] * ax) * (1 - ay) + (g[y1, x0] * (1 - ax) + g[y1, x1] * ax) * ay
    return out
frames = {}
for p in glob.glob(f'{D}/frame-*.png'):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); tf = np.floor(t * 30 + 1e-6) / 30; frames[int(np.ceil(tf * 25 - 1e-6))] = p
for t in [129.32, 129.52, 129.72, 129.92, 130.12, 130.32, 130.52, 130.72, 130.92, 131.12]:
    k = round(t * 25); tn = str(int(round(t * 100)))
    a = cv2.imread(frames[k])[..., ::-1].astype(np.float32) / 255
    b = vframe(SRC, k)[..., ::-1].astype(np.float32) / 255
    pa = GR.ungrade(a, t); pb = GR.ungrade(b, t)
    K = loadKey('fig' + tn); sil = ringsMask(K['sil'])
    lid = np.zeros((H, W), np.uint8); q = np.array(LIDQ[f"{t:.2f}"], float).copy(); q[2:, 1] += 80; cv2.fillPoly(lid, [np.int32(q)], 1)
    lid = cv2.dilate(lid, np.ones((31, 31), np.uint8))
    other = np.zeros((H, W), np.uint8)
    if t <= 129.84: other[370:860, 0:345] = 1
    if t <= 130.12: cv2.fillPoly(other, [np.int32(mugpoly(t, 12))], 1)
    room_valid = (cv2.dilate(sil, np.ones((21, 21), np.uint8)) == 0) & (lid == 0) & (other == 0)
    room_valid[H - 6:, :] = False
    fig_valid = (cv2.erode(sil, np.ones((9, 9), np.uint8)) > 0) & (lid == 0)
    rr = gainfield(pa, pb, room_valid); rf = gainfield(pa, pb, fig_valid)
    # room: full frame, texel grid (w, h) as before
    G = KG['room' + tn]
    r32 = cv2.resize(cv2.resize(rr, (W, H), interpolation=cv2.INTER_LINEAR), (G['w'], G['h']), interpolation=cv2.INTER_AREA)
    gn = np.clip(grid_of(G) * r32, 0.8, 1.3)
    KG['room' + tn] = dict(G, g=[int(round((v - 0.5) * 255)) for v in gn.reshape(-1)])
    # figure: on the new canvas box
    pts = np.concatenate([np.array(r) for r in K['sil']])
    x0, y0 = int(np.floor(pts[:, 0].min() - 16)), int(np.floor(pts[:, 1].min() - 16))
    x1, y1 = int(np.ceil(pts[:, 0].max() + 16)), int(np.ceil(pts[:, 1].max() + 16))
    box = (x0, y0, x1 - x0, y1 - y0)
    old = resample(KG['fig' + tn], box)
    full = np.ones((H + 400, W + 400, 3), np.float32); full[200:200 + H, 200:200 + W] = cv2.resize(rf, (W, H), interpolation=cv2.INTER_LINEAR)
    crop = full[y0 + 200:y1 + 200, x0 + 200:x1 + 200]
    c32 = cv2.resize(crop, (old.shape[1], old.shape[0]), interpolation=cv2.INTER_AREA)
    gn = np.clip(old * c32, 0.8, 1.3)
    KG['fig' + tn] = {'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'w': old.shape[1], 'h': old.shape[0], 'g': [int(round((v - 0.5) * 255)) for v in gn.reshape(-1)]}
    print(t, 'room ratio', rr[room_valid[::sc, ::sc][:h8, :w8]].mean(0).round(3), 'fig ratio', rf[fig_valid[::sc, ::sc][:h8, :w8]].mean(0).round(3), flush=True)
head = src[:src.index('export const KEYGAIN = ')]
if 'regain.py' not in head:
    head = head.rstrip('\n') + "\n// Refitted 2026-09-27 by snapshots/s28t-tools/regain.py after the orbit keys were re-traced (figure gains on the new key boxes).\n"
open('src/shots/s28/keygain.js', 'w').write(head + 'export const KEYGAIN = ' + json.dumps(KG, separators=(',', ':')) + ';\n')
