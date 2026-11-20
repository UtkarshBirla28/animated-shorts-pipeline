import sys, cv2
im = cv2.imread(sys.argv[1]); h, w = im.shape[:2]
for a in sys.argv[2:]:
    x, y = [float(v) for v in a.split(",")]
    X, Y = int(x * w), int(y * h); p = im[max(0,Y-3):Y+4, max(0,X-3):X+4].reshape(-1, 3).mean(0)[::-1]
    print(a, "rgb", [int(v) for v in p])
