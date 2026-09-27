import numpy as np, sys
s=np.load('smean138.npy'); r=np.load(sys.argv[1])
y0,y1,x0,x1,st=[int(v) for v in sys.argv[2:7]]
def cls(p):
    b,g,rr=p
    if g<45 and rr<140: return 'M'   # maroon
    if rr>150 and g<95: return 'r'   # red / rose
    if 95<=g<170 and rr>180: return 'p'
    if g>=170: return 'c'
    return '?'
def runs(a,y):
    out=[];prev=None;start=x0
    for x in range(x0,x1):
        c=cls(a[y,x])
        if c!=prev:
            if prev is not None: out.append(f'{prev}{start}-{x-1}')
            prev=c; start=x
    out.append(f'{prev}{start}-{x1-1}')
    return ' '.join(o for o in out if not (o[0]=='?' and int(o.split('-')[1])-int(o[1:].split('-')[0])<3))
for y in range(y0,y1,st):
    print(y,'S:',runs(s,y)); print(y,'R:',runs(r,y))
