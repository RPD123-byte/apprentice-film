# Map held-view (119.6) desk points through the desk-plane homography used by the shot (base top face: back corners on
# the lid hinge line via the screen homography, front corners from keys.js) to test rigid placement of desk props.
import json, numpy as np, re, sys, cv2
S={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/screen.json'))}
for r in json.load(open('../s27d-meas/screen2.json')):
    if r[0]>=122.0: S[round(r[0],2)]=np.array(r[1:]).reshape(3,3)
src=open('../../src/shots/s27/drawn/keys.js').read()
def arr(name):
    m=re.search(name+r' = \[(.*?)\];',src,re.S); return np.array(json.loads('['+re.sub(r'\s','',m.group(1)).rstrip(',')+']'))
FL=arr('BASE_FL'); FR=arr('BASE_FR')
TW,TD=1400,860
REF=np.float32([[680,673],[1489,673],[1620,774],[546,774]])
def interp(K,t): return np.array([np.interp(t,K[:,0],K[:,k]) for k in (1,2)])
def Hs(t):
    k=min(S,key=lambda k:abs(k-t)); return S[k]
def deskH(t):
    H=Hs(t)
    bl=cv2.perspectiveTransform(np.float32([[[-100,1150],[2288,1150]]]),H)[0]
    dst=np.float32([bl[0],bl[1],interp(FR,t),interp(FL,t)])
    Ht=cv2.getPerspectiveTransform(np.float32([[0,0],[TW,0],[TW,TD],[0,TD]]),dst)
    Href=cv2.getPerspectiveTransform(np.float32([[0,0],[TW,0],[TW,TD],[0,TD]]),REF)
    return Ht@np.linalg.inv(Href)
if __name__=='__main__':
    pts=np.float32([[1660,717],[1938,712],[2152,789],[1806,798],[1593,700],[1738,700],[1824,717],[2040,776]])
    for t in [float(a) for a in sys.argv[1:]]:
        q=cv2.perspectiveTransform(pts[None],deskH(t))[0]
        print(t,' '.join('(%.0f,%.0f)'%tuple(p) for p in q))
