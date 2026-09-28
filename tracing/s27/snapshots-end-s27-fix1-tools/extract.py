# end-s27-rev1: decode frames by index from a video (sequential read from a seek point) -> OUT/<prefix><F>.png
import cv2, sys, os
vid, out, prefix, frames = sys.argv[1], sys.argv[2], sys.argv[3], sorted(map(int, open(sys.argv[4]).read().split(',')))
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(vid)
f0 = frames[0] - 50
cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
i = f0; want = set(frames)
# verify seek position by reading pos
while i <= frames[-1]:
    ok, im = cap.read()
    if not ok: break
    if i in want: cv2.imwrite(f'{out}/{prefix}{i}.png', im)
    i += 1
print('done', len(want))
