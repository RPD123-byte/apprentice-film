import sys, time, json, numpy as np, cv2
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T
f=np.load('snapshots/s20-f2-trace/clean.npy')
mask=np.zeros(f.shape,np.uint8); mask[60:1006,60:1160]=1
LV=[0.06,0.09,0.125,0.165,0.21,0.26,0.315,0.375,0.44,0.51,0.58,0.65,0.72,0.79,0.86,0.93]
bhi,blo=float(sys.argv[2]),float(sys.argv[3])
out,base=T.trace(f,mask,mode='close',C=5,use_bright=True,
   bright=dict(hi=bhi,lo=blo,cmin=blo*0.8,minlen=4,sigs=(0.9,1.6)),
   reg=dict(levels=LV,eps=0.9,minarea=12,blur=0.6),
   dark=dict(hi=0.05,lo=0.025,cmin=0.03,minlen=4,sigs=(0.9,1.6)))
print('bright',len(out['bright']),'dark',len(out['dark']))
json.dump(out,open('snapshots/s20-f2-trace/%s.json'%sys.argv[1],'w'))
