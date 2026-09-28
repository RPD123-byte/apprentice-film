import cv2,numpy as np,re,sys
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
for d in sys.argv[1:]:
    E6=[];E2=[];E1=[]
    for n in range(1338,1382):
        r=cv2.imread('%s/r%d.png'%(d,n),0); s=cv2.imread('../s18-fix1-src/f%04d.png'%n,0)
        if r is None: continue
        r=r.astype(np.float32); s=s.astype(np.float32); dx,dy=P[n]
        x0=max(0,600+dx); x1=1000+dx; sl=(slice(530,650),slice(x0,x1))
        for sig,L in ((6,E6),(2,E2),(1,E1)):
            L.append(np.abs(cv2.GaussianBlur(r,(0,0),sig)-cv2.GaussianBlur(s,(0,0),sig))[sl].mean())
    print(d,'feet box s6 %.2f s2 %.2f s1 %.2f (n=%d)'%(np.mean(E6),np.mean(E2),np.mean(E1),len(E6)))
