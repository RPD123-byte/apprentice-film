#!/usr/bin/env python3
# Shot B owl as ink drawings (measurement only; nothing here is loaded by the film).
# Inputs (scratch dir SP): owlB_frames.npz (every frame 1382-1432 with the grade undone P<n>, and the owl-free
# expectation E<n> = plates under the measured tip), B_cons / B_body (the belly: consensus silhouette and median of the
# frames registered on TRACK_B), owlB_states.npz + owlB_state.json (the far wing's 3-state flap: per-state medians),
# B_tail / B_tailcons / B_tailA.json (the tail: its registered median and affine per frame).
# Output pickle:
#   belly, wing[down|mid|up]  - rigid drawings in registered coords (frame = reg + (dx, dy + RY0), TRACK_B)
#   tail                      - rigid drawing at the 1382 placement, moved by the per-frame tail affine
#   parts[n] (1382-1416)      - per frame, the owl parts that change: legs, feet, the near wing sweeping down
#   keys[n]  (1382-1416)      - per frame, the marks of the keys pressed down (dark centre-lines only)
#   fly[n]   (1417-1432)      - the leaping / flying owl, per frame (motion-blurred in the source: drawn from the
#                               lightly smoothed frame, softened again by the film inside its own silhouette)
import sys, os, json, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import *
from trace_plate2 import trace_image, shift
SP = sys.argv[1]; out = sys.argv[2]
ONLY = sys.argv[3] if len(sys.argv) > 3 else 'all'
BSM, BHI, BLO, BML = [float(v) for v in os.environ.get('BELLY', '0.8,8,3.5,10').split(',')]
Z = np.load(SP + '/owlB_frames.npz')
TB = {1382:(0,0),1383:(-39,1),1384:(-64,-3),1385:(-73,-8),1386:(-74,-1),1387:(-76,4),1388:(-76,2),1389:(-84,-4),1390:(-103,2),1391:(-120,2),1392:(-132,-6),1393:(-140,-12),1394:(-141,-3),1395:(-146,5),1396:(-156,3),1397:(-164,-3),1398:(-182,7),1399:(-194,12),1400:(-199,8),1401:(-199,8),1402:(-212,-6),1403:(-206,12),1404:(-212,26),1405:(-212,30),1406:(-232,24),1407:(-248,28),1408:(-312,24),1409:(-392,18),1410:(-453,3),1411:(-496,-8),1412:(-540,-21),1413:(-572,-30),1414:(-593,-40),1415:(-585,-29),1416:(-589,-32)}
RW, RH, RY0 = 2206 + 620, 946 + 90, -45
state = {int(k): v for k, v in json.load(open(SP + '/owlB_state.json')).items()}
tailA = {int(k): np.array(v) for k, v in json.load(open(SP + '/B_tailA.json')).items()}
cons = np.load(SP + '/B_cons.npy'); body = np.load(SP + '/B_body.npy'); ST = np.load(SP + '/owlB_states.npz')
tail = np.load(SP + '/B_tail.npy'); tcons = np.load(SP + '/B_tailcons.npy')
def fillholes(m, maxA=10 ** 9):
    m = m.copy(); inv = (1 - m).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        touches = x == 0 or y == 0 or x + w == m.shape[1] or y + h == m.shape[0]
        if not touches and a < maxA: m[lab == i] = 1
    return m
def comps(m, keep=99, minA=0):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    idx = [1 + i for i in np.argsort(-st[1:, 4])[:keep] if st[1 + i, 4] >= minA]
    return np.isin(lab, idx).astype(np.uint8)
E_ = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
def silh(c, keep=1, minA=0):
    m = (c > 0.55).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, E_(7)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, E_(15))
    return comps(fillholes(m), keep=keep, minA=minA)
owl_prm = dict(T=0.45, rc=1.5, ro=1.5, sm=1.0, nms=1, sigd='0.8,1.3,2.0', sigb='0.8,1.3,2.0', HId=5, LOd=2, minlen=4, HIb=12, LOb=5,
               blobs=40, blobA=1500, blobsig='6,10,16,26', rim=1, minA=30, holeA=20, specks=1, spthr=0.25, spmax=40, dots=0)
def draw_of(P, mask, prm=owl_prm):
    dv = float(np.median(P[(mask > 0) & (P < 0.2)])) if ((mask > 0) & (P < 0.2)).sum() > 20 else 0.05
    return trace_image(P.astype(np.float32), dict(prm, basev=dv), allowed=mask.astype(np.uint8))
