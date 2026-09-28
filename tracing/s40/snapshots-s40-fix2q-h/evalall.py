import sys
from lib import *
a, b = sys.argv[1], sys.argv[2]
ts = [round(136.0 + 0.16 * i, 2) for i in range(30)]
regs = {'whole': None, 'owl': (1495, 190, 1690, 445), 'face': (1525, 262, 1650, 350), 'feet': (1515, 390, 1640, 452), 'ribL': (0, 0, 440, 700), 'ribR': (1850, 0, 2206, 700),
        'cloudL': (0, 560, 900, 946), 'cloudR': (1400, 700, 2206, 946), 'wm': (480, 280, 1560, 640), 'tag': (540, 645, 1620, 720), 'spk': (1880, 40, 1980, 150)}
acc = {k: [[], []] for k in regs}
for t in ts:
    S = src(t)
    for k, box in regs.items():
        acc[k][0].append(bdiff(ren(t, a), S, box)); acc[k][1].append(bdiff(ren(t, b), S, box))
for k in regs:
    print(f'{k:7s} {np.mean(acc[k][0]):6.2f} -> {np.mean(acc[k][1]):6.2f}')
print('per-frame whole:', ' '.join(f'{t}:{x:.2f}/{y:.2f}' for t, x, y in zip(ts, acc['whole'][0], acc['whole'][1])))
print('per-frame owl:', ' '.join(f'{t}:{x:.1f}/{y:.1f}' for t, x, y in zip(ts, acc['owl'][0], acc['owl'][1])))
