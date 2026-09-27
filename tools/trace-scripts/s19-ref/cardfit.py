import cv2,numpy as np,sys
f=cv2.imread('f5732.png')
Q=np.float32([[1090,78],[1600,55],[1680,800],[1000,778]])
if len(sys.argv)>1: Q=np.float32(eval(sys.argv[1]))
C=np.float32([[0,0],[465,0],[465,648],[0,648]])
H=cv2.getPerspectiveTransform(C,Q)
def P(pts): return cv2.perspectiveTransform(np.float32(pts).reshape(-1,1,2),H).reshape(-1,2)
def poly(pts,col,closed=True):
    p=P(pts).astype(np.int32); cv2.polylines(f,[p],closed,col,2)
import math
# outer rounded rect approx
def rrect(x0,y0,x1,y1,r,n=8):
    pts=[]
    for cx,cy,a0 in [(x1-r,y0+r,-90),(x1-r,y1-r,0),(x0+r,y1-r,90),(x0+r,y0+r,180)]:
        for i in range(n+1):
            a=math.radians(a0+90*i/n); pts.append([cx+r*math.cos(a),cy+r*math.sin(a)])
    return pts
poly(rrect(0,0,465,648,45),(0,0,255))
poly(rrect(51,160,423,600.5,15),(0,255,0))
poly([[51,532.5],[423,532.5]],(0,255,0),False)
poly([[237,532.5],[237,600.5]],(0,255,0),False)
circ=[[196+40*math.cos(a/20*6.283),80+40*math.sin(a/20*6.283)] for a in range(20)]
poly(circ,(255,0,255))
poly([[276,67],[313,67],[308,97],[281,97]],(255,255,0))
poly([[85,210],[85+19*15.6,210]],(255,128,0),False)
cv2.imwrite('cardfit.jpg',f[0:946,850:1800])
