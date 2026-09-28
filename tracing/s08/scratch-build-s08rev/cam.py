import re,numpy as np
src=open('/Users/computer/rootline/apprentice-film/src/shots/s08.js').read()
blk=src[src.index('const CAM = ['):src.index('];',src.index('const CAM = ['))]
CAM=[list(map(float,m.split(','))) for m in re.findall(r'\[([-\d., ]+)\]',blk)]
def cam(u):
    if u<=0: return CAM[0]
    for i in range(1,len(CAM)):
        if u<=CAM[i][0]+1e-9:
            a,b=CAM[i-1],CAM[i]; f=(u-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*f for k in range(5)]
    return CAM[-1]
def M(u):
    _,s,tx,ty,rot=cam(u); c=s*np.cos(np.radians(rot)); sn=s*np.sin(np.radians(rot))
    return np.array([[c,-sn,tx],[sn,c,ty]],np.float32)
