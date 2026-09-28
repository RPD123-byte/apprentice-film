import cv2, os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')
def frame(k): return cv2.imread(os.path.join(D,f'{k}.png'))
