# Layer masks of the settled frame (visible part of each layer), from ink-bounded flood fills, the head's own motion
# (25.00 vs 26.04), the hand's slide (24.24 vs 25.00) and hand-placed polygons. Writes CACHE/masks.npz + an overlay.
import numpy as np, cv2, json, os
from scipy import ndimage as ndi
import frames
from seg import seg
H, W = 946, 2206
HERE = os.path.dirname(os.path.abspath(__file__))
OLD = json.load(open(f'{HERE}/old_masks.json'))

def poly_mask(polys, scale=1):
    m = np.zeros((H, W), np.uint8)
    for p in polys: cv2.fillPoly(m, [np.round(np.array(p, np.float64)).astype(np.int32)], 1)
    return m > 0
def close(m, r):
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))) > 0
def dil(m, r):
    return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))) > 0
def ero(m, r):
    return cv2.erode(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))) > 0

# ---- geometry placed by hand (frame px, settled camera)
OWL_TAIL = [(1560,560),(1667,410),(1687,437),(1713,490),(1727,543),(1733,570),(1753,603),(1773,637),(1770,665),(1735,692),(1693,682),(1673,657),(1620,654),(1580,636),(1540,652),(1508,647),(1498,620)]
RH_ADD = [[(940,674),(952,668),(988,660),(1008,664),(1026,688),(1022,702),(1008,710),(980,714),(964,714),(950,700)],[(926,722),(952,718),(974,722),(976,746),(930,747)]]
SPK_L = [(40,395),(187,327),(245,340),(280,700),(242,728),(150,838),(40,850)]

