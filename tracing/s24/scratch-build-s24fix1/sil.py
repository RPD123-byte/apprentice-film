# sil.py file.js -> dict name -> {'pts':[...], 'notch':[...]}
import re,json
def load(fn):
  s=open(fn).read(); out={}
  for m in re.finditer(r'export const (\w+)\s*=\s*\{(.*?)\};',s,re.S):
    name,body=m.group(1),m.group(2); d={}
    for mm in re.finditer(r'(\w+):\s*pairs\(\[([^\]]*)\]\)',body):
      v=[float(x) for x in mm.group(2).split(',') if x.strip()]
      d[mm.group(1)]=[(v[i],v[i+1]) for i in range(0,len(v),2)]
    out[name]=d
  return out
