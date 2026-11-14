# Picture probes for the saladoil sound (fix round 1): read the MERGED picture code (studio/src/videos/saladoil/*.ts) at
# mix time and pull out the frame formulas of the actions the SFX must hit, so a picture re-time after a merge reaches
# the sound on the next `python mix.py` without anyone copying frames by hand. Every probe has a fallback in sfx.py (the
# formula as it was at the A1 merge); picture_events_used.json "_probes" lists which ones were read from the code, and
# picture_events.json still overrides everything.
#   flapState (sets_ext.ts)      : each LOANS digit's roll start s(i) and landing land(i) (T f per flip)
#   PLUNK (sets_ext.ts)          : the plumb weight hits the oil (shot 4)
#   BL (sets_ext.ts poseTop)     : the shot-7 bubble ring under the lender's face
#   perched gull (sets_ext.ts)   : shot 4's rail gull startled off by the shout (tOff)
#   car reflection (sets_ext.ts) : shot 14's passing car sliding across the shop window (cu window)
#   flashAt (sets_ext.ts) and FLASHES (SaladOil.tsx): the lightning flash frames (shots 8-9)
#   S4 (cast.ts)                 : the tank man's shot-4 contacts (climb pulls, rim, on the roof, kneel, stand, rail)
#   STAMPS5 (cast.ts)            : the banker's stamp landings, both hands (shot 5)
#   bottleShake (cast.ts)        : the shake window on 'Ever' and its rock period (shot 11)
#   PULLS13 / valveAngle (cast.ts): the valve-wheel pulls per worker (shot 13)
# The expressions are evaluated with BEAT, SHOTS (0-indexed, like story.ts) and i / k only (no builtins).
# PROBE_SRC=<dir> reads another folder (e.g. an owner's sandbox) for a dry run.
import os
import re
import math

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("PROBE_SRC") or os.path.normpath(os.path.join(HERE, "..", "..", "..", "studio", "src", "videos", "saladoil"))


class _Beat(dict):
    def __getattr__(self, k):
        return self[k]


