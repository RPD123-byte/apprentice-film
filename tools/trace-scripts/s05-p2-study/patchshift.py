import cv2,numpy as np,sys,glob,math
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace'); import frames
f=sys.argv[1]; t=float(sys.argv[2]); k=math.ceil(t*25-1e-6)
a=cv2.imread(f).astype(np.float32).mean(2); b=frames.frame(k).mean(2)*255
win=cv2.createHanningWindow((128,128),cv2.CV_32F)
out=[]
for (x,y,n) in [(100,150,'boxL'),(600,60,'boxTop'),(1150,250,'spkC'),(1250,300,'face'),(1500,60,'beanie'),(1450,280,'owlhead'),(1560,500,'owlbody'),(1750,650,'back'),(650,700,'lh'),(250,500,'spkL'),(900,500,'lap'),(500,650,'kbd'),(1300,780,'shirtL'),(300,800,'deskF')]:
  (dx,dy),r=cv2.phaseCorrelate(b[y:y+128,x:x+128],a[y:y+128,x:x+128],win)
  out.append(f'{n} {dx:+.1f},{dy:+.1f} ({r:.2f})')
print(t,' | '.join(out))
