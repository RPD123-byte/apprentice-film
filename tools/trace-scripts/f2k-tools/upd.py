# re-emit traced patches and splice them into hippie.js
import subprocess, sys
D='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f2k/'
P='/Users/computer/rootline/apprentice-film/src/lib/hippie.js'
BL={'TR_CL':5,'TR_R2':5,'TR_TL':3,'TR_DES':3,'TR_SR':3,'TR_SL':3,'TR_BL':3,'TR_BR':3,'TR_HL':3,'TR_DK':3,'TR_TOP':3,'TR_MID':3,'TR_OWL':3,'TR_XL':3,'TR_XR':3}
FN={'TR_CL':'tr-cl','TR_R2':'tr-r2','TR_TL':'tr-tl','TR_DES':'tr-des','TR_SR':'tr-sr','TR_SL':'tr-sl','TR_BL':'tr-bl','TR_BR':'tr-br','TR_HL':'tr-hl','TR_DK':'tr-dk','TR_TOP':'tr-top','TR_MID':'tr-mid','TR_OWL':'tr-owl','TR_XL':'tr-xl','TR_XR':'tr-xr'}
names=sys.argv[1:] or list(FN)
s=open(P).read()
for nm in names:
  f=FN[nm]
  subprocess.run(['python3',D+'emit.py',D+f+'.json',nm,str(BL[nm])],check=True,stdout=subprocess.DEVNULL)
  if 'const '+nm+' = {' not in s:
    s=s.rstrip('\n')+'\n'+open(D+f+'.js').read()
  else:
    a=s.index('const '+nm+' = {'); b=s.index('] };\n',a)+5
    s=s[:a]+open(D+f+'.js').read()+s[b:]
open(P,'w').write(s)
print('updated',names)
