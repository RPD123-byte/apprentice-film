import json,numpy as np,cv2
from segm import L
from hpoly import hp
R=json.load(open('rough.json'))
POSES={
 'pop':   {'frame':2576,'body':'pop','hp':(1070,444,0.96)},
 'crouch':{'frame':2585,'body':'crouch','hp':(1062,590,1.0)},
 'hips1': {'frame':2615,'body':'hips1','hp':(1075,440,1.0)},
 'closed':{'frame':2665,'body':'bigsc','hp':(1084,439,1.0)},
 'raise': {'frame':2685,'body':'raise','hp':(1062,418,1.05)},
 'hips2': {'frame':2735,'body':'hips2','hp':(1055,444,1.0)},
}
for k,p in POSES.items():
    c=R.get(k,{})
    c['body']=p['body']; c['frame']=p['frame']
    ex=[e for e in c.get('extras',[]) if e.get('mode')=='bright']
    c['extras']=[{'poly':hp(*p['hp']),'ring':12,'sure':8}]+ex
    R[k]=c
json.dump(R,open('rough.json','w'),indent=1)
for k,c in R.items():
    im=L(c['frame']).astype(np.uint8)
    PP=json.load(open('poses.json')).get(c['body'])
    if PP:
        for sl in PP['sil']: cv2.polylines(im,[np.array(sl,np.int32).reshape(-1,2)],True,(0,255,0),1)
    for e in c['extras']: cv2.polylines(im,[np.array(e['poly'],np.int32)],True,(0,0,255) if e.get('mode')!='bright' else (255,0,255),2)
    cv2.imwrite(f'rough_{k}.jpg',cv2.resize(im[150:946,500:1650],None,fx=0.9,fy=0.9))
