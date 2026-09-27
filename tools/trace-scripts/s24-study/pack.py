import cv2,numpy as np,glob,re,sys,math
d=sys.argv[1]; shift=int(sys.argv[2]) if len(sys.argv)>2 else 0
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    K=math.ceil(t*25-1e-6)-2420+shift
    r=cv2.resize(cv2.imread(p),(552,237),interpolation=cv2.INTER_AREA)
    s=cv2.resize(cv2.imread('snapshots/s24-study/fr/f%03d.png'%K),(552,237),interpolation=cv2.INTER_AREA)
    row=np.hstack([r,np.zeros((237,6,3),np.uint8),s]); cv2.putText(row,'%.3f k%d'%(t,K),(5,20),0,0.6,(0,255,255),2); rows.append(row)
half=(len(rows)+1)//2
a=np.vstack(rows[:half]); b=np.vstack(rows[half:]+[np.zeros_like(rows[0])]*(half-len(rows[half:])))
cv2.imwrite(d+'/all.jpg',np.hstack([a,np.zeros((a.shape[0],12,3),np.uint8),b]))
