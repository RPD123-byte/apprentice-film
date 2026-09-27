import cv2, numpy as np, sys, json, re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s04-k2')
s=open('/Users/computer/rootline/apprentice-film/src/shots/s04/screen04.js').read()
Q=json.loads('['+s[s.index('SCREEN_Q = [')+12:s.index('];',s.index('SCREEN_Q = ['))]+']')
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=cv2.VideoCapture(V)
for d in sys.argv[1:]:
    out=[]
    for r in Q:
        t=r[0]; fi=round(t*25)
        try: R=cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(np.float32)
        except: continue
        cap.set(1,fi); ok,f=cap.read(); S=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
        m=np.zeros(S.shape,np.uint8); cv2.fillPoly(m,[np.round(np.array(r[1:]).reshape(4,2)).astype(np.int32)],1); m=cv2.erode(m,np.ones((9,9),np.uint8))>0
        b=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
        out.append((t, np.abs(b(R,2)-b(S,2))[m].mean(), np.abs(b(R,6)-b(S,6))[m].mean(), (R[m].mean()-S[m].mean())))
    a=np.array([o[1:] for o in out])
    print(d, 'screen MAE s2 %.2f s6 %.2f bias %.2f' % tuple(a.mean(0)), ' '.join(f'{o[0]:.2f}:{o[1]:.1f}' for o in out))
