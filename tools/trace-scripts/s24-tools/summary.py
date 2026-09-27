import re, sys, numpy as np
rows = []
for f in sys.argv[1:]:
    for line in open(f):
        m = re.match(r'k(\d+) t [\d.]+\s+mean r\s+([\d.]+) s\s+([\d.]+)\s+σ1\s+([\d.]+)\s+σ2\(¼\)\s+([\d.]+)\s+σ8\(¼\)\s+([\d.]+)', line)
        if m: rows.append([int(m.group(1))] + [float(m.group(i)) for i in range(2, 7)])
R = np.array(rows)
print('frames', len(R), 'mean σ1 %.2f σ2 %.2f σ8 %.2f' % tuple(R[:, 3:6].mean(0)))
beats = [('page k7', 7, 7), ('page hold k8-18', 8, 18), ('whip k19', 19, 19), ('white k20-22', 20, 22), ('wash k23', 23, 23),
         ('F k24-53', 24, 53), ('H k54,57-62', 54, 62), ('whirl k63-67', 63, 67), ('J k68-90', 68, 90), ('wipe k91', 91, 91)]
for name, a, b in beats:
    s = (R[:, 0] >= a) & (R[:, 0] <= b)
    if name.startswith('H'): s &= ~np.isin(R[:, 0], [55, 56])
    if s.any(): print('%-18s σ1 %5.2f  σ2 %5.2f  σ8 %5.2f  (n %d)' % (name, *R[s, 3:6].mean(0), s.sum()))
s = np.isin(R[:, 0], [55, 56]); print('%-18s σ1 %5.2f  σ2 %5.2f  σ8 %5.2f' % ('flash k55-56', *R[s, 3:6].mean(0)))
