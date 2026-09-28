#!/usr/bin/env python3
# s22 measurement prep (not loaded by the film). Reads the SOURCE film only to measure; writes caches/tracks to
# $S22_WORK (default /tmp/s22-work). Steps, in order:
#   frames   cache the segment's frames (74.52–84.04)
#   top      align the top-edge drawing (phase correlation against 75.00) and take the grade-inverted median
#   bottom   the same drawing along the bottom side (inside the screen), rotated back: its own (unlit) values
#   sides    refine the cup tracks on the right/bottom/left sides with the rotated median
#   late     grade-inverted cache of 79.72–84.04 and the clean plates (top margin + the strip at rest)
#   walk     rigid (Euclidean ECC) fit of the walking drawing per pose, and its median in drawing coordinates
#   strip    ECC affine of the strip during the jump (for plates) and the 9-patch strip tracks (STRIP_WARP)
# then: trace_edge2.py (edge drawing), trace_all.py (late drawings), build_data.py ../owlData.js
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cv2, numpy as np
S = os.environ.get('S22_WORK', '/tmp/s22-work'); os.makedirs(S, exist_ok=True)
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
step = sys.argv[1] if len(sys.argv) > 1 else 'all'

if step in ('frames', 'all'):
    c = cv2.VideoCapture(V); f0, f1 = round(74.52 * 25), round(84.04 * 25)
    c.set(cv2.CAP_PROP_POS_FRAMES, f0)
    np.save(S + '/frames.npy', np.array([c.read()[1] for _ in range(f0, f1 + 1)]))

from common import *   # noqa: E402  (needs frames.npy)

if step in ('top', 'all'):
    TOP_CUP = [[74.80, 618.9, 80.3], [74.84, 650.9, 79.9], [74.88, 681.5, 80.0], [74.92, 710.9, 80.0], [74.96, 740.6, 80.3], [75.00, 773.0, 80.0], [75.04, 803.8, 79.9],
               [75.08, 834.7, 79.8], [75.12, 864.9, 80.2], [75.16, 897.2, 80.1], [75.24, 928.2, 79.8], [75.28, 959.4, 79.7], [75.32, 990.7, 80.3], [75.36, 1023.6, 80.1],
               [75.40, 1056.4, 80.1], [75.44, 1087.3, 79.7], [75.48, 1120.8, 80.2], [75.52, 1152.6, 80.1], [75.56, 1184.8, 80.2], [75.60, 1215.5, 80.1], [75.64, 1247.7, 80.8],
               [75.68, 1279.4, 80.5], [75.72, 1310.4, 80.3], [75.76, 1340.3, 80.0], [75.80, 1371.6, 80.4], [75.84, 1402.9, 80.1], [75.88, 1433.8, 80.4], [75.92, 1463.6, 80.3],
               [75.96, 1495.3, 80.5], [76.00, 1525.2, 80.1], [76.04, 1556.6, 80.2], [76.08, 1585.7, 79.9], [76.12, 1617.4, 80.5], [76.16, 1647.5, 80.3], [76.24, 1679.1, 80.6],
               [76.28, 1708.6, 80.2], [76.32, 1740.5, 80.6], [76.36, 1771.5, 80.3], [76.40, 1803.9, 80.7], [76.44, 1833.7, 80.1], [76.48, 1865.3, 80.8], [76.52, 1898.0, 80.7]]
    X0, Y0, W, H = -115, -60, 330, 172
    ref = crop_sub(gray(75.0), 773 + X0, 80 + Y0, W, H); win = cv2.createHanningWindow((W, H), cv2.CV_32F)
    res, crops, gcrops = [], [], []
    for t, x, y in TOP_CUP:
        (dx, dy), r = cv2.phaseCorrelate(ref, crop_sub(gray(t), x + X0, y + Y0, W, H), win)
        res.append((t, x + dx, y + dy, dx, dy, r, 0, 0))
        gcrops.append(crop_sub(gray(t), x + dx + X0, y + dy + Y0, W, H))
        crops.append(crop_sub(ungrade(t), x + dx + X0, y + dy + Y0, W, H))
    np.save(S + '/top_align.npy', np.array(res))
    np.save(S + '/top_med.npy', np.median(np.array(gcrops[5:30]), axis=0))
    np.save(S + '/top_pre_med.npy', np.median(np.array(crops), axis=0))

