# crops.py render ref name:x0,y0,x1,y1 ... [--s 2] -> z_name.jpg (render | ref)
import cv2,numpy as np,sys
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); s=2.0; pre=''
args=sys.argv[3:]
if '--s' in args: i=args.index('--s'); s=float(args[i+1]); args=args[:i]+args[i+2:]
if '--p' in args: i=args.index('--p'); pre=args[i+1]; args=args[:i]+args[i+2:]
for r in args:
  n,c=r.split(':'); x0,y0,x1,y1=map(int,c.split(','))
  A=cv2.resize(a[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC); B=cv2.resize(b[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
  im=np.hstack([A,np.full((A.shape[0],4,3),(0,0,255),np.uint8),B]) if (x1-x0)<=(y1-y0)*1.2 else np.vstack([A,np.full((4,A.shape[1],3),(0,0,255),np.uint8),B])
  cv2.imwrite(pre+'z_'+n+'.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,90])
