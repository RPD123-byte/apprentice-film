# sheet.py out.jpg dir1 [dir2 ...] [--k k0 k1] [--w 700] : pairs render|source (true 25fps frame, via floor-30 rule)
import cv2, glob, re, sys, math, numpy as np
a=sys.argv[1:]; out=a[0]; dirs=[]; k0,k1=-99,999; w=700; crop=None
i=1
while i<len(a):
    if a[i]=='--k': k0,k1=int(a[i+1]),int(a[i+2]); i+=3
    elif a[i]=='--w': w=int(a[i+1]); i+=2
    elif a[i]=='--crop': crop=list(map(int,a[i+1:i+5])); i+=5
    else: dirs.append(a[i]); i+=1
items=[]
for d in dirs:
    for p in glob.glob(d+'/frame-*.png'):
        T=float(re.search(r'at-([\d.]+)s',p).group(1))
        g=math.floor(T*30+1e-6)/30 if abs(T*30-round(T*30))>1e-3 else round(T*30)/30
        k=math.floor((g-96.8)/0.04+0.5)
        items.append((k,T,p))
items=sorted(set(items))
seen=set(); rows=[]
for k,T,p in items:
    if k in seen or not(k0<=k<=k1): continue
    seen.add(k)
    r=cv2.imread(p); s=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s24-rev1-src/f_%05d.png'%(k+20))
    if crop: x0,y0,x1,y1=crop; r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
    h=int(r.shape[0]*w/r.shape[1])
    r=cv2.resize(r,(w,h),interpolation=cv2.INTER_AREA); s=cv2.resize(s,(w,h),interpolation=cv2.INTER_AREA)
    cv2.putText(r,'R k%d t=%.2f'%(k,96.8+0.04*k),(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)
    cv2.putText(s,'S k%d'%k,(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)
    rows.append(np.hstack([r,np.full((h,4,3),(0,0,200),np.uint8),s]))
sheet=np.vstack([np.vstack([x,np.full((4,x.shape[1],3),40,np.uint8)]) for x in rows])
cv2.imwrite(out,sheet,[cv2.IMWRITE_JPEG_QUALITY,85]); print(out,len(rows),sheet.shape)
