import cv2, numpy as np, glob
d='snapshots/s40-rev2c-a'
a=cv2.imread(glob.glob(d+'/frame-09-*.png')[0]).astype(np.float32); b=cv2.imread(glob.glob(d+'/ref-09-*.png')[0]).astype(np.float32)
def tops(im):
    hsv=cv2.cvtColor(im.astype(np.uint8),cv2.COLOR_BGR2HSV)
    cream=(hsv[...,1]<90)&(hsv[...,2]>150)
    out={}
    for x in list(range(0,760,20))+list(range(1380,2206,20)):
        col=cream[480:,x]
        # first run of >=6 cream px
        ys=np.where(col)[0]
        y=None
        for yy in ys:
            if col[yy:yy+6].all(): y=yy+480; break
        out[x]=y
    return out
ta,tb=tops(a),tops(b)
for x in ta: 
    if ta[x] is None or tb[x] is None: print(x,ta[x],tb[x]); continue
    dd=ta[x]-tb[x]
    print(x,ta[x],tb[x],dd,'<<<' if abs(dd)>4 else '')
