import sys; sys.path.insert(0,'../s18fix1')
from src import *
bg=np.load('../bgA.npy').astype(np.float32)
fs=list(range(1337,1382))
cf=lambda f: f-(f-1)//25
crops={}
for n in fs:
    g=reg(n,420,150,1080,640).astype(np.float32)
    crops[n]=g
# compare body/head region (x 460-800, y 190-470 in frame coords => crop coords -420,-150) and wing region
def d(a,b,x0,y0,x1,y1): return np.abs(a[y0-150:y1-150,x0-420:x1-420]-b[y0-150:y1-150,x0-420:x1-420]).mean()
ref=crops[1356]
print('frame cf phase head/body  wing  legs')
for n in fs:
    print(n, cf(n), ['level','up','level','down'][cf(n)%4], '%.1f %.1f %.1f'%(d(crops[n],ref,470,200,700,440), d(crops[n],ref,700,230,1000,440), d(crops[n],ref,560,470,860,560)))
