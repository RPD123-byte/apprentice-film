# overlay traced shapes from src/shots/s05/trace.js on the source frame (measuring aid only)
# usage: overlay.py T x0 y0 x1 y1 Z out.jpg [NAME ...]   (no names = all)
import cv2, numpy as np, re, sys, json
src=open('/Users/computer/rootline/apprentice-film/src/shots/s05/trace.js').read()
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; Z=float(sys.argv[6]); out=sys.argv[7]; names=sys.argv[8:]
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read()
f=cv2.resize(f[y0:y1,x0:x1],None,fx=Z,fy=Z,interpolation=cv2.INTER_CUBIC)
def cr(P,closed,per=6):
    P=np.array(P,float); n=len(P); out=[]
    last=n if closed else n-1
    for i in range(last):
        g=lambda k: P[k%n] if closed else P[max(0,min(n-1,k))]
        p0,p1,p2,p3=g(i-1),g(i),g(i+1),g(i+2)
        for j in range(per):
            u=j/per; out.append(0.5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3))
    out.append(P[0] if closed else P[-1]); return np.array(out)
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0),(0,128,255),(255,128,0)]
k=0
for m in re.finditer(r'export const (\w+) = (\[\[.*?\]\]);', src, re.S):
    nm,body=m.group(1),m.group(2)
    if names and nm not in names: continue
    try: P=json.loads(re.sub(r'//[^\n]*','',body))
    except Exception as e: print('skip',nm,e); continue
    if not P or not isinstance(P[0],list) or isinstance(P[0][0],list): continue
    closed=not nm.startswith('L_'); smooth=nm.startswith('S_') or nm.startswith('L_')
    Q=cr(P,closed) if smooth else np.array(P+([P[0]] if closed else []),float)
    q=((Q-[x0,y0])*Z).astype(np.int32)
    col=cols[k%len(cols)]; k+=1
    cv2.polylines(f,[q],False,col,1,cv2.LINE_AA)
    lab=((np.array(P[0])-[x0,y0])*Z).astype(int)
    cv2.putText(f,nm,(int(lab[0])+3,int(lab[1])+10),0,0.4,col,1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,88])
