# estimated timing for the rewrite; N 3.3 w/s, char lines 3.0 w/s, calls fixed, gap 0.18 s (+extra where noted)
L=[
("N","This tourist yells at his own suitcase.",0),
("T","Suitcase... CHECK!",'c1.45'),
("N","And it's the smartest thing he's done all trip.",0),
("N","You see, he loses a suitcase on every trip.",0),
("N","Three days ago, he was laughing at the guy who fixed that.",0),
("D","Signal... green!",'c1.40'),
("T","He's yelling at a traffic light!",0),
("D","Platform... clear!",'c1.40'),
("T","Clear of WHAT?",0),
("N","He sent the clip home to New York.",0),
("N","Then the kid beside him joined in.",0),
("K","Door... closed!",'c1.30'),
("N","So, as a joke... so did he.",0),
("T","Coffee... CHECK!",'c1.35'),
("T","Passport... CHECK!",'c1.40'),
("T","Pants...",'c0.75'),
("T","...check.",'c0.80'),
("N","Six train rides. Nothing lost.",0),
("N","So on day three, he decided he was cured.",0),
("T","I don't need the finger anymore.",0),
("N","He grabbed his coffee... his phone... his passport...",0.3),
("D","Doors... closed!",'c1.40'),
("N","...but not his suitcase.",0.35),
("K","Bag... CHECK!",'c1.30'),
("T","Bag... gone.",'c1.50'),
("N","Japan's railway lab tested this.",0.2),
("N","Just looking: six mistakes.",0),
("N","Pointing and saying it out loud: about one.",0),
("N","A finger and a shout drag your mind back.",0),
("N","And his friends in New York? Their subway conductors point too.",0.1),
("N","The suitcase? Lost and found had it by lunch.",0),
]
t=0.08; tot=0
for sp,txt,x in L:
    w=len(txt.replace('...',' ').split())
    extra=0
    if isinstance(x,str): d=float(x[1:])
    else:
        d=w/(3.3 if sp=='N' else 3.0); extra=x
    t+=extra
    print(f"{t:5.1f}-{t+d:5.1f} {sp} {txt}")
    t+=d+0.18; tot+=w
print('end',round(t,1),'words',tot)
