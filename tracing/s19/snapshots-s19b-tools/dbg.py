import sys; sys.path.insert(0, '.')
from lab import *
L = Lab()
im = L.dev('card', {'t': 57.36}); print('card only first', im.mean())
im = L.render(57.36, False); print('ungraded', im.mean(), im[400, 1300])
im = L.render(57.36, True); print('graded', im.mean(), im[400, 1300])
im = L.dev('card', {'t': 57.36}); print('card only after', im.mean())
L.close()
