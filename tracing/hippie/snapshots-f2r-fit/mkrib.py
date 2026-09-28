import json, glob
parts = []
for name in ['ribA', 'ribB', 'ribD1', 'ribD2']:
    J = json.load(open(name + '.b.json'))
    parts.append(f"  {name}: {{ cls: {json.dumps(''.join(J['cls']))}, b: {json.dumps(J['b'], separators=(',', ':'))} }},")
open('ribbons.frag.js', 'w').write('const RIBBONS = {\n' + '\n'.join(parts) + '\n};\n')
