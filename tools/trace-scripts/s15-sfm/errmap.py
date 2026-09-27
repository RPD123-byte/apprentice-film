# signed error maps (render - source, blurred) for a render dir -> a tiled image; red = render too bright, blue = too dark
import cv2, numpy as np, glob, re, sys
d, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
step = max(1, len(fs) // 8)
tiles = []
for fp in fs[::step][:8]:
    t = float(re.search(r'at-([\d.]+)s', fp).group(1))
    a = cv2.imread(fp, 0).astype(np.float32); b = cv2.imread(fp.replace('frame-', 'ref-'), 0).astype(np.float32)
    e = cv2.GaussianBlur(a, (0, 0), 12) - cv2.GaussianBlur(b, (0, 0), 12)
    e = cv2.resize(e, (551, 236))
    g = cv2.resize(b, (551, 236)).astype(np.uint8)
    vis = cv2.cvtColor(g // 2, cv2.COLOR_GRAY2BGR).astype(np.float32)
    vis[..., 2] += np.clip(e, 0, 255) * 1.5; vis[..., 0] += np.clip(-e, 0, 255) * 1.5
    vis = np.clip(vis, 0, 255).astype(np.uint8)
    cv2.putText(vis, f'{t:.2f} {np.abs(e).mean():.0f}', (5, 18), 0, 0.55, (0, 255, 0), 1)
    tiles.append(vis)
while len(tiles) % 2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]))
