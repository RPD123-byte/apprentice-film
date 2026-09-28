# Per-frame metrics 84.00-140.60 (frames 2100..3515): NOW (harness PNGs, passed through the same yuv420p/x264 round trip
# as renders/film.mp4) and BASE (renders/film.mp4) against the source, all decoded by frame index.
# mad4/mad12 = mean abs RGB diff after Gaussian blur sigma 4/12 (8-bit levels); de4/de12 = CIE76 dE on blurred Lab.
import cv2, numpy as np, json, subprocess, os, sys
D='/Users/computer/rootline/apprentice-film/snapshots/'
SP=sys.argv[1]
N0,N1=2100,3515
if not os.path.exists(SP+'/now.mp4'):
    lst=SP+'/list.txt'
    with open(lst,'w') as f:
        for n in range(N0,N1+1): f.write(f"file '{D}end-critic-render/{n}.png'\nduration 0.04\n")
    subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',lst,'-vf','format=yuv420p','-r','25','-c:v','libx264','-crf','10',SP+'/now.mp4'],check=True)
def reader(path,start):
    cap=cv2.VideoCapture(path); n=0
    while True:
        ok,f=cap.read()
        if not ok: return
        if n>=start: yield n,f
        n+=1
def rdnow():
    cap=cv2.VideoCapture(SP+'/now.mp4'); n=N0
    while True:
        ok,f=cap.read()
        if not ok: return
        yield n,f; n+=1
def blur(a,s): return cv2.GaussianBlur(a,(0,0),s)
def lab(a): return cv2.cvtColor((a/255.).astype(np.float32),cv2.COLOR_BGR2Lab)
out={}
S=reader('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4',N0)
B=reader('/Users/computer/rootline/apprentice-film/renders/film.mp4',N0)
R=rdnow()
for (ns,s),(nb,b),(nr,r) in zip(S,B,R):
    if ns>N1: break
    assert ns==nb==nr,(ns,nb,nr)
    s=s.astype(np.float32); b=b.astype(np.float32); r=r.astype(np.float32)
    row={}
    for sig in (4,12):
        bs,bb,br=blur(s,sig),blur(b,sig),blur(r,sig)
        row[f'now_mad{sig}']=float(np.abs(br-bs).mean()); row[f'base_mad{sig}']=float(np.abs(bb-bs).mean())
        ls,lb,lr=lab(bs),lab(bb),lab(br)
        row[f'now_de{sig}']=float(np.sqrt(((lr-ls)**2).sum(2)).mean()); row[f'base_de{sig}']=float(np.sqrt(((lb-ls)**2).sum(2)).mean())
        if sig==4: row['now_vs_base4']=float(np.abs(br-bb).mean())
    out[ns]=row
    if ns%100==0: print(ns,{k:round(v,2) for k,v in row.items()},flush=True)
json.dump(out,open(D+'end-critic/metrics_every_frame.json','w'))
