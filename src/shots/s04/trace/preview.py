#!/usr/bin/env python3
# preview.py key.json out.jpg  -- rasterise a traced key the way the JS renderer does (tone fills blurred, tapered
# strokes), grade it, compare with the source frame (blurred MAE inside the hull), write render | source.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import grade, degrade
Hh, Ww = 946, 2206
SS = 2  # supersample
def fill(img, rings, v):
    m = np.zeros((Hh * SS, Ww * SS), np.uint8)
    cv2.fillPoly(m, [np.array(r, np.int32) * SS for r in rings], 255, lineType=cv2.LINE_AA)
    a = m.astype(np.float32) / 255
    img[:] = img * (1 - a) + v * a
def fill_eo(img, rings, v, blur=0):
    # even-odd: fillPoly with all rings = even-odd in cv2
    m = np.zeros((Hh * SS, Ww * SS), np.uint8)
    cv2.fillPoly(m, [np.array(r, np.int32) * SS for r in rings], 255, lineType=cv2.LINE_AA)
    a = m.astype(np.float32) / 255
    if blur: a = cv2.GaussianBlur(a, (0, 0), blur * SS)
    img[:] = img * (1 - a) + v * a
def taper(img, pts, ws, v, endt=3.0):
    pts = np.array(pts, float); n = len(pts)
    if n < 2: return
    # resample
    seg = np.hypot(*np.diff(pts, axis=0).T); S = np.concatenate([[0], np.cumsum(seg)]); Ltot = S[-1]
    if Ltot < 0.5: return
    m = max(2, int(Ltot / 2) + 1); s = np.linspace(0, Ltot, m)
    x = np.interp(s, S, pts[:, 0]); y = np.interp(s, S, pts[:, 1]); w = np.interp(s, S, ws)
    e = np.minimum(1, np.minimum(s / endt, (Ltot - s) / endt)); w = w * (0.35 + 0.65 * np.sqrt(np.maximum(0, e)))
    Lp, Rp = [], []
    for i in range(m):
        a, b = max(0, i - 1), min(m - 1, i + 1)
        dx, dy = x[b] - x[a], y[b] - y[a]; d = np.hypot(dx, dy) or 1; dx /= d; dy /= d
        hw = w[i] / 2
        Lp.append([x[i] - dy * hw, y[i] + dx * hw]); Rp.append([x[i] + dy * hw, y[i] - dx * hw])
    poly = np.array(Lp + Rp[::-1]) * SS
    mm = np.zeros((Hh * SS, Ww * SS), np.uint8)
    x0, y0 = np.floor(poly.min(0)).astype(int) - 2; x1, y1 = np.ceil(poly.max(0)).astype(int) + 2
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(Ww * SS, x1); y1 = min(Hh * SS, y1)
    if x1 <= x0 or y1 <= y0: return
    sub = np.zeros((y1 - y0, x1 - x0), np.uint8)
    cv2.fillPoly(sub, [np.round(poly - [x0, y0]).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    a = sub.astype(np.float32) / 255
    img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - a) + v * a
def render(K, cal=None):
    cal = cal or {}
    img = np.zeros((Hh * SS, Ww * SS), np.float32)
    tone = K["tone"]
    tb = np.zeros_like(img)
    for i, b in enumerate(tone):
        fill_eo(tb, b["rings"], b["v"])
    tb = cv2.GaussianBlur(tb, (0, 0), cal.get("tblur", 1.2) * SS)
    img = tb
    for b in K.get("inkd", []) + K.get("inkb", []):
        fill_eo(img, b["rings"], b["v"] + cal.get("iv", 0))
    dv = cal.get("dv", 0); wk = cal.get("wk", 1.0)
    for st in K["dark"]:
        p = [q[:2] for q in st]; vd = max(0, min(q[3] for q in st) + dv)
        w = [q[2] * wk * max(0.0, q[4] - q[3]) / max(8.0, q[4] - vd) for q in st]
        taper(img, p, w, vd)
    bv = cal.get("bv", 0); bw = cal.get("bw", 1.0)
    for st in K["bright"]:
        p = [q[:2] for q in st]; vb = min(255, max(q[3] for q in st) + bv)
        w = [q[2] * bw * max(0.0, q[3] - q[4]) / max(8.0, vb - q[4]) for q in st]
        taper(img, p, w, vb)
    img = cv2.resize(img, (Ww, Hh), interpolation=cv2.INTER_AREA)
    # hull alpha
    hm = np.zeros((Hh, Ww), np.uint8)
    hull = K["hull"]; hull = [hull] if isinstance(hull[0][0], (int, float)) else hull
    cv2.fillPoly(hm, [np.array(h, np.int32) for h in hull], 255, lineType=cv2.LINE_AA)
    return img, hm.astype(np.float32) / 255
if __name__ == "__main__":
    K = json.load(open(sys.argv[1])); out = sys.argv[2]; T = K["t"]
    cal = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    img, a = render(K, cal)
    V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
    cap = cv2.VideoCapture(V); cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(T * 25))); ok, fr = cap.read()
    F = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    P = degrade(F, T)
    comp = P * (1 - a) + img * a            # the source outside the hull (to judge the key alone)
    G = grade(comp, T)
    m = a > 0.5
    for sg in (6, 2):
        e = np.abs(cv2.GaussianBlur(G, (0, 0), sg) - cv2.GaussianBlur(F, (0, 0), sg))
        sd = (cv2.GaussianBlur(G, (0, 0), sg) - cv2.GaussianBlur(F, (0, 0), sg))[m].mean()
        print(f"sigma {sg}: MAE in hull {e[m].mean():.2f} signed {sd:+.2f}")
    x0 = int(np.nonzero(m.any(0))[0].min())
    im = np.hstack([G[:, x0:], F[:, x0:]]).astype(np.uint8)
    cv2.imwrite(out, cv2.resize(im, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(out.replace('.jpg', '-full.png'), G.astype(np.uint8))
