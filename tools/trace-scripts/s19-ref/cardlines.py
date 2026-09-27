import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
ts=[float(x) for x in sys.argv[1].split(',')]
tiles=[]; res={}
for t in ts:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    m=(cv2.GaussianBlur(g,(0,0),2)>185).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    i=1+np.argmax(st[1:,4]); m=((lab==i)*255).astype(np.uint8)
    e=cv2.Canny(m,50,150)
    L=cv2.HoughLines(e,1,np.pi/360,120)
    out=f.copy()
    lines=[]
    if L is not None:
        for rho,th in L[:,0,:]:
            if all(abs(rho-r2)>40 or abs(th-t2)>0.12 for r2,t2 in lines): lines.append((float(rho),float(th)))
            if len(lines)>=6: break
    for k,(rho,th) in enumerate(lines):
        a,b=np.cos(th),np.sin(th); x0,y0=a*rho,b*rho
        p1=(int(x0+3000*(-b)),int(y0+3000*a)); p2=(int(x0-3000*(-b)),int(y0-3000*a))
        cv2.line(out,p1,p2,[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0)][k],2)
        cv2.putText(out,str(k),(int(x0),int(y0)),0,1,(0,255,0),2)
    res[t]=lines
    cv2.putText(out,f'{t:.2f}',(20,40),0,1.2,(0,255,0),3)
    tiles.append(cv2.resize(out,None,fx=0.3,fy=0.3))
cols=3
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]))
json.dump(res,open(sys.argv[2]+'.json','w'))
for t,l in res.items(): print(t,[(round(r),round(np.degrees(th),1)) for r,th in l])
