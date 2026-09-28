import cv2, numpy as np, sys
# sheet.py out.jpg f0 f1 [step] [w] [cols] [grid]
out=sys.argv[1]; f0=int(sys.argv[2]); f1=int(sys.argv[3]); st=int(sys.argv[4]) if len(sys.argv)>4 else 1
w=int(sys.argv[5]) if len(sys.argv)>5 else 700; cols=int(sys.argv[6]) if len(sys.argv)>6 else 3
grid=len(sys.argv)>7
ims=[]
for f in range(f0,f1+1,st):
    im=cv2.imread(f'../src/f{f}.png')
    if grid:
        for x in range(0,2206,100): cv2.line(im,(x,0),(x,946),(0,160,255) if x%500 else (0,0,255),2)
        for y in range(0,946,100): cv2.line(im,(0,y),(2206,y),(0,160,255) if y%500 else (0,0,255),2)
    s=cv2.resize(im,(w,int(w*946/2206)),interpolation=cv2.INTER_AREA)
    cv2.putText(s,f'{f} t={f/25:.2f}',(6,22),0,0.7,(0,255,255),2)
    ims.append(s)
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
rows=[np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
