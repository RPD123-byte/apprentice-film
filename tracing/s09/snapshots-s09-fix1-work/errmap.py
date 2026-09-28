import cv2,numpy as np,sys
f=cv2.imread(sys.argv[1],0).astype(np.float32); r=cv2.imread(sys.argv[2],0).astype(np.float32)
x0,y0,x1,y1=map(int,sys.argv[3:7]); B=int(sys.argv[7]) if len(sys.argv)>7 else 40
fb=cv2.GaussianBlur(f,(0,0),6); rb=cv2.GaussianBlur(r,(0,0),6)
d=(fb-rb)
print('signed blurred diff (render - source) per block; rows y, cols x')
xs=list(range(x0,x1,B)); print('      '+' '.join('%5d'%x for x in xs))
for y in range(y0,y1,B):
    print('%5d '%y+' '.join('%+5.0f'%d[y:y+B,x:x+B].mean() for x in xs))
