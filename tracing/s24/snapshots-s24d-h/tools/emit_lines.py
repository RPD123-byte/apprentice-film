import json
out=['// s24 speed-line sets, measured on the source: the lines boil through three drawings (A, B, C) in the F/H beats,',
     '// the dive holds its own set D (k69–82), then a new set every frame (K83–K89, E = k90–91; K68 = k68). Each set is a list of straight bars in a frame rotated by',
     '// `ang` (u along the lines, v across; x = u cos a − v sin a, y = u sin a + v cos a), measured on a median of that set\'s',
     '// frames with the owl and scissors masked out: [u0, u1, v, FWHM width, value at the start / middle / end third]',
     '// (0–255, ungraded: the inverse of post.js\'s S-curve and vignette at the bar). Coordinates and values only;',
     '// s24.js draws them as soft round-capped bars.']
out.append('const unpack = (a) => { const o = []; for (let i = 0; i < a.length; i += 7) o.push(a.slice(i, i + 7)); return o; };')
out.append('export const LINE_SETS = {')
for n in ['A','B','C','D','E','K67','K68','K83','K84','K85','K86','K87','K88','K89']:
  d=json.load(open('meas/bars2%s.json'%n))
  flat=[]
  for b in d['bars']:
    flat+= [round(b[0]*2)/2, round(b[1]*2)/2, round(b[2]*4)/4, round(b[3]*4)/4, round(b[4]), round(b[5]), round(b[6])]
  txt=','.join(('%g'%v) for v in flat)
  out.append('  %s: { ang: %s, bars: unpack([%s]) },'%(n,d['ang'],txt))
out.append('};')
open('/Users/computer/rootline/apprentice-film/src/shots/s24/d/lineData.js','w').write('\n'.join(out)+'\n')
