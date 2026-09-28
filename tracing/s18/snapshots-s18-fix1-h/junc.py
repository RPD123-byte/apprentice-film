import cv2,numpy as np,re,sys
d=sys.argv[1]
txt=open('../../src/shots/s18/shotB.js').read()
TR={int(a):(int(b),int(c)) for a,b,c in re.findall(r'\[(\d{4}), (-?\d+), (-?\d+)\]', txt.split('export const TRACK_B')[1].split('];')[0])}
tiles=[]
for n in range(1382,1417):
    dx=TR[n][0]; x0=1538+dx-120
    r=cv2.imread('%s/r%d.png'%(d,n))[0:300,x0:x0+240]; s=cv2.imread('../s18-fix1-src/f%04d.png'%n)[0:300,x0:x0+240]
    t=np.vstack([r,s]); cv2.putText(t,str(n),(4,16),0,0.5,(0,0,255),1); tiles.append(t)
tiles+= [np.zeros_like(tiles[0])]
rows=[np.hstack(tiles[i:i+9]) for i in range(0,36,9)]
cv2.imwrite('../s18-fix1-pairs/junc_%s_1.jpg'%d,np.vstack(rows[:2])); cv2.imwrite('../s18-fix1-pairs/junc_%s_2.jpg'%d,np.vstack(rows[2:]))
