# owl-region metrics: mask = the source's traced silhouette of the drawing (sil_data.js) grown 6 px
import json, re, numpy as np, cv2, sys
sys.path.insert(0,'.')
S=open('/Users/computer/rootline/apprentice-film/src/shots/s17/sil_data.js').read(); SIL=json.loads(S[S.index('{'):S.rindex('}')+1])
KEYS=sorted(float(k) for k in SIL)
DRAW=[]
k=0
while True:
    t=round(47.84+0.08*k,2)
    if t>49.53: break
    DRAW.append(t); k+=1
for a,b in [(49.64,50.53),(50.64,51.53),(51.64,52.45)]:
    t=a
    while t<b: DRAW.append(round(t,2)); t+=0.08
def tick(t):
    if t>=52.52-1e-6: return 53.0 if abs(t-53.04)<0.01 else t
    d=DRAW[0]
    for x in DRAW:
        if x<=t+1e-6: d=x
    return 48.8 if d<49.1 else d
def mask(t, grow=6):
    k=f'{tick(t):.2f}'
    m=np.zeros((946,2206),np.uint8)
    for q in SIL.get(k,[]):
        p=np.array(q,np.float32).reshape(-1,2).round().astype(np.int32); cv2.fillPoly(m,[p],255)
    if grow: m=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*grow+1,2*grow+1)))
    return m>0
def gray(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
def om(f,s,t,sig=1.5):
    m=mask(t)
    A=cv2.GaussianBlur(gray(f),(0,0),sig) if sig else gray(f); B=cv2.GaussianBlur(gray(s),(0,0),sig) if sig else gray(s)
    return float(np.abs(A-B)[m].mean())
