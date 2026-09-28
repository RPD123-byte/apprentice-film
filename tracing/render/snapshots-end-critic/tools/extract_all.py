import cv2, os
D='/Users/computer/rootline/apprentice-film/snapshots/end-critic-src/'
for tag,path in [('src','/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'),('base','/Users/computer/rootline/apprentice-film/renders/film.mp4')]:
    cap=cv2.VideoCapture(path); n=0
    while n<=3515:
        ok,f=cap.read()
        if not ok: break
        if n>=2100 and not os.path.exists(f'{D}{tag}-{n}.png'): cv2.imwrite(f'{D}{tag}-{n}.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,95])
        n+=1
print('done')
