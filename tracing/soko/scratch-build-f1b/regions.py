import numpy as np, cv2, sys
P='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f1b'
v=np.load(P+'/vref.npy'); m=cv2.imread(sys.argv[1]).astype(np.float32).mean(2)/255
R={'pantsL top':(935,560,1030,640),'pantsL low':(935,660,1060,780),'pantsR top':(1165,560,1265,640),'pantsR low':(1130,660,1260,780),'lap':(1045,555,1140,630),'shoes':(900,780,1255,885),'torso':(925,370,1250,450),'face':(1025,265,1118,370),'beanie':(995,165,1145,240),'hairL':(985,260,1022,360),'hairR':(1122,255,1158,355)}
for k,(x0,y0,x1,y1) in R.items():
    a=m[y0:y1,x0:x1]; b=v[y0:y1,x0:x1]
    print('%-11s mean %.3f / %.3f   p90 %.2f / %.2f   frac>0.7 %.2f / %.2f'%(k,a.mean(),b.mean(),np.percentile(a,90),np.percentile(b,90),(a>0.7).mean(),(b>0.7).mean()))
