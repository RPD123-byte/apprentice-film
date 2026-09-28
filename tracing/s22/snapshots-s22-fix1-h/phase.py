import numpy as np, re, sys
rows=[re.findall(r'[-+]?\d+\.?\d*', l) for l in open(sys.argv[1]).read().strip().split('\n')[1:]]
names=['top','left','right','strip','page','all']
ph=[('top',1863,1913),('right',1914,1935),('bottom',1936,1979),('left',1980,1994),('jump',1995,2019),('face',2020,2035),('peel',2036,2100)]
for n,a,b in ph:
    R=[list(map(float,r)) for r in rows if a<=int(float(r[0]))<=b]
    if not R: continue
    A=np.array(R)[:,1:]; mae=A[:,0::2]; bias=A[:,1::2]
    print(f'{n:7s}', ' '.join(f'{k}:{m:5.2f}({bb:+5.2f})' for k,m,bb in zip(names,mae.mean(0),bias.mean(0))))
