import re,sys,numpy as np
L=[l for l in open(sys.argv[1]) if re.match(r'^\d{4} b6',l)]
v={int(l.split()[0]):float(l.split()[2]) for l in L}
for a,b,nm in ((1331,1337,'A fly-in'),(1338,1381,'A standing'),(1382,1416,'B standing'),(1417,1419,'B leap'),(1420,1423,'B take-off'),(1424,1432,'B wing/tip')):
  x=[v[n] for n in range(a,b+1) if n in v]
  if x: print(f'{nm:12s} {a}-{b} mean {np.mean(x):.2f} max {np.max(x):.2f}')
print('all mean %.2f max %.2f'%(np.mean(list(v.values())),max(v.values())))
