# motion3.py: frame-to-frame mean abs change (blur 2), render vs source, 2762-2938 (the cut neighbours rendered by s25 / s27)
import cv2, numpy as np, json, sys
SP = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3'
pats = {'src': SP + '/src/s{F}.png', 'cur': SP + '/cur/r{F}.png', 'fin2': SP + '/fin2/r{F}.png'}
ld = lambda p, F: cv2.GaussianBlur(cv2.imread(p.format(F=F)).astype(np.float32), (0, 0), 2)
res = {}
for k, p in pats.items():
    prev = ld(p, 2762); ch = {}
    for F in range(2763, 2939):
        cur = ld(p, F); ch[F] = round(float(np.abs(cur - prev).mean()), 2); prev = cur
    res[k] = ch
json.dump(res, open(SP + '/motion3.json', 'w'))
r = [res['fin2'][F] / max(res['src'][F], 0.5) for F in range(2763, 2939)]
print('cut 110.52', res['src'][2763], res['cur'][2763], res['fin2'][2763], '| cut 117.52', res['src'][2938], res['cur'][2938], res['fin2'][2938])
print('mean |fin2-src|', round(np.mean([abs(res['fin2'][F] - res['src'][F]) for F in range(2764, 2938)]), 3), 'cur', round(np.mean([abs(res['cur'][F] - res['src'][F]) for F in range(2764, 2938)]), 3))
for F in range(2764, 2938):
    a, b, c = res['src'][F], res['cur'][F], res['fin2'][F]
    if c > 1.5 * a + 1 or c < 0.6 * a - 1: print('outlier', F, 'src', a, 'cur', b, 'fin2', c)
