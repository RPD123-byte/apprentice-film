# bench.py: warm draw-time breakdown (each frame drawn 3x after a warm-up; machine load inflates absolute numbers)
import sys, json
sys.path.insert(0, '.')
from run import build, Lab
html = build('entry_prof.js', 'entry_prof.b.js'); L = Lab(html)
Fs = [1880, 1920, 1950, 1985, 2000, 2016, 2030, 2060, 2090]
for F in Fs: L.frame(F / 25)          # warm every sprite
L.p.evaluate('() => { globalThis.__S22PROF = {}; }')
tot = {}
for F in Fs:
    ms = []
    for k in range(3): ms.append(L.frame(F / 25, raw=True)[1])
    print(F, ['%.0f' % m for m in ms])
print(json.dumps({k: round(v / (3 * len(Fs)), 1) for k, v in L.p.evaluate('() => globalThis.__S22PROF').items()}))
L.close()
