# errmap.py OUTDIR k [cell] [u] : sigma-2 abs error (graded levels) per cell; prints the grid and the top cells; writes err-k.jpg
import cv2, numpy as np, sys, glob, math, re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d,k=sys.argv[1],int(sys.argv[2]); C=int(sys.argv[3]) if len(sys.argv)>3 else 100; U=len(sys.argv)>4 and sys.argv[4]=='u'
f=[f for f in glob.glob(d+'/frame-*.png') if 578+math.floor((float(re.search(r'at-([\d.]+)s',f).group(1))-(10 if U else 0))*30+1e-6)==k][0]
a=cv2.imread(f).astype(np.float32).mean(2); b=((frames.pre(k) if U else frames.frame(k))*255).astype(np.float32).mean(2)
e=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)); s=cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)
print(f'k {k} mean err {e.mean():.2f}')
cells=[]
for y in range(0,946,C):
    row=[]
    for x in range(0,2206,C):
        v=e[y:y+C,x:x+C].mean(); sg=s[y:y+C,x:x+C].mean(); row.append(f'{v:4.0f}'); cells.append((v,x,y,sg))
    print(f'y{y:4d} '+''.join(row))
cells.sort(reverse=True)
print('top cells (err, x, y, signed):',[(round(v,1),x,y,round(sg,1)) for v,x,y,sg in cells[:14]])
m=np.clip(e*4,0,255).astype(np.uint8); cv2.imwrite(f'{d}/err-{k}.jpg',cv2.resize(cv2.applyColorMap(m,cv2.COLORMAP_INFERNO),None,fx=0.5,fy=0.5))
