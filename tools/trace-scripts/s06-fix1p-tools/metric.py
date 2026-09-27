#!/usr/bin/env python3
# metric.py DIR [IDX] : per-region blurred MAE / signed mean (render - source) at sigma 5 and 1.5, plus structure-tensor
# coherence (sigma 6) of the darkness in the region, render vs source
import cv2, sys, glob, numpy as np
d = sys.argv[1]; idx = sys.argv[2] if len(sys.argv) > 2 else '00'
fr = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0], 0).astype(np.float32)
rf = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0], 0).astype(np.float32)
R = {
 'frame': (0, 0, 2206, 946),
 'eyeL': (760, 250, 960, 420), 'eyeR': (1100, 250, 1360, 440), 'underL': (790, 360, 950, 425), 'underR': (1150, 350, 1320, 410),
 'lidL': (790, 275, 940, 320), 'lidR': (1150, 258, 1320, 305),
 'nose': (980, 480, 1180, 610), 'forehead': (880, 90, 1220, 180), 'mouth': (960, 590, 1260, 810), 'chinjaw': (900, 700, 1260, 815),
 'cheekR': (1260, 380, 1360, 600), 'cheekL': (750, 400, 860, 560),
 'beanie': (580, 0, 1480, 330), 'hair': (620, 60, 1520, 700), 'fist': (440, 360, 900, 860), 'shoulderL': (100, 500, 560, 700), 'shoulderR': (1850, 620, 1980, 900),
 'owl': (1520, 120, 1880, 640), 'owleyes': (1575, 315, 1775, 395), 'tuft': (1720, 175, 1790, 260), 'room': (0, 0, 620, 700), 'laprim': (250, 805, 1900, 832),
}
sel = sys.argv[3].split(',') if len(sys.argv) > 3 else list(R)
def coh(img):
    g = cv2.GaussianBlur(img, (0, 0), 1.2)
    ix = cv2.Sobel(g, cv2.CV_32F, 1, 0); iy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    j11 = cv2.GaussianBlur(ix * ix, (0, 0), 6); j12 = cv2.GaussianBlur(ix * iy, (0, 0), 6); j22 = cv2.GaussianBlur(iy * iy, (0, 0), 6)
    c = np.sqrt((j11 - j22) ** 2 + 4 * j12 ** 2) / (j11 + j22 + 1e-6); e = j11 + j22
    return c, e
cf, ef = coh(fr); cr, er = coh(rf)
b5f, b5r = cv2.GaussianBlur(fr, (0, 0), 5), cv2.GaussianBlur(rf, (0, 0), 5)
b1f, b1r = cv2.GaussianBlur(fr, (0, 0), 1.5), cv2.GaussianBlur(rf, (0, 0), 1.5)
print('%-10s %7s %7s %7s %7s %6s %6s' % ('region', 'mae5', 'sgn5', 'mae1.5', 'mae0', 'cohR', 'cohS'))
for k in sel:
    x0, y0, x1, y1 = R[k]; s = np.s_[y0:y1, x0:x1]
    m5 = np.abs(b5f[s] - b5r[s]).mean(); s5 = (b5f[s] - b5r[s]).mean(); m1 = np.abs(b1f[s] - b1r[s]).mean(); m0 = np.abs(fr[s] - rf[s]).mean()
    w1, w2 = ef[s], er[s]
    print('%-10s %7.2f %7.2f %7.2f %7.2f %6.3f %6.3f' % (k, m5, s5, m1, m0, (cf[s] * w1).sum() / (w1.sum() + 1e-6), (cr[s] * w2).sum() / (w2.sum() + 1e-6)))
