# seg.py LOG_A LOG_B : segment means of sigma 1/2/4/8 errors and region errors from run.py logs
import sys, re, numpy as np
def load(p):
    D = {}
    for l in open(p):
        m = re.match(r'F(\d+) s1 ([\d.]+) s2 ([\d.]+) s4 ([\d.]+) s8 ([\d.]+) \| (.*) \| ', l)
        if not m: continue
        reg = dict((a, float(b)) for a, b in re.findall(r'(\w+) ([\d.]+)', m.group(6)))
        D[int(m.group(1))] = ([float(m.group(i)) for i in range(2, 6)], reg)
    return D
A, B = load(sys.argv[1]), load(sys.argv[2])
SEG = [('jolt', 1144, 1150), ('flight', 1151, 1157), ('landing', 1158, 1164), ('hold', 1165, 1187), ('pull', 1188, 1192), ('ALL', 1144, 1192), ('1143', 1143, 1143)]
for nm, a, b in SEG:
    fr = [f for f in range(a, b + 1) if f in A and f in B]
    ma = np.mean([A[f][0] for f in fr], 0); mb = np.mean([B[f][0] for f in fr], 0)
    print('%-8s' % nm, ' '.join('s%d %.2f->%.2f' % (s, x, y) for s, x, y in zip((1, 2, 4, 8), ma, mb)))
fr = [f for f in range(1144, 1193) if f in A and f in B]
keys = [k for k in A[fr[0]][1] if k in B[fr[0]][1]]
print('regions s2 (1144-1192):', ' '.join('%s %.2f->%.2f' % (k, np.mean([A[f][1][k] for f in fr if k in A[f][1] and k in B[f][1]]), np.mean([B[f][1][k] for f in fr if k in A[f][1] and k in B[f][1]])) for k in keys))
