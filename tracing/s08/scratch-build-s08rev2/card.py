import cv2,numpy as np
R=cv2.imread('snapshots/s08-rev2-a/frame-01-at-30.6s.png').astype(float); S=cv2.imread('snapshots/s08-rev2-src/f765.png').astype(float)
g=lambda im: cv2.cvtColor(im.astype(np.float32),cv2.COLOR_BGR2GRAY)
lr,ls=g(R),g(S)
# card column profile: median luma over y 560-700 (empty text area interior) and y 220-300
for (ya,yb) in [(200,250),(560,700),(790,825)]:
    print('rows',ya,yb)
    for x in [1470,1520,1600,1680,1760,1800,1850,1880,1900]:
        print(f'  x{x}: r{np.median(lr[ya:yb,x-5:x+5]):.0f} s{np.median(ls[ya:yb,x-5:x+5]):.0f}',end='')
    print()
# card edges: find transitions along row y=600 from x 1400..1480 and 1880..1960
def edge(l,y,xa,xb):
    row=l[y-3:y+3,xa:xb].mean(0); d=np.diff(row); return xa+int(np.argmax(np.abs(d))), row.round(0)[::4]
for y in [300,600]:
    print('left edge y',y,edge(lr,y,1420,1480)[0],edge(ls,y,1420,1480)[0],' right edge',edge(lr,y,1880,1950)[0],edge(ls,y,1880,1950)[0])
for x in [1600,1750]:
    colr=lr[150:230,x-3:x+3].mean(1); cols=ls[150:230,x-3:x+3].mean(1)
    print('top edge x',x,150+np.argmax(np.abs(np.diff(colr))),150+np.argmax(np.abs(np.diff(cols))))
    colr=lr[790:870,x-3:x+3].mean(1); cols=ls[790:870,x-3:x+3].mean(1)
    print('bot edge x',x,790+np.argmax(np.abs(np.diff(colr))),790+np.argmax(np.abs(np.diff(cols))))
# smiley region colour
for nm,(x0,y0,x1,y1) in {'smiley':(1605,235,1665,285),'text':(1530,360,1700,395),'cancel':(1540,640,1640,670),'save':(1720,640,1800,670),'paper':(1600,450,1800,600)}.items():
    a=R[y0:y1,x0:x1].reshape(-1,3); b=S[y0:y1,x0:x1].reshape(-1,3)
    la=g(R)[y0:y1,x0:x1].ravel(); lb=g(S)[y0:y1,x0:x1].ravel()
    print(nm,'median BGR r',np.median(a,0).round(0),'s',np.median(b,0).round(0),'p2 luma r',np.percentile(la,2).round(0),'s',np.percentile(lb,2).round(0),'min',la.min().round(0),lb.min().round(0))
