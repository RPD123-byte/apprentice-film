import cv2, numpy as np, json
d=json.load(open('snapshots/s24-study/shards.json'))
conf=[c for c in d['conf'] if min(c[2],c[3])>=7 and max(c[2],c[3])/min(c[2],c[3])<3.2 and c[2]*c[3]>=90]
# arc polyline (frame px) - rough, from the mask
arc=np.array([[355,690],[362,610],[380,540],[415,480],[470,430],[540,385],[620,345],[700,315],[800,285],[900,262],[1000,245],[1150,225],[1300,212],[1450,203],[1600,202],[1750,215],[1850,235]],np.float32)
def near_arc(p):
    dd=np.min(np.hypot(arc[:,0]-p[0],arc[:,1]-p[1]))
    return dd<22
segs=[]
for s in d['segs']:
    L=np.hypot(s[2]-s[0],s[3]-s[1])
    if L<28: continue
    mid=((s[0]+s[2])/2,(s[1]+s[3])/2)
    if near_arc(mid) and near_arc(s[:2]) : continue
    if near_arc(mid) and near_arc(s[2:]): continue
    segs.append(s)
print(len(conf),len(segs))
json.dump({'conf':conf,'segs':segs},open('snapshots/s24-study/shards2.json','w'))
f=cv2.imread('snapshots/s24-study/fr/f013.png')
for s in segs: cv2.line(f,(int(s[0]),int(s[1])),(int(s[2]),int(s[3])),(0,0,255),2)
for c in conf:
    box=cv2.boxPoints(((c[0],c[1]),(c[2],c[3]),c[4])); cv2.polylines(f,[box.astype(np.int32)],True,(0,255,0),2)
cv2.polylines(f,[arc.astype(np.int32)],False,(255,0,255),2)
cv2.imwrite('snapshots/s24-study/shardover.jpg',f)
