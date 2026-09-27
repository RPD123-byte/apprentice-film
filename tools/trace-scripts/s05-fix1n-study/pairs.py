# pairs.py OUTDIR [u] : pair frames rendered by rend.sh with the source frame k; print blurred MAE; write pair-k.jpg
import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d=sys.argv[1]; U=len(sys.argv)>2 and sys.argv[2]=='u'
k_=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
scr=np.zeros((946,2206),np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); ns=cv2.dilate(scr,np.ones((9,9)))==0
res=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    P=float(re.search(r'at-([\d.]+)s',f).group(1)); n=math.floor((P-(10 if U else 0))*30+1e-6); k=578+n
    a=cv2.imread(f).astype(np.float32)/255; b=frames.pre(k) if U else frames.frame(k)
    A,B=a.mean(2),b.mean(2)
    e=[float(np.abs(k_(A,s)-k_(B,s)).mean()*255) for s in (1,2,4)]
    en=float(np.abs(k_(A,2)-k_(B,2))[ns].mean()*255)
    res.append((k,e[1]))
    print(f'k {k} ({k/25:.2f}) s1 {e[0]:.2f} s2 {e[1]:.2f} s4 {e[2]:.2f} | noscr s2 {en:.2f} | mean {A.mean()*255:.1f}/{B.mean()*255:.1f}')
    pr=np.hstack([a,np.ones((946,8,3)),b]); pr=cv2.resize((pr*255).astype(np.uint8),None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{d}/pair-{k}.jpg',pr,[cv2.IMWRITE_JPEG_QUALITY,88])
if res: print('mean s2', np.mean([r[1] for r in res]))
