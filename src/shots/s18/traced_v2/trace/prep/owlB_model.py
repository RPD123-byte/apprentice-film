# richer rigid model for the shot-B owl: far-wing state (3-frame flap cycle) x belly median, and the tail as its own
# rigid part with a fitted affine per frame
import sys; sys.path.insert(0,'.')
import numpy as np, cv2
from owlB_prep import TB
Z=np.load('owlB_frames.npz')
RW,RH,RY0=2206+620,946+90,-45
def reg(img,n,fill=np.nan):
    dx,dy=TB[n]; Mt=np.float32([[1,0,-dx],[0,1,-dy-RY0]])
    return cv2.warpAffine(img.astype(np.float32),Mt,(RW,RH),flags=cv2.INTER_NEAREST,borderValue=fill)
def owlmask(n):
    P=Z[f'P{n}']; E=Z[f'E{n}']
    return (np.abs(cv2.GaussianBlur(P,(0,0),1.5)-cv2.GaussianBlur(E,(0,0),1.5))>0.12).astype(np.float32)
fs=list(range(1382,1417))
# far wing state: brightness of the far-wing zone (registered x 0-420, y 60-300 in reg coords => frame y 15-255)
st={}
for n in fs:
    r=reg(Z[f'P{n}'],n); zone=r[60:300,0:420]
    st[n]=float(np.nanmean(zone))
vals=np.array([st[n] for n in fs]); print(' '.join(f'{n}:{st[n]:.2f}' for n in fs))
state={n:('down' if st[n]>0.25 else 'mid' if st[n]>0.05 else 'up') if not np.isnan(st[n]) else 'up' for n in fs}
print(state)
out={}
Ms={n:reg(owlmask(n),n) for n in fs}; Ps={n:reg(Z[f'P{n}'],n) for n in fs}
for S in ['down','mid','up']:
    ff=[n for n in fs if state[n]==S and n!=1401]
    Mm=np.array([Ms[n] for n in ff]); Pp=np.array([Ps[n] for n in ff])
    valid=~np.isnan(Mm); cons=np.nansum(Mm,0)/np.maximum(valid.sum(0),1)
    # where only few frames see a pixel, fall back to the all-frames consensus
    body=np.nanmedian(np.where(Mm>0.5,Pp,np.nan),0)
    out['cons_'+S]=cons.astype(np.float32); out['body_'+S]=np.nan_to_num(body).astype(np.float32); out['nv_'+S]=valid.sum(0).astype(np.int16)
    print(S,len(ff))
np.savez_compressed('owlB_states.npz',**out)
import json; json.dump(state,open('owlB_state.json','w'))