res = pickle.load(open(out, 'rb')) if os.path.exists(out) and ONLY != 'all' else {}
# ---- tail zone and rigid parts
tsil = (tcons > 0.5).astype(np.uint8); tsil[:, :1540] = 0
tsil = cv2.morphologyEx(tsil, cv2.MORPH_OPEN, E_(5)); tsil = comps(fillholes(cv2.morphologyEx(tsil, cv2.MORPH_CLOSE, E_(11))), keep=2, minA=500)
tz = np.zeros((RH, RW), np.uint8); tz[-RY0:-RY0 + 946, :2206] = cv2.dilate(tsil, np.ones((5, 5), np.uint8))
sil_all = (cv2.erode(silh(cons), np.ones((3, 3), np.uint8)) & (1 - tz)).astype(np.uint8)
wings = {}
for S in ['down', 'mid', 'up']:
    w = silh(ST['cons_' + S], keep=4, minA=3000) & (1 - cv2.dilate(sil_all, np.ones((5, 5), np.uint8))) & (1 - tz)
    w[:, 760:] = 0
    w = comps(cv2.morphologyEx(w, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)), minA=1500)
    wings[S] = cv2.dilate(w, np.ones((5, 5), np.uint8))
if ONLY in ('all', 'rigid'):
    # the belly is redrawn on every source frame, so the median of the registered frames is smoother than any of
    # them (about half the fine feather strokes average out). Its ink is measured on ONE drawing instead: frame 1382
    # (TRACK_B origin: registered = frame + (0, 45)), with the median only where 1382 does not show the belly.
    P0 = Z['P1382']; b1 = body.copy(); b1[-RY0:-RY0 + 946, :2206] = P0
    ok = np.zeros_like(sil_all); ok[-RY0 + 2:-RY0 + 944, :2204] = 1
    # frame 1382's own legs / feet hang under the belly: keep the median there
    E0 = Z['E1382']; E0r = np.zeros_like(body); E0r[-RY0:-RY0 + 946, :2206] = E0
    bl = np.where(ok > 0, cv2.GaussianBlur(b1, (0, 0), BSM), body)
    # one frame carries its film grain: smoothed a little, and only strokes long and strong enough to be ink
    res['belly'] = draw_of(bl, sil_all, dict(owl_prm, HId=BHI, LOd=BLO, minlen=BML)); print('belly', len(res['belly']['dark']), 'strokes')
    res['wing'] = {S: (draw_of(ST['body_' + S], wings[S]) if wings[S].any() else None) for S in wings}
    res['tail'] = draw_of(tail, tsil)
    res['state'] = state; res['tailA'] = {n: A.tolist() for n, A in tailA.items()}
