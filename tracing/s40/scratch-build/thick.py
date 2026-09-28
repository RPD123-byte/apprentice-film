import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.2)
B,G,R=b[...,0],b[...,1],b[...,2]
mar=((R<125)&(G<60)&(B<70)&(R>50)).astype(np.uint8)
cre=((G>135)&(B>110)&(R-B<70)).astype(np.uint8)
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]
for name,m in [('maroon',mar),('cream',cre)]:
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    dt=cv2.distanceTransform(m,cv2.DIST_L2,5)
    # for rows in steps, report max DT within each run in the crop
    print(name)
    for y in range(y0,y1,20):
        row=dt[y,x0:x1]; mm=m[y,x0:x1]
        i=0; out=[]
        while i<len(mm):
            if mm[i]:
                j=i
                while j<len(mm) and mm[j]: j+=1
                if j-i>=4:
                    # local max DT around this run within +-30 rows
                    sub=dt[max(0,y-30):y+30, x0+i:x0+j]
                    out.append((x0+i,x0+j-1, round(2*float(dt[max(0,y-40):y+40, x0+i:x0+j].max()),1)))
                i=j
            else: i+=1
        print(' ',y,out)
