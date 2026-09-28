import re, numpy as np, sys
L=open(sys.argv[1]).read().splitlines()
v=[(float(re.search(r't=\s*([\d.]+)',l).group(1)), float(re.search(r'blur8\s+([\d.]+)',l).group(1)), float(re.search(r'blur2\s+([\d.]+)',l).group(1))) for l in L if 'blur8' in l]
print('mean blur8 %.2f blur2 %.2f  max %.2f at %.2f'%(np.mean([x[1] for x in v]), np.mean([x[2] for x in v]), max(x[1] for x in v), max(v,key=lambda x:x[1])[0]))
for a,b in [(6.04,8.7),(8.7,10.56),(10.56,12.4),(12.4,14.44),(14.44,15.88),(15.88,16.56),(16.56,17.6),(17.6,18.4),(18.4,19.13)]:
    s=[x[1] for x in v if a<=x[0]<b]; print('%5.2f-%5.2f  mean %.2f max %.2f n=%d'%(a,b,np.mean(s),max(s),len(s)))
