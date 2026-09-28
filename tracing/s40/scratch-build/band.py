# Measure band cross-sections perpendicular to a rough centreline.
import cv2, numpy as np, sys, json
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.0)
def cls(p):
    B,G,R=p
    if (R<150 and G<80) or (R<180 and G<75 and B>45 and B>G*0.6): return 'M'
    if G>130 and B>100 and R-B<80: return 'C'
    if R>130 and G<68 and B<45: return 'R'
    if R>130 and G>=68 and B>=45 and R-G>40: return 'P'
    return 'o'
def sample(x,y):
    if 0<=x<2205 and 0<=y<945:
        return cls(b[int(round(y)),int(round(x))])
    return '_'
def measure(pts,L=160,per=1):
    pts=np.array(pts,float); out=[]
    for i in range(len(pts)):
        a=pts[max(0,i-1)]; c=pts[min(len(pts)-1,i+1)]
        d=c-a; d/=np.linalg.norm(d); n=np.array([-d[1],d[0]])
        seq=[sample(*(pts[i]+n*t)) for t in range(-L,L+1)]
        s=''.join(seq)
        out.append((pts[i],n,s))
    return out
def rle(s,L):
    o=[];j=0
    while j<len(s):
        k=j
        while k<len(s) and s[k]==s[j]: k+=1
        o.append((s[j],j-L,k-L)); j=k
    return o
if __name__=='__main__':
    pts=json.loads(sys.argv[1]); L=int(sys.argv[2])
    for p,n,s in measure(pts,L):
        runs=[r for r in rle(s,L) if r[2]-r[1]>=3 or r[0] in 'M']
        print('(%d,%d) n(%.2f,%.2f)'%(p[0],p[1],n[0],n[1]),' '.join('%s[%d,%d]'%r for r in runs))
