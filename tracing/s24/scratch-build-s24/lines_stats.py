import cv2,numpy as np,sys
ANG=32.1
def rot(g):
  h,w=g.shape; M=cv2.getRotationMatrix2D((w/2,h/2),ANG,1.0)  # positive = counterclockwise in image coords
  # We want line direction (cos a, sin a) (down-right in image coords) to become horizontal.
  big=cv2.warpAffine(g,M,(w,h),flags=cv2.INTER_LINEAR,borderValue=-1)
  return big,M
def analyze(n, mask_fn=None):
  g=cv2.imread('src/f%04d.png'%n,0).astype(np.float32)
  if mask_fn is not None: g=mask_fn(g)
  r,M=rot(g)
  return r
if __name__=='__main__':
  n=int(sys.argv[1])
  r=analyze(n)
  cv2.imwrite('rot%d.jpg'%n,np.clip(r,0,255).astype(np.uint8))
