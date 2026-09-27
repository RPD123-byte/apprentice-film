# plate.py T out.jpg x0 y0 x1 y1 [scale] [--render PNG]: source (or render) frame at T mapped back to plate coords via CAM
import cv2, sys, re, numpy as np
src = open('/Users/computer/rootline/apprentice-film/src/shots/s01_birdseye.js').read()
cam = [list(map(float, m)) for m in re.findall(r'\[(\d\.\d\d), (1\.\d+), (-?[\d.]+), (-?[\d.]+)\]', src)]
def camat(t):
    if t <= cam[0][0]: return cam[0][1:]
    for i in range(1, len(cam)):
        if t <= cam[i][0]:
            a, b = cam[i-1], cam[i]; u = (t - a[0]) / (b[0] - a[0]); return [a[k] + (b[k]-a[k])*u for k in (1,2,3)]
    return cam[-1][1:]
a = sys.argv; t = float(a[1]); out = a[2]; x0,y0,x1,y1 = map(int, a[3:7]); k = float(a[7]) if len(a) > 7 and not a[7].startswith('--') else 2
if '--render' in a: f = cv2.imread(a[a.index('--render')+1])
else:
    c = cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(cv2.CAP_PROP_POS_FRAMES, int(round(t*25))); ok, f = c.read()
s, tx, ty = camat(round(t*25)/25)
M = np.float32([[s*k, 0, (tx + s*x0)*1], [0, s*k, ty + s*y0]])
# output pixel (u,v) -> plate (x0+u/k, y0+v/k) -> frame s*plate+t
Minv = np.float32([[s/k, 0, s*x0+tx], [0, s/k, s*y0+ty]])
o = cv2.warpAffine(f, Minv, (int((x1-x0)*k), int((y1-y0)*k)), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_CUBIC)
cv2.imwrite(out, o, [cv2.IMWRITE_JPEG_QUALITY, 90]); print('cam', s, tx, ty)
if '--grid' in a:
    st = 10
    for x in range((x0//st+1)*st, x1, st):
        X = int((x-x0)*k); mj = x % 50 == 0
        cv2.line(o, (X,0), (X,o.shape[0]), (0,0,255) if mj else (0,160,220), 1)
        if mj: cv2.putText(o, str(x), (X+2,12), 0, 0.4, (0,255,255), 1)
    for y in range((y0//st+1)*st, y1, st):
        Y = int((y-y0)*k); mj = y % 50 == 0
        cv2.line(o, (0,Y), (o.shape[1],Y), (0,0,255) if mj else (0,160,220), 1)
        if mj: cv2.putText(o, str(y), (2,Y-3), 0, 0.4, (0,255,255), 1)
    cv2.imwrite(out, o, [cv2.IMWRITE_JPEG_QUALITY, 90])
