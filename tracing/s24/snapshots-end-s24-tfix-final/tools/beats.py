# beats.py DIR_A DIR_B [k0 k1] -> per-beat mean abs diff vs source (sigma 1 / 4 / 12) for two render dirs
import sys, os, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
A, B = sys.argv[1], sys.argv[2]
k0, k1 = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (7, 91)
BEATS = [("page smear k7", 7, 7), ("page hold k8-18", 8, 18), ("whip k19", 19, 19), ("flash k20-22", 20, 22), ("wash k23", 23, 23),
         ("F k24-53", 24, 53), ("H k54,57-62", 54, 62), ("whirl k63-66", 63, 66), ("J k67-90", 67, 90), ("wipe k91", 91, 91)]
def err(d, k):
    p = f"{d}/k{k:02d}.png"
    if not os.path.exists(p): return None
    r = cv2.imread(p).astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png")
    if s is None: return None
    s = s.astype(np.float32)
    return [np.abs(cv2.GaussianBlur(r, (0, 0), g) - cv2.GaussianBlur(s, (0, 0), g)).mean() for g in (1, 4, 12)]
res = {}
for k in range(k0, k1 + 1):
    if k in (55, 56): continue
    a, b = err(A, k), err(B, k)
    if a and b: res[k] = (a, b)
allA = np.mean([v[0] for v in res.values()], 0); allB = np.mean([v[1] for v in res.values()], 0)
print(f"{'beat':16s} {'A s1/s4/s12':>22s}   {'B s1/s4/s12':>22s}")
for n, a, b in BEATS:
    ks = [k for k in res if a <= k <= b]
    if not ks: continue
    ma = np.mean([res[k][0] for k in ks], 0); mb = np.mean([res[k][1] for k in ks], 0)
    print(f"{n:16s} {ma[0]:6.2f} {ma[1]:6.2f} {ma[2]:6.2f}   {mb[0]:6.2f} {mb[1]:6.2f} {mb[2]:6.2f}")
print(f"{'all':16s} {allA[0]:6.2f} {allA[1]:6.2f} {allA[2]:6.2f}   {allB[0]:6.2f} {allB[1]:6.2f} {allB[2]:6.2f}   (n={len(res)})")
