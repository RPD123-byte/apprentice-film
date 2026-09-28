#!/usr/bin/env python3
# stretch.py A.met.json B.met.json [C.met.json]: per-stretch s4 / s12 means (source frame index ranges)
import json, sys
st=[(2101,2102,'hug'),(2103,2147,'strip carried'),(2148,2162,'exit, slot'),(2163,2208,'banner carried'),(2209,2239,'slap, press'),(2240,2253,'hop'),(2254,2295,'wipe'),(2296,2315,'crouch'),(2316,2345,'power-up'),(2346,2371,'scissors back'),(2372,2378,'flare'),(2379,2398,'two pairs'),(2399,2426,'zip'),(2101,2426,'ALL')]
D=[json.load(open(p)) for p in sys.argv[1:]]
print('%-15s %-11s '%('stretch','frames')+' | '.join('%-18s'%p.split('/')[-1].replace('.met.json','') for p in sys.argv[1:]))
for k0,k1,n in st:
    ks=[str(k) for k in range(k0,k1+1) if str(k) in D[0]]
    cells=[]
    for d in D:
        a=sum(d[k][0] for k in ks)/len(ks); b=sum(d[k][1] for k in ks)/len(ks); cells.append('s4 %5.2f s12 %5.2f'%(a,b))
    print('%-15s %4d-%4d  '%(n,k0,k1)+' | '.join(cells))
