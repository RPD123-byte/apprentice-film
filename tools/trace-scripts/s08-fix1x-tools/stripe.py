import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s08-fix1x-tools'); from cam import *
dirs=sys.argv[1:]
def amp_at(im,k):
    Mk=M(k); s=np.hypot(Mk[0,0],Mk[1,0])
    # F0 box -> output box
    x0,y0=Mk@[1530,430,1]; x1,y1=Mk@[1830,690,1]
    x0,x1=int(max(0,x0)),int(min(2205,x1)); y0,y1=int(y0),int(min(945,y1))
    reg=im[y0:y1,x0:x1].mean(-1)
    prof=reg.mean(1); prof=prof-cv2.GaussianBlur(prof.reshape(-1,1),(0,0),5).ravel()
    n=len(prof); w=np.hanning(n); F=np.abs(np.fft.rfft(prof*w))/w.sum()*2; fr=np.fft.rfftfreq(n)
    P=2.09*s; j=np.argmin(np.abs(fr-1/P))
    loc=F[max(0,j-3):j+4]; jj=np.argmax(loc)+max(0,j-3)
    others=sorted([(F[i],1/fr[i]) for i in range(5,len(F)) if abs(i-jj)>3],reverse=True)[:2]
    return round(P,2), round(F[jj],3), round(1/fr[jj],2), [(round(a,3),round(p,2)) for a,p in others], round(reg.mean(),1)
for k in [770,786,800,810,814]:
    row=[f'{k}']
    row.append('S '+str(amp_at(src(k).astype(np.float32),k)))
    for d in dirs: row.append(d[-6:]+' '+str(amp_at(cv2.imread(f'{d}/r{k}.png').astype(np.float32),k)))
    print(' | '.join(row))
