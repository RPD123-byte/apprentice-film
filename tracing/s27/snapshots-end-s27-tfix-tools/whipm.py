# end-s27-tfix: whip variant scoring: full-frame dE8, periphery (outside an ellipse round the page centre) and centre
# (within 250 px of the face) blurred abs diff. Usage: whipm.py DIR F variants.json
import cv2, numpy as np, json, sys
D, F = sys.argv[1], int(sys.argv[2]); V = json.load(open(sys.argv[3]))
s = cv2.imread(f'src/s{F}.png').astype(np.float32)
def lab(a): return cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_BGR2Lab)
H, W = s.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
per = (((xx - 1100) / 900.0) ** 2 + ((yy - 440) / 420.0) ** 2) > 1
cen = ((xx - 1090) ** 2 + (yy - 420) ** 2) < 250 ** 2
for i, v in enumerate(V):
    r = cv2.imread(f'{D}/v{i}_r{F}.png').astype(np.float32)
    de = np.sqrt(((lab(cv2.GaussianBlur(r, (0, 0), 8)) - lab(cv2.GaussianBlur(s, (0, 0), 8))) ** 2).sum(-1))
    d4 = np.abs(cv2.GaussianBlur(r, (0, 0), 4) - cv2.GaussianBlur(s, (0, 0), 4)).mean(2)
    print(i, v, 'dE8 %.2f  per %.2f  cen s4 %.2f' % (de.mean(), de[per].mean(), d4[cen].mean()))
