# measurement view: lower shell in elliptic coords about the plate (1379.5,277.5, 41.5x77): columns = angle, rows = rho
import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace'); from degrade import degrade
src = degrade(cv2.imread('src-850.png', 0).astype(np.float32))
ren = cv2.imread(sys.argv[1], 0).astype(np.float32)
CX, CY, RX, RY = 1379.5, 277.5, 41.5, 77
th = np.deg2rad(np.arange(-10, 230, 0.5)); rho = np.arange(0.95, 1.75, 0.005)
T, R = np.meshgrid(th, rho)
mx = (CX + RX * R * np.cos(T)).astype(np.float32); my = (CY + RY * R * np.sin(T)).astype(np.float32)
a = cv2.remap(src, mx, my, cv2.INTER_LINEAR); b = cv2.remap(ren, mx, my, cv2.INTER_LINEAR)
im = np.vstack([a, np.full((4, a.shape[1]), 128), b]).astype(np.uint8)
im = cv2.resize(im, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
for d in range(0, 240, 30):
  X = int((d + 10) / 0.5 * 2); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 0, 255), 1); cv2.putText(im, str(d), (X + 2, 12), 0, 0.4, (0, 0, 255), 1)
for r in np.arange(1.0, 1.75, 0.1):
  Y = int((r - 0.95) / 0.005 * 2); cv2.line(im, (0, Y), (40, Y), (0, 255, 0), 1); cv2.putText(im, '%.1f' % r, (2, Y - 2), 0, 0.35, (0, 255, 0), 1)
cv2.imwrite(sys.argv[2], im)
