# Estimate the camera focal length from the screen homographies (page plane -> frame), assuming square pixels and the
# principal point at the frame centre, then decompose each H into the lid plane's pose (R, t).
import json, numpy as np
S={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/screen.json'))}
for r in json.load(open('../s27d-meas/screen2.json')):
    if r[0]>=122.0: S[round(r[0],2)]=np.array(r[1:]).reshape(3,3)
cx,cy=1103,473
T=np.array([[1,0,-cx],[0,1,-cy],[0,0,1.]])
def fest(H):
    Hp=T@H
    h=Hp
    # orthogonality: (h11 h12 + h21 h22)/f^2 + h31 h32 = 0
    a=h[0,0]*h[0,1]+h[1,0]*h[1,1]; b=h[2,0]*h[2,1]
    f2o=-a/b if b!=0 else np.nan
    # equal norms: (h11^2+h21^2 - h12^2 - h22^2)/f^2 + (h31^2 - h32^2) = 0
    c=h[0,0]**2+h[1,0]**2-h[0,1]**2-h[1,1]**2; d=h[2,0]**2-h[2,1]**2
    f2n=-c/d if d!=0 else np.nan
    return f2o,f2n
for t in sorted(S):
    if t<120.2 or t>128.4: continue
    if abs((t*100)%20)>1e-6 and abs((t*100)%20-20)>1e-6: continue
    f2o,f2n=fest(S[t])
    print(f"{t:.2f} f_orth={np.sqrt(f2o) if f2o>0 else float('nan'):8.0f} f_norm={np.sqrt(f2n) if f2n>0 else float('nan'):8.0f}")
