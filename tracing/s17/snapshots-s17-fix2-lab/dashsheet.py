# dashsheet.py dir out : head crops render | source for the dash frames
import sys,cv2,numpy as np
sys.path.insert(0,'.')
d,out=sys.argv[1],sys.argv[2]
HX={52.68:740,52.72:705,52.76:677,52.80:647,52.84:612,52.88:590,52.92:570,52.96:537,53.00:512,53.08:480,53.12:452,53.16:428,53.20:400}
rows=[]
for t,hx in HX.items():
    r=cv2.imread(f'{d}/r{t:.2f}.png');s=cv2.imread(f'{d}/s{t:.2f}.png')
    if r is None: continue
    x0,y0=hx-65,385; a=r[y0:y0+110,x0:x0+150]; b=s[y0:y0+110,x0:x0+150]
    rows.append(np.hstack([a,np.full((110,3,3),(0,0,255),np.uint8),b]))
half=(len(rows)+1)//2
L=np.vstack(rows[:half]); R=np.vstack(rows[half:]+[np.zeros_like(rows[0])]*(half-len(rows[half:])))
im=np.hstack([L,np.full((L.shape[0],6,3),(0,255,0),np.uint8),R])
cv2.imwrite(out,cv2.resize(im,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC),[cv2.IMWRITE_JPEG_QUALITY,88])
