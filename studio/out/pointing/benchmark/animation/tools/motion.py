import subprocess,json,glob,os,sys
import numpy as np
B="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/benchmark/animation"
S="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out"
vids={"POINTING(rejected)":S+"/pointing/pointing_FINAL_1080x1920.mp4",
"antitheft":S+"/antitheft/antitheft_FINAL_1080x1920.mp4",
"saladoil":S+"/saladoil/saladoil_FINAL_v2_1080x1920.mp4",
"clown":S+"/clown/upload/clown_FINAL_1080x1920.mp4",
"typo":S+"/typo/upload/typo_FINAL_1080x1920.mp4"}
for p in sorted(glob.glob("C:/Users/utkar/Desktop/yt short videos/*.mp4"))+sorted(glob.glob("C:/Users/utkar/Desktop/yt short videos/new_2026-11-19/*.mp4")):
    n=os.path.basename(p)[:-4]
    if n.endswith("(1)"): continue
    vids["REF:"+n[:40]]=p
W,H=108,192
out={}
for name,p in vids.items():
    cmd=["ffmpeg","-v","error","-i",p,"-vf",f"fps=30,scale={W}:{H}","-f","rawvideo","-pix_fmt","gray","-"]
    raw=subprocess.run(cmd,capture_output=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,H,W).astype(np.int16)
    n=len(a)
    top=int(H*0.58)
    d=np.abs(np.diff(a,axis=0))
    mov=(d>14)
    area_full=mov.mean(axis=(1,2))
    pic=mov[:,:top,:]
    area_pic=pic.mean(axis=(1,2))
    mad=d.mean(axis=(1,2))
    # grid 4x6 on picture region
    gh,gw=6,4
    cells=np.zeros(len(d))
    ch=top//gh; cw=W//gw
    for i in range(gh):
        for j in range(gw):
            c=pic[:,i*ch:(i+1)*ch,j*cw:(j+1)*cw].mean(axis=(1,2))
            cells+= (c>0.04)
    # cut detection: hist distance
    hs=np.array([np.histogram(f,bins=32,range=(0,256))[0] for f in a],float)
    hs/=hs.sum(1,keepdims=True)
    hd=0.5*np.abs(np.diff(hs,axis=0)).sum(1)
    cut=np.where((mad>18)&(hd>0.18)|(mad>32))[0]
    # merge cuts closer than 4 frames
    cl=[]
    for c in cut:
        if not cl or c-cl[-1]>4: cl.append(int(c))
    noncut=np.ones(len(d),bool)
    for c in cl: noncut[max(0,c-1):c+2]=False
    ap=area_pic[noncut]; ce=cells[noncut]
    res=dict(frames=n,dur=n/30,cuts=len(cl),avg_shot_s=round(n/30/(len(cl)+1),2),
      moving_area_pic_mean=round(float(ap.mean())*100,1),
      moving_area_pic_median=round(float(np.median(ap))*100,1),
      pct_frames_dead=round(float((ap<0.01).mean())*100,1),   # nothing moves
      pct_frames_onething=round(float(((ap>=0.01)&(ce<=3)).mean())*100,1), # one small region moves
      pct_frames_wide=round(float((ce>=12).mean())*100,1),  # half+ of picture moving (camera/whole scene)
      mean_cells=round(float(ce.mean()),1), cutlist=cl)
    out[name]=res
    np.save(f"{B}/tools/m_{len(out):02d}.npy",np.stack([area_pic,cells,mad]))
    print(name,{k:v for k,v in res.items() if k!='cutlist'},flush=True)
json.dump(out,open(B+"/tools/motion.json","w"),indent=1)
