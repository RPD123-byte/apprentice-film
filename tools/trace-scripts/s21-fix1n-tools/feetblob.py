import cv2, glob, re, numpy as np, sys
d='/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-h/out-'+sys.argv[1]+'/t/'
fs=sorted(glob.glob(d+'r-*.png'),key=lambda p:float(re.search(r'r-([\d.]+)-',p).group(1)))
def blobs(im,y0=850):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
    out=[]
    for (a,b,tag) in ((878,892,'P'),(860,878,'L')):
        m=(g[a-y0:b-y0]>125).astype(np.uint8)
        n,lab,st,cen=cv2.connectedComponentsWithStats(m)
        for k in range(1,n):
            x,y,w,h,ar=st[k]
            if ar<20 or x>=415: continue
            out.append(f"{tag}{cen[k][0]:.0f},{cen[k][1]+a:.0f}")
    return ' '.join(out)
for f in fs:
    t=float(re.search(r'r-([\d.]+)-',f).group(1))
    print(f"{t:.2f} R: {blobs(cv2.imread(f)):40s} S: {blobs(cv2.imread(f.replace('/r-','/s-')))}")
