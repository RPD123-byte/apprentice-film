import json, subprocess, sys, cv2, numpy as np
# runlate.py stage.json spec_in.json spec_out.json  (stage: name, params, iters, out, Z)
st = json.load(open(sys.argv[1])); spec = json.load(open(sys.argv[2]))
st['spec'] = spec; name = st['name']; Z = st.get('Z', 3); out = st.get('out', 'lf')
r = subprocess.run(['node', 'ev.mjs', 'fitlate.js', json.dumps(st)], capture_output=True, text=True, timeout=3000)
d = None
for l in r.stdout.splitlines():
    if l.startswith('{'): d = json.loads(l)
    elif 'error' in l.lower() and 's18' not in l: print(l[:300])
if not d: print(r.stdout[-1500:], r.stderr[-1500:]); sys.exit(1)
print('IoU %.3f -> %.3f  (%.0f ms) pen %s' % (d['before'], d['after'], d['ms'], d.get('pen'))); print(d['params']); print('lm', {k: [round(v, 1) for v in p] for k, p in (d.get('lm') or {}).items()})
json.dump(d['spec'], open(sys.argv[3], 'w'), indent=1)
bx0, by0, bx1, by1 = d['box']
if name == 'walk': img, ox, oy = np.load('../s22/walk_med.npy'), -40, -30
elif name == 'brand': img, ox, oy = np.load('../s22/brand_v.npy'), 200, 0
else:
    t = int(name[1:]) / 100; img = np.load('../s22/late_pre.npz')['%.2f' % t].astype(np.float32); ox, oy = 0, 0
H, W = img.shape
canvas = np.zeros((by1 - by0, bx1 - bx0), np.float32)
for j in range(by1 - by0):
    y = by0 + j - oy
    if 0 <= y < H:
        xs = np.arange(bx0, bx1) - ox; ok = (xs >= 0) & (xs < W); canvas[j, ok] = img[y, xs[ok]]
src = cv2.resize((np.clip(canvas, 0, 1) * 255).astype(np.uint8), None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
v = cv2.imread(f'ev/{out}_v.png'); ov = cv2.imread(f'ev/{out}_ov.png')
cv2.imwrite(f'{out}.jpg', np.hstack([v, cv2.cvtColor(src, cv2.COLOR_GRAY2BGR), ov]))
