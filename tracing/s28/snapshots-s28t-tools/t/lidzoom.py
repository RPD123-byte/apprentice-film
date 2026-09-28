import cv2,numpy as np,json,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
Q=json.load(open('snapshots/s28t-tools/t/lidquads.json'))
times=[float(x) for x in sys.argv[1].split(',')]; out=sys.argv[2]
Z=2; R=60
rows=[]
for t in times:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    q=np.array(Q[f"{t:.2f}"])
    # crop centres: TL, TR, left edge at y=880 (or BL), right edge at y=800 (or BR)
    def onedge(a,b,y):
        u=(y-a[1])/(b[1]-a[1]); return a+(b-a)*u
    cs=[q[0],q[1],onedge(q[0],q[3],min(q[3][1],900)),onedge(q[1],q[2],min(q[2][1],880))]
    tiles=[]
    for (cx,cy) in cs:
        cx,cy=int(round(cx/10)*10),int(round(cy/10)*10)
        x0,y0=cx-R,cy-R
        pad=cv2.copyMakeBorder(f,R,R,R,R,cv2.BORDER_CONSTANT,value=(40,40,40))
        cr=pad[y0+R:y0+3*R,x0+R:x0+3*R].copy()
        cr=cv2.resize(cr,None,fx=Z,fy=Z,interpolation=cv2.INTER_CUBIC)
        for k in range(0,2*R+1,10):
            col=(0,0,255) if (x0+k)%50==0 else (0,200,255)
            cv2.line(cr,(k*Z,0),(k*Z,2*R*Z),col,1)
            col=(0,0,255) if (y0+k)%50==0 else (0,200,255)
            cv2.line(cr,(0,k*Z),(2*R*Z,k*Z),col,1)
        cv2.putText(cr,f"x{x0}",(2,12),0,0.4,(255,255,0),1); cv2.putText(cr,f"y{y0}",(2,26),0,0.4,(255,255,0),1)
        tiles.append(cr)
    row=np.hstack(tiles); cv2.putText(row,f"{t:.2f}",(2,row.shape[0]-6),0,0.6,(255,255,255),2)
    rows.append(row)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
