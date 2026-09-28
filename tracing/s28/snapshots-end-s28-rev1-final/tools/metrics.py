# per-frame metrics: new render (end-s28-rev1-all) and baseline film.mp4 vs source, sigma 4 / 12 blurred abs diff (8-bit)
# and mean deltaE (CIE76 on blurred Lab); plus frame-to-frame step at sigma 4 vs the source's own step
import cv2, numpy as np, sys, json
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
NEW='/Users/computer/rootline/apprentice-film/snapshots/end-s28-rev1-all'  # (deleted after the review; re-create with shoot.mjs)
def ld(kind,n):
    if kind=='new': p=f'{NEW}/f-{n/25:.4f}.png'
    else: p=f'{SP}/{kind}/{n}.png'
    return cv2.imread(p).astype(np.float32)
def bl(a,s): return cv2.GaussianBlur(a,(0,0),s)
def lab(a): return cv2.cvtColor(np.clip(a,0,255).astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)*[100/255,1,1]-[0,128,128]
out={}
prev={}
for n in range(3223,3416):
    S=ld('src',n); row={}
    Sb4,Sb12=bl(S,4),bl(S,12)
    for k in ('new','film'):
        R=ld(k,n); Rb4,Rb12=bl(R,4),bl(R,12)
        row[k]=[float(np.abs(Rb4-Sb4).mean()),float(np.abs(Rb12-Sb12).mean()),
                float(np.linalg.norm(lab(Rb4)-lab(Sb4),axis=2).mean()),float(np.linalg.norm(lab(Rb12)-lab(Sb12),axis=2).mean())]
        if k in prev: row[k+'_step']=float(np.abs(Rb4-prev[k]).mean())
        prev[k]=Rb4
    if 'src' in prev: row['src_step']=float(np.abs(Sb4-prev['src']).mean())
    prev['src']=Sb4
    out[n]=row
    print(n, f'{n/25:.2f}', ' '.join(f'{v:.2f}' for v in row['new']), '|', ' '.join(f'{v:.2f}' for v in row['film']), '| step new %.2f film %.2f src %.2f'%(row.get('new_step',0),row.get('film_step',0),row.get('src_step',0)), flush=True)
json.dump(out,open('/Users/computer/rootline/apprentice-film/snapshots/end-s28-rev1-tools/metrics.json','w'))
