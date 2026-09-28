import sys, json; sys.path.insert(0, '.')
from common import *
from beat import process
from multiprocessing import Pool
tr = json.load(open('ftrack.json')); tr['23'] = tr['24']; M = np.load('maskF.npy')
def owl_occ(k, grow=6):
    dx, dy = tr[str(k)][:2]
    A = np.float32([[1, 0, 600 + dx], [0, 1, -80 + dy]])
    o = cv2.warpAffine(M, A, (2206, 946), flags=cv2.INTER_NEAREST)
    return cv2.dilate(o, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
def job(k):
    if k == 23:
        # the dissolve frame: frame content at half strength over a flat wash (u23 = 0.498 u + 123.6 inside the
        # screen); in the margins over their own smooth lit level (grey opening of the frame), so the lines running
        # on through the margins are traced too
        u23 = U(23)
        scr = np.zeros_like(u23); scr[136:, 152:2016] = 1
        scr = cv2.GaussianBlur(scr, (0, 0), 6)
        Bm = cv2.GaussianBlur(cv2.morphologyEx(u23, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))), (0, 0), 6)
        B = scr * 123.6 + (1 - scr) * Bm
        u = (u23 - B) / 0.498
        occ = owl_occ(24).copy()
        u[occ > 0] = 0
        return process(23, occ, field=np.clip(u, 0, 255).astype(np.float32))
    return process(k, owl_occ(k))
if __name__ == '__main__':
    ks = [int(a) for a in sys.argv[1:]] or list(range(24, 54))
    with Pool(8) as p:
        for r in p.imap_unordered(job, ks): print(r, flush=True)
