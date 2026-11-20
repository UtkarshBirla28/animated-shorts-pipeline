"""Character voice CASTING takes: 3 candidates per role, one take each on the role's own line(s), eleven_v4, with the
narrator's lead-in as previous_text (context only). The winner's casting take counts as its t1.
  python make_jobs_chars.py  -> jobs/cast.json"""
import json

import v6_lib as L

T = L.TEXT
ROLES = {
    # role: (lines, take text, prev line ids, next line ids, [(candidate name, voice id)])
    "STUDENT": (["s01", "s02"], "[proudly] I own a unicycle... and a clown suit.", ["n07"], ["n08"],
                [("erby", "n27L8GNoVt7SPUboEQb7"), ("sheldon", "uWNz6TbvrJHW6G4bBMPw"), ("nathan", "g2W4HAjKvdW93AmsjsOx")]),
    "INTERVIEWER": (["i01"], "[friendly] Did you see anything unusual?", ["n08", "n09"], ["f01"],
                    [("irene", "w9xM4Spfmuw28ZXAirWK"), ("nikki", "yhFUAoS32gPDJFQHbH68"), ("sarah", "EXAVITQu4vr4xnSDxMaL")]),
    "FRIEND": (["f01"], "[laughing] The clown? He was amazing!", ["i01"], ["h01"],
               [("kymmiee", "KHDywVwjZ97ShJLe4NCr"), ("jessica", "cgSgspJ2msm6clMCkdW9"), ("laura", "FGY2WhTYpPnrIDTdsKH5")]),
    "HEADPHONES": (["h01"], "[relaxed] Dude, the unicycle guy!", ["i01", "f01"], ["p01"],
                   [("jerryb", "rHWSYoq8UlV0YIBKMryp"), ("brandon", "QzclONYwRWvec152I3wf"), ("will", "bIHbv24MWmeRgasZH58o")]),
    "PHONE_GUY": (["p01"], "[confused] Sorry... what clown?", ["i01", "h01"], ["n10"],
                  [("jeremy", "5gaEGrWSk4v20HMfIhgC"), ("trevor", "69SAlwj2jajrSXUGnYAA"), ("chris", "iP95p4xoKVk53GoZ742B")]),
}
if __name__ == "__main__":
    jobs = []
    for ri, (role, (lines, text, prev, nxt, cands)) in enumerate(ROLES.items()):
        assert L.word_diff(" ".join(T[i] for i in lines), text) == [], (role, L.word_diff(" ".join(T[i] for i in lines), text))
        for ci, (name, vid) in enumerate(cands):
            jobs.append({"folder": f"cast_{role.lower()}", "take": name, "voice": vid, "model": L.MODEL, "text": text,
                         "stability": 0.5, "speed": 1.0, "seed": 8000 + 10 * ri + ci, "prev": " ".join(T[i] for i in prev) or None,
                         "next": " ".join(T[i] for i in nxt) or None, "lines": lines, "role": role, "candidate": name})
    (L.HERE / "jobs" / "cast.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(jobs), "jobs,", sum(len(j["text"]) for j in jobs), "characters")
