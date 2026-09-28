import cv2, numpy as np, sys, json
f=cv2.imread(sys.argv[1]).astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.0)
spine=json.loads(sys.argv[2]); L=int(sys.argv[3]) if len(sys.argv)>3 else 200
def cls(p):
    B,G,R=p
    if R<130 and G<70: return 'M'   # maroon/keyline
    if G>135 and B>105 and R-B<75: return 'C'
    if R>140 and G<70 and B<45: return 'R'
    if R>140 and G>=70 and B>=48 and R-G>45: return 'P'
    return 'o'
sp=np.array(spine,float)
for i in range(1,len(sp)-1):
    d=sp[i+1]-sp[i-1]; d/=np.linalg.norm(d); n=np.array([-d[1],d[0]])
    seq=[]
    for t in range(-L,L+1):
        x,y=sp[i]+n*t
        if 0<=x<b.shape[1]-1 and 0<=y<b.shape[0]-1: seq.append(cls(b[int(round(y)),int(round(x))]))
        else: seq.append('_')
    # RLE
    out=[];j=0
    while j<len(seq):
        k=j
        while k<len(seq) and seq[k]==seq[j]: k+=1
        if k-j>=3 or seq[j] in 'MC': out.append('%s%d@%d'%(seq[j],k-j,j-L))
        j=k
    print(tuple(sp[i].astype(int)),' '.join(out))
