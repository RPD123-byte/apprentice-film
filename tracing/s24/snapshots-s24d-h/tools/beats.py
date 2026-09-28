import sys,re,numpy as np
B=[('page k7',7,7),('hold k8-18',8,18),('whip k19',19,19),('flash k20-22',20,22),('wash k23',23,23),('F k24-53',24,53),('H k54,57-62',54,54),('H',57,62),('flash k55-56',55,56),('whirl k63-66',63,66),('J k67-90',67,90),('wipe k91',91,91)]
d={}
for l in open(sys.argv[1]):
  m=re.match(r'k(\d+)\s+mae ([\d.]+)\s+mae_s8 ([\d.]+)',l)
  if m: d[int(m.group(1))]=(float(m.group(2)),float(m.group(3)))
agg={}
for n,a,b in B:
  key=n.split(' ')[0] if n.startswith('H') else n
  agg.setdefault(key,[]).extend([d[k] for k in range(a,b+1) if k in d])
for k,v in agg.items():
  v=np.array(v); print('%-16s n=%2d  mae %.1f  s8 %.2f'%(k,len(v),v[:,0].mean(),v[:,1].mean()))
v=np.array(list(d.values())); print('ALL n=%d mae %.2f s8 %.2f'%(len(v),v[:,0].mean(),v[:,1].mean()))
