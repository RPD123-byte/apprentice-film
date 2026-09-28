import cv2,numpy as np,json,sys
name=sys.argv[1]
d=json.load(open('meas/%s%s.json'%(sys.argv[2] if len(sys.argv)>2 else 'bars',name))); a=np.radians(d['ang']); c,s=np.cos(a),np.sin(a)
img=np.zeros((946,2206),np.uint8)
S=4
big=np.zeros((946*S,2206*S),np.uint8)
for b in d['bars']:
  u0,u1,v,w=b[:4]; val=int(min(255,b[5]))
  p0=(u0*c-v*s, u0*s+v*c); p1=(u1*c-v*s, u1*s+v*c)
  cv2.line(big,(int(p0[0]*S),int(p0[1]*S)),(int(p1[0]*S),int(p1[1]*S)),val,max(1,int(w*S)),cv2.LINE_AA)
img=cv2.resize(big,(2206,946),interpolation=cv2.INTER_AREA)
m=np.load('meas/L%s.npy'%name)
out=np.vstack([np.clip(m,0,255).astype(np.uint8),img])
cv2.imwrite('meas/barvis%s.jpg'%name,cv2.resize(out[:, :],None,fx=0.5,fy=0.5))
cv2.imwrite('meas/barvis%s_z.jpg'%name,np.hstack([np.clip(m,0,255).astype(np.uint8)[500:900,0:700],img[500:900,0:700]]))
