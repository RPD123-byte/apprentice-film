import re, sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/'
old={}
for fn in ['s18fix1/finA.log','s18fix1/finB2.log']:
    for line in open(S+fn):
        g=re.match(r'(\d+) mae ([\d.]+)',line)
        if g: old[int(g[1])]=float(g[2])
m={}
for fn in sys.argv[1:]:
    for line in open(fn):
        g=re.match(r'(\d+) mae ([\d.]+) mean R ([\d.]+) S ([\d.]+)',line)
        if g: m[int(g[1])]=(float(g[2]),float(g[3]),float(g[4]))
def rng(a,b,d):
    v=[d[f] if not isinstance(d[f],tuple) else d[f][0] for f in range(a,b+1) if f in d]
    return (sum(v)/len(v),max(v),len(v)) if v else (0,0,0)
for name,a,b in [('A fly-in 1331-1337',1331,1337),('A 1338-1381',1338,1381),('B 1382-1416',1382,1416),('B leap 1417-1419',1417,1419),('B take-off 1420-1423',1420,1423),('B wing/tip 1424-1432',1424,1432),('cuts 1329-1330 / 1433-1434',1329,1330)]:
    n1=rng(a,b,m); n0=rng(a,b,old)
    print(f'{name}: now mean {n1[0]:.1f} max {n1[1]:.1f} ({n1[2]}) | fix1 mean {n0[0]:.1f} max {n0[1]:.1f}')
print('worst:',sorted(((v[0],f) for f,v in m.items() if 1331<=f<=1432),reverse=True)[:8])
print('mean level R-S:',sum(v[1]-v[2] for f,v in m.items() if 1331<=f<=1432)/max(1,len([f for f in m if 1331<=f<=1432])))
