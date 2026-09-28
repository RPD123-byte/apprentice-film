import sys
from lib import *
d=sys.argv[1]
S=np.load('x/S9.npy'); R=mean_ren([137.6,138.0,138.4,138.8],d)
f=lambda I:0.299*I[...,0]+0.587*I[...,1]+0.114*I[...,2]
for nm,I in [('S',S),('R',R)]:
    c=I[645:720,540:1620]; L=f(c)
    mar=(L<70).sum(); cre=(L>200).sum()
    rows=np.where((L<70).any(1)|(L>200).any(1))[0]
    print(nm,'maroon',mar,'cream',cre,'ink rows',645+rows.min(),645+rows.max())
print('tag diff', bdiff(R,S,(540,645,1620,720)))
