import re, numpy as np, cv2, glob
src=open('/Users/computer/rootline/apprentice-film/src/shots/s08.js').read()
blk=src[src.index('const CAM = ['):src.index('];',src.index('const CAM = ['))]
CAM=[list(map(float,m.groups())) for m in re.finditer(r'\[([\d.\-]+), ([\d.\-]+), ([\d.\-]+), ([\d.\-]+), ([\d.\-]+)\]',blk)]
def cam(u):
    if u<=0: return CAM[0]
    for i in range(1,len(CAM)):
        if u<=CAM[i][0]+1e-9:
            a,b=CAM[i-1],CAM[i]; f=(u-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*f for k in range(5)]
    return CAM[-1]
def M(n):
    u,s,tx,ty,rot=cam((n-764)/25); r=np.deg2rad(rot)
    return np.array([[s*np.cos(r),-s*np.sin(r),tx],[s*np.sin(r),s*np.cos(r),ty]])
def toF0(img,n):
    return cv2.warpAffine(img,M(n),(img.shape[1],img.shape[0]),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
D='/Users/computer/rootline/apprentice-film/snapshots/'
def render(n):
    if n==764: return cv2.imread(D+'s08-rev2n-tools/out/r764.png')
    t=round(30.56+(n-764)*0.04,2)
    fs=glob.glob(D+f's08-rev2n-motion/frame-*-at-{t:g}s.png')
    return cv2.imread(fs[0])
def source(n): return cv2.imread(D+f's08-rev2n-tools/src/f{n}.png')
