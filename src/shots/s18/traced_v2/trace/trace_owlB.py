#!/usr/bin/env python3
# Shot B owl traces (measurement script, not loaded by the film). Inputs (scratch): owlB_frames.npz = every source
# frame 1382-1432 with the grade undone (P<n>) and the owl-free expectation E<n> (traced-plate sources: background +
# keyboard under the measured tip transform); B_cons.npy / B_body.npy = the owl difference-mask consensus and the median
# of the frames registered on TRACK_B (the belly is one rigid drawing).
#  - body: the consensus silhouette (closed, holes filled, largest part), traced from the registered median; drawn
#    at the 1382 placement moved by TRACK_B (frames 1382-1416);
#  - per frame: everything that still differs from (plates + moved body) — legs and feet, the swinging far wing, the
#    near wing sweeping down, the tail, pressed keys; from 1417 on the whole leaping / flying owl — traced from that
#    frame inside its difference region, in frame px.
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from trace_plate import build, enc_ring
SP = sys.argv[1]; out = sys.argv[2]
Z = np.load(SP + '/owlB_frames.npz'); cons = np.load(SP + '/B_cons.npy'); body = np.load(SP + '/B_body.npy')
TB = {1382:(0,0),1383:(-39,1),1384:(-64,-3),1385:(-73,-8),1386:(-74,-1),1387:(-76,4),1388:(-76,2),1389:(-84,-4),1390:(-103,2),1391:(-120,2),1392:(-132,-6),1393:(-140,-12),1394:(-141,-3),1395:(-146,5),1396:(-156,3),1397:(-164,-3),1398:(-182,7),1399:(-194,12),1400:(-199,8),1401:(-199,8),1402:(-212,-6),1403:(-206,12),1404:(-212,26),1405:(-212,30),1406:(-232,24),1407:(-248,28),1408:(-312,24),1409:(-392,18),1410:(-453,3),1411:(-496,-8),1412:(-540,-21),1413:(-572,-30),1414:(-593,-40),1415:(-585,-29),1416:(-589,-32)}
RW, RH, RY0 = 2206 + 620, 946 + 90, -45
LEV = [-1, 0.2, 0.45, 0.65, 0.8, 0.88, 0.94]
def fillholes(m):
    # holes = background not reachable from outside the image (pad by 1 px so the flood always starts outside)
    h, w = m.shape; ff = np.pad(m, 1); pad = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(ff, pad, (0, 0), 255); return m | (~ff[1:-1, 1:-1] & 255)
def comps(m, keep=99, minA=0):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    idx = [1 + i for i in np.argsort(-st[1:, 4])[:keep] if st[1 + i, 4] >= minA]
    return (np.isin(lab, idx) * 255).astype(np.uint8)
def pack(P, mask, levels, eps, ox=0, oy=0):
    L = build(P, levels, eps=eps, bigA=300, mask=(mask > 0).astype(np.uint8), minarea=1.5)
    def sh(v):
        if isinstance(v, list): return [round(v[0] + ox, 1), round(v[1] + oy, 1), v[2], round(v[3] + ox, 1), round(v[4] + oy, 1), v[5]]
        return v
    return [[[sh(v), [enc_ring(r + [ox, oy]) for r in g]] for v, g in lay] for lay in L]
# ---- body: belly x far-wing state (the far wing flaps on a 3-frame cycle: down / mid / up), registered coords
ST = np.load(SP + '/owlB_states.npz'); state = {int(k): v for k, v in json.load(open(SP + '/owlB_state.json')).items()}
tail = np.load(SP + '/B_tail.npy'); tcons = np.load(SP + '/B_tailcons.npy'); tailA = {int(k): np.array(v) for k, v in json.load(open(SP + '/B_tailA.json')).items()}
tsil = ((tcons > 0.5) * 255).astype(np.uint8)
tsil[:, :1540] = 0   # the rump belongs to the belly drawing; the tail proper starts at x 1540 (1382 placement)
tsil = cv2.morphologyEx(tsil, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
tsil = comps(fillholes(cv2.morphologyEx(tsil, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))), keep=2, minA=500)
# the tail zone in registered coords (at the 1382 placement, reg = frame + (0, -RY0))
tz = np.zeros((RH, RW), np.uint8); tz[-RY0:-RY0 + 946, :2206] = cv2.dilate(tsil, np.ones((5, 5), np.uint8))
res = {'body': {}, 'tail': pack(tail, tsil, LEV, 0.4), 'tailA': {n: [round(float(v), 5) for v in (A[0, 0], A[1, 0], A[0, 1], A[1, 1])] + [round(float(A[0, 2]), 2), round(float(A[1, 2]), 2)] for n, A in tailA.items()},
       'state': state, 'frames': {}}
