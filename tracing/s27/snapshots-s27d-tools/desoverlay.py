# overlay the designer drawing's shape constants (parsed from designer.js) on the 125.0 median frame
import re, json, cv2, numpy as np
src=open('../../src/shots/s27/drawn/designer.js').read()
med=cv2.imread('../s27d-meas/med125.png')
names=['JACKET','GAP','BAND','CUP','SHIRT','BEANIE','HAIR','FACE','FOREARM','HAND_R','TEMPLE']
cols=[(0,255,0),(255,255,255),(255,255,0),(0,200,255),(128,128,128),(0,255,255),(255,0,255),(0,0,255),(255,0,0),(255,128,0),(0,128,255)]
ov=med.copy()
for n,c in zip(names,cols):
    m=re.search(r'const '+n+r' = (\[\[.*?\]\]);',src,re.S)
    if not m: continue
    try: P=np.array(json.loads(m.group(1)),float)
    except Exception as e: continue
    cv2.polylines(ov,[np.int32(P)],True,c,2)
m=re.search(r'const STRANDS = \[(.*?)\n\];',src,re.S)
for sm in re.finditer(r'\[\[\[(.*?)\]\], (\d+)\]',m.group(1)):
    P=np.array(json.loads('[['+sm.group(1)+']]'),float); cv2.polylines(ov,[np.int32(P)],False,(0,255,128),max(1,int(sm.group(2))//4))
cv2.imwrite('../s27d-study/desoverlay.jpg',ov[40:946,0:1120],[cv2.IMWRITE_JPEG_QUALITY,85])
