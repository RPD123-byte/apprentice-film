import cv2,numpy as np,sys,glob
d=sys.argv[1]; idx=sys.argv[2] if len(sys.argv)>2 else '00'
a=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0],0); b=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0],0)
def ext(im,y):
    row=cv2.GaussianBlur(im,(0,0),2)[y,1500:1860].astype(int)
    # largest bright run
    m=row>180; best=(0,0); i=0
    while i<len(m):
        if m[i]:
            j=i
            while j<len(m) and m[j]: j+=1
            if j-i>best[1]-best[0]: best=(i,j)
            i=j
        else: i+=1
    return (1500+best[0],1500+best[1]-1)
for y in range(200,600,20): print(y, 'ren',ext(a,y),'src',ext(b,y))
def top(im,x):
    col=cv2.GaussianBlur(im,(0,0),2)[150:400,x].astype(int); w=np.where(col>180)[0]; return 150+w[0] if len(w) else None
print('tops', [(x,top(a,x),top(b,x)) for x in range(1580,1780,30)])
