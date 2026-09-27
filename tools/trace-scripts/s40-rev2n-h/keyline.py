import cv2, numpy as np
s=np.mean([cv2.imread(f'src/f{n}.png').astype(np.float32) for n in range(3440,3460)],0).mean(2)
r=np.mean([cv2.imread(f'all/r-{n/25:.3f}.png').astype(np.float32) for n in range(3440,3460)],0).mean(2)
s=cv2.GaussianBlur(s,(0,0),1); r=cv2.GaussianBlur(r,(0,0),1)
def firstdark(img,x,y0,y1,thr):
    col=img[y0:y1,x-1:x+2].mean(1)
    idx=np.where(col<thr)[0]
    return y0+idx[0] if len(idx) else None
print('cloud top keylines (first dark px below y0, scanning columns)')
for x in list(range(20,900,40))+list(range(1300,2206,40)):
    y0=500 if x<900 else 560
    # cloud keyline: find a dark run followed by light cloud (>180) within 12px
    def cl(img):
        col=img[y0:946,x-1:x+2].mean(1)
        for i in range(len(col)-12):
            if col[i]<110 and col[i+3:i+14].max()>185: return y0+i
        return None
    a=cl(s); b=cl(r)
    print(x, a, b, (b-a) if a and b else '')
