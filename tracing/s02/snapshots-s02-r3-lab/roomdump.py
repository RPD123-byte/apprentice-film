import sys, os, cv2
os.environ['ENTRY']='entry_room.js'; fr=sys.argv[1]; sys.argv=[sys.argv[0]]
from run import Lab, parse
L=Lab(); L.js('()=>{ window.ONLY={nogain:true}; }')
for f in parse(fr):
    img,_=L.frame(f,False); cv2.imwrite(f'../s02-r3-roomonly2/r{f:04d}.png',img)
L.close()
