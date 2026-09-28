# zone2.py: the colour owl's trace zone, round 2 (measurement only). owlmask.fmask with the weak-difference margin
# optionally restricted to where the page under it is the dark navy sky (the headband over the navy), so the zone does not
# carry the source's own stripes / box edges round the owl.
import cv2, numpy as np, sys, re, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
import owlmask as o
_txt = open('/Users/computer/rootline/apprentice-film/archive/prev-builds/s26-end1-prev/s26/slabE.js').read()
def slabpoly(F):
    m = re.search(r'%d: \{ poly: (\[\[.*?\]\])' % F, _txt)
    return np.array(json.loads(m.group(1)), np.float32) if m else None
def fzone(F, grow=3, dark=48, navy=None, thr=48, closek=9):
    f = o.src(F).astype(np.float32); w = o.pagewarp(F)
    om = o.oldmask(F); far = cv2.dilate(om, np.ones((81, 81), np.uint8)) == 0
    fb, wb = cv2.GaussianBlur(f, (0, 0), 2), cv2.GaussianBlur(w, (0, 0), 2)
    for c in range(3):
        a, b = wb[..., c][far], fb[..., c][far]
        A = np.vstack([a, np.ones_like(a)]).T; g, off = np.linalg.lstsq(A, b, rcond=None)[0]
        wb[..., c] = wb[..., c] * g + off
    d = np.abs(fb - wb).sum(2)
    m = (d > thr).astype(np.uint8)
    m &= cv2.dilate(om, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (closek, closek)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= 40 and (om[lab == i] > 0).mean() > 0.2: keep[lab == i] = 1
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(keep); cv2.drawContours(out, cs, -1, 1, -1)
    if grow: out = cv2.dilate(out, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    if dark:
        weak = cv2.morphologyEx((d > 22).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        weak = cv2.dilate(cv2.morphologyEx(weak, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))), np.ones((7, 7), np.uint8))
        add = cv2.dilate(out, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dark + 1, 2 * dark + 1))) & weak
        if navy is not None:
            # only over the dark sky (the clean page's luminance, blurred, below `navy`)
            lum = cv2.GaussianBlur(cv2.cvtColor(np.clip(w, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 3)
            add &= (lum < navy).astype(np.uint8)
            add = cv2.morphologyEx(add, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        out |= add
        cs, _ = cv2.findContours(out, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); out = np.zeros_like(out)
        cv2.drawContours(out, [c for c in cs if cv2.contourArea(c) > 400], -1, 1, -1)
    sp = slabpoly(F)
    if sp is not None:
        sm = np.zeros_like(out); cv2.fillPoly(sm, [np.int32(sp)], 1); out[cv2.erode(sm, np.ones((9, 9), np.uint8)) > 0] = 0
    return out
