# rect.py: rectify the laptop screen (source frame k or a render png) into page units (1600x1000 at scale s)
import sys, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
PAGE_QUAD=np.float32([[320.7,246.0],[834.7,168.7],[900.9,521.2],[411.9,644.8]])
def rect(img,s=1.0):
    src=np.float32([[0,0],[1600,0],[1600,1000],[0,1000]])*s
    Hm=cv2.getPerspectiveTransform(src,PAGE_QUAD)
    return cv2.warpPerspective(img,Hm,(int(1600*s),int(1000*s)),flags=cv2.INTER_CUBIC|cv2.WARP_INVERSE_MAP)
