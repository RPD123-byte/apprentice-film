# end-s27-rev1: signed/abs error maps. For each frame: dE on sigma4-blurred Lab (render vs source); saves a heat overlay
# (source dimmed + heat) per frame and a per-stretch mean. Usage: heat.py WORK OUTDIR F1,F2,...
import cv2, numpy as np, sys, os
W, O, fr = sys.argv[1], sys.argv[2], list(map(int, sys.argv[3].split(',')))
os.makedirs(O, exist_ok=True)
def lab(p, s=4):
    im = cv2.imread(p).astype(np.float32) / 255
    return cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), s), cv2.COLOR_BGR2Lab)
for F in fr:
    s = lab(f'{W}/src/s{F}.png'); r = lab(f'{W}/render/r{F}.png')
    de = np.sqrt(((s - r) ** 2).sum(-1)); dL = r[..., 0] - s[..., 0]
    src = cv2.imread(f'{W}/src/s{F}.png')
    h = cv2.applyColorMap(np.clip(de * 12, 0, 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    ov = cv2.addWeighted(src, 0.35, h, 0.75, 0)
    # signed lightness: blue = render darker, red = render lighter
    sg = np.zeros_like(src); sg[..., 2] = np.clip(dL * 12, 0, 255); sg[..., 0] = np.clip(-dL * 12, 0, 255)
    sg = cv2.addWeighted(cv2.cvtColor(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR), 0.4, sg, 0.9, 0)
    out = np.vstack([cv2.resize(ov, None, fx=0.45, fy=0.45), cv2.resize(sg, None, fx=0.45, fy=0.45)])
    cv2.putText(out, f'{F/25:.2f} dE4 mean {de.mean():.2f}  (top: dE heat x12; bottom: red=render lighter, blue=darker)', (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.imwrite(f'{O}/heat_{F}.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, 85])
    # top blobs
    k = cv2.GaussianBlur(de, (0, 0), 25); ys, xs = np.unravel_index(np.argsort(k.ravel())[::-1], k.shape)
    picks = []
    for y, x in zip(ys[:200000:500], xs[:200000:500]):
        if all(abs(x - a) > 150 or abs(y - b) > 150 for a, b, _ in picks): picks.append((x, y, k[y, x]))
        if len(picks) >= 5: break
    print(F, f'{F/25:.2f}', f'mean dE4 {de.mean():.2f}', ' '.join(f'({x},{y}):{v:.1f}' for x, y, v in picks))
