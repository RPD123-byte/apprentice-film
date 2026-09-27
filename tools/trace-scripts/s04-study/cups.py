import cv2,numpy as np,glob,re,sys
d=sys.argv[1]
def cups(g):
    x0,y0=1400,200; roi=cv2.GaussianBlur(g[y0:720,x0:2206],(0,0),2)
    cs=cv2.HoughCircles(roi,cv2.HOUGH_GRADIENT,dp=1.2,minDist=80,param1=90,param2=40,minRadius=35,maxRadius=80)
    return [] if cs is None else [(int(x+x0),int(y+y0),int(r)) for x,y,r in cs[0][:3]]
vis=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f); b=cv2.imread(f.replace('frame-','ref-'))
    ca=cups(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)); cb=cups(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY))
    print(t,'render',ca,'source',cb)
    for im,cc in ((a,ca),(b,cb)):
        for i,(x,y,r) in enumerate(cc): cv2.circle(im,(x,y),r,(0,0,255) if i==0 else (0,255,255),3)
    vis.append(np.hstack([cv2.resize(a[150:800,1400:2206],(403,325)),cv2.resize(b[150:800,1400:2206],(403,325))]))
cv2.imwrite(d+'/cups.jpg',np.vstack(vis))
