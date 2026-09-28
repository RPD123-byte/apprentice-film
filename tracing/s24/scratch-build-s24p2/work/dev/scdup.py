import sys, json, re; sys.path.insert(0, '.')
from common import *
from tone import raster
s = open('../../s24.js').read()
SCA = json.loads(re.search(r'const SC_A = (\[.*?\]\]);', s, re.S).group(1))
SCB = json.loads(re.search(r'const SC_B = (\[.*?\]\]);', s, re.S).group(1))
ks = list(range(24, 54))
objimg = {}
for k in ks:
    d = json.load(open(f'out/lines_k{k:02d}.json'))
    L = [{'v': l['v'], 'paths': [np.array(p) for p in l['paths']]} for l in d.get('obj', [])]
    objimg[k] = raster(L, (946, 2206), ss=1)
def crop(k, c, R):
    x, y = int(round(c[0])), int(round(c[1]))
    im = np.pad(objimg[k], R)
    return im[y:y + 2 * R, x:x + 2 * R]
for name, sc, R in (('A', SCA, 240), ('B', SCB, 200)):
    P = {k: crop(k, (sc[k - 24][0], sc[k - 24][1]), R) for k in ks}
    print(name)
    for k in ks:
        best = []
        for j in ks:
            if j >= k: continue
            a, b = P[k], P[j]
            # allow a small shift
            r = cv2.matchTemplate(cv2.GaussianBlur(b, (0, 0), 1.5), cv2.GaussianBlur(a[20:-20, 20:-20], (0, 0), 1.5), cv2.TM_CCOEFF_NORMED)
            _, mx, _, loc = cv2.minMaxLoc(r)
            best.append((mx, j, loc[0] - 20, loc[1] - 20))
        best.sort(reverse=True)
        print(k, sc[k - 24][2:], [(round(b[0], 3), b[1], b[2], b[3]) for b in best[:2]])
