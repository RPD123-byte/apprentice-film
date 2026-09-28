import sys,os,json,subprocess,cv2,numpy as np
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0,'snapshots/s28-tools')
from raster import paint
from grade import pre_frame
base=json.load(open(sys.argv[2] if len(sys.argv)>2 else 'snapshots/s28-tools/k_room13160.json'))
p=(pre_frame(base['t'])[...,::-1]*255).astype(np.float32)
hid=np.zeros(p.shape[:2],np.uint8)
for r in base['fill_hidden']: cv2.fillPoly(hid,[np.int32(r)],255)
if base['fill_hidden']==[]:
    hid[:]=255
    for r in base['area']: cv2.fillPoly(hid,[np.int32(r)],0)
    for r in base.get('exclude',[]): cv2.fillPoly(hid,[np.int32(r)],255)
    hid=cv2.dilate(hid,np.ones((5,5),np.uint8))
vis=hid==0
variants=json.loads(sys.argv[1])
for name,over in variants.items():
    sp=dict(base); sp.update(over)
    json.dump(sp,open(f'/tmp/tune_{name}.json','w') if False else open(f'snapshots/s28-tools/tune_{name}.json','w'))
    subprocess.run(['python3','snapshots/s28-tools/traceview.py',f'snapshots/s28-tools/tune_{name}.json',f'snapshots/s28-tools/tune_{name}_out.json'],check=True,capture_output=True)
    D=json.load(open(f'snapshots/s28-tools/tune_{name}_out.json'))
    im,al=paint(D,bg='#e9dcc0'); im=im.astype(np.float32)
    res=[]
    for s in (2,6):
        A=cv2.GaussianBlur(im,(0,0),s); B=cv2.GaussianBlur(p,(0,0),s)
        res.append(np.abs(A-B).mean(2)[vis].mean())
    sz=os.path.getsize(f'snapshots/s28-tools/tune_{name}_out.json')//1024
    print(name,'MAD σ2 %.2f σ6 %.2f'%tuple(res),'size',sz,'KB','regions',len(D['regions']),'ink',len(D['ink']),flush=True)
    cv2.imwrite(f'snapshots/s28-study/tune_{name}.jpg',cv2.resize(np.hstack([im,p]).astype(np.uint8),None,fx=0.35,fy=0.35))
