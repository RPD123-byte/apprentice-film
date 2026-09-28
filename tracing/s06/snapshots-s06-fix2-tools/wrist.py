import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
pts=[(560,640),(561,655),(567,670),(579,685),(595,700),(613,715),(628,730),(645,745),(659,760),(674,775),(688,788)]
e5=[];mins=[]
for n in F:
    a=ren(d,n); b=src(n)
    m=np.zeros_like(a,np.uint8); cv2.polylines(m,[np.array(pts,np.int32)],False,1,14); m=m.astype(bool)
    e5.append(np.abs(cv2.GaussianBlur(a,(0,0),1.5)-cv2.GaussianBlur(b,(0,0),1.5))[m].mean())
    A=cv2.GaussianBlur(a,(0,0),0.7); mins.append([int(A[y-3:y+4,x-3:x+4].min()) for x,y in pts])
print('wrist band s1.5 %.2f'%np.mean(e5), 'mins', np.mean(mins,0).astype(int).tolist())
