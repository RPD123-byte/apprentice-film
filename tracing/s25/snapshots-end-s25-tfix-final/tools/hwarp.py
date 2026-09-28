# hwarp.py F out.jpg x0 y0 x1 y1 [scale] [step] [--img path] [--body]: the frame warped into the 104.60 head space
# (p_head -> frame = CAM[f] . HEAD[f] . p), cropped + fine grid (labels in head-space px). --body uses SCHED instead.
import cv2, sys, json, numpy as np
A=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-tools/aff.json'))
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
a=sys.argv[1:]; img=None; body=False
if '--img' in a: i=a.index('--img'); img=a[i+1]; del a[i:i+2]
if '--body' in a: a.remove('--body'); body=True
f=int(a[0]); out=a[1]; x0,y0,x1,y1=[int(v) for v in a[2:6]]; sc=float(a[6]) if len(a)>6 else 3; st=int(a[7]) if len(a)>7 else 10
im=cv2.imread(img if img else f'{M}/src_{f:05d}.png')
def m3(m): return np.array([[m[0],m[2],m[4]],[m[1],m[3],m[5]],[0,0,1]])
cam=A['CAM'][max(0,min(len(A['CAM'])-1,f-A['CAM_F0']))]
h=A['SCHED'][f-A['SCHED_F0']][1:] if body else A['HEAD'][max(0,min(len(A['HEAD'])-1,f-A['HEAD_F0']))]
T=m3(cam)@m3(h)   # head -> frame
S=np.array([[sc,0,-x0*sc],[0,sc,-y0*sc],[0,0,1]])  # head -> out
W=S@np.linalg.inv(T)  # frame -> out
c=cv2.warpAffine(im,W[:2],(int((x1-x0)*sc),int((y1-y0)*sc)),flags=cv2.INTER_CUBIC)
if st>0:
  for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); big=x%50==0
    cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if big else (0,120,200),1)
    if big: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
  for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); big=y%50==0
    cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if big else (0,120,200),1)
    if big: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
