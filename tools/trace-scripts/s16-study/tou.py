import sys, math, json
# usage: tou.py rootx rooty s rot "x,y x,y ..."
rx,ry,s,rot=map(float,sys.argv[1:5])
c,sn=math.cos(-rot),math.sin(-rot)
out=[]
for tok in sys.argv[5].split():
    x,y=map(float,tok.split(','))
    dx,dy=(x-rx)/s,(y-ry)/s
    out.append([round(dx*c-dy*sn),round(dx*sn+dy*c)])
print(json.dumps(out))
