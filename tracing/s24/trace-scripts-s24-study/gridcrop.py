import cv2,sys
def gridcrop(k,x0,y0,x1,y1,out,step=50,scale=1.0):
    f=cv2.imread('snapshots/s24-study/fr/f%03d.png'%k)[y0:y1,x0:x1].copy()
    for x in range((x0//step+1)*step,x1,step):
        cv2.line(f,(x-x0,0),(x-x0,y1-y0),(0,0,255) if x%500==0 else ((0,200,255) if x%100==0 else (0,100,160)),1)
        if x%100==0: cv2.putText(f,str(x),(x-x0+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//step+1)*step,y1,step):
        cv2.line(f,(0,y-y0),(x1-x0,y-y0),(0,0,255) if y%500==0 else ((0,200,255) if y%100==0 else (0,100,160)),1)
        if y%100==0: cv2.putText(f,str(y),(2,y-y0-2),0,0.4,(0,255,255),1)
    if scale!=1: f=cv2.resize(f,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(out,f)
a=sys.argv[1:]
gridcrop(int(a[0]),*[int(v) for v in a[1:5]],a[5],scale=float(a[6]) if len(a)>6 else 1.0)
