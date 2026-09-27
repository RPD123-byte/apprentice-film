# The page beats (k7 97.08, k8–18 97.12–97.52): what the source adds to the framed page — the owls, their
# scissors and smoke — traced as grey tone levels inside hand-bounded regions of the difference from the clean page
# (95.92 s). The page itself, the banner, the shard outlines, confetti and the slash arc are drawn separately.
# Measurement only.
import sys, json; sys.path.insert(0, '.')
from common import *
from ungrade import ungrade
from scipy import ndimage
from tone import trace, npts
from mask import show
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
clean = np.load('page_clean.npy')
LVP = [20, 50, 85, 120, 155, 190, 218, 238]
def region_mask(img, polys, thr=38, close=9, fill=True, open_=3):
    d = np.abs(img - clean).max(2)
    m = (cv2.GaussianBlur(d, (0, 0), 1.2) > thr).astype(np.uint8)
    R = np.zeros_like(m)
    for p in polys: cv2.fillPoly(R, [np.int32(p)], 1)
    m &= R
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    if fill: m = ndimage.binary_fill_holes(m).astype(np.uint8)
    if open_: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_, open_)))
    return m & R
def run(name, img, polys, **kw):
    M = region_mask(img, polys, **kw)
    g = cv2.cvtColor(img.astype(np.float32) / 255, cv2.COLOR_BGR2GRAY) * 255
    L = trace(g, M, LVP, sigma=0.8, eps=0.5, min_area=3.0)
    json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open(f'out/{name}.json', 'w'))
    show(g, M, S + f'm_{name}.png')
    print(name, 'mask', M.sum(), 'pts', npts(L))
if __name__ == '__main__':
    which = sys.argv[1]
    if which == 'B':
        med = np.load('pageB_med.npy')
        polys = [
            # big owl + its scissors
            [(560, 440), (760, 390), (980, 300), (1180, 290), (1370, 320), (1560, 380), (1600, 470), (1520, 560), (1420, 640), (1250, 650), (1060, 600), (860, 560), (600, 540)],
            # top-left owl + its smoke
            [(310, 250), (420, 190), (560, 150), (700, 170), (720, 260), (620, 330), (520, 400), (400, 420), (300, 380)],
            # bottom-right owl
            [(1740, 610), (1840, 570), (1960, 600), (1980, 700), (1930, 790), (1800, 800), (1720, 720)],
            # smoke trailing the big owl
            [(1480, 300), (1700, 300), (1960, 380), (1990, 520), (1900, 600), (1700, 620), (1560, 600), (1500, 500)],
        ]
        # each owl slides a little through the hold (holdmotion.py): trace each layer from its own motion-compensated
        # median (every frame shifted back by that layer's measured shift) so the drawing stays sharp
        H = json.load(open('out/hold.json'))
        fr = {k: ungrade(frame(k), tk(k)) * 255 for k in range(8, 19)}
        for g, ps in (('B1', [polys[0], polys[3]]), ('B2', [polys[1]]), ('B3', [polys[2]])):
            al = []
            for k in range(8, 19):
                dx, dy = H['owl'][g][str(k)][:2]
                M_ = np.float32([[1, 0, dx], [0, 1, dy]])
                al.append(cv2.warpAffine(fr[k], M_, (2206, 946), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE))
            run('page' + g, np.median(np.stack(al), 0).astype(np.float32), ps)
    if which == 'A':
        f7 = np.load('page7.npy')
        polys = [
            [(520, 60), (800, 30), (1150, 30), (1480, 60), (1480, 150), (1200, 200), (900, 240), (650, 250), (520, 200)],
            [(960, 330), (1300, 300), (1700, 330), (2206, 360), (2206, 720), (1800, 700), (1500, 640), (1200, 560), (960, 480)],
            [(1600, 640), (1850, 610), (1990, 700), (2000, 946), (1600, 946)],
        ]
        run('pageA', f7, polys, thr=24, close=15)
