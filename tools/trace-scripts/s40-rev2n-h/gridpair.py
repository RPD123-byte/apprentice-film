import cv2, numpy as np, sys
a=np.load(sys.argv[1]); b=np.load(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=int(sys.argv[7]); out=sys.argv[8]; st=int(sys.argv[9]) if len(sys.argv)>9 else 10
def g(im):
    c=np.clip(im[y0:y1,x0:x1,::-1],0,255).astype(np.uint8); c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//st+1)*st,x1,st):
        X=(x-x0)*sc; cv2.line(c,(X,0),(X,c.shape[0]),(0,255,0) if x%50 else (255,255,0),1)
        if x%(st*2)==0: cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,0),1)
    for y in range((y0//st+1)*st,y1,st):
        Y=(y-y0)*sc; cv2.line(c,(0,Y),(c.shape[1],Y),(0,255,0) if y%50 else (255,255,0),1)
        if y%(st*2)==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,0),1)
    return c
A=g(a);B=g(b); cv2.imwrite(out,np.hstack([A,np.full((A.shape[0],6,3),255,np.uint8),B]),[cv2.IMWRITE_JPEG_QUALITY,92])
