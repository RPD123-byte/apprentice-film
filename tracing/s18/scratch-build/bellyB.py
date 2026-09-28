import cv2,numpy as np,glob,re,math
SP="/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad"
rp={}
for p in glob.glob('snapshots/s18-rev1-f[AB]/frame-*.png'):
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); rp[int(math.floor(25*math.floor(30*t+1e-6)/30+1e-6))]=p
def comp(p):
    g=cv2.GaussianBlur(cv2.imread(p,0),(0,0),4)
    m=(g>120).astype(np.uint8); m[330:,:]=0   # above key tops only
    k,lab,st,cen=cv2.connectedComponentsWithStats(m)
    # component touching top edge with largest area
    best=None
    for i in range(1,k):
        x,y,w,h,a=st[i]
        if y<=2 and (best is None or a>st[best][4]): best=i
    if best is None: return None
    mm=(lab==best)
    xs=list(range(700,1500,100)); low=[]
    for x in xs:
        ys=np.where(mm[:,x])[0]; low.append(int(ys.max()) if len(ys) else -1)
    x,y,w,h,a=st[best]
    return (x,x+w,y+h,a,low)
print("frame | src: x0 x1 ybot area lower-edge@x=700..1400 | render")
for n in range(1382,1421):
    a=comp(f"{SP}/src/f{n:04d}.png"); b=comp(rp[n])
    print(n,'S',a[:3],a[4],'| R',b[:3],b[4])
