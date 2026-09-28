#!/usr/bin/env python3
# split.py F ID f1,f2,... : split face ID of roto/F.txt into bands along v (fractions of its height from the bottom
# edge p0-p1 to the top edge p3-p2); the parts are named ID, ID_1, ID_2 ... (bottom first), kept in the face's place
import sys, os
sys.path.insert(0,os.path.dirname(__file__)); from common import *
f=int(sys.argv[1]); fid=sys.argv[2]; fr=[0.0]+[float(x) for x in sys.argv[3].split(',')]+[1.0]
faces=load(f); out=[]
for i,q,o in faces:
    if i!=fid: out.append((i,q,o)); continue
    L=lambda t: q[0]+(q[3]-q[0])*t; R=lambda t: q[1]+(q[2]-q[1])*t
    for k in range(len(fr)-1):
        a,b=fr[k],fr[k+1]; out.append((fid if k==0 else f'{fid}_{k}',np.array([L(a),R(a),R(b),L(b)]),dict(o)))
save(f,out); print(f,fid,'->',len(fr)-1)
