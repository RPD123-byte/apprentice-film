# figmask.py: the sleeve mask (BODY minus head, hoods, black gaps, left hand) in plate px -> sleeve_mask.png (scratch, not used by the film)
import re, json, cv2, numpy as np
s=open('/Users/computer/rootline/apprentice-film/src/shots/s01/figure.js').read()
def arr(name):
    m=re.search(r'const '+name+r' = (\[\s*\[.*?\]),?\s*\];', s, re.S)
    return np.array(json.loads(re.sub(r'\s+','',m.group(1))+']'),np.int32)
m=np.zeros((946,2206),np.uint8)
cv2.fillPoly(m,[arr('BODY')],255)
for n in ['HOOD_L','HOOD_R','WEDGE_L','WEDGE_R','CAP_L','CAP_R','LHAND']:
    cv2.fillPoly(m,[arr(n)],0)
cv2.ellipse(m,(1077,677),(133,161),0,0,360,0,-1)
h=open('/Users/computer/rootline/apprentice-film/src/shots/s01/head.js').read()
hm=re.search(r'const HAIR = (\[\s*\[.*?\]\]);', h, re.S)
hair=np.array(json.loads(re.sub(r'\s+','',hm.group(1))),np.int32)
cv2.fillPoly(m,[np.vstack([hair,[[1196,700],[958,700]]])],0)
m[846:,:]=0
m=cv2.erode(m,np.ones((9,9),np.uint8))
cv2.imwrite('sleeve_mask.png',m)
print(m.sum()//255)
