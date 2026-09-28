# end-s26-rev2: frame-to-frame mean abs change (blur 2) for a sequence of frames, render vs source
import cv2, numpy as np, sys, json
pats = sys.argv[1:]
F0, F1 = 2758, 2942
def ld(p, F):
    im = cv2.imread(p.format(F=F))
    return None if im is None else cv2.GaussianBlur(im.astype(np.float32), (0, 0), 2)
res = {}
for p in pats:
    lbl, pat = p.split("=", 1); prev = ld(pat, F0); ch = {}
    for F in range(F0 + 1, F1 + 1):
        cur = ld(pat, F)
        if cur is None or prev is None: prev = cur; continue
        ch[F] = round(float(np.abs(cur - prev).mean()), 2); prev = cur
    res[lbl] = ch
json.dump(res, open("/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26r2/motion.json", "w"))
print("ok")
