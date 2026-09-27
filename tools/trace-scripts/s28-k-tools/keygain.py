# Per-key low-frequency colour gain for the orbit keys, measured at each key's own frame (where the key is drawn
# unwarped): pre-grade source / render, separately for the room layer (figure and lid excluded) and the figure layer
# (inside its silhouette), blurred 36 px, holes filled from around them, clamped; on a 32 px grid in the key's own
# texture coordinates (room: the frame; figure: the key canvas' bbox = silhouette bbox + 16 px). -> keygain.json
import sys, glob, json; sys.path.insert(0, '.')
from geo import *
import grade28 as GR
D = sys.argv[1]
FIGN = {129.32: 'fig12932', 129.52: 'fig12952', 129.72: 'fig12972', 129.92: 'fig12992', 130.12: 'fig13012', 130.32: 'fig13032',
        130.52: 'fig13052', 130.72: 'fig13072', 130.92: 'fig13092', 131.12: 'fig13112'}
sc = 8; h, w = H // sc + 1, W // sc + 1
def gainfield(pa, pb, valid, sig=36):
    V = cv2.resize(valid.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    A = cv2.resize(pa * valid[..., None], (w, h), interpolation=cv2.INTER_AREA)
    B = cv2.resize(pb * valid[..., None], (w, h), interpolation=cv2.INTER_AREA)
    s = sig / sc
    Vb = cv2.GaussianBlur(V, (0, 0), s)[..., None]
    g = (cv2.GaussianBlur(B, (0, 0), s) / np.maximum(Vb, 1e-4) + 0.01) / (cv2.GaussianBlur(A, (0, 0), s) / np.maximum(Vb, 1e-4) + 0.01)
    # fill: wider normalized convolution where support is thin, 1.0 where there is none
    s2 = 4 * s
    Vb2 = cv2.GaussianBlur(V, (0, 0), s2)[..., None]
    g2 = cv2.GaussianBlur(g * Vb, (0, 0), s2) / np.maximum(cv2.GaussianBlur(Vb, (0, 0), s2), 1e-4)[..., None]
    a1 = np.clip(Vb / 0.3, 0, 1); a2 = np.clip(Vb2 / 0.05, 0, 1)
    g = a1 * g + (1 - a1) * (a2 * g2 + (1 - a2) * 1.0)
    return np.clip(g, 0.85, 1.2)
out = {}
for t, fn in FIGN.items():
    fp = glob.glob(f'{D}/frame-*-at-{t:g}s.png')[0]
    a = cv2.imread(fp)[..., ::-1].astype(np.float32) / 255
    b = frame(round(t * 25))[..., ::-1].astype(np.float32) / 255
    pa = GR.ungrade(a, t); pb = GR.ungrade(b, t)
    K = loadKey(fn); sil = ringsMask(K['sil'])
    lid = np.zeros((H, W), np.uint8); q = lidQuad(t).copy(); q[2:, 1] += 80; cv2.fillPoly(lid, [np.int32(q)], 1)
    lid = cv2.dilate(lid, np.ones((31, 31), np.uint8))
    room_valid = (cv2.dilate(sil, np.ones((21, 21), np.uint8)) == 0) & (lid == 0)
    room_valid[H - 6:, :] = False
    fig_valid = (cv2.erode(sil, np.ones((9, 9), np.uint8)) > 0) & (lid == 0)
    gr = gainfield(pa, pb, room_valid); gf = gainfield(pa, pb, fig_valid)
    g32 = cv2.resize(gr, (W // 32 + 1, H // 32 + 1), interpolation=cv2.INTER_AREA)
    out['room' + str(int(round(t * 100)))] = {'x0': 0, 'y0': 0, 'x1': W, 'y1': H, 'w': g32.shape[1], 'h': g32.shape[0],
                                              'g': [int(round((v - 0.5) * 255)) for v in g32.reshape(-1)]}
    # figure: crop to the key canvas box (silhouette bbox + 16 px, as figKey builds it)
    pts = np.concatenate([np.array(r) for r in K['sil']])
    x0, y0 = int(np.floor(pts[:, 0].min() - 16)), int(np.floor(pts[:, 1].min() - 16))
    x1, y1 = int(np.ceil(pts[:, 0].max() + 16)), int(np.ceil(pts[:, 1].max() + 16))
    full = np.ones((H + 400, W + 400, 3), np.float32); full[200:200 + H, 200:200 + W] = cv2.resize(gf, (W, H), interpolation=cv2.INTER_LINEAR)
    crop = full[y0 + 200:y1 + 200, x0 + 200:x1 + 200]
    gw, gh = max(2, (x1 - x0) // 32 + 1), max(2, (y1 - y0) // 32 + 1)
    c32 = cv2.resize(crop, (gw, gh), interpolation=cv2.INTER_AREA)
    out[fn] = {'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'w': gw, 'h': gh, 'g': [int(round((v - 0.5) * 255)) for v in c32.reshape(-1)]}
    print(t, 'room gain', gr.reshape(-1, 3).mean(0).round(3), 'fig gain', gf[fig_valid[::sc, ::sc][:h, :w]].mean(0).round(3) if fig_valid.any() else '', flush=True)
json.dump(out, open('keygain.json', 'w'))
