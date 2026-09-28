import cv2, numpy as np, re, itertools
src=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
g=cv2.GaussianBlur(src,(0,0),0.8).mean(-1)
X0,Y0,X1,Y1=500,280,1500,640
darkS=(g<75)[Y0:Y1,X0:X1]
txt=open('/Users/computer/rootline/apprentice-film/src/shots/s40/glyphs.js').read()
letters=[]
for line in txt.splitlines():
    m=re.match(r'\s+(\w+): \[(.*)\],$',line)
    if not m: continue
    cs=[np.array([int(x) for x in c.split(',')]).reshape(-1,2) for c in re.findall(r'\[([\d,]+)\]',m.group(2))]
    letters.append(cs)
def render(E,kw=5.5,bw=10):
    Hh,Ww=Y1-Y0,X1-X0
    lab=np.zeros((Hh,Ww),np.uint8)  # 0 bg,1 dark,2 L2,3 L1,4 face
    off=np.array([X0,Y0])
    def poly(cs,dx,dy):
        return [np.round((c+[dx,dy]-off)).astype(np.int32) for c in cs]
    for cs in letters:
        for (ex,ey,val) in E:
            n=max(2,int(np.hypot(ex,ey)/1.5))
            m=np.zeros_like(lab)
            for s in range(1,n+1):
                p=poly(cs,ex*s/n,ey*s/n)
                cv2.polylines(m,p,True,1,int(round(bw)))
            fill=np.zeros_like(lab)
            for s in range(1,n+1):
                cv2.fillPoly(fill,poly(cs,ex*s/n,ey*s/n),1)
            lab[m>0]=1
            lab[fill>0]=val
        f=np.zeros_like(lab); cv2.fillPoly(f,poly(cs,0,0),1)
        lab[f>0]=4
        k=np.zeros_like(lab); cv2.polylines(k,poly(cs,0,0),True,1,int(round(kw)))
        lab[k>0]=1
    return lab
def score(E):
    lab=render(E)
    d=lab==1
    inter=(d&darkS).sum(); uni=(d|darkS).sum()
    return inter/uni
E=[[38,55,1],[30,45,2],[16,25,3]]
print('start',score(E))
for it in range(2):
    for bi in range(3):
        best=(score(E),E[bi][0],E[bi][1])
        for dx in range(E[bi][0]-8,E[bi][0]+9,2):
            for dy in range(E[bi][1]-6,E[bi][1]+7,2):
                E2=[list(e) for e in E]; E2[bi][0]=dx; E2[bi][1]=dy
                s=score(E2)
                if s>best[0]: best=(s,dx,dy)
        E[bi][0],E[bi][1]=best[1],best[2]
        print('iter',it,'band',bi,'->',E[bi][:2],'IoU %.4f'%best[0])
