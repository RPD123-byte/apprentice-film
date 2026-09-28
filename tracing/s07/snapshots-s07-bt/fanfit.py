# fit curved petals (s07 page fan) to the hue classes of the rectified source mean (page units)
import cv2, numpy as np, json, math
b = cv2.imread('s07-bt/src_screen_mean.png')
R = cv2.GaussianBlur(b, (0, 0), 1.5)
h = cv2.cvtColor(R, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
H = h[..., 0] * 360 / 256; S = h[..., 1] / 255; V = h[..., 2] / 255
Hh = np.where(H > 350, H - 360, H)
cls = np.zeros(H.shape, np.uint8); sat = (S > 0.33) & (V > 0.35)
for k, (a, bb) in [(1, (35, 70)), (2, (12, 35)), (3, (-10, 12)), (4, (300, 350)), (5, (230, 300))]: cls[sat & (Hh >= a) & (Hh < bb)] = k
cream = (S < 0.2) & (V > 0.62)
X0, Y0, X1, Y1 = 480, 170, 910, 400
valid = np.zeros(H.shape, bool); valid[Y0:Y1, X0:X1] = True
valid &= ~cream
valid[300:322, :] = False                     # the selection's top edge
vm = valid.astype(np.uint8); cv2.circle(vm, (530, 188), 56, 0, -1); valid = vm > 0
def petal(poly_img, lab, bx, by, a0, a1, L, hw, pw=0.7, n=28):
  C = [(bx, by)]; x, y = bx, by
  for i in range(1, n + 1):
    a = math.radians(a0 + (a1 - a0) * i / n); x += math.cos(a) * L / n; y += math.sin(a) * L / n; C.append((x, y))
  Lp, Rp = [], []
  for i in range(n + 1):
    p = C[i]; q0 = C[max(0, i - 1)]; q1 = C[min(n, i + 1)]
    dx, dy = q1[0] - q0[0], q1[1] - q0[1]; l = math.hypot(dx, dy) or 1; dx /= l; dy /= l
    w = hw * (i / n) ** pw
    Lp.append((p[0] - dy * w, p[1] + dx * w)); Rp.append((p[0] + dy * w, p[1] - dx * w))
  ea = math.radians(a1); cap = []
  for k in range(9):
    t = ea + math.pi / 2 - math.pi * k / 8
    cap.append((C[n][0] + math.cos(t) * hw, C[n][1] + math.sin(t) * hw))
  pts = np.array(Lp + cap + Rp[::-1], np.float32)
  cv2.fillPoly(poly_img, [np.round(pts * 4).astype(np.int32)], lab, shift=2)
def render(P):
  img = np.zeros(H.shape, np.uint8)
  for p in P: petal(img, *p)
  return img
def score(P):
  img = render(P)
  return ((img == cls) & valid).sum() / valid.sum()
# initial: left fan back to front (purple .. yellow), then right fan
def init(tx, ty, bx, by, S, hw, lab):
  th = math.degrees(math.atan2(ty - by, tx - bx)) % 360
  ch = math.hypot(tx - bx, ty - by); s = math.radians(S) / 2; L = ch / (math.sin(s) / s)
  return [lab, bx, by, th + S / 2, th - S / 2, L, hw, 0.5]
P0 = [[5, 768.6, 396.7, 266.2, 216.2, 229.6, 17.2, 0.5], [4, 770.7, 393.2, 253.8, 203.2, 238.6, 23.2, 0.5], [3, 772.0, 395.9, 242.2, 192.2, 247.6, 20.4, 0.5], [2, 776.4, 384.8, 224.9, 180.6, 263.4, 18.8, 0.5], [1, 762.9, 400.7, 228.4, 183.4, 248.5, 23.5, 0.5]]
P = [init(645, 200, 752, 395, 50, 14, 5), init(598, 219, 752, 395, 50, 17, 4), init(561, 250, 752, 395, 50, 14, 3), init(522, 300, 752, 395, 45, 20, 2), init(530, 287, 752, 395, 45, 15, 1)]
P = P0 + [init(765, 290, 745, 385, -40, 10, 5), init(842, 330, 752, 388, -40, 12, 4), init(884, 358, 760, 390, -30, 12, 3), init(842, 360, 762, 392, -25, 10, 2), init(804, 364, 764, 394, -20, 8, 1)]
print('init', score(P))
steps = [None, 3, 3, 3, 3, 8, 2, 0.08]
for it in range(8):
  for i in range(len(P)):
    for k in range(1, 8):
      for sgn in (1, -1):
        for _ in range(8):
          Q = [p[:] for p in P]; Q[i][k] += sgn * steps[k]
          if score(Q) > score(P): P = Q
          else: break
  steps = [None] + [s * 0.6 for s in steps[1:]]
  print(it, round(score(P), 4))
print(json.dumps([[round(v, 1) for v in p] for p in P]))
img = render(P)
pal = np.array([[40, 40, 40], [80, 200, 240], [60, 130, 230], [50, 50, 210], [170, 80, 210], [190, 90, 110], [235, 235, 235]], np.uint8)
c2 = cls.copy(); c2[cream] = 6
vis = np.hstack([pal[c2][Y0 - 40:Y1 + 80, X0 - 40:X1 + 40], pal[img][Y0 - 40:Y1 + 80, X0 - 40:X1 + 40]])
cv2.imwrite('s07-b0/fanfit.png', vis)
