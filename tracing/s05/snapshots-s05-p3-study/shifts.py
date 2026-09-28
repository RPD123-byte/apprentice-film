import sys,cv2,numpy as np
rs=np.load(sys.argv[1]+'_src.npy'); rr=np.load(sys.argv[1]+'_ren.npy')
g=lambda a: cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),(0,0),1.5)
S,R=g(rs),g(rr)
st=int(sys.argv[2]) if len(sys.argv)>2 else 100
for y in range(st//2,1000,st):
    row=[]
    for x in range(st//2,1600,st):
        h=st//2-10
        tpl=R[y-h:y+h,x-h:x+h]
        if tpl.std()<8: row.append('    .     '); continue
        win=S[max(0,y-h-25):y+h+25,max(0,x-h-25):x+h+25]
        res=cv2.matchTemplate(win,tpl,cv2.TM_CCOEFF_NORMED); _,mx,_,ml=cv2.minMaxLoc(res)
        dx=ml[0]+max(0,x-h-25)-(x-h); dy=ml[1]+max(0,y-h-25)-(y-h)
        row.append(f'{dx:+3d}{dy:+3d}/{mx:.2f}')
    print(' '.join(row))
