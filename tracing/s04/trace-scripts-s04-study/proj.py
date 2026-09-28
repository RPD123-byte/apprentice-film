import numpy as np, json, sys
W,H=2206,946
d=json.load(open('camfit.json')); fov=d['fov']
def cam_axes(yaw,pitch,roll):
    f=np.array([-np.sin(yaw)*np.cos(pitch),np.sin(pitch),-np.cos(yaw)*np.cos(pitch)])
    r=np.cross(f,[0,1,0]); r/=np.linalg.norm(r); u=np.cross(r,f)
    cr,sr=np.cos(roll),np.sin(roll); return f,cr*r+sr*u,-sr*r+cr*u
def project(c,X):
    ex,ey,ez,yaw,pitch,roll=c; f,r,u=cam_axes(yaw,pitch,roll); k=(H/2)/np.tan(np.radians(fov)/2); dd=np.array(X)-np.array([ex,ey,ez]); z=dd@f
    return (W/2+(dd@r)*k/z, H/2-(dd@u)*k/z, z)
def unproject_desk(c,px,py,Y=-25.3):
    ex,ey,ez,yaw,pitch,roll=c; f,r,u=cam_axes(yaw,pitch,roll); k=(H/2)/np.tan(np.radians(fov)/2)
    ray=f+r*(px-W/2)/k-u*(py-H/2)/k; t=(Y-ey)/ray[1]; return np.array([ex,ey,ez])+t*ray
cams=dict(zip(d['times'],d['cams']))
for t,pts in json.loads(sys.argv[1]).items():
    c=cams[float(t)]
    for p in pts: print(t,p,'->',np.round(unproject_desk(c,*p),1))
