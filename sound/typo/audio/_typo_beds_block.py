def _S(x):
    return st(x) if np.ndim(x) == 1 else x


def _sparse(n, r, rate, fn, t0=0.3):
    """mono layer: fn(r) placed at Poisson times (rate per s), deterministic for the seed"""
    y = np.zeros(n)
    tm = t0 + r.exponential(1.0 / rate)
    while tm < n / SR - 0.3:
        x = np.asarray(fn(r), float)
        x = x.mean(0) if x.ndim > 1 else x
        G._place_mono(y, x * r.uniform(0.4, 1.0), tm)
        tm += r.exponential(1.0 / rate)
    return y


def bed_signal(key, t0, t1, r):
    n = ns(t1 - t0)
    if key in ("office", "office_eve"):
        eve = key == "office_eve"
        air = _S(G.room_tone(n, r, hum=0.25, air=0.9 if eve else 1.0))
        keys = widen(lp(_sparse(n, r, 1.2 if eve else 6.0, lambda q: key_click(q, False)), 3500.0, 1), r, 10, 0.8)
        murmur = _S(G.crowd_murmur(n, r, voices=3 if eve else 6, lo=170.0, hi=1100.0, density=0.5 if eve else 0.9))
        phone = _S(lp(_sparse(n, r, 0.0 if eve else 0.07, lambda q: G.phone_ring(q, 1.2, far=2.5)), 2600.0, 1)) if not eve else 0 * air
        hum = _S(G.lamp_hum(n, r, mains=50.0))
        city = _S(lp(G.city(n, r, 0.6), 1200.0, 1)) if eve else 0 * air
        return _mix([(air, 0.0), (keys, -9.0 if not eve else -14.0), (murmur, -8.0 if not eve else -15.0), (phone, -14.0),
                     (hum, -18.0), (city, -8.0)])
    if key == "street":
        city = _S(G.city(n, r, 1.0))
        cars = _S(lp(_sparse(n, r, 0.25, lambda q: G2.car_pass(q, 2.2, 0.5)), 5000.0, 1))
        birds = _S(_sparse(n, r, 0.3, lambda q: G.bird_chip(q)))
        return _mix([(city, 0.0), (cars, -5.0), (birds, -16.0)])
    if key in ("lobby", "museum"):
        mus = key == "museum"
        air = _S(G.room_tone(n, r, hum=0.1, air=1.4))
        crowd = _S(G.crowd_murmur(n, r, voices=4 if mus else 11, lo=200.0, hi=1500.0, density=0.5 if mus else 1.2))
        tick = _S(G.ticker(n, r, rate=7.0, level=0.6)) if not mus else 0 * air
        return _mix([(air, 0.0), (crowd, -6.0 if not mus else -16.0), (tick, -16.0)])
    if key == "homes":
        air = _S(G.room_tone(n, r, hum=0.5, air=0.8))
        fan = _S(G.lamp_hum(n, r, mains=50.0))
        city = _S(lp(G.city(n, r, 0.5), 1500.0, 1))
        return _mix([(air, 0.0), (fan, -10.0), (city, -10.0)])
    if key == "hall":
        air = _S(G.room_tone(n, r, hum=0.0, air=1.0))
        birds = _S(_sparse(n, r, 0.5, lambda q: G3.sparrow_chirp(q)))
        return _mix([(air, 0.0), (birds, -12.0)])
    if key == "court":
        air = _S(G.room_tone(n, r, hum=0.0, air=0.8))
        paper = _S(_sparse(n, r, 0.12, lambda q: G.paper_rustle(q, 0.3, 0.7)))
        return _mix([(air, 0.0), (paper, -16.0)])
    return np.zeros((2, n))


def bed_mod_db(key, t):
    """per-sample level automation of a bed (dB) on top of its level"""
    g = np.zeros(len(t))
    B = T.BEAT
    if key == "office":
        # the mystery: the room thins; the cancel beat: the room leans in; each 'Nothing.': near-dead silence (the clock stays)
        g += np.interp(t, [T.fr(B["but"]) - 0.2, T.fr(B["but"]), T.fr(B["cancelIt"]) - 0.1, T.fr(B["cancelIt"])], [0, -4, -4, 0], left=0, right=0)
        for a, z in ((B["nothing1"], B["again"]), (B["nothing2"], B["nothing2End"] + 18)):
            ta, tz = T.fr(a) - 0.04, T.fr(z) - 0.05
            g += np.interp(t, [ta - 0.05, ta, tz, tz + 0.15], [0, -20, -20, 0], left=0, right=0)
    return g
