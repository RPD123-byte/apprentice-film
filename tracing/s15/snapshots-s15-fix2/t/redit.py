# redit.py: edit rows of a roto*.js file (text-level, keeps everything else as is)
import re, json
ROOT = '/Users/computer/rootline/apprentice-film/src/shots/s15/'
class Roto:
    def __init__(self, name):
        self.p = ROOT + name; self.s = open(self.p).read()
    def _line(self, f):
        i = self.s.index(f'\n  {f}: [') + 1; j = self.s.index('\n', i)
        return i, j
    def rows(self, f):
        i, j = self._line(f); line = self.s[i:j]
        k = line.index('['); arr = line[k:].rstrip().rstrip(',')
        return json.loads(arr)
    def set_rows(self, f, rows):
        i, j = self._line(f); line = self.s[i:j]
        k = line.index('['); tail = ',' if line.rstrip().endswith(',') else ''
        body = '[' + ','.join('[' + ','.join(json.dumps(x) if isinstance(x, str) else (f'{x:.1f}' if abs(x - round(x)) < 1e-9 and abs(x) >= 1 else repr(round(x, 3))) for x in r) + ']' for r in rows) + ']'
        self.s = self.s[:i] + line[:k] + body + tail + self.s[j:]
    def drop(self, f, fid):
        self.set_rows(f, [r for r in self.rows(f) if r[0] != fid])
    def put(self, f, row, after=None):
        rows = [r for r in self.rows(f) if r[0] != row[0]]
        if after is None: rows.append(row)
        else:
            k = next((n for n, r in enumerate(rows) if r[0] == after), len(rows) - 1)
            rows.insert(k + 1, row)
        self.set_rows(f, rows)
    def face(self, fid, d):
        i = self.s.index('faces: {') + len('faces: {')
        if f'"{fid}":' in self.s[:self.s.index('frames:')]:
            return
        self.s = self.s[:i] + f'"{fid}":' + json.dumps(d, separators=(',', ':')) + ',' + self.s[i:]
    def save(self):
        open(self.p, 'w').write(self.s)
