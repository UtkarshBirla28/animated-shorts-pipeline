import json, os
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = ['pointing','clown','antitheft','saladoil','typo','R_jobjapan','R_burglar','R_stormoil','R_window','R_railroads','R_pinkcell','R_cart','R_dashcam']
D = {k: json.load(open(os.path.join(B,'data',k+'.metrics.json'),encoding='utf-8')) for k in K}
def g(d, path):
    x = d
    for p in path.split('.'):
        if x is None: return None
        x = x.get(p) if isinstance(x, dict) else None
    return x
rows = [('dur','dur'),('I','r128.I'),('LRA','r128.LRA'),('TP','r128.TP'),('words','n_words'),('wps film','wps_film'),('speech_s','speech_time'),
 ('gaps>0.3','gaps_over_0_3'),('gaps>0.6','gaps_over_0_6'),('gaps>1.0','gaps_over_1_0'),('gap time>0.3','gap_time_over_0_3'),('no voice s','no_voice_s'),('dead air s','dead_air_s'),
 ('first word','first_word'),('tail','close.tail_after_last_word'),
 ('f0 med','f0_median_all'),('f0 rng p5-95','f0_range_st_p5_p95'),('f0 sd in sent','f0_sd_within_sentence_median'),('f0 rng in sent','f0_range_within_sentence_median'),
 ('jump med st','jump_between_sentences_st_median'),('jumps>5st','jump_between_sentences_over_5st'),('n sent','n_sentences'),('sent>5st off','sentences_over_5st_from_median'),('ends','ends'),
 ('sent wps med','sentence_wps_median'),('sent wps sd','sentence_wps_sd'),('word dB sd','word_db_sd_median'),('sent dB sd','sentence_db_sd'),
 ('bed gaps vs sp','est_bed_in_gaps_db_vs_speech'),('floor p10','est_floor_p10_vs_speech'),('tonal gaps','tonal_frac_gaps'),('onsets/10s gap','mix_onsets_in_gaps_per10s_gap'),
 ('S-M dB','side_minus_mid_db'),('LRcorr','lr_corr'),('<120','ltas_rel.<120'),('120-400','ltas_rel.120-400'),('2-5k','ltas_rel.2-5k'),('5-10k','ltas_rel.5-10k'),('10-16k','ltas_rel.10-16k'),('centroid','centroid_median'),
 ('open 0-.05','open.rms_0_0.05'),('open 0-.3','open.rms_0_0.3'),('peak 0-.3','open.peak_0_0.3'),('last2 rms','close.rms_last2'),('last.3 rms','close.rms_last0.3'),('asr p','mean_p'),
 ('music LUFS','stems.music_lufs'),('music %film','stems.music_present_pct_film'),('music under v','stems.music_under_voice_median_db'),('music silent s','stems.music_silent_total_s'),('music jumps/min','stems.music_level_jumps_over_6db_per_min'),('music centroid','stems.music_centroid_median'),
 ('sfx LUFS','stems.sfx_lufs'),('sfx under v','stems.sfx_under_voice_median_db'),('sfx on/10s','stems.sfx_onsets_per10s'),('sfx on vs v','stems.sfx_onset_db_vs_voice_median'),('sfx on p90','stems.sfx_onset_db_vs_voice_p90'),('sfx cent','stems.sfx_onset_centroid_median'),
 ('amb LUFS','stems.amb_lufs'),('amb under v','stems.amb_under_voice_median_db'),('voice LUFS','stems.voice_lufs'),('stem corr','stems_vs_final_corr')]
def f(v):
    if isinstance(v,float): return '%.2f'%v if abs(v)<10 else '%.1f'%v
    if isinstance(v,dict): return '/'.join(str(x) for x in v.values())
    return str(v)
print('| metric | ' + ' | '.join(K) + ' |')
for n,p in rows:
    print('| %s | '%n + ' | '.join(f(g(D[k],p)) for k in K) + ' |')
