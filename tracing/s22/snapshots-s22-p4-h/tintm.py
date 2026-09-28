# tintm.py DIR: per-channel (src - render) minus their mean, per tone band, averaged over the frames in DIR
import sys, cv2, numpy as np, glob, re
sys.path.insert(0, '.')
from run import src
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
for grp, sel in [('pre', [F for F in Fs if F < 2014]), ('post', [F for F in Fs if F > 2020])]:
    acc = {k: [] for k in ('dark', 'mid', 'white')}; lvl = {k: [] for k in acc}
    for F in sel:
        r = cv2.imread(f'{d}/r{F:04d}.png').astype(float); s = src(F).astype(float); L = s.mean(2)
        for name, m in [('dark', (L > 6) & (L < 40)), ('mid', (L >= 40) & (L < 150)), ('white', (L >= 200) & (L < 250))]:
            dd = (s[m] - r[m]).mean(0); acc[name].append(dd - dd.mean()); lvl[name].append(dd.mean())
    if sel: print(grp, len(sel), ' | '.join(f'{k}: B{np.mean(v,0)[0]:+.2f} G{np.mean(v,0)[1]:+.2f} R{np.mean(v,0)[2]:+.2f} (lvl {np.mean(lvl[k]):+.2f})' for k, v in acc.items()))
