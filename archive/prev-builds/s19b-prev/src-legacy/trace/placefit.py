# For every rendered frame in a dir (r-T.png), compare the render's owl silhouette (difference against the render's
# own owl-free 57.36 frame) with the source's (owlmask.src_mask) above the floor line: IoU, and the translation and
# scale (about the render mask's centroid) that maximise it. Measurement only; prints a table.
import sys, glob, re, json, numpy as np, cv2
from owlmask import mask_from, src_mask
d = sys.argv[1]; FY = 850
clean = cv2.cvtColor(cv2.imread(f'{d}/r-57.36.png'), cv2.COLOR_BGR2GRAY)
res = {}
for p in sorted(glob.glob(f'{d}/r-*.png')):
    t = float(re.search(r'r-([\d.]+)\.png', p).group(1))
    if t < 57.39 or t > 61.42: continue
    r = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY)
    mr = mask_from(r, clean); ms = src_mask(t)
    mr[FY:] = 0; ms[FY:] = 0
    if mr.sum() < 500 or ms.sum() < 500: continue
    iou0 = (mr & ms).sum() / (mr | ms).sum()
    ys, xs = np.nonzero(mr); cx, cy = xs.mean(), ys.mean()
    best = (iou0, 0, 0, 1.0)
    for sc in (0.9, 0.94, 0.97, 1.0, 1.03, 1.06, 1.1):
        M = np.float32([[sc, 0, cx * (1 - sc)], [0, sc, cy * (1 - sc)]])
        ms_ = cv2.warpAffine(mr, M, (mr.shape[1], mr.shape[0]), flags=cv2.INTER_NEAREST)
        # translation by FFT cross-correlation on a coarse grid then refine
        a = cv2.resize(ms_.astype(np.float32), None, fx=0.25, fy=0.25); b = cv2.resize(ms.astype(np.float32), None, fx=0.25, fy=0.25)
        F = np.fft.fft2(b) * np.conj(np.fft.fft2(a)); cc = np.real(np.fft.ifft2(F))
        iy, ix = np.unravel_index(np.argmax(cc), cc.shape)
        if iy > cc.shape[0] / 2: iy -= cc.shape[0]
        if ix > cc.shape[1] / 2: ix -= cc.shape[1]
        for dx in range(ix * 4 - 6, ix * 4 + 7, 3):
            for dy in range(iy * 4 - 6, iy * 4 + 7, 3):
                Mt = np.float32([[1, 0, dx], [0, 1, dy]])
                m2 = cv2.warpAffine(ms_, Mt, (mr.shape[1], mr.shape[0]), flags=cv2.INTER_NEAREST)
                iou = (m2 & ms).sum() / max(1, (m2 | ms).sum())
                if iou > best[0]: best = (iou, dx, dy, sc)
    res[f'{t:.2f}'] = [round(float(iou0), 3), round(float(best[0]), 3), best[1], best[2], best[3], round(float(cx), 1), round(float(cy), 1)]
    print(f'{t:.2f}', 'IoU', round(float(iou0), 3), '-> best', round(float(best[0]), 3), 'dx', best[1], 'dy', best[2], 'scale', best[3], flush=True)
json.dump(res, open(sys.argv[2], 'w'))
