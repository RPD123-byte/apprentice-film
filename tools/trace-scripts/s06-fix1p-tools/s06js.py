# s06js.py: load the s06 JS data modules (export const NAME = <json-ish literal>;) into Python (measurement only)
import re, json, os
ROOT = '/Users/computer/rootline/apprentice-film'
def load(name):
    p = name if name.endswith('.js') else os.path.join(ROOT, 'src/shots/s06/data', name + '.js')
    txt = open(p).read()
    txt = re.sub(r'^\s*//.*$', '', txt, flags=re.M)
    out = {}
    parts = re.split(r'export const (\w+)\s*=\s*', txt)
    for i in range(1, len(parts), 2):
        k, body = parts[i], parts[i + 1].strip()
        body = body.rstrip().rstrip(';')
        body = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', body)
        body = re.sub(r',\s*([\]}])', r'\1', body)
        out[k] = json.loads(body)
    return out
def strokes(set_, stride=5):
    import numpy as np
    return [np.array(s, float).reshape(-1, stride) for s in set_ if len(s) >= 2 * stride]
