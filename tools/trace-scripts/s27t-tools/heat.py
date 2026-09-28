# ΔE8 heat maps: per row  source | render | heat (0..20 ΔE -> black..white) for frames k...
# usage: heat.py OUT.jpg RENDERDIR k1,k2,... [--w 600]
import cv2, numpy as np, sys, os
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
a = sys.argv; out, d, ks = a[1], a[2], [int(x) for x in a[3].split(',')]
w = int(a[a.index('--w') + 1]) if '--w' in a else 600
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), 8).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
rows = []
for k in ks:
    S = cv2.imread(f'{REF}/src/{k:05d}.png'); R = cv2.imread(os.path.join(d, 'frame-%05d.png' % k))
    de = np.linalg.norm(lab(R) - lab(S), axis=2)
    hm = cv2.applyColorMap(np.clip(de / 20 * 255, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    h = int(946 * w / 2206)
    r = np.hstack([cv2.resize(x, (w, h), interpolation=cv2.INTER_AREA) for x in (S, R, hm)])
    cv2.putText(r, '%.2f  mean %.2f' % (k / 25, de.mean()), (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    rows.append(r)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
