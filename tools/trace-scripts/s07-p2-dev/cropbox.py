import cv2,sys
x0,y0,x1,y1=map(int,sys.argv[3].split(','))
cv2.imwrite(sys.argv[2],cv2.imread(sys.argv[1])[y0:y1,x0:x1])
