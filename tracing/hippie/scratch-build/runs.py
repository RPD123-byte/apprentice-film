import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.2)
B,G,R=b[...,0],b[...,1],b[...,2]
mar=(R<125)&(G<60)&(B<70)&(R>50)
cre=(G>135)&(B>110)&(R-B<70)
pea=(R>150)&(G>85)&(G<135)&(B>45)&(B<80)&(R-G>50)
red=(R>150)&(G<65)&(B<40)
def runs(row, mask, x0,x1):
    m=mask[row,x0:x1]; out=[]; i=0
    while i<len(m):
        if m[i]:
            j=i
            while j<len(m) and m[j]: j+=1
            if j-i>=4: out.append((x0+i,x0+j-1))
            i=j
        else: i+=1
    return out
x0,x1=int(sys.argv[2]),int(sys.argv[3])
for y in range(int(sys.argv[4]),int(sys.argv[5]),int(sys.argv[6])):
    print(y,'M',runs(y,mar,x0,x1),'C',runs(y,cre,x0,x1),'P',runs(y,pea,x0,x1),'R',runs(y,red,x0,x1))
