# Decode source and renders/film.mp4 sequentially and save the frames listed in frames.json (by index) as PNG.
import cv2, json, sys, os
D='/Users/computer/rootline/apprentice-film/snapshots/'
need=set(json.load(open(D+'end-critic-tools/frames.json'))['all'])
for tag,path in [('src','/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'),('base','/Users/computer/rootline/apprentice-film/renders/film.mp4')]:
    cap=cv2.VideoCapture(path); n=0; mx=max(need)
    while n<=mx:
        ok,f=cap.read()
        if not ok: break
        if n in need: cv2.imwrite(f'{D}end-critic-src/{tag}-{n}.png',f)
        n+=1
    print(tag,'decoded',n)
