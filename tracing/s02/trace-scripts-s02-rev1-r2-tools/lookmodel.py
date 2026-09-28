import cv2, numpy as np, json, subprocess
cam=json.loads(subprocess.check_output(['node','-e',"import('/Users/computer/rootline/apprentice-film/src/shots/s02/cam.js').then(m=>{const o={};for(let f=261;f<=478;f++){const i=Math.min(m.CAM.length/2-1,f-m.CAM0);o[f]=[m.CAM[2*i],m.CAM[2*i+1]]}console.log(JSON.stringify(o))})"]))
def G(p): return cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
def hp(x,s1=1.2,s2=5): return cv2.GaussianBlur(x,(0,0),s1)-cv2.GaussianBlur(x,(0,0),s2)
look=G('s02-rev1-r2-src/0247.png')
WX0,WX1,WY0,WY1=670,1530,16,560
for f in [292,298,304,310,316,322,328,457,460,464,466,470,476]:
    ox,oy=cam[str(f)]; s=G(f's02-rev1-r2-src/{f:04d}.png'); r=G(f's02-rev1-r2-labpairs/r{f:04d}.png')
    X0,X1=int(max(0,WX0+ox)),int(min(2206,WX1+ox)); Y0,Y1=int(max(0,WY0+oy)),int(min(946,WY1+oy))
    if X1-X0<200 or Y1-Y0<120: continue
    S=s[Y0:Y1,X0:X1]; R=r[Y0:Y1,X0:X1]; hS=hp(S).ravel()
    best=None
    for ddx in range(-14,15,2):
        for ddy in range(-14,15,2):
            lx0,ly0=int(X0-ox-ddx),int(Y0-oy-ddy)
            if ly0<0 or lx0<0 or ly0+(Y1-Y0)>946 or lx0+(X1-X0)>2206: continue
            L=look[ly0:ly0+(Y1-Y0),lx0:lx0+(X1-X0)]
            for sg in [1.0,2.0,3.0]:
                c=np.corrcoef(hp(cv2.GaussianBlur(L,(0,0),sg)).ravel(),hS)[0,1]
                if best is None or c>best[0]: best=(c,ddx,ddy,sg)
    if best is None: print(f, 'skip'); continue
    cr=np.corrcoef(hp(R).ravel(),hS)[0,1]
    print(f"f{f} {f/25:.2f}: src vs blurred look {best[0]:.2f} (off {best[1]:+d},{best[2]:+d} sigma {best[3]}) | src vs render {cr:.2f}", flush=True)
