# cardm.py: the card's left edge per source pose — the source's edge (50 % crossing), its bright hairline and the
# crease inside, against this film's card quad (cardAt replicated from s22.js)
import sys, re, json, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
s = open('src/shots/s22.js').read()
grab = lambda n: json.loads(re.sub(r',\s*\]', ']', re.search(r'const ' + n + r' = (\[.*?\]);', s, re.S).group(1)))
CARD, FIX, ADJ = grab('CARD'), grab('CARD_FIX'), grab('CARD_ADJ')
def hold(K, t):
    r = K[0]
    for k in K:
        if k[0] <= t + 1e-6: r = k
    return r[1:]
def cardAt(T):
    a = hold(ADJ, T) if T >= 81.6 else [0] * 8
    v = [x + (FIX[i] if T >= 81.52 else 0) + a[i] for i, x in enumerate(hold(CARD, T))]
    return [(v[0], v[1]), (v[2], v[3]), (v[4], v[5]), (v[6], v[7])]
def leftx(c, y):
    (x0, y0), (x1, y1) = c[0], c[3]
    return x0 + (y - y0) * (x1 - x0) / (y1 - y0)
if __name__ == '__main__':
    poses = [k[0] for k in CARD if k[0] >= 82.6]
    for T in poses:
        F = int(round(T * 25)); c = cardAt(T)
        rows = []
        for FF in (F, F + 1):
            B = cv2.GaussianBlur(gray(src(FF)), (0, 0), 0.5)
            for y in range(196, 352, 4):
                xr = leftx(c, y); x0 = int(xr) - 14
                row = B[y, x0:x0 + 30]
                i = int(np.argmax(row > 128))
                if i == 0 or row[i] <= 128: continue
                xe = x0 + i - 1 + (128 - row[i - 1]) / (row[i] - row[i - 1])
                ins = B[y, int(round(xe)) + 1:int(round(xe)) + 12]
                hl = ins[0:3].max(); cr = ins[3:10].min(); ci = int(np.argmin(ins[3:10])) + 3 + 1
                rows.append((y, xe - xr, hl, cr, ci, np.median(ins[8:11])))
        R = np.array(rows)
        crease = R[:, 3] < R[:, 5] - 25
        print(f'{T:.2f} F{F} edge − quad: med {np.median(R[:,1]):+5.2f} sd {R[:,1].std():4.2f} | hairline max {np.median(R[:,2]):5.1f} vs interior {np.median(R[:,5]):5.1f} | crease rows {crease.mean()*100:3.0f}% depth {np.median(R[crease,5]-R[crease,3]) if crease.any() else 0:5.1f} at +{np.median(R[crease,4]) if crease.any() else 0:.1f}')