# the belly: median of all pre-leap frames inside the all-frames consensus silhouette; the far wing per flap state:
# what that state's silhouette adds at the belly's top left (large parts only)
def silh(c, keep=1, minA=0):
    m = ((c > 0.55) * 255).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    return comps(fillholes(m), keep=keep, minA=minA)
sil_all = cv2.erode(silh(cons), np.ones((3, 3), np.uint8)) & ~(tz * 255)
res['belly'] = pack(body, sil_all, LEV, 0.4, 0, RY0)
print('belly', int((sil_all > 0).sum()), 'px')
wings = {}
for S in ['down', 'mid', 'up']:
    w = silh(ST['cons_' + S], keep=4, minA=3000) & ~cv2.dilate(sil_all, np.ones((5, 5), np.uint8)) & ~(tz * 255)
    w[:, 760:] = 0   # the far wing lives at the belly's top left
    w = comps(cv2.morphologyEx(w, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)), minA=1500)
    w = cv2.dilate(w, np.ones((5, 5), np.uint8))   # overlap the belly edge a little (drawn on top of it)
    wings[S] = w
    res['body'][S] = pack(ST['body_' + S], w, LEV, 0.45, 0, RY0) if w.any() else []
    print('wing', S, int((w > 0).sum()), 'px')
def place_body(n):
    dx, dy = TB[n]; S = state[n]
    Mt = np.float32([[1, 0, dx], [0, 1, dy + RY0]])
    b = cv2.warpAffine(body, Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    s = cv2.warpAffine(sil_all, Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    wb = cv2.warpAffine(ST['body_' + S], Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    ws = cv2.warpAffine(wings[S], Mt, (2206, 946), flags=cv2.INTER_NEAREST)
    b = np.where(ws > 0, wb, b); s = np.maximum(s, ws)
    A = tailA[n].astype(np.float32)
    tb = cv2.warpAffine(tail, A, (2206, 946), flags=cv2.INTER_LINEAR); ts = cv2.warpAffine(tsil, A, (2206, 946), flags=cv2.INTER_NEAREST)
    b = np.where(ts > 0, tb, b); s = np.maximum(s, ts)
    return b, s
HOLD = {1401: 1400, 1426: 1425}   # the source repeats one drawing every 25 frames
res['hold'] = HOLD
for n in range(1382, 1433):
    if n in HOLD: continue
    P = Z[f'P{n}']; E = Z[f'E{n}'].copy()
    if n <= 1416:
        b, s = place_body(n); E = np.where(s > 0, b, E)
    d = np.abs(cv2.GaussianBlur(P, (0, 0), 1.5) - cv2.GaussianBlur(E, (0, 0), 1.5))
    r = ((d > 0.12) * 255).astype(np.uint8)
    r = cv2.morphologyEx(r, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    r = cv2.morphologyEx(r, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    r = comps(fillholes(r), minA=250)
    r = cv2.dilate(r, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    if r.sum() == 0: continue
    soft = n >= 1419
    # standing frames: 5 levels; the motion-blurred leap / take-off frames: smooth content, so more levels with a
    # coarser outline (the film softens these layers again, see owlBT.js)
    if soft: Pn, lev, eps = cv2.GaussianBlur(P, (0, 0), 2.0), [-1, .15, .3, .45, .6, .72, .84, .93], 1.4
    else: Pn, lev, eps = cv2.GaussianBlur(P, (0, 0), 0.6), [-1, 0.22, 0.5, 0.78, 0.9], 0.55
    res['frames'][n] = pack(Pn, r, lev, eps)
    print(n, int((r > 0).sum()), 'px')
with open(out, 'w') as f:
    f.write('// Generated by src/shots/s18/trace/trace_owlB.py — outline traces of the shot-B owl: the rigid belly at the\n')
    f.write('// 1382 placement (moved by TRACK_B) and, per source frame, everything else that changes (frame px). See trace/README.md.\n')
    f.write('export const OWL_B_TRACE = '); json.dump(res, f, separators=(',', ':')); f.write(';\n')
print('wrote', out, os.path.getsize(out))
