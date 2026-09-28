# Signed tone per 1-s window (every 5th frame): mean L* (NOW - SRC, BASE - SRC) on sigma-12 blurred Lab, plus contrast (std of L).
import cv2, numpy as np, sys
SP=sys.argv[1]
def rd(p,start):
    cap=cv2.VideoCapture(p); n=start if start else 0
    while True:
        ok,f=cap.read()
        if not ok: return
        yield n,f; n+=1
def skip(gen,n0):
    for n,f in gen:
        if n>=n0: yield n,f
S=skip(rd('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4',0),2100)
B=skip(rd('/Users/computer/rootline/apprentice-film/renders/film.mp4',0),2100)
R=rd(SP+'/now.mp4',2100)
acc={}
for (ns,s),(nb,b),(nr,r) in zip(S,B,R):
    if ns%5: continue
    L=lambda a: cv2.cvtColor((cv2.GaussianBlur(a,(0,0),12)/255.).astype(np.float32),cv2.COLOR_BGR2Lab)
    ls,lb,lr=L(s),L(b),L(r)
    w=int(ns/25); d=acc.setdefault(w,[])
    d.append([ (lr[...,0]-ls[...,0]).mean(), (lb[...,0]-ls[...,0]).mean(), ls[...,0].std(), lr[...,0].std(), lb[...,0].std(),
              (lr[...,1:]-ls[...,1:]).mean((0,1))[0],(lr[...,1:]-ls[...,1:]).mean((0,1))[1]])
print('win   dL now  dL base | Lstd src now base | da now db now')
for w in sorted(acc):
    a=np.mean(acc[w],0); print(f"{w}-{w+1}: {a[0]:+6.2f} {a[1]:+6.2f} | {a[2]:5.1f} {a[3]:5.1f} {a[4]:5.1f} | {a[5]:+5.2f} {a[6]:+5.2f}")
