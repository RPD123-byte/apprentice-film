import cv2,sys,glob,re,math,numpy as np
# The snapshot tool renders at floor(30t)/30 and pulls the reference at round(25t). Replace each ref-*.png with the
# source frame the render actually shows: n = floor(25 * floor(30t)/30 + 1e-4). Also writes sheet.jpg (render | ref).
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]
c=cv2.VideoCapture(V)
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fr:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    tq=math.floor(30*t+1e-6)/30; n=math.floor(25*tq+1e-4)
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,g=c.read()
    cv2.imwrite(f.replace('frame-','ref-'),g)
    a=cv2.imread(f)
    a=cv2.resize(a,(736,316)); b=cv2.resize(g,(736,316))
    cv2.putText(a,f'{t:.2f} f{n}',(6,22),0,0.7,(0,255,255),2)
    tiles.append(np.hstack([a,np.full((316,4,3),128,np.uint8),b]))
    print(f't={t} -> frame {n}')
if len(sys.argv)>2:
    cols=int(sys.argv[2])
    while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
    rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
    cv2.imwrite(d+'/sheet2.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,82])
