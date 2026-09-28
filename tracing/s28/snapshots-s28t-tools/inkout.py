# how much of a figure key's ink lies outside its silhouette (dilated by D px). Usage: inkout.py name [D] [out.png]
import json, subprocess, sys, numpy as np, cv2
name = sys.argv[1]; D = int(sys.argv[2]) if len(sys.argv) > 2 else 4
subprocess.run(['node', '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools/keyras.mjs', name, '/tmp/s28t_key.json'], check=True)
K = json.load(open('/tmp/s28t_key.json'))
W, H = 2206, 946; S = 4
def ras(rings_list):
    m = np.zeros((H * 1, W * 1), np.uint8)
    for rings in rings_list:
        # even-odd per shape
        mm = np.zeros_like(m)
        for r in rings:
            tmp = np.zeros_like(m); cv2.fillPoly(tmp, [np.round(np.array(r)).astype(np.int32)], 1); mm ^= tmp
        m |= mm
    return m
sil = ras([K['sil']])
ink = ras([sh['r'] for sh in K['ink']])
reg = ras([R['r'] for R in K['regions']])
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * D + 1, 2 * D + 1))
sd = cv2.dilate(sil, k)
out = ink & (1 - sd)
print(name, 'ink px', ink.sum(), 'outside sil+%d' % D, out.sum(), 'regions outside sil', (reg & (1 - sil)).sum())
if len(sys.argv) > 3:
    vis = np.full((H, W, 3), 255, np.uint8); vis[sil > 0] = (200, 220, 200); vis[ink > 0] = (0, 0, 0); vis[out > 0] = (0, 0, 255)
    cv2.imwrite(sys.argv[3], vis)
