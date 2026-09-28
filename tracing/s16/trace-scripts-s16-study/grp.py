import cv2,numpy as np,glob,re,sys
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; per=int(sys.argv[6]) if len(sys.argv)>6 else 4; sc=float(sys.argv[7]) if len(sys.argv)>7 else 0.5
key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))
fr=sorted(glob.glob(d+'/frame-*.png'),key=key); rf=sorted(glob.glob(d+'/ref-*.png'),key=key)
rows=[]
for a,b in zip(fr,rf):
    t=key(a); A=cv2.imread(a)[y0:y1,x0:x1]; B=cv2.imread(b)[y0:y1,x0:x1]
    im=np.hstack([A,B]); im=cv2.resize(im,None,fx=sc,fy=sc); cv2.putText(im,f'{t:.2f}',(10,30),0,1,(0,255,0),2); rows.append(im)
for k in range(0,len(rows),per):
    cv2.imwrite(f'{d}/grp{k//per}.jpg', np.vstack(rows[k:k+per]))
print(len(rows))
