import re
p='src/lib/hippie.js'; s=open(p).read()
a=s.index('  // raised forearm (sleeve rolled): elbow on the desk, fist under the chin')
b=s.index('  // laptop lid (seen from behind) and his other hand on the keys')
new=open('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/head.js').read()
s=s[:a]+new+s[b:]
old_hair='''  // hair mass behind the face
  shape(ctx, [[940, 400], [990, 380], [1060, 372], [1130, 374], [1186, 396], [1190, 450], [1182, 500], [1170, 540], [1150, 520], [1150, 470], [1000, 470], [980, 520], [960, 505], [944, 460]], HC.hair, { lw: 2, smooth: true });
'''
assert old_hair in s
s=s.replace(old_hair,'')
open(p,'w').write(s)
print('ok')
