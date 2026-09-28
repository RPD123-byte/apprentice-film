import cv2,numpy as np,json,os
_CD=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'camdrift.json'))) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)),'camdrift.json')) else {}
def camW(f):
    v=_CD.get(str(f))
    if v is None: return np.float32([[1,0,0],[0,1,0]])
    return np.float32(v[1:]).reshape(2,3)
def L(f, ref=True):
    """source frame f; ref=True warps it into the 104.6 reference frame (camera drift + the 108.08 squash undone)"""
    im=cv2.imread(f'src/f{f:05d}.png').astype(np.float32)
    if ref and str(f) in _CD:
        Wm=camW(f)   # maps ref coords -> frame coords
        im=cv2.warpAffine(im,Wm,(im.shape[1],im.shape[0]),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
    return im
