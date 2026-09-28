# side-by-side crops (render | source) of named regions for a rendered frame dir
import cv2, numpy as np, sys, os
d, f = sys.argv[1], int(sys.argv[2]); regs = sys.argv[3].split(',') if len(sys.argv) > 3 else ['top', 'eyes', 'mouth', 'hoodL', 'hoodR']
R = {'top': (560, 0, 1520, 330), 'eyes': (700, 150, 1400, 480), 'mouth': (850, 450, 1250, 830), 'hoodL': (0, 420, 800, 946), 'hoodR': (1300, 420, 2100, 946),
     'bgL': (0, 0, 620, 560), 'bgR': (1450, 0, 2206, 700), 'face': (520, 0, 1560, 830), 'full': (0, 0, 2206, 946)}
a = cv2.imread(f'{d}/r{f:04d}.png'); b = cv2.imread(f'../s02-r3-src/{f:04d}.png')
for n in regs:
    x0, y0, x1, y1 = R[n] if n in R else [int(v) for v in n.split(':')]
    c = np.hstack([a[y0:y1, x0:x1], np.full((y1 - y0, 6, 3), 255, np.uint8), b[y0:y1, x0:x1]])
    s = min(1.0, 1900 / c.shape[1])
    cv2.imwrite(f'{d}/crop-{n.replace(":","_")}-{f:04d}.jpg', cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
# overlay: red = render, cyan = source (where they agree -> grey)
if os.environ.get('OVL'):
    for n in regs:
        x0, y0, x1, y1 = R[n] if n in R else [int(v) for v in n.split(':')]
        ga = cv2.cvtColor(a[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); gb = cv2.cvtColor(b[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
        o = np.dstack([gb, gb, ga])
        s = min(1.0, 1900 / o.shape[1])
        cv2.imwrite(f'{d}/ovl-{n.replace(":","_")}-{f:04d}.jpg', cv2.resize(o, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
