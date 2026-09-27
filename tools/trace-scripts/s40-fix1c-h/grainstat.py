import cv2,numpy as np,glob,sys
def stats(fr,label):
  regs={'sky':(700,60,1000,260),'sky2':(1250,560,1450,640),'cloud':(1900,860,2100,940),'face':(1180,400,1230,440),'ribcream':(250,20,300,60)}
  for n,(x0,y0,x1,y1) in regs.items():
    L=fr[:,y0:y1,x0:x1,:].mean(-1)
    L=L-L.mean(axis=(1,2),keepdims=True)
    m=L.mean(0); mov=L-m
    movhp=np.array([f-cv2.GaussianBlur(f,(0,0),4) for f in mov])
    st2=m-cv2.GaussianBlur(m,(0,0),2); mid=cv2.GaussianBlur(m,(0,0),4)-cv2.GaussianBlur(m,(0,0),30)
    a=mov[0]-mov[0].mean(); F=np.fft.fft2(a); ac=np.real(np.fft.ifft2(F*np.conj(F))); ac/=ac[0,0]
    one=L[0]; hp1=one-cv2.GaussianBlur(one,(0,0),2)
    print(f'{label:6s} {n:8s} movHP {movhp.std():.2f} fdiff {(L[1]-L[0]).std():.2f} static_hp2 {st2.std():.2f} static_mid {mid.std():.2f} frame_hp2 {hp1.std():.2f} acx {ac[0,1]:.2f},{ac[0,2]:.2f},{ac[0,3]:.2f} acy {ac[1,0]:.2f},{ac[2,0]:.2f},{ac[3,0]:.2f}')
if __name__=='__main__':
  src=np.load('srcstack.npy').astype(np.float32)[:12]
  stats(src,'src')
  fs=sorted(glob.glob(sys.argv[1]+'/r-*.png'))
  stats(np.array([cv2.imread(f).astype(np.float32) for f in fs]),'rend')
