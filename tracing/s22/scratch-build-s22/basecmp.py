import cv2,glob,re,numpy as np,sys
def load(d):
    out={}
    for f in glob.glob(d+'/frame-*.png'):
        t=round(float(re.search(r'at-([\d.]+)s',f).group(1)),2)
        r=f.replace('frame-','ref-')
        A=cv2.imread(f,0); B=cv2.imread(r,0)
        if A is None or B is None: continue
        out[t]=(A.astype(np.float32),B.astype(np.float32))
    return out
base=load('/Users/computer/rootline/apprentice-film/snapshots/s22-p3-base'); fin=load(sys.argv[1])
# owl boxes (frame px) per time: where the owl is in the source
box={74.6:(380,20,720,200),75.0:(650,20,1000,200),76.0:(1400,20,1760,200),76.8:(1890,40,2206,420),77.2:(1890,40,2206,480),78.4:(880,330,1300,560),79.4:(0,180,260,560),79.6:(0,150,260,520),
     79.8:(0,0,300,300),80.0:(150,0,420,180),80.4:(190,0,450,180),81.0:(200,20,420,200),81.4:(150,40,410,210),82.0:(560,20,820,190),82.4:(780,20,1060,190),83.2:(1230,20,1510,190),83.8:(1380,20,1690,190),84.0:(1420,40,1720,240)}
rows=[]
for t in sorted(box):
    if t not in base or t not in fin: continue
    x0,y0,x1,y1=box[t]
    def m(ab,s):
        a,b=ab; return np.abs(cv2.GaussianBlur(a,(0,0),s)-cv2.GaussianBlur(b,(0,0),s))[y0:y1,x0:x1].mean()
    def whole(ab):
        a,b=ab; return np.abs(cv2.GaussianBlur(a,(0,0),6)-cv2.GaussianBlur(b,(0,0),6)).mean()
    def hdr(ab):
        a,b=ab; return np.abs(cv2.GaussianBlur(a,(0,0),6)-cv2.GaussianBlur(b,(0,0),6))[0:370,:].mean()
    rows.append((t,m(base[t],3),m(fin[t],3),m(base[t],1.5),m(fin[t],1.5),whole(base[t]),whole(fin[t]),hdr(base[t]),hdr(fin[t])))
print('   t   owl σ3 base→final | owl σ1.5 base→final | frame σ6 base→final | top 370 rows σ6 base→final')
for r in rows: print('%6.2f   %5.1f → %5.1f   |   %5.1f → %5.1f   |   %5.2f → %5.2f   |   %5.2f → %5.2f'%r)
R=np.array(rows)[:,1:]; print('mean    %5.1f → %5.1f   |   %5.1f → %5.1f   |   %5.2f → %5.2f   |   %5.2f → %5.2f'%tuple(R.mean(0)))
