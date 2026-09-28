import cv2,numpy as np,sys,glob
d=sys.argv[1]; idx=sys.argv[2] if len(sys.argv)>2 else '00'
fr=cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0],0); rf=cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0],0)
R={'forehead':(1000,160,1100,200),'cheekL':(800,420,900,500),'cheekR':(1150,420,1250,520),'chin':(1000,740,1120,790),'beanieMid':(900,20,1200,80),'beanieL':(600,100,700,200),'beanieR':(1350,100,1450,200),'hoodL':(200,700,500,800),'hoodR':(1500,650,1800,800),'hoodTopL':(250,600,400,650),'hoodEdgeL':(40,750,160,900),'hoodEdgeR':(1880,700,1990,900),'hand':(620,520,760,640),'bgL':(0,0,600,300),'bgLlow':(100,400,500,600),'bgR':(1900,300,2206,800),'bgTop':(1480,0,1850,120),'lid':(400,860,1700,946),'owlBody':(1600,440,1740,540),'hairR':(1330,300,1420,500),'hairL':(600,250,740,420),'eyesL':(760,280,950,400),'eyesR':(1140,260,1330,400),'all':(0,0,2206,946)}
print(f"{'region':10s} render  source")
for k,(x0,y0,x1,y1) in R.items():
  a=fr[y0:y1,x0:x1]; b=rf[y0:y1,x0:x1]
  print(f'{k:10s} {a.mean():6.1f} {b.mean():6.1f}   {a.mean()-b.mean():+6.1f}')