def place(n):
    """the rigid parts placed for frame n -> (image, silhouette), frame coords"""
    dx, dy = TB[n]; S = state[n]
    Mt = np.float32([[1, 0, dx], [0, 1, dy + RY0]])
    b = cv2.warpAffine(body, Mt, (2206, 946), flags=cv2.INTER_NEAREST); s = cv2.warpAffine(sil_all, Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    wb = cv2.warpAffine(ST['body_' + S], Mt, (2206, 946), flags=cv2.INTER_NEAREST); ws = cv2.warpAffine(wings[S], Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    b = np.where(ws > 0, wb, b); s = np.maximum(s, ws)
    A = tailA[n].astype(np.float32)
    tb = cv2.warpAffine(tail, A, (2206, 946), flags=cv2.INTER_LINEAR); ts = cv2.warpAffine(tsil, A, (2206, 946), flags=cv2.INTER_NEAREST)
    return np.where(ts > 0, tb, b), np.maximum(s, ts)
part_prm = dict(owl_prm, blobs=0, rim=0, HId=8, LOd=3.5, minlen=8, minA=12, holeA=12, spmax=25)   # single frames: grain-safe
key_prm = dict(T=0.5, rc=2.5, ro=2.5, nms=1, sigd='0.8,1.3', sigb='0.8', HId=10, LOd=4, HIb=999, LOb=999, minlen=6, specks=0, dots=0, blobs=0, rim=0)
if ONLY in ('all', 'parts', 'keys'):
    if ONLY != 'keys': res['parts'] = {}
    res['keys'] = {}
    for n in range(1382, 1417):
        if n == 1401: continue   # held frame (= 1400)
        P = Z[f'P{n}']; E = Z[f'E{n}'].copy()
        b, s = place(n); E2 = np.where(s > 0, b, E)
        d = cv2.GaussianBlur(P, (0, 0), 1.5) - cv2.GaussianBlur(E2, (0, 0), 1.5)
        r = (np.abs(d) > 0.12).astype(np.uint8)
        r = cv2.morphologyEx(r, cv2.MORPH_OPEN, E_(5)); r = cv2.morphologyEx(r, cv2.MORPH_CLOSE, E_(9))
        r = comps(fillholes(r, 2000), minA=150)
        # owl parts: difference regions that include plumage brighter than the plate under them (legs over the black
        # knob row / keys, feet, wing) - grown back over the connected difference region
        brt = ((d > 0.2) & (r > 0)).astype(np.uint8); brt = comps(cv2.morphologyEx(brt, cv2.MORPH_OPEN, E_(5)), minA=200)
        owlr = np.zeros_like(r)
        n_, lab = cv2.connectedComponents(r, connectivity=8)
        near = cv2.dilate((s > 0).astype(np.uint8), E_(31))
        ids = np.unique(np.concatenate([lab[brt > 0], lab[(near > 0) & (r > 0)]])); ids = ids[ids > 0]
        owlr = np.isin(lab, ids).astype(np.uint8)
        # below the belly only what is close to plumage (feet on the keys), not the key marks further off
        low = np.zeros_like(owlr); low[430:] = 1
        owlr = (owlr & ((1 - low) | cv2.dilate(brt, E_(61)) | near)).astype(np.uint8)
        owlr = cv2.morphologyEx(owlr, cv2.MORPH_CLOSE, E_(7))
        owlr = (cv2.dilate(owlr, E_(5)) & (cv2.dilate(r, E_(3)) | (s > 0))).astype(np.uint8)   # overlap the belly edge
        if owlr.sum() > 0 and ONLY != 'keys': res['parts'][n] = draw_of(cv2.GaussianBlur(P, (0, 0), 0.8), owlr, part_prm)
        # pressed keys: the dark marks left outside the owl, on the keyboard's key area (y > 430)
        kr = (r & (1 - cv2.dilate(owlr, E_(7)))).astype(np.uint8); kr[:430] = 0
        kr = cv2.dilate(kr, E_(5))
        if kr.sum() > 0:
            K = trace_image(P.astype(np.float32), dict(key_prm), allowed=kr)
            # only the marks: the key faces themselves are the plate's
            K['masses'] = []; K['specks'] = []; K['bright'] = []; K['dots'] = []
            res['keys'][n] = K
        print(n, 'parts px', int(owlr.sum()), 'keys px', int(kr.sum()), 'key strokes', len(res['keys'].get(n, {}).get('dark', [])))
fly_prm = dict(owl_prm, blobs=24, blobA=1500, rim=1, HId=10, LOd=4, minlen=8, specks=0, sigd='1.0,1.8,2.6', sigb='1.0,1.8,2.6', HIb=16, LOb=6)
if ONLY in ('all', 'fly'):
    res['fly'] = {}
    for n in range(1417, 1433):
        if n == 1426: continue   # held frame (= 1425)
        P = Z[f'P{n}']; E = Z[f'E{n}']
        d = np.abs(cv2.GaussianBlur(P, (0, 0), 2.0) - cv2.GaussianBlur(E, (0, 0), 2.0))
        r = (d > 0.12).astype(np.uint8)
        r = cv2.morphologyEx(r, cv2.MORPH_OPEN, E_(7)); r = cv2.morphologyEx(r, cv2.MORPH_CLOSE, E_(15))
        r = comps(fillholes(r, 20000), minA=400)
        # only the owl: the bright plumage core (brighter than the plate under it), grown back over the difference
        # region - not the differences the motion-blurred tipping keyboard leaves
        Pb, Eb = cv2.GaussianBlur(P, (0, 0), 3), cv2.GaussianBlur(E, (0, 0), 3)
        core = ((Pb > 0.5) & (Pb - Eb > 0.15)).astype(np.uint8)
        core = comps(cv2.morphologyEx(core, cv2.MORPH_OPEN, E_(7)), minA=600)
        r = (r & cv2.dilate(core, E_(41))).astype(np.uint8)
        r = comps(fillholes(r, 20000), minA=400)
        if r.sum() == 0: continue
        res['fly'][n] = draw_of(cv2.GaussianBlur(P, (0, 0), 1.0), r, fly_prm)
        print(n, 'fly px', int(r.sum()))
pickle.dump(res, open(out, 'wb'))
