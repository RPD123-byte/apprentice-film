import re, sys
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18fix1/'
base = {1331: 22.4, 1333: 22.8, 1336: 24.1, 1345: 23.6, 1356: 23.0, 1363: 25.1, 1380: 23.6, 1385: 23.5, 1392: 23.7, 1405: 23.9,
        1411: 20.8, 1417: 30.2, 1418: 27.6, 1420: 49.6, 1422: 32.2, 1423: 30.2, 1428: 14.1, 1432: 17.4}
m = {}
for fn in ['finA.log', 'finB2.log']:
    for line in open(S + fn):
        g = re.match(r'(\d+) mae ([\d.]+) mean R ([\d.]+) S ([\d.]+)', line)
        if g: m[int(g[1])] = (float(g[2]), float(g[3]), float(g[4]))
def rng(a, b):
    v = [m[f][0] for f in range(a, b + 1) if f in m]
    return sum(v) / len(v), max(v), len(v)
for name, a, b in [('A fly-in 1331-1336', 1331, 1336), ('A 1337-1381', 1337, 1381), ('B 1382-1416', 1382, 1416), ('B leap 1417-1419', 1417, 1419),
                   ('B take-off 1420-1423', 1420, 1423), ('B wing/tip 1424-1432', 1424, 1432)]:
    mean, mx, n = rng(a, b); print(f'{name}: mean {mean:.1f}, max {mx:.1f} ({n} frames)')
print('baseline -> now:', ', '.join(f'{f} {base[f]}->{m[f][0]}' for f in sorted(base) if f in m))
print('worst:', sorted(((v[0], f) for f, v in m.items() if 1331 <= f <= 1432), reverse=True)[:8])
