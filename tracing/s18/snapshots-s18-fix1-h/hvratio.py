import cv2,numpy as np,re,sys
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
def ratio(im,n):
    dx,dy=P[n]; x0=max(0,480+dx); x1=min(2206,960+dx); sl=(slice(220+dy,520+dy),slice(x0,x1))
    im=im.astype(np.float32); gx=np.abs(cv2.Sobel(im,cv2.CV_32F,1,0))[sl]; gy=np.abs(cv2.Sobel(im,cv2.CV_32F,0,1))[sl]
    return gx.mean()/gy.mean()
for d in sys.argv[1:]:
    out=[]
    for n in range(1331,1348):
        r=cv2.imread('%s/r%d.png'%(d,n),0); s=cv2.imread('../s18-fix1-src/f%04d.png'%n,0)
        out.append('%d:%.2f/%.2f'%(n,ratio(r,n),ratio(s,n)))
    print(d,' '.join(out))
