import cv2, numpy as np, sys
def blob(im, kind):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV).astype(int); H,S,V=hsv[...,0],hsv[...,1],hsv[...,2]
    m=((H>=18)&(H<=34)&(S>=110)&(V>=110)) if kind=="yellow" else (((H<=7)|(H>=168))&(S>=110)&(V>=50))
    m=m.astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: return None
    k=1+np.argmax(st[1:,4]); x,y,w,h,a=st[k]
    L=cv2.cvtColor(im,cv2.COLOR_BGR2LAB).astype(float); C=np.sqrt((L[...,1]-128)**2+(L[...,2]-128)**2)
    sel=lab==k
    return dict(x=int(x),y=int(y),w=int(w),h=int(h),h_pct=round(h/19.2,1),w_pct=round(w/10.8,1),area_pct=round(a/(1080*1920)*100,2),chroma=round(float(np.median(C[sel])),1),L=round(float(np.median(L[...,0][sel])*100/255),1))
for f in sys.argv[1:]:
    im=cv2.imread(f); L=cv2.cvtColor(im,cv2.COLOR_BGR2LAB).astype(float); C=np.sqrt((L[...,1]-128)**2+(L[...,2]-128)**2)
    print(f.split('/')[-1],"frame chroma median",round(float(np.median(C)),1),"| suitcase",blob(im,"yellow"),"| cap",blob(im,"red"))
