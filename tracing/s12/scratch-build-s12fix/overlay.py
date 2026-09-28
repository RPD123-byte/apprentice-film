import cv2, json, re, sys, numpy as np
# usage: overlay.py ref.png out.jpg x0 y0 x1 y1 scale [keys...]
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s12fix/'
src=open('/Users/computer/rootline/apprentice-film/src/shots/s12/geo.js').read()
js=src[src.index('{'):src.rindex('}')+1]
G=json.loads(js)
im=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); keys=sys.argv[8:]
im=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
def cr(pts,closed,per=10):
    n=len(pts); P=lambda i: pts[(i+n)%n] if closed else pts[max(0,min(n-1,i))]
    out=[]; last=n if closed else n-1
    for i in range(last):
        p0,p1,p2,p3=[np.array(P(j),float) for j in (i-1,i,i+1,i+2)]
        for j in range(per):
            t=j/per; out.append(0.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    out.append(np.array(pts[0] if closed else pts[-1],float)); return out
cols=[(0,0,255),(0,200,0),(255,0,0),(0,200,255),(255,0,255),(255,255,0),(0,128,255)]
k=[0]
def poly(pts,closed=True,col=None,dots=True):
    c=col or cols[k[0]%len(cols)]; k[0]+=1
    q=cr(pts,closed)
    q=np.array([[(p[0]-x0)*sc,(p[1]-y0)*sc] for p in q],np.int32)
    cv2.polylines(im,[q],closed,c,1,cv2.LINE_AA)
    if dots:
        for p in pts: cv2.circle(im,(int((p[0]-x0)*sc),int((p[1]-y0)*sc)),2,c,-1)
def ell(cx,cy,rx,ry=None,col=(0,0,255)):
    ry=ry or rx; cv2.ellipse(im,(int((cx-x0)*sc),int((cy-y0)*sc)),(int(rx*sc),int(ry*sc)),0,0,360,col,1,cv2.LINE_AA)
def want(n): return not keys or n in keys
if want('head'): poly(G['head'])
if want('tuft'): poly(G['tuftL']); [poly(t) for t in G['tuftR']]
if want('body'): poly(G['body'])
if want('wing'): poly(G['wing']); poly(G['wingLow'],False); poly(G['wingLow2'],False)
if want('tail'): poly(G['tail']); [poly(t,False) for t in G['tailLines']]
if want('feet'):
    for f in G['feetL']+G['feetR']:
        poly(f['toe'],False,(0,0,255));
        if f['claw']: poly(f['claw'],False,(255,0,0))
if want('eyes'):
    for e in (G['eyeR'],G['eyeL']):
        p=e['pupil']; ell(p[0],p[1],p[2],p[3] if len(p)>3 else p[2],(0,0,255)); r=e['ring']; ell(r[0],r[1],r[2],r[3],(0,200,0)); poly(e['lid'],False,(255,0,0)); poly(e['lash'],False,(255,0,255))
if want('beak'):
    b=G['beak']; poly(b['out']); poly(b['gape']); ell(*b['nostril'])
if want('disc'): [poly(d,False) for d in G['disc']]
if want('band'):
    fb=G['farBand']; poly(fb['top'],True,(0,0,255),True); poly(fb['low'],True,(0,200,0))
    L=G['bandage']['long']; a,b_,w=L; cv2.line(im,(int((a[0]-x0)*sc),int((a[1]-y0)*sc)),(int((b_[0]-x0)*sc),int((b_[1]-y0)*sc)),(255,0,0),1)
if want('hp'):
    h=G['hp']
    for n_ in ['block','collar','arm','cup','cushion']: poly(h[n_],True)
    poly(h['yoke'],False); poly(h['armEdge'],False); p=h['plate']; ell(p[0],p[1],p[2],p[3],(0,255,255))
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
