# silhouette of the bright owl in source frame k (and optionally a render), IoU, contour polygon (approx) printed
import cv2, sys, numpy as np
root='/Users/computer/rootline/apprentice-film'
def mask(im, thr=150, op=15):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    m=(g>thr).astype(np.uint8)*255
    # close small dark keylines inside the bird first, then open to remove speed lines
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(op,op)))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    keep=np.zeros_like(m)
    for i in range(1,n):
        if st[i,4]>20000: keep[lab==i]=255
    return keep
if __name__=='__main__':
    k=int(sys.argv[1]); S=cv2.imread(root+'/snapshots/s24-rev1-src/f_%05d.png'%(k+20))
    ms=mask(S)
    if len(sys.argv)>2:
        R=cv2.imread(sys.argv[2]); mr=mask(R)
        inter=((ms>0)&(mr>0)).sum(); uni=((ms>0)|(mr>0)).sum()
        print('IoU %.3f  areaS %d areaR %d'%(inter/uni,(ms>0).sum(),(mr>0).sum()))
        ov=np.zeros_like(S); ov[...,1]=np.where((ms>0)&(mr==0),255,0); ov[...,2]=np.where((mr>0)&(ms==0),255,0)
        both=(ms>0)&(mr>0); ov[both]=(0,200,200)
        base=cv2.addWeighted(S,0.5,ov,0.5,0)
        for x in range(0,2206,100): cv2.line(base,(x,0),(x,946),(90,90,90),1); cv2.putText(base,str(x),(x+2,14),0,0.45,(255,255,0),1)
        for y in range(0,946,100): cv2.line(base,(0,y),(2206,y),(90,90,90),1); cv2.putText(base,str(y),(2,y-3),0,0.45,(255,255,0),1)
        cv2.imwrite(sys.argv[3] if len(sys.argv)>3 else '/tmp/ov.jpg',base,[cv2.IMWRITE_JPEG_QUALITY,85])
