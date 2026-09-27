import cv2,numpy as np,sys,glob
d=sys.argv[1]; idx=sys.argv[2] if len(sys.argv)>2 else '*'
fr=sorted(glob.glob(f'{d}/frame-{idx}-at-*.png'))[0]; rf=fr.replace('/frame-','/ref-')
s=cv2.imread(rf,0).astype(np.float32); r=cv2.imread(fr,0).astype(np.float32)
hf=lambda g: np.abs(g-cv2.GaussianBlur(g,(0,0),3)).mean()
R={'upper arm':(1330,760,1560,940),'forearm':(1220,650,1460,740),'back mid':(1760,580,1980,760),'back low':(1700,780,2060,940),'under owl':(1560,660,1760,760),
'desk L lit':(300,760,700,940),'desk behind':(1180,500,1440,620),'desk L dark':(0,560,250,900),'beanie crown':(1450,0,1850,90),'beanie cuff':(1450,130,1850,250),
'face':(1320,250,1400,480),'owl head':(1500,280,1640,420),'owl body':(1480,470,1700,620),'Lhand':(640,660,860,840),'Rhand':(900,560,1190,710),
'cartons':(0,0,900,330),'spkL':(60,330,300,825),'chair':(1900,700,2206,946),'screen':(420,250,820,560)}
for k,(x0,y0,x1,y1) in R.items():
  a=s[y0:y1,x0:x1]; b=r[y0:y1,x0:x1]
  print('%-13s mean src %5.1f ren %5.1f (%+5.1f) | hf src %4.1f ren %4.1f | std %4.1f %4.1f'%(k,a.mean(),b.mean(),b.mean()-a.mean(),hf(a),hf(b),a.std(),b.std()))
