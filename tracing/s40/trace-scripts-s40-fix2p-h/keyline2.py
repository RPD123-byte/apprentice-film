import cv2, numpy as np, sys
s=cv2.GaussianBlur(np.load('smean138.npy').mean(2),(0,0),1); r=cv2.GaussianBlur(np.load(sys.argv[1]).mean(2),(0,0),1)
step=int(sys.argv[2]) if len(sys.argv)>2 else 10
def kl(img,x,y0):
    col=img[:,x-1:x+2].mean(1)
    for y in range(y0,930):
        if col[y:y+20].min()>172 and col[y-12:y].min()<120:
            yy=y-12+int(np.argmin(col[y-12:y])); return yy
    return None
res=[]
for x in list(range(10,900,step))+list(range(1300,2206,step)):
    y0=500 if x<900 else 560
    a=kl(s,x,y0); b=kl(r,x,y0)
    res.append((x,a,b))
print(' '.join(f'{x}:{b-a:+d}' if a and b else f'{x}:?' for x,a,b in res))
d=[b-a for x,a,b in res if a and b and abs(b-a)<30]
print('n',len(d),'abs mean',np.mean(np.abs(d)).round(2))
import json; json.dump(res,open('kl_'+sys.argv[1].replace('.npy','')+'.json','w'))
