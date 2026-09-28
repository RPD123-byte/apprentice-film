#!/usr/bin/env python3
# bladetrack.py T0 T1 : per source frame on the top edge, the two blades' directions from s21's tracked screw (peaks of
# the mean grey along rays u 22..62 px), their tip distances (last u with grey > 120 along each peak), versus ours.
import cv2, numpy as np, sys, json, subprocess
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t0,t1=float(sys.argv[1]),float(sys.argv[2]); ts=[round(t0+0.04*i,2) for i in range(int(round((t1-t0)/0.04))+1)]
js=subprocess.run(['node','--input-type=module','-e','''
const {probe}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
console.log(JSON.stringify(JSON.parse(process.argv[1]).map((t)=>{const p=probe(t); return [p.pivot,p.ang,p.open,p.L];})));''',json.dumps(ts)],capture_output=True,text=True)
P=json.loads(js.stdout); c=cv2.VideoCapture(V)
print('   t   src upper/lower deg  open   | ours upper/lower  open  | src tips(upper,lower) px')
for t,(pv,a,o,L) in zip(ts,P):
    c.set(1,int(round(t*25))); ok,f=c.read(); g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),0.8)
    th=np.arange(-0.15,0.8,0.004); us=np.arange(22,62,1.0)
    X=pv[0]+np.cos(th)[:,None]*us[None,:]; Y=pv[1]+np.sin(th)[:,None]*us[None,:]
    val=cv2.remap(g,X.astype(np.float32),Y.astype(np.float32),cv2.INTER_LINEAR).mean(1)
    # two strongest separated peaks
    idx=np.argsort(-val); pk=[]
    for i in idx:
        if all(abs(th[i]-th[j])>0.07 for j in pk): pk.append(i)
        if len(pk)==2: break
    pk=sorted(pk,key=lambda i:th[i])
    tips=[]
    for i in pk:
        uu=np.arange(20,110,0.5); xx=pv[0]+np.cos(th[i])*uu; yy=pv[1]+np.sin(th[i])*uu
        vv=cv2.remap(g,xx.astype(np.float32).reshape(1,-1),yy.astype(np.float32).reshape(1,-1),cv2.INTER_LINEAR)[0]
        on=np.nonzero(vv>120)[0]; tips.append(uu[on[-1]] if len(on) else 0)
    su,sl=np.degrees(th[pk[0]]),np.degrees(th[pk[1]])
    ou,ol=np.degrees(a-o/2),np.degrees(a+o/2)
    print(f'{t:6.2f}  {su:6.1f} {sl:6.1f}  {np.radians(sl-su):.3f} |  {ou:6.1f} {ol:6.1f}  {o:.3f} |  {tips[0]:.0f} {tips[1]:.0f}')
