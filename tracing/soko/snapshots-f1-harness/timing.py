import sys, time; sys.path.insert(0,'.')
from run import Lab, build
build('entry_dev.js','bundle_dev.js')
L=Lab('hd.html')
for sc in (1, 2):
    for gz in ('owl','down'):
        ms=L.js('''(o) => { const t=performance.now(); F1.I.sokoIllCanvas({gaze:o.g, scale:o.s}); return performance.now()-t; }''', {'g':gz,'s':sc})
        print(f'scale {sc} gaze {gz}: {ms:.0f} ms')
ms=L.js('''() => { const t=performance.now(); F1.S.sokoPageCanvas({gaze:'owl', scale:2}); return performance.now()-t; }''')
print('page scale2 (after ill cached):', round(ms))
L.close()