if step in ('bottom', 'all'):
    # the same drawing along the bottom (inside the screen: no margin light over it), rotated back by 180° about
    # the cup (tracks = BOT_CUP in s22.js) and median'd: the drawing's own values for trace_edge2.py
    BOT = [[77.48, 1943.1, 465.6], [77.52, 1905.9, 464.9], [77.56, 1870.5, 465], [77.6, 1833.1, 465.3], [77.64, 1795.2, 465.3], [77.68, 1759.3, 464.8], [77.72, 1721.4, 465.1],
           [77.76, 1683.9, 465.1], [77.8, 1646.3, 465.1], [77.84, 1611.1, 464.7], [77.88, 1575.2, 465.3], [77.92, 1537.4, 465.3], [77.96, 1499, 465.8], [78, 1460.5, 464.9],
           [78.04, 1424.5, 465.9], [78.08, 1387.2, 465.5], [78.12, 1348.7, 465.8], [78.16, 1311.9, 465.7], [78.24, 1274.7, 465.9], [78.28, 1236.5, 465.7], [78.32, 1197, 465.4],
           [78.36, 1161, 464.7], [78.4, 1122.1, 464.9], [78.44, 1080.3, 465.8], [78.48, 1037.9, 465.8], [78.52, 999.6, 465.2], [78.56, 961.9, 465.1], [78.6, 923.8, 465.8],
           [78.64, 884.4, 465.5], [78.68, 846.6, 465.4], [78.72, 808.5, 465.7], [78.76, 770.3, 465.4], [78.8, 731, 465.5], [78.84, 692.9, 465.3], [78.88, 656.2, 465.4],
           [78.92, 618.7, 465.4], [78.96, 578.6, 465.3], [79, 541.6, 465.2], [79.04, 503.1, 465.4], [79.08, 463.8, 465.2], [79.12, 421.5, 465.5], [79.16, 381.2, 465.5]]
    X0, Y0, W, H = -115, -60, 330, 172
    qq, pp = np.meshgrid(np.arange(W, dtype=np.float32) + X0, np.arange(H, dtype=np.float32) + Y0)
    crops = [cv2.remap(ungrade(t), (x - qq).astype(np.float32), (y - pp).astype(np.float32), cv2.INTER_CUBIC) for t, x, y in BOT]
    np.save(S + '/bot_pre_med.npy', np.median(np.array(crops), axis=0))

if step in ('late', 'all'):
    ts = [round((1863 + i) / 25, 2) for i in range(idx(79.72), idx(84.04) + 1)]
    pre = {('%.2f' % t): ungrade(t).astype(np.float16) for t in ts}
    np.savez_compressed(S + '/late_pre.npz', **pre)
    get = lambda t: pre['%.2f' % t].astype(np.float32)
    P = np.median(np.array([get(t) for t in ts if 83.36 <= t <= 84.0]), axis=0)
    PR = np.median(np.array([get(t) for t in ts if 80.80 <= t <= 81.40]), axis=0)
    comb = P.copy(); comb[:, 1000:] = PR[:, 1000:]
    np.save(S + '/plate_top.npy', comb)

if step in ('walk', 'all'):
    Z = np.load(S + '/late_pre.npz'); pre = lambda t: Z['%.2f' % t].astype(np.float32)
    FX = {81.60: 519.9, 81.72: 580.2, 81.80: 617.8, 81.88: 673.8, 81.96: 735.1, 82.04: 791.3, 82.12: 854.5, 82.20: 910.6, 82.28: 962.8, 82.36: 1007.6, 82.44: 1066.5,
          82.52: 1115.5, 82.60: 1162.6, 82.72: 1211.9, 82.80: 1254.1, 82.88: 1292.2, 82.96: 1335.6, 83.04: 1376.3, 83.12: 1415.0, 83.20: 1442.1, 83.28: 1471.5,
          83.36: 1504.5, 83.44: 1534.9, 83.52: 1554.4, 83.60: 1572.7, 83.72: 1602.3, 83.80: 1624.8, 83.88: 1635.8}
    rx0, ry0, W, H = 1066.5 - 195, 35, 210, 115
    ref = cv2.GaussianBlur(crop_sub(pre(82.44), rx0, ry0, W, H), (0, 0), 1)
    res = {}
    for t, fx in FX.items():
        warp = np.array([[1, 0, rx0 + fx - 1066.5], [0, 1, ry0]], np.float32)
        cc, warp = cv2.findTransformECC(ref, cv2.GaussianBlur(pre(t), (0, 0), 1), warp, cv2.MOTION_EUCLIDEAN, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), None, 1)
        res[t] = warp.tolist()
    json.dump(res, open(S + '/walk_warp.json', 'w'))
    U0, V0, UW, VH = -40, -30, 290, 190
    uu, vv = np.meshgrid(np.arange(U0, U0 + UW, dtype=np.float32), np.arange(V0, V0 + VH, dtype=np.float32))
    cs = []
    for t, w in res.items():
        if t < 81.7: continue
        w = np.array(w, np.float32)
        cs.append(cv2.remap(pre(t), w[0, 0] * uu + w[0, 1] * vv + w[0, 2], w[1, 0] * uu + w[1, 1] * vv + w[1, 2], cv2.INTER_CUBIC))
    np.save(S + '/walk_med.npy', np.median(np.array(cs), axis=0))

# 'sides' and 'strip' were run interactively with the same helpers (rotated-median phase correlation per frame;
# 9-patch sub-pixel template tracks against 79.60 along the headline row) — their outputs are the RIGHT/BOT/LEFT_CUP
# and STRIP_WARP tables written straight into s22.js.
