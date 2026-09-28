# end-s27-tfix: local translation (render -> source) in windows, by phase correlation of blurred gradient magnitude
import cv2, numpy as np, sys
def gm(im):
    g = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.5)
    return np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
def off(s, r, box):
    x0, y0, x1, y1 = box
    a = gm(s)[y0:y1, x0:x1]; b = gm(r)[y0:y1, x0:x1]
    win = cv2.createHanningWindow((x1 - x0, y1 - y0), cv2.CV_32F)
    (dx, dy), resp = cv2.phaseCorrelate(b, a, win)
    return dx, dy, resp
D = sys.argv[1]; frames = list(map(int, sys.argv[2].split(','))); boxes = eval(sys.argv[3])
for F in frames:
    s = cv2.imread(f'src/s{F}.png'); r = cv2.imread(f'{D}/r{F}.png')
    out = []
    for name, box in boxes.items():
        dx, dy, rp = off(s, r, box(F) if callable(box) else box)
        out.append(f'{name} {dx:+5.1f},{dy:+5.1f} ({rp:.2f})')
    print(F, '%.2f' % (F / 25), ' | '.join(out))
