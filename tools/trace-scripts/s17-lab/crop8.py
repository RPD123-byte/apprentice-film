# crop8.py DIR T1,T2 x0,y0,x1,y1 K OUT [grid]: render | source crops with a page-px grid
import cv2, numpy as np, sys
d=sys.argv[1]; ts=[float(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=map(int,sys.argv[3].split(',')); k=int(sys.argv[4]); out=sys.argv[5]
gs=int(sys.argv[6]) if len(sys.argv)>6 else 10
def up(a):
    a=cv2.resize(a,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//gs+1)*gs,x1,gs):
        X=(x-x0)*k; cv2.line(a,(X,0),(X,a.shape[0]),(0,110,230),1); cv2.putText(a,str(x),(X+2,11),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,200,255),1)
    for y in range((y0//gs+1)*gs,y1,gs):
        Y=(y-y0)*k; cv2.line(a,(0,Y),(a.shape[1],Y),(0,110,230),1); cv2.putText(a,str(y),(2,Y+11),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,200,255),1)
    return a
rows=[]
for t in ts:
    r=cv2.imread(f'{d}/r-{t:.2f}.png'); s=cv2.imread(f'{d}/s-{t:.2f}.png')
    a=up(r[y0:y1,x0:x1]); b=up(s[y0:y1,x0:x1])
    row=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b]); cv2.putText(row,f'{t:.2f}',(a.shape[1]-70,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,0),2)
    rows.append(row); rows.append(np.full((4,row.shape[1],3),(0,0,255),np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
