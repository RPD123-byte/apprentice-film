# geo2.py n x0 y0 x1 y1 scale out : source crop with band strips (magenta) and hl strokes (cyan, width), C (yellow)
import sys, json, cv2, numpy as np, h16
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]
D=json.load(open('../../s16-fix2-w/owl.json'))[str(n)]
im=h16.src(n)[y0:y1,x0:x1]; im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
def P(r): return (np.array(r,np.float32).reshape(-1,2)-[x0,y0])*s
HP=D.get('HP') or {}
for r in HP.get('band',[]): cv2.polylines(im,[P(r).astype(np.int32)],True,(255,0,255),1,cv2.LINE_AA)
for st in HP.get('hl',[]):
    a=np.array(st).reshape(-1,4); q=((a[:,:2]-[x0,y0])*s).astype(np.int32)
    cv2.polylines(im,[q],False,(255,255,0),1,cv2.LINE_AA)
    print('hl w',a[:,2].round(1).tolist()[:6],'v',a[:,3].round(2).tolist()[:6])
for st in D.get('C',[]):
    a=np.array(st).reshape(-1,4); q=((a[:,:2]-[x0,y0])*s).astype(np.int32)
    cv2.polylines(im,[q],False,(0,255,255),1,cv2.LINE_AA)
cv2.imwrite(out,im)
