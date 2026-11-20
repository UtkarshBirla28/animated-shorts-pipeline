from PIL import Image,ImageDraw,ImageFont
B="C:/Users/utkar/Desktop/animated-shorts-studio/studio/out/pointing/benchmark/animation"
W={
"01_s04_middle_finger_over_boy":[214,220,222,224,226,232,240,252],
"02_s24_finger_across_face_at_loop":[1880,1890,1896,1898,1900,1902,1904,1906],
"03_s02_turn_double_exposure_arm_in_mouth":[128,130,132,134,136,138],
"04_s11_ghost_tourist_floats_out":[836,838,840,842,844,846,848,850],
"05_s03b_driver_white_blob_fist":[164,170,174,180,192,196,204,208],
"06_s01_handless_plank_arm_hook":[0,10,16,18,20,30,48,70],
"07_s15_tpose_scarecrow_and_ghost_turn":[1084,1088,1092,1094,1110,1140,1142,1144],
"08_s20_rod_arm_no_body":[1610,1612,1614,1620,1636,1648,1652,1660],
"09_s16a_s16b_dead_4s_and_floating_fist":[1150,1180,1210,1240,1270,1284,1300,1326],
"10_s17_s19_lab_only_balls_move":[1356,1380,1410,1440,1498,1530,1560,1590],
}
try: font=ImageFont.truetype("arial.ttf",26)
except: font=ImageFont.load_default()
for k,fr in W.items():
    tw,th=270,480
    sh=Image.new("RGB",(tw*len(fr),th+40),(20,20,20));d=ImageDraw.Draw(sh)
    for i,f in enumerate(fr):
        sh.paste(Image.open(f"{B}/frames/f{f:04d}.jpg").resize((tw,th)),(i*tw,40))
        d.text((i*tw+6,6),f"f{f} ({f/30:.2f}s)",fill=(255,230,0),font=font)
    sh.save(f"{B}/worst/{k}.jpg",quality=88)
print("ok")
