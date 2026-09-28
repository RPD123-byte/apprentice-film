import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22')
from common import *
import trace as TR, json, glob, re
T=json.load(open(S+'/edge_trace2.json'))
img,a=TR.render(T,blur=0.7)
d=sys.argv[1]
cups={75.0:(0,(773,80)),76.0:(0,(1525.7,80.6)),76.8:(1,(2079,128.2)),77.2:(1,(2081.7,220.7)),77.4:(1,(2082,283.5)),78.0:(2,(1460.5,464.9)),78.4:(2,(1122.1,464.9)),79.2:(2,(381.2,465.5)),79.6:(3,(88.2,336.9))}
R=[np.array([[1,0],[0,1]]),np.array([[0,-1],[1,0]]),np.array([[-1,0],[0,-1]]),np.array([[0,1],[-1,0]])]
yy,xx=np.mgrid[0:946,0:2206]
for t,(side,c) in cups.items():
    fs=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-t)<1e-3]
    if not fs: continue
    fa=cv2.imread(fs[0]).astype(np.float32).mean(2); fb=cv2.imread(fs[0].replace('frame-','ref-')).astype(np.float32).mean(2)
    Rm=R[side]; o=np.array([-115,-60])
    M=np.zeros((2,3),np.float32); M[:,:2]=Rm; M[:,2]=np.array(c)+Rm@o
    af=cv2.warpAffine(a.astype(np.float32),M,(2206,946)); vf=cv2.warpAffine(img.astype(np.float32),M,(2206,946))
    m=cv2.erode((af>0.98).astype(np.uint8),np.ones((5,5)))>0
    ins=m&(yy>135)&(xx>150)&(xx<2015); outs=m&~ins
    out=[]
    for lo,hi in [(0.0,0.45),(0.45,0.7),(0.7,0.85),(0.85,0.95),(0.95,1.01)]:
        mm=outs&(vf>=lo)&(vf<hi)
        if mm.sum()>40: out.append('%.2f-%.2f:%+.0f'%(lo,hi,fb[mm].mean()-fa[mm].mean()))
    ring=(cv2.dilate(m.astype(np.uint8),np.ones((25,25)))>0)&~(cv2.dilate(m.astype(np.uint8),np.ones((9,9)))>0)&~((yy>135)&(xx>150)&(xx<2015))
    print('%.1f s%d outside-owl bins src-ren: '%(t,side)+' '.join(out),'| inside %+.1f | halo ring %+.1f'%((fb[ins]-fa[ins]).mean() if ins.sum() else 0,(fb[ring]-fa[ring]).mean() if ring.sum() else 0))
