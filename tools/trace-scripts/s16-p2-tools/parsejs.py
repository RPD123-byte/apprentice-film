import re, json, numpy as np
def parse_drawing(text):
    """parse one 'export const X = { box:[..], L:[..], D:[..], B:[..] }' block of the compact format"""
    def arr(name):
        i = text.index('  %s: [' % name) + len('  %s: ' % name)
        depth = 0
        for j in range(i, len(text)):
            if text[j] == '[': depth += 1
            elif text[j] == ']':
                depth -= 1
                if depth == 0: return json.loads(re.sub(r',\s*\]', ']', text[i:j + 1]))
    box = json.loads(text[text.index('box: ') + 5:text.index(']', text.index('box: ')) + 1])
    L = arr('L'); D = arr('D'); B = arr('B')
    def ring(a):
        q = np.array(a, float).reshape(-1, 2); q = np.cumsum(q, 0) / 2; return q
    Ld = [[it[0] / 1000, [ring(r) for r in it[1:]]] for it in L]
    def stroke(a):
        a = np.array(a, float).reshape(-1, 4); xy = np.cumsum(a[:, :2], 0) / 2
        return [[x - 0.5, y - 0.5, w / 10, s / 100] for (x, y), w, s in zip(xy, a[:, 2], a[:, 3])]
    return box, Ld, [stroke(s) for s in D], [stroke(s) for s in B]
