# p4: the S8 twinkle sits on the friend's "The clown?": 3 dB softer there
import os

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sfx.py")
s = open(P, encoding="utf-8").read()
a = '           ("jaw_drop", "S5"): -5.0}'
b = '           ("jaw_drop", "S5"): -5.0, ("sparkle", "S8"): -3.0}   # p4: the S8 twinkle sits on the friend\'s "The clown?"'
assert s.count(a) == 1
s = s.replace(a, b)
open(P, "w", encoding="utf-8").write(s)
print("ok")
