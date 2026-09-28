# trial: pale toe centre-lines inside expanded feet boxes
import sys, json, cv2, numpy as np, h16
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s16/trace')
import tr
D=json.load(open('../../s16-fix2-w/owl.json')); FB=json.load(open('../../s16-fix2-w/feetbox.json'))
def feet(n):
    d=D[str(n)]; x0,y0,x1,y1=d['box']
    bs=[b for b in FB[str(n)] if b[0] > x0+0.45*(x1-x0)]
    return [[b[0]-14,b[1]-40,b[2]+14,b[3]+4] for b in bs]
out={}; tiles=[]
for n in map(int,sys.argv[1:]):
    P=h16.pre(n); Y=cv2.GaussianBlur(P,(0,0),0.7)
    d=D[str(n)]
    sm=np.zeros(P.shape,np.uint8)
    for r in d['sil']: cv2.fillPoly(sm,[np.array(r,np.float32).reshape(-1,2).round().astype(np.int32)],1)
    sm=cv2.erode(sm,np.ones((3,3),np.uint8))
    out[n]=[]
    for bx in feet(n):
        m=np.zeros(P.shape,bool); m[bx[1]:bx[3],bx[0]:bx[2]]=True; m&=sm>0
        S=tr.strokes(Y,np.zeros_like(Y),m,polarity='bright',sigmas=(1.8,2.6),hi=0.06,lo=0.03,minlen=6,dmin=0.4,maxw=10,valley=0.06,smooth=5)
        out[n].append({'box':bx,'S':S})
        im=cv2.resize(h16.src(n)[bx[1]-10:bx[3]+10,bx[0]-10:bx[2]+10],None,fx=5,fy=5,interpolation=cv2.INTER_CUBIC)
        for s in S:
            a=np.array(s); q=((a[:,:2]-[bx[0]-10,bx[1]-10])*5).astype(np.int32)
            cv2.polylines(im,[q],False,(0,0,255),2)
        cv2.putText(im,str(n),(5,20),0,0.6,(255,0,255),2)
        tiles.append(im)
H=max(t.shape[0] for t in tiles); tiles=[np.pad(t,((0,H-t.shape[0]),(0,4),(0,0))) for t in tiles]
cv2.imwrite('../../s16-fix2-w/toes.jpg',np.hstack(tiles))
json.dump(out,open('../../s16-fix2-w/toes.json','w'))
