import cv2,glob,numpy as np,sys
d=sys.argv[1]; per=int(sys.argv[2]) if len(sys.argv)>2 else 4
fs=sorted(glob.glob(d+'/pair-*.jpg'),key=lambda p:float(p.split('-at-')[1][:-5]))
ims=[cv2.imread(f) for f in fs]; ims=[cv2.resize(i,(1600,int(1600*i.shape[0]/i.shape[1]))) for i in ims]
for i in range(0,len(ims),per): cv2.imwrite(f'{d}/sheet{i//per}.jpg',np.vstack(ims[i:i+per]))
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(p.split('-at-')[1][:-5])):
    r=cv2.imread(f,0); s=cv2.imread(f.replace('frame-','ref-'),0)
    print(f.split('-at-')[1][:-5], 'R mean %3.0f p10 %3.0f p50 %3.0f p90 %3.0f'%(r.mean(),*np.percentile(r,[10,50,90])), '| S mean %3.0f p10 %3.0f p50 %3.0f p90 %3.0f'%(s.mean(),*np.percentile(s,[10,50,90])), '| blurdiff %.1f'%np.abs(cv2.blur(r,(41,41)).astype(float)-cv2.blur(s,(41,41))).mean())
