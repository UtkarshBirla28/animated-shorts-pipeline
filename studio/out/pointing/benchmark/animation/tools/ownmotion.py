import subprocess,json,glob,os,sys
import numpy as np, cv2
B="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/benchmark/animation"
S="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out"
R="C:/Users/utkar/Desktop/yt short videos"
vids={"POINTING":S+"/pointing/pointing_FINAL_1080x1920.mp4",
"antitheft":S+"/antitheft/antitheft_FINAL_1080x1920.mp4",
"saladoil":S+"/saladoil/saladoil_FINAL_v2_1080x1920.mp4",
"clown":S+"/clown/upload/clown_FINAL_1080x1920.mp4",
"typo":S+"/typo/upload/typo_FINAL_1080x1920.mp4"}
for p in sorted(glob.glob(R+"/*.mp4"))+sorted(glob.glob(R+"/new_2026-11-19/*.mp4")):
    n=os.path.basename(p)[:-4]
    if n.endswith("(1)"): continue
    vids["REF:"+n.split(" [")[0][:38]]=p
W,H=180,320
yy=np.arange(H)[:,None]*np.ones((1,W))
mask=~((yy>H*0.62)&(yy<H*0.78))  # drop caption band
gy,gx=np.mgrid[8:H-8:12,8:W-8:12]
pts=np.stack([gx.ravel(),gy.ravel()],1).astype(np.float32)
out={}
for name,p in vids.items():
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"fps=15,scale={W}:{H}","-f","rawvideo","-pix_fmt","gray","-"],capture_output=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,H,W)
    cam=[];own=[];cells=[];valid=[]
    for i in range(len(a)-1):
        f=cv2.calcOpticalFlowFarneback(a[i],a[i+1],None,0.5,3,15,3,5,1.2,0)
        v=f[gy.ravel(),gx.ravel()]
        M,inl=cv2.estimateAffine2D(pts,pts+v,ransacReprojThreshold=1.0)
        if M is None: cam.append(0);own.append(0);cells.append(0);valid.append(False);continue
        X=np.stack([np.tile(np.arange(W),H),np.repeat(np.arange(H),W),np.ones(W*H)],1)
        pred=(X@M.T).reshape(H,W,2)-np.stack(np.meshgrid(np.arange(W),np.arange(H)),2)
        res=np.linalg.norm(f-pred,axis=2)
        m=(res>1.0)&mask
        area=m.sum()/mask.sum()
        t=np.hypot(M[0,2]+M[0,0]*W/2+M[0,1]*H/2-W/2, M[1,2]+M[1,0]*W/2+M[1,1]*H/2-H/2)  # centre displacement
        cam.append(t/W*100/2)  # % of width per 30fps frame
        own.append(area*100)
        c=0
        for r in range(8):
            for q in range(4):
                blk=m[r*40:(r+1)*40,q*45:(q+1)*45]
                if blk.mean()>0.03:c+=1
        cells.append(c)
        valid.append(area<0.6)
    cam=np.array(cam);own=np.array(own);cells=np.array(cells);valid=np.array(valid)
    np.save(f"{B}/tools/own_{name.replace(':','_').replace(' ','_')[:30]}.npy",np.stack([cam,own,cells,valid.astype(float)]))
    c=cam[valid];o=own[valid];ce=cells[valid]
    res=dict(dur=round(len(a)/15,1),
      cam_median_pct_per_f=round(float(np.median(c)),3),
      cam_still_pct=round(float((c<0.05).mean()*100),1),
      own_motion_area_mean=round(float(o.mean()),2),own_motion_area_median=round(float(np.median(o)),2),
      dead_acting_pct=round(float((o<0.5).mean()*100),1),
      one_spot_pct=round(float(((o>=0.5)&(ce<=2)).mean()*100),1),
      spread_cells_mean=round(float(ce.mean()),2),
      busy_pct=round(float((ce>=6).mean()*100),1))
    out[name]=res
    print(name,res,flush=True)
json.dump(out,open(B+"/tools/ownmotion.json","w"),indent=1)
