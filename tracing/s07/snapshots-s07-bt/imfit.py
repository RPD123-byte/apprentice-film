# fit the arched "Imagination" layout (s07 page.js imaginationG) to the source's cream letter mask (page units)
import cv2, numpy as np, math, json, sys
from PIL import Image, ImageDraw, ImageFont
F = '/Users/computer/rootline/apprentice-film/assets/fonts/Fraunces-Variable.ttf'
inst = sys.argv[1] if len(sys.argv) > 1 else '9,750,100,0'
axes = [float(v) for v in inst.split(',')]
b = cv2.imread('s07-bt/src_screen_mean.png'); R_ = cv2.GaussianBlur(b, (0, 0), 1.2)
h = cv2.cvtColor(R_, cv2.COLOR_BGR2HSV_FULL).astype(np.float32); S = h[..., 1] / 255; V = h[..., 2] / 255
X0, Y0, X1, Y1 = 335, 520, 1265, 690
src = ((S < 0.22) & (V > 0.6))[Y0:Y1, X0:X1].astype(np.float32)
src[:30, 465:725] = 0.5   # the fan / "Pure" letters' feet bleed into the top of the box: ignore-ish
FS = 200
font = ImageFont.truetype(F, FS); font.set_variation_by_axes(axes)
word = 'Imagination'
G = {}
for ch in set(word):
  adv = font.getlength(ch)
  im = Image.new('L', (int(adv) + 200, FS * 2), 0); d = ImageDraw.Draw(im)
  asc = font.getmetrics()[0]
  d.text((100, FS * 1.4 - asc), ch, font=font, fill=255)   # baseline at y = FS*1.4
  G[ch] = (adv, np.array(im, np.float32) / 255)
def render(p):
  base, span, cx, Rr, x0, sy, track = p
  ws = [G[c][0] * 100 / FS + track for c in word]; tot = sum(ws); size = 100 * span / tot; k = size / 100
  out = np.zeros((Y1 - Y0, X1 - X0), np.float32); x = x0
  for c, w0 in zip(word, ws):
    w = w0 * k; mid = x + w / 2; ang = math.asin((mid - cx) / Rr)
    px, py = cx + math.sin(ang) * Rr, base + Rr - math.cos(ang) * Rr + 4
    adv, img = G[c]; s = size / FS
    # glyph image: origin (100 + adv/2, FS*1.4) is the centre of the baseline
    M = cv2.getRotationMatrix2D((100 + adv / 2, FS * 1.4), -math.degrees(ang), 1.0)
    A = np.array([[s, 0, 0], [0, s * sy, 0]], np.float64) @ np.vstack([M, [0, 0, 1]])
    A[0, 2] += px - X0 - s * (100 + adv / 2); A[1, 2] += py - Y0 - s * sy * FS * 1.4
    out = np.maximum(out, cv2.warpAffine(img, A, (X1 - X0, Y1 - Y0), flags=cv2.INTER_LINEAR))
    x += w
  return out
def err(p):
  r = render(p)
  return np.abs(cv2.GaussianBlur(r, (0, 0), 3) - cv2.GaussianBlur(src, (0, 0), 3)).mean()
P = [626.0, 866.0, 815.0, 2720.0, 382.0, 0.97, 0.0]
st = [4, 12, 40, 400, 6, 0.04, 1.0]
e0 = err(P); print('init', e0)
for it in range(7):
  for i in range(len(P)):
    for sg in (1, -1):
      while True:
        Q = P[:]; Q[i] += sg * st[i]; e = err(Q)
        if e < e0 - 1e-5: P, e0 = Q, e
        else: break
  st = [s * 0.55 for s in st]
  print(it, round(e0, 4), [round(v, 2) for v in P])
r = render(P)
cv2.imwrite('s07-b0/imfit.png', np.vstack([(r * 255).astype(np.uint8), (src * 255).astype(np.uint8)]))
print(json.dumps([round(v, 2) for v in P]))
