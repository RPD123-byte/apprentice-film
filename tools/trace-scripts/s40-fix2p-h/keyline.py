import cv2, numpy as np, sys
s=np.load('smean138.npy').mean(2); r=np.load(sys.argv[1]).mean(2)
s=cv2.GaussianBlur(s,(0,0),1); r=cv2.GaussianBlur(r,(0,0),1)
step=int(sys.argv[2]) if len(sys.argv)>2 else 20
out=[]
for x in list(range(10,900,step))+list(range(1300,2206,step)):
    y0=500 if x<900 else 560
    def cl(img):
        col=img[y0:946,x-1:x+2].mean(1)
        for i in range(len(col)-12):
            if col[i]<110 and col[i+3:i+14].max()>185: return y0+i
        return None
    a=cl(s); b=cl(r)
    out.append((x,a,b,(b-a) if a and b else None))
print(' '.join(f'{x}:{d:+d}' if d is not None else f'{x}:?' for x,a,b,d in out))
print('abs mean',np.mean([abs(d) for *_,d in out if d is not None]).round(2))
