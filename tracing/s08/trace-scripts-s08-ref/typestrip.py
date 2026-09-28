import cv2, numpy as np, re
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cam={}
for l in open('snapshots/s08-ref/cam.txt'):
    m=re.match(r't=\s*([\d.]+) s=([\d.]+) rot=\S+ tx=\s*([-\d.]+) ty=\s*([-\d.]+)',l)
    if m: cam[round(float(m[1]),2)]=tuple(map(float,m.groups()[1:]))
c=cv2.VideoCapture(V); fps=c.get(5)
rows=[]
x0,y0,x1,y1=1500,355,2000,415
for i in range(int(round(30.40*fps)),int(round(32.60*fps))):
    t=round(i/fps,2)
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read()
    s,tx,ty=cam.get(t,(1,0,0))
    # map t0 box to frame t
    M=np.float32([[s,0,tx],[0,s,ty]])
    # warp frame back to t0 coordinates
    Mi=cv2.invertAffineTransform(M)
    g=cv2.warpAffine(f,Mi,(2206,946))
    crop=g[y0:y1,x0:x1].copy()
    cv2.putText(crop,f"{t:.2f}",(420,50),0,0.6,(0,0,255),2)
    rows.append(crop)
half=(len(rows)+1)//2
while len(rows)<2*half: rows.append(np.zeros_like(rows[0]))
img=np.hstack([np.vstack(rows[:half]),np.vstack(rows[half:])])
cv2.imwrite('snapshots/s08-ref/typing.jpg',img,[cv2.IMWRITE_JPEG_QUALITY,90]); print(img.shape)
