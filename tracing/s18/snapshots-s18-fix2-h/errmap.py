import cv2,numpy as np,re,sys
d=sys.argv[1]
txt=open('../../src/shots/s18/shotA.js').read(); PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
acc=np.zeros((150,340)); accs=np.zeros((150,340)); n0=0
for n in range(1338,1382):
    if n in (1351,1376): continue
    dx,dy=P[n]
    r=cv2.imread('%s/r%d.png'%(d,n),0).astype(np.float32); s=cv2.imread('../s18-fix2-src/f%04d.png'%n,0).astype(np.float32)
    x0,y0=560+dx,470+dy
    rc=r[y0-40:y0+190,x0-40:x0+380]; sc=s[y0-40:y0+190,x0-40:x0+380]
    D=(cv2.GaussianBlur(rc,(0,0),6)-cv2.GaussianBlur(sc,(0,0),6))[40:190,40:380]
    acc+=np.abs(D); accs+=D; n0+=1
A=acc/n0; Sg=accs/n0
print(d,'mean |d| rows y, cols x 560.. step 34')
for j in range(0,150,15): print('%3d '%(470+j)+' '.join('%4.0f'%A[j:j+15,i:i+34].mean() for i in range(0,340,34)))
