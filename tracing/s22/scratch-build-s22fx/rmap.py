import json, cv2
def rpath(F):
    return json.load(open('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22fx/pool_map.json'))[str(F)]
def rimg(F, flag=1): return cv2.imread(rpath(F), flag)
