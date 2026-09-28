import cv2, numpy as np, sys
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
# regions in plate coords
R={'top':(900,312,1250,322),'keys':(1000,350,1180,395),'right':(1262,340,1300,420),'left':(845,440,1000,500),'pad':(1015,455,1060,500),'front':(860,505,1000,518)}
def meas(img_or_t):
    out={}
    for k,(x0,y0,x1,y1) in R.items():
        g=cv2.cvtColor(plate_frame(img_or_t,x0,y0,x1,y1,1) if not isinstance(img_or_t,str) else plate_frame(float(img_or_t.split('@')[1]),x0,y0,x1,y1,1,cv2.imread(img_or_t.split('@')[0])),cv2.COLOR_BGR2GRAY)
        out[k]=np.median(g) if k=='keys' else g.mean()
    return out
if len(sys.argv)>1:
    for a in sys.argv[1:]:
        m=meas(a); print(a.split('@')[1], ' '.join(f"{k}={v:5.1f}" for k,v in m.items()))
else:
    for n in range(0,115,1):
        m=meas(n/25); print(f"{n/25:.2f}", ' '.join(f"{k}={v:5.1f}" for k,v in m.items()))
