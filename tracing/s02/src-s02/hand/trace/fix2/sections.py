import re,sys,numpy as np
d={}
for l in open(sys.argv[1]):
    m=re.match(r'f=(\d+) .*ms=(\d+) mae8=([\d.]+)',l)
    if m: d[int(m.group(1))]=(float(m.group(3)),int(m.group(2)))
S=[('stare/look',151,262),('outbound pan',263,361),('hold/blink/crouch',362,404),('flight',405,451),('return pan',452,477)]
for n,a,b in S:
    v=[d[f][0] for f in d if a<=f<=b]; print('%-18s %3d-%3d n=%3d mean %.2f range %.2f-%.2f'%(n,a,b,len(v),np.mean(v),min(v),max(v)))
v=[x[0] for x in d.values()]; print('all mean %.2f   max ms (after first) %d, mean ms %.0f'%(np.mean(v), max(x[1] for f,x in d.items() if f>151), np.mean([x[1] for f,x in d.items() if f>151])))
