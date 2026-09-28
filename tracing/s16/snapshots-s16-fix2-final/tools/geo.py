# geo.py n x0 y0 x1 y1 scale out : source crop with owl geometry overlaid
import sys, json, cv2, numpy as np, h16, math
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]
D=json.load(open('../../s16-fix2-w/owl.json'))[str(n)]
im=h16.src(n)[y0:y1,x0:x1]; im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
def P(r): return (np.array(r,np.float32).reshape(-1,2)-[x0,y0])*s
def poly(r,col,th=1): cv2.polylines(im,[P(r).astype(np.int32)],True,col,th,cv2.LINE_AA)
for r in D['sil']: poly(r,(0,255,0))
HP=D.get('HP')
if HP:
    for r in HP['rings']: poly(r,(0,0,255))
    for r in HP.get('band',[]): poly(r,(255,0,255))
    for c in HP['cups']:
        cx,cy,a,b,deg=c[:5]
        cv2.ellipse(im,(int((cx-x0)*s),int((cy-y0)*s)),(int(a*s),int(b*s)),deg,0,360,(0,200,255) if c[10] else (255,200,0),1,cv2.LINE_AA)
        cv2.line(im,(int((cx-x0)*s),int((cy-y0)*s)),(int((cx-x0+c[5]*20)*s),int((cy-y0+c[6]*20)*s)),(255,255,0),1)
cv2.imwrite(out,im)