def head_motion_mask():
    fr = [frames.frame(625), frames.frame(651)]
    ref = fr[0].mean(2); im = fr[1].mean(2)
    x0, y0, x1, y1 = 1390, 200, 1720, 470
    cc, Wm = cv2.findTransformECC(ref[y0:y1, x0:x1].copy(), im[y0-40:y1+40, x0-40:x1+40].copy(), np.array([[1,0,40],[0,1,40]], np.float32), cv2.MOTION_EUCLIDEAN, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    A = Wm[:, :2]; b = Wm[:, 2] - 40 + np.array([x0, y0]) - A @ np.array([x0, y0])
    M = np.hstack([A, b[:, None]]).astype(np.float32)
    wref = cv2.warpAffine(ref, M, (W, H))
    s = lambda x: cv2.GaussianBlur(x, (0, 0), 1.5)
    d = cv2.GaussianBlur(s(np.abs(im - ref)) - s(np.abs(im - wref)), (0, 0), 2)
    m = (d > 0.012).astype(np.uint8); m[:, :1380] = 0; m[:, 1720:] = 0; m[:190] = 0; m[480:] = 0
    m = close(m, 7); lab, n = ndi.label(m); m = lab == lab[330, 1560]
    return ndi.binary_fill_holes(m)

def build():
    S = frames.static_target(); Y = S.mean(2).astype(np.float32)
    L = {}
    # owl
    seeds = [[1560,330],[1560,480],[1600,600],[1720,660],[1520,560],[1640,450],[1700,620],[1600,250]]
    owl = seg(Y, seeds, [1380,190,1800,720], 0.14, 0.25, 1, 3)
    head = head_motion_mask()
    owl = owl | ero(head, 3) | poly_mask([OWL_TAIL])
    owl = ndi.binary_fill_holes(close(owl, 3))
    L['owl'] = owl
    # figure (the designer) minus the owl
    fig = poly_mask(OLD['fig'])
    L['fig'] = fig & ~owl
    arm = poly_mask(OLD['arm'])
    L['arm'] = arm & ~fig & ~owl
    rh = seg(Y, [[1050,680],[900,700],[980,687],[937,733],[940,732],[870,720],[1000,700],[960,700]], [820,580,1230,800], 0.14, 0.12, 1, 3)
    rh = close(rh | poly_mask(RH_ADD), 4)
    # the whole outline and the hand's own shadow on the trackpad travel with it: grow 3 px, plus a band 10 px below
    rh = dil(rh, 5) | (cv2.warpAffine(rh.astype(np.uint8), np.float32([[1, 0, 0], [0, 1, 24]]), (W, H)) > 0)
    L['rh'] = rh & ~arm & ~fig & ~owl
    # pose B of the right hand and forearm (the drawing held 25.48-26.68 and seen for most of the shot), segmented on
    # the average of those frames, where it sits at (+43, -17) / (+40, -5) from pose A
    YB = frames.poseB().mean(2).astype(np.float32)
    BH, BA = (43, -17), (40, -5)
    shp = lambda pts, d: [(x + d[0], y + d[1]) for x, y in pts]
    rhb = seg(YB, [[1100,660],[1150,680],[1050,640],[1030,690],[960,690],[945,700],[1090,700]], [880, 570, 1230, 770], 0.14, 0.12, 1, 3)
    rhb = close(rhb | poly_mask([shp(p, BH) for p in RH_ADD]), 4)
    rhb = dil(rhb, 5) | (cv2.warpAffine(rhb.astype(np.uint8), np.float32([[1, 0, 0], [0, 1, 24]]), (W, H)) > 0)
    armb = cv2.warpAffine(arm.astype(np.uint8), np.float32([[1, 0, BA[0]], [0, 1, BA[1]]]), (W, H)) > 0
    L['armB'] = armb & ~fig & ~owl
    L['rhB'] = rhb & ~armb & ~fig & ~owl
    # the owl at the bottom of its head dip (26.00-26.08): the owl mask carried through the measured head motion
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ddx, ddy = frames.dip_field(xx, yy)
    px, py = xx.copy(), yy.copy()
    for _ in range(4):
        ex = cv2.remap(ddx, px, py, cv2.INTER_LINEAR); ey = cv2.remap(ddy, px, py, cv2.INTER_LINEAR); px, py = xx - ex, yy - ey
    L['owlD'] = cv2.remap(owl.astype(np.uint8), px, py, cv2.INTER_NEAREST) > 0
    lh = poly_mask(OLD['lh'])
    L['lh'] = lh & ~fig
    desk = poly_mask(OLD['desk']) | poly_mask([SPK_L])
    L['desk'] = desk & ~lh & ~rh & ~arm & ~fig & ~owl
    L['room'] = np.ones((H, W), bool) & ~L['desk'] & ~lh & ~rh & ~arm & ~fig & ~owl
    np.savez_compressed(f'{frames.CACHE}/masks.npz', **L)
    # for the settle tracks: the laptop base without the hands, the lid without the page
    base = poly_mask([[[408,683],[928,543],[1219,671],[686,866]], [[686,866],[1219,671],[1225,700],[690,896]], [[408,683],[686,866],[690,896],[402,704]]][0:1]) | poly_mask([[[686,866],[1219,671],[1225,700],[690,896]]]) | poly_mask([[[408,683],[686,866],[690,896],[402,704]]])
    hands = dil(L['lh'] | L['rh'] | L['arm'] | L['rhB'] | L['armB'] | L['fig'], 15)
    lid = poly_mask([[[285,223],[843,143],[921,532],[405,660]]]); scr = poly_mask([[[315,246],[834,168],[898,519],[409,648]]])
    np.savez_compressed(f'{frames.CACHE}/masks_lap.npz', lapbase=dil(base, 4) & ~hands, lid=dil(lid, 4) & ~ero(scr, 4))
    col = {'owlD': (255,128,0), 'rhB': (128,0,255), 'armB': (0,200,128), 'room': (255,0,0), 'desk': (0,255,0), 'lh': (0,255,255), 'rh': (255,0,255), 'arm': (0,128,255), 'fig': (0,0,255), 'owl': (255,255,0)}
    vis = (np.clip(S, 0, 1) * 255).astype(np.uint8)
    for k, m in L.items():
        cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(vis, cs, -1, col[k], 1)
    cv2.imwrite(f'{frames.CACHE}/masks.jpg', vis)
    return L

if __name__ == '__main__':
    L = build(); print({k: int(v.sum()) for k, v in L.items()})
