# pairs.py outdir [offset=23.12] : pair proj frames (frame-NN-at-Ps.png, film t = offset + P) with the source frame the
# shot holds (k = ceil(t*25)), write pair-*.jpg (render | source) and print blurred-luminance MAE
import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d=sys.argv[1]; off=float(sys.argv[2]) if len(sys.argv)>2 else 23.12
k_=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
scr=np.zeros((946,2206),np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); ns=cv2.dilate(scr,np.ones((9,9)))==0
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    P=float(re.search(r'at-([\d.]+)s',f).group(1)); P=math.floor(P*30+1e-6)/30; t=off+P; k=math.ceil(t*25-1e-6)   # (the snapshot tool seeks floor(P*30)/30; s05 holds ceil to 25 fps)
    a=cv2.imread(f).astype(np.float32)/255; b=frames.frame(k)
    A,B=a.mean(2),b.mean(2)
    e=[float(np.abs(k_(A,s)-k_(B,s)).mean()*255) for s in (1,2,4)]
    en=[float(np.abs(k_(A,s)-k_(B,s))[ns].mean()*255) for s in (2,)]
    rows.append((t,k,e,en,A.mean()*255,B.mean()*255))
    print(f't {t:.2f} k {k} ({k/25:.2f}) MAE s1 {e[0]:.2f} s2 {e[1]:.2f} s4 {e[2]:.2f} | noscreen s2 {en[0]:.2f} | mean {A.mean()*255:.1f}/{B.mean()*255:.1f}')
    pr=np.hstack([a,np.ones((946,8,3)),b]); pr=cv2.resize((pr*255).astype(np.uint8),None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{d}/pair-{t:.2f}.jpg',pr,[cv2.IMWRITE_JPEG_QUALITY,88])
