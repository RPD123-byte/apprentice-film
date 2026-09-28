import cv2, numpy as np, subprocess, json, sys
cam=json.loads(subprocess.check_output(['node','-e',"import('/Users/computer/rootline/apprentice-film/src/shots/s02/cam.js').then(m=>{const o={};for(let f=261;f<=478;f++){const i=Math.min(m.CAM.length/2-1,f-m.CAM0);o[f]=[m.CAM[2*i],m.CAM[2*i+1]]}console.log(JSON.stringify(o))})"]))
import glob
fr=sorted(int(p[-8:-4]) for p in glob.glob('s02-rev1-r2-labpairs/r*.png'))
rng=(int(sys.argv[1]),int(sys.argv[2])) if len(sys.argv)>2 else (262,478)
for f in fr:
    if f<rng[0] or f>rng[1]: continue
    ox,oy=cam[str(f)] if str(f) in cam else (0,0)
    # face+beanie world box (stare coords)
    X0,Y0,X1,Y1=560+ox,-180+oy,1650+ox,700+oy
    x0,y0,x1,y1=int(max(40,X0)),int(max(40,Y0)),int(min(2166,X1)),int(min(906,Y1))
    if x1-x0<150 or y1-y0<120: continue
    a=cv2.cvtColor(cv2.imread(f's02-rev1-r2-labpairs/r{f:04d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    b=cv2.cvtColor(cv2.imread(f's02-rev1-r2-src/{f:04d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    A=cv2.GaussianBlur(a,(0,0),2); B=cv2.GaussianBlur(b,(0,0),2)
    tpl=A[y0:y1,x0:x1]; S=40
    sx0,sy0=max(0,x0-S),max(0,y0-S); sx1,sy1=min(2206,x1+S),min(946,y1+S)
    res=cv2.matchTemplate(B[sy0:sy1,sx0:sx1],tpl,cv2.TM_CCOEFF_NORMED)
    _,mv,_,ml=cv2.minMaxLoc(res)
    dx=ml[0]+sx0-x0; dy=ml[1]+sy0-y0
    # same for the room (outside the face box): whole frame phase corr already ~0
    print(f"f{f} {f/25:.2f} face box {x1-x0}x{y1-y0}  source face offset vs render = ({dx:+d},{dy:+d}) ncc={mv:.2f}")
