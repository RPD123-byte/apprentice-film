import cv2,numpy as np,sys
f,r=sys.argv[1],sys.argv[2]
x0,y0,x1,y1=map(int,sys.argv[3:7]); step=int(sys.argv[7]) if len(sys.argv)>7 else 10
A=cv2.GaussianBlur(cv2.imread(f,0),(0,0),1.2); B=cv2.GaussianBlur(cv2.imread(r,0),(0,0),1.2)
def runs(col,th=80):
    # list of dark runs (y start,end)
    d=col<th; out=[];s=None
    for i,v in enumerate(d):
        if v and s is None: s=i
        if not v and s is not None:
            if i-s>=2: out.append((s+y0,i-1+y0))
            s=None
    if s is not None: out.append((s+y0,len(d)-1+y0))
    return out
for x in range(x0,x1,step):
    print(x,'R',runs(A[y0:y1,x]),' S',runs(B[y0:y1,x]))