def _read(name):
    try:
        with open(os.path.join(SRC, name), encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def _js(expr, env):
    """evaluate a small JS arithmetic expression (BEAT.x, SHOTS[n].a/.b, numbers, + - * /, Math.min / max / floor, i, k)"""
    e = expr.strip().rstrip(";,")
    e = re.sub(r"Math\.(min|max|floor|round|abs)", r"\1", e)
    e = re.sub(r"SHOTS\[(\d+)\]\.(a|b)", r'SHOTS[\1]["\2"]', e)
    if re.search(r"[^\w\s\.\+\-\*/\(\),\[\]\"]", e):
        raise ValueError(f"unsupported expression {expr!r}")
    ns = {"min": min, "max": max, "floor": math.floor, "round": round, "abs": abs}
    ns.update(env)
    return float(eval(e, {"__builtins__": {}}, ns))  # noqa: S307 (own project's picture code, restricted namespace)


def _list(txt, env):
    """'[a, b, c]' of JS expressions -> [floats]"""
    out = []
    for part in re.split(r",(?![^\(]*\))", txt.strip().strip("[]")):
        if part.strip():
            out.append(_js(part, env))
    return out


def _words_ts():
    """words.ts WORDS -> [(norm word, f, fe, p)] (the picture's PW / PWE anchors)"""
    out = []
    for m in re.finditer(r"\{\s*w:\s*\"((?:[^\"\\]|\\.)*)\",\s*s:\s*[\d.]+,\s*e:\s*[\d.]+,\s*f:\s*(\d+),\s*fe:\s*(\d+),\s*p:\s*(\d+)", _read("words.ts")):
        out.append((re.sub(r"[^a-z0-9%']", "", m.group(1).lower()), int(m.group(2)), int(m.group(3)), int(m.group(4))))
    return out


def _pw_funcs():
    W = _words_ts()
    norm = lambda s: re.sub(r"[^a-z0-9%']", "", str(s).lower())

    def idx(i, w=None):
        for k, (ww, f, fe, p) in enumerate(W):
            if p == int(i) and (w is None or ww == norm(w)):
                return k
        raise KeyError(f"PW({i}, {w})")
    return {"PW": lambda i, w=None: float(W[idx(i, w)][1]), "PWE": lambda i, w=None: float(W[idx(i, w)][2])}


def _balanced(src, i):
    """src[i] == '(' -> the text inside the matching ')'"""
    d = 0
    for j in range(i, len(src)):
        if src[j] == "(":
            d += 1
        elif src[j] == ")":
            d -= 1
            if d == 0:
                return src[i + 1:j]
    raise ValueError("unbalanced")


def _expr_from(src, i):
    """the JS expression starting at src[i], up to the next top-level ',' / ';' / newline"""
    d = 0
    for j in range(i, len(src)):
        c = src[j]
        if c in "([{":
            d += 1
        elif c in ")]}":
            if d == 0:
                return src[i:j]
            d -= 1
        elif c in ",;\n" and d == 0:
            return src[i:j]
    return src[i:]


def _ramp(src, name, env, scope=None):
    """`name = clamp01((f - X) / L)` (or smooth(...)) in src -> (start frame, length); identifiers in X are resolved from
    their own `id = expr` definitions in the same source (scope = the text to search them in)"""
    m = re.search(r"\b" + name + r"\s*=\s*(?:clamp01|smooth)\(", src)
    if not m:
        return None
    arg = _balanced(src, m.end() - 1).strip()
    mm = re.match(r"^\(\s*f\s*-\s*(.*)\)\s*/\s*([\d.]+)$", arg, re.S)
    if not mm:
        return None
    X, L = mm.group(1), float(mm.group(2))
    env = dict(env)
    for tok in set(re.findall(r"\b([A-Za-z_]\w*)\b", X)) - set(env) - {"BEAT", "SHOTS", "min", "max", "floor", "round", "abs"}:
        d = re.search(r"\b" + tok + r"\s*=\s*", scope or src)
        if d:
            env[tok] = _js(_expr_from(scope or src, d.end()), env)
    return -_js("0 - " + X, env), L


def probes(BEAT, SHOTS=None):
    """-> (dict of probed values, list of log strings)"""
    B = _Beat(BEAT)
    SH = [dict(SHOTS[k]) for k in sorted(SHOTS)] if SHOTS else []
    env0 = {"BEAT": B, "SHOTS": SH}
    try:
        env0.update(_pw_funcs())
    except Exception:  # noqa
        pass
    out, log = {}, []
    ext, cast, tsx = _read("sets_ext.ts"), _read("cast.ts"), _read("SaladOil.tsx")

    def tryp(name, fn):
        try:
            r = fn()
            if r is not None:
                log.append(r)
        except Exception as e:  # noqa
            log.append(f"{name}: could not read ({type(e).__name__}: {e}); fallback")

    # ---- the LOANS counter roll
    def p_flaps():
        m = re.search(r"const flapState\s*=\s*\(i[^)]*\)\s*=>\s*\{(.*?)\n\};", ext, re.S)
        if not m:
            return None
        body = m.group(1)
        ms_, ml, mt = re.search(r"\bs\s*=\s*([^,;]+)", body), re.search(r"\bland\s*=\s*([^,;]+(?:\([^)]*\)[^,;]*)?)", body), re.search(r"\bT\s*=\s*([\d.]+)", body)
        T_ = float(mt.group(1)) if mt else 2.0
        digs = [(_js(ms_.group(1), dict(env0, i=i)), _js(ml.group(1), dict(env0, i=i)), T_) for i in range(9)]
        out["flaps"] = digs
        return f"flapState: digits roll {digs[0][0]:.1f}..{max(d[1] for d in digs):.1f} (T {T_:g} f) from sets_ext.ts"
    tryp("flapState", p_flaps)

    def p_simple(key, pat, src, what):
        def f():
            m = re.search(pat, src)
            if not m:
                return None
            out[key] = _js(m.group(1), env0)
            return f"{what} = {out[key]:.1f}"
        return f
    tryp("PLUNK", p_simple("plunk", r"const PLUNK\s*=\s*([^;]+);", ext, "PLUNK (sets_ext.ts)"))
    tryp("BL", p_simple("bloop_ring", r"const BL\s*=\s*([^;]+);", ext, "shot-7 bubble ring BL (sets_ext.ts)"))
    tryp("perch", p_simple("perch_off", r"tOff\s*=\s*([^,;]+)", ext, "shot-4 perched gull takes off (sets_ext.ts tOff)"))

    def p_car():
        m = re.search(r"const cu\s*=\s*\(f\s*-\s*\(([^)]*)\)\)\s*/\s*([\d.]+)", ext)
        if not m:
            return None
        a = _js(m.group(1), env0)
        out["car"] = (a, a + float(m.group(2)))
        return f"shot-14 car reflection slides {a:.0f}..{a + float(m.group(2)):.0f} (sets_ext.ts)"
    tryp("car", p_car)

    # ---- lightning: POST's FLASHES (SaladOil.tsx), else WORLD-EXT's flashAt F1 / F2
    def p_flash():
        m = re.search(r"const FLASHES[^=]*=\s*\[(.*?)\n\];", tsx, re.S)
        if m:
            fl = []
            for row in re.finditer(r"\{[^}]*?\bf:\s*([^,]+),[^}]*?\}", m.group(1)):
                far = "far: true" in row.group(0)
                fl.append((_js(row.group(1), env0), far))
            if fl:
                out["flashes"] = sorted(fl)
                return "lightning (SaladOil.tsx FLASHES): " + ", ".join(f"{a:.0f}{' far' if fr else ''}" for a, fr in out["flashes"])
        m = re.search(r"const F1\s*=\s*([^,]+),\s*F2\s*=\s*([^;]+);", ext)
        if m:
            out["flashes"] = [(_js(m.group(1), env0), False), (_js(m.group(2), env0), True)]
            return "lightning (sets_ext.ts flashAt F1 / F2): " + ", ".join(f"{a:.0f}" for a, _ in out["flashes"])
        return None
    tryp("flashes", p_flash)

    # ---- the tank man (shot 4)
    def p_s4():
        m = re.search(r"export const S4\s*=\s*\(\(\)\s*=>\s*\{(.*?)return", cast, re.S)
        if not m:
            return None
        env = dict(env0)
        for name, ex in re.findall(r"(\w+)\s*=\s*((?:[^,;()]|\([^()]*\))+)", m.group(1)):
            if name in ("const",):
                continue
            env[name] = _js(ex, env)
        mp = re.search(r"pulls:\s*(\[[^\]]*\])", cast[m.end():m.end() + 400])
        pulls = _list(mp.group(1), env) if mp else []
        out["s4"] = dict(pulls=pulls, **{k: env[k] for k in ("rim", "onRoof", "kneel", "tapeEnd", "stand", "rail") if k in env})
        return f"S4 (cast.ts): pulls {', '.join(f'{x:.0f}' for x in pulls)}, rim {env.get('rim', 0):.0f}, roof {env.get('onRoof', 0):.0f}, " \
               f"kneel {env.get('kneel', 0):.0f}, stand {env.get('stand', 0):.0f}, rail {env.get('rail', 0):.0f}"
    tryp("S4", p_s4)

    # ---- the banker's stamps (shot 5)
    def p_st5():
        m = re.search(r"export const STAMPS5\s*=\s*\{\s*R:\s*(\[[^\]]*\]),\s*L:\s*(\[[^\]]*\])", cast, re.S)
        if not m:
            return None
        out["stamps5"] = dict(R=_list(m.group(1), env0), L=_list(m.group(2), env0))
        return "STAMPS5 (cast.ts): R " + ", ".join(f"{x:.1f}" for x in out["stamps5"]["R"]) + "; L " + ", ".join(f"{x:.1f}" for x in out["stamps5"]["L"])
    tryp("STAMPS5", p_st5)

    # ---- the bottle shake (shot 11): window + rock period (half a rock = one liquid stroke)
    def p_shake():
        m = re.search(r"bottleShake\s*=.*?=>\s*\{(.*?)\n\};", cast, re.S)
        if not m:
            return None
        body = m.group(1)
        a = _js(re.search(r"const t\s*=\s*f\s*-\s*([^,]+),", body).group(1), env0)
        ml = re.search(r"t\s*[<>]=?\s*([\d.]+)\s*\?", body) or re.search(r"t\s*>\s*([\d.]+)", body) or re.search(r"t\s*<\s*([\d.]+)", body)
        L = max(float(x) for x in re.findall(r"t\s*[<>]=?\s*([\d.]+)", body)) if re.findall(r"t\s*[<>]=?\s*([\d.]+)", body) else (float(ml.group(1)) if ml else 22.0)
        mp = re.search(r"Math\.sin\(\(TAU \* t\)\s*/\s*([\d.]+)\)", body)
        mw = re.search(r"Math\.sin\(t\s*\*\s*([\d.]+)\)", body)
        w = (2 * math.pi / float(mp.group(1))) if mp else (float(mw.group(1)) if mw else 1.9)
        out["shake"] = dict(a=a, len=L, w=w)
        return f"bottleShake (cast.ts): {a:.0f} + {L:g} f, {w:.3f} rad/f (a stroke every {math.pi / w:.1f} f)"
    tryp("bottleShake", p_shake)

    # ---- the valve wheels (shot 13): explicit pulls per worker, else the periodic valveAngle
    def p_valves():
        m = re.search(r"const PULLS13[^=]*=\s*\[\s*(\[[^\]]*\])\s*,\s*(\[[^\]]*\])\s*\]", cast, re.S)
        if m:
            out["pulls13"] = [_list(m.group(1), env0), _list(m.group(2), env0)]
            return "PULLS13 (cast.ts): " + " | ".join(", ".join(f"{x:.0f}" for x in w) for w in out["pulls13"])
        m = re.search(r"valveAngle\s*=\s*\(k[^)]*\)\s*=>\s*\{\s*const t\s*=\s*f\s*\+\s*([\d.]+)\s*\*\s*k,\s*n\s*=\s*Math\.floor\(t\s*/\s*([\d.]+)\)"
                      r".*?m\s*/\s*([\d.]+)", cast, re.S)
        if m:
            out["valves"] = dict(phase=float(m.group(1)), period=float(m.group(2)), heave=float(m.group(3)))
            return f"valveAngle (cast.ts): a quarter turn every {float(m.group(2)):g} f, wheel phase {float(m.group(1)):g} f"
        return None
    tryp("valves", p_valves)

    # ---- CHAR's shot-7 bubble: it pops at the reflection's chin when its ring starts
    def p_ring():
        m = re.search(r"const ring\s*=\s*f\s*>=\s*([^?]+)\?", cast)
        if not m:
            return None
        out["bubble_pop"] = _js(m.group(1), env0)
        return f"shot-7 bubble pops / ring starts (cast.ts) = {out['bubble_pop']:.0f}"
    tryp("ring", p_ring)

    # ---- fix r2 (A2): the actions whose SFX sat off the picture
    def p_tick():                       # shot 4: the inspector's pencil check-mark stroke (cast.ts tick = clamp01((f - X) / L))
        r = _ramp(cast, "tick", env0)
        if not r:
            return None
        out["tick"] = r
        return f"shot-4 pencil tick stroke (cast.ts) {r[0]:.0f} + {r[1]:g} f"
    tryp("tick", p_tick)

    def p_wipe():                       # shot 13: the blob's brow wipe (cast.ts wipe = clamp01((f - oilW) / L))
        r = _ramp(cast, "wipe", env0)
        if not r:
            return None
        out["wipe13"] = r
        return f"shot-13 brow wipe (cast.ts) {r[0]:.0f} + {r[1]:g} f"
    tryp("wipe", p_wipe)

    def p_pap():                        # shot 6: Tino raises the fan of OIL RECEIPTS on 'papers' (pap = gest2(f, X, L, ...))
        m = re.search(r"\bpap\s*=\s*gest2\(\s*f\s*,\s*", cast)
        if not m:
            return None
        x = _expr_from(cast, m.end())
        ml = re.match(r"\s*,\s*([\d.]+)", cast[m.end() + len(x):])
        out["papers6"] = (_js(x, env0), float(ml.group(1)) if ml else 12.0)
        return f"shot-6 papers fan raised (cast.ts) {out['papers6'][0]:.0f} + {out['papers6'][1]:g} f"
    tryp("papers", p_pap)

    # ---- WORLD-INT's pump room (sets_int.ts): the flywheel's rate (one chug per turn) and the flange drip's period
    def p_pump():
        si = _read("sets_int.ts")
        r = []
        m = re.search(r"this\.flywheel\.rotation\.\w\s*=\s*-?VF\s*\*\s*([\d.]+)", si)
        if m:
            out["flywheel_hz"] = float(m.group(1)) * 30.0 / (2 * math.pi)
            r.append(f"flywheel {out['flywheel_hz']:.3f} turns / s")
        m = re.search(r"const ph\s*=\s*\(\(VF\s*%\s*([\d.]+)\)[^;]*;?[^}]*?fall\s*=\s*ph\s*/\s*([\d.]+)[^}]*?this\.drip\.", si, re.S)
        if m:
            out["pump_drip"] = (float(m.group(1)), float(m.group(2)))
            r.append(f"flange drip lands at VF % {float(m.group(1)):g} == {float(m.group(2)):g}")
        return ("pump room (sets_int.ts): " + "; ".join(r)) if r else None
    tryp("pump", p_pump)
    return out, log
