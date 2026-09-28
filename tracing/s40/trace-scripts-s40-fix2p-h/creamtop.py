import numpy as np, cv2, sys
s=cv2.GaussianBlur(np.load('smean138.npy').mean(2),(0,0),1); r=cv2.GaussianBlur(np.load(sys.argv[1]).mean(2),(0,0),1)
x0,x1,st,y0=[int(v) for v in sys.argv[2:6]]
def top(img,x):
    col=img[:,x]
    for y in range(y0,940):
        if col[y:y+15].min()>182: return y
    return None
out=[]
for x in range(x0,x1,st):
    a=top(s,x); b=top(r,x); out.append(f'{x}:{a}/{b}({(b-a) if a and b else "?"})')
print(' '.join(out))
