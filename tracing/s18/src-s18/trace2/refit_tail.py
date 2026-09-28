#!/usr/bin/env python3
# refit_tail.py SP out.json [frames] - refit the shot-B tail affine (1382 placement -> frame) on the frames where the
# rigid tail was visibly off: ECC of the tail median against the frame, masked to the tail silhouette dilated 6 px so
# that its black outline counts, started from the earlier fit; kept only where the masked error drops
import sys, os, json, numpy as np, cv2
SP, out = sys.argv[1], sys.argv[2]
frames = [int(v) for v in (sys.argv[3] if len(sys.argv) > 3 else '1382,1383,1384,1385,1404,1405,1406,1414').split(',')]
Z = np.load(SP + '/owlB_frames.npz'); T = np.load(SP + '/B_tail.npy').astype(np.float32); tc = np.load(SP + '/B_tailcons.npy')
A0 = {int(k): np.array(v) for k, v in json.load(open(SP + '/B_tailA.json')).items()}
sil = (tc > 0.5).astype(np.uint8); sil[:, :1540] = 0
msk = cv2.dilate(sil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
res = {}
for n in frames:
    P = Z[f'P{n}'].astype(np.float32); A = A0[n].astype(np.float32)
    W = cv2.warpAffine(T, A, (2206, 946), flags=cv2.INTER_LINEAR); m = cv2.warpAffine(msk, A, (2206, 946), flags=cv2.INTER_NEAREST)
    # template = the frame (masked where the placed tail is); input = the placed tail median
    D = np.eye(2, 3, dtype=np.float32)
    try:
        cc, D = cv2.findTransformECC(cv2.GaussianBlur(P, (0, 0), 1.5), cv2.GaussianBlur(W, (0, 0), 1.5), D, cv2.MOTION_AFFINE,
                                     (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), m, 5)
    except cv2.error: cc = -1
    # W(D x) ~ P(x): the placed tail moved by D^-1 matches; new affine = D^-1 . A
    D3 = np.vstack([D.astype(np.float64), [0, 0, 1]]); A3 = np.vstack([A.astype(np.float64), [0, 0, 1]]); An = (np.linalg.inv(D3) @ A3)[:2]
    e = lambda AA: float(np.abs(cv2.warpAffine(T, AA.astype(np.float32), (2206, 946)) - P)[cv2.warpAffine(sil, AA.astype(np.float32), (2206, 946), flags=cv2.INTER_NEAREST) > 0].mean() * 255)
    e0, e1 = e(A0[n]), e(An)
    print(n, f'cc {cc:.3f} err {e0:.2f} -> {e1:.2f}')
    if e1 < e0: res[n] = An.tolist()
json.dump(res, open(out, 'w'))
