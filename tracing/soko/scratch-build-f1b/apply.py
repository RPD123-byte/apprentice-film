#!/usr/bin/env python3
# apply.py src.js vref.npy LINE[,LINE...] : set measured corner values on the stripes()/face() calls on those lines
import re, sys, numpy as np
path=sys.argv[1]; src=open(path).read().split('\n'); v=np.load(sys.argv[2]); lines=[int(t) for t in sys.argv[3].split(',')]
num=r'-?\d+(?:\.\d+)?'
pat=re.compile(r'(stripes|face)\(g, \[\[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\], \[('+num+'), ('+num+r')\]\]')
def samp(q,u,w,r=3):
    a=[q[0][k]+(q[1][k]-q[0][k])*u for k in (0,1)]; b=[q[3][k]+(q[2][k]-q[3][k])*u for k in (0,1)]
    x,y=[int(a[k]+(b[k]-a[k])*w) for k in (0,1)]
    return v[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean()
for ln in lines:
    l=src[ln-1]; mt=pat.search(l)
    if not mt: print('no call on line',ln); continue
    f=[float(t) for t in mt.groups()[1:]]; q=[f[0:2],f[2:4],f[4:6],f[6:8]]
    S=[max(0.02,min(0.95,samp(q,u,w))) for u,w in ((.15,.15),(.85,.15),(.85,.85),(.15,.85))]
    c='bl(%s)'%', '.join('%.2f'%x for x in S)
    if mt.group(1)=='stripes':
        l2=re.sub(r'cov: (?:[^,()]|\([^()]*(?:\([^()]*(?:\([^()]*\)[^()]*)*\)[^()]*)*\))*?, lum: '+num, 'cov: %s, lum: 1'%c, l, count=1)
        if l2==l: l2=re.sub(r'cov: '+num+', lum: '+num, 'cov: %s, lum: 1'%c, l, count=1)
    else:
        l2=re.sub(r'(face\(g, \[\[[^\]]*\], \[[^\]]*\], \[[^\]]*\], \[[^\]]*\]\], )\[[^\]]*\]', lambda m: m.group(1)+'[%s]'%', '.join('%.2f'%x for x in S), l, count=1)
    if l2==l: print('unchanged',ln,l.strip()[:90])
    else: src[ln-1]=l2; print('set',ln,c)
open(path,'w').write('\n'.join(src))
