import numpy as np, cv2
def gridcrop(img,x0,y0,x1,y1,step=20,lab=100,sc=1.5,col=(0,255,255)):
    c=(np.clip(img,0,1)*255).astype(np.uint8)[y0:y1,x0:x1].copy() if img.dtype!=np.uint8 else img[y0:y1,x0:x1].copy()
    c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_LINEAR)
    for y in range(y0 - y0%step + step, y1, step):
        yy=int((y-y0)*sc); cv2.line(c,(0,yy),(12 if y%lab else 30,yy),col,1)
        if y%lab==0: cv2.putText(c,str(y),(32,yy+5),0,0.45,col,1)
    for x in range(x0 - x0%step + step, x1, step):
        xx=int((x-x0)*sc); cv2.line(c,(xx,0),(xx,12 if x%lab else 30),col,1)
        if x%lab==0: cv2.putText(c,str(x),(xx+2,44),0,0.45,col,1)
    return c
