"use client"
import React, { useEffect, useRef, useState, useCallback } from "react";

const BLOB_SIZE = 150;
const HALF = BLOB_SIZE / 2;
const GRAVITY = 0.75;
const AIR_FRICTION = 0.988;
const WALL_BOUNCE = 0.5;
const FLOOR_BOUNCE = 0.42;
const FOLLOW_SPRING = 0.28;
const RECOVERY = 0.16;
const PAD = 14;
const EXPLODE_THRESHOLD = 11;
const IDLE_SLEEPY_MS = 9000;
const IDLE_ASLEEP_MS = 15000;

const SKINS = [
  { name: "Mint", grad: "radial-gradient(circle at 35% 30%, #d4ffe9, #5eead4 55%, #22b8a1 100%)", swatch: "#5eead4", particles: ["#5eead4", "#22b8a1", "#d4ffe9"] },
  { name: "Bubblegum", grad: "radial-gradient(circle at 35% 30%, #ffe0f0, #ff8fc7 55%, #e0559f 100%)", swatch: "#ff8fc7", particles: ["#ff8fc7", "#e0559f", "#ffe0f0"] },
  { name: "Lava", grad: "radial-gradient(circle at 35% 30%, #ffe3c2, #ff9a52 55%, #e0611f 100%)", swatch: "#ff9a52", particles: ["#ff9a52", "#e0611f", "#ffe3c2"] },
  { name: "Grape", grad: "radial-gradient(circle at 35% 30%, #ecdcff, #b083f0 55%, #7c3fd4 100%)", swatch: "#b083f0", particles: ["#b083f0", "#7c3fd4", "#ecdcff"] },
  { name: "Lemon", grad: "radial-gradient(circle at 35% 30%, #fffbd1, #f5e05a 55%, #d4b91f 100%)", swatch: "#f5e05a", particles: ["#f5e05a", "#d4b91f", "#fffbd1"] },
  { name: "Blueberry", grad: "radial-gradient(circle at 35% 30%, #d6ecff, #6badf5 55%, #2f6fc4 100%)", swatch: "#6badf5", particles: ["#6badf5", "#2f6fc4", "#d6ecff"] },
];

const SCARED_GRAD = "radial-gradient(circle at 35% 30%, #ffd6d6, #ff8fa3 55%, #ef5a7a 100%)";
const SLEEPY_GRAD = "radial-gradient(circle at 35% 30%, #d9f3ff, #7fd8e0 55%, #4bb8c4 100%)";

// ---------- sound engine (synthesized, no audio files) ----------
function useSounds(mutedRef) {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const tone = useCallback((freq, dur, type = "sine", vol = 0.16, delay = 0, freqEnd = null) => {
    if (mutedRef.current) return;
    try {
      const ctx = getCtx();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) {}
  }, []);

  const noiseBurst = useCallback((dur = 0.16, vol = 0.18, cutoff = 1200, delay = 0) => {
    if (mutedRef.current) return;
    try {
      const ctx = getCtx();
      const size = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(ctx.currentTime + delay);
    } catch (e) {}
  }, []);

  return {
    poke: (pitchBoost = 0) => tone(560 + pitchBoost, 0.09, "sine", 0.16, 0, 380 + pitchBoost),
    boop: () => tone(300, 0.12, "sine", 0.16, 0, 170),
    giggle: () => [660, 780, 700, 840].forEach((f, i) => tone(f, 0.08, "triangle", 0.11, i * 0.08)),
    yawn: () => tone(240, 0.55, "sine", 0.1, 0, 110),
    snore: () => tone(150, 0.4, "sine", 0.05, 0, 110),
    gasp: () => {
      noiseBurst(0.1, 0.16, 2000);
      tone(200, 0.22, "sawtooth", 0.13, 0.02, 90);
    },
    scream: () => tone(900, 0.32, "sawtooth", 0.13, 0, 300),
    whee: () => tone(420, 0.28, "sine", 0.13, 0, 750),
    wake: () => tone(520, 0.14, "sine", 0.14, 0, 680),
    chirp: () => tone(880, 0.07, "sine", 0.09, 0, 980),
    land: () => tone(180, 0.08, "sine", 0.1, 0, 100),
    squeak: () => tone(650 + Math.random() * 300, 0.055, "triangle", 0.05, 0, 900 + Math.random() * 200),
    boing: () => {
      tone(160, 0.13, "sine", 0.15, 0, 480);
      tone(480, 0.09, "sine", 0.1, 0.11, 220);
    },
    raspberry: () => {
      noiseBurst(0.22, 0.16, 500);
      tone(110, 0.22, "sawtooth", 0.12, 0, 70);
    },
    sparkle: () => [700, 1000, 1300].forEach((f, i) => tone(f, 0.09, "sine", 0.1, i * 0.06)),
    munch: () => {
      noiseBurst(0.08, 0.12, 900);
      tone(380, 0.1, "sine", 0.1, 0.07, 500);
    },
    select: () => tone(720, 0.07, "square", 0.06, 0, 900),
    pop: () => {
      noiseBurst(0.3, 0.28, 3200);
      tone(120, 0.35, "sawtooth", 0.22, 0, 40);
    },
    hic: () => {
      tone(500, 0.06, "sine", 0.12, 0, 700);
      tone(400, 0.06, "sine", 0.1, 0.18, 550);
    },
    kiss: () => {
      tone(900, 0.05, "sine", 0.1, 0, 650);
      noiseBurst(0.05, 0.08, 1800, 0.05);
    },
    reform: () => [220, 330, 440, 660].forEach((f, i) => tone(f, 0.1, "sine", 0.1, i * 0.07)),
    jump: () => tone(340, 0.12, "sine", 0.13, 0, 560),
  };
}

// ---------- expressive eye (pure JSX helper, not a component) ----------
function renderEye(pupilRef, side, mood, blink) {
  const isScared = mood === "scared";
  const isSurprised = mood === "surprised" || mood === "falling";
  const size = isScared || isSurprised ? 33 : 27;
  const iris = Math.round(size * 0.58);
  const pupilSize = isScared ? Math.round(iris * 0.4) : Math.round(iris * 0.5);
  return (
    <div
      style={{
        position: "absolute",
        [side]: 38,
        top: mood === "surprised" || mood === "falling" ? 50 : 56,
        width: size,
        height: blink ? 3 : size,
        borderRadius: "50%",
        background: "white",
        overflow: "hidden",
        transition: "height 0.09s, width 0.15s, top 0.15s",
        boxShadow: "inset 0 3px 5px rgba(0,0,0,0.14)",
      }}
    >
      {!blink && (
        <div
          ref={pupilRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: iris,
            height: iris,
            marginLeft: -iris / 2,
            marginTop: -iris / 2,
            borderRadius: "50%",
            background: "#2b2660",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: pupilSize,
              height: pupilSize,
              borderRadius: "50%",
              background: "#08060f",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: pupilSize * 0.4,
                height: pupilSize * 0.4,
                borderRadius: "50%",
                background: "white",
                top: pupilSize * 0.08,
                left: pupilSize * 0.12,
                opacity: 0.95,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlobCompanion() {
  const wrapRef = useRef(null);
  const blobRef = useRef(null);
  const pupilLRef = useRef(null);
  const pupilRRef = useRef(null);

  const [mood, setMoodState] = useState("idle");
  const [blink, setBlink] = useState(false);
  const [msg, setMsg] = useState("hi! i'm Glub — poke, rub, squeeze or fling me!");
  const [skinIdx, setSkinIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [popScore, setPopScore] = useState(0);
  const [starScore, setStarScore] = useState(0);
  const [treatScore, setTreatScore] = useState(0);
  const [particles, setParticles] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [sparkles, setSparkles] = useState([]);
  const [treats, setTreats] = useState([]);
  const [comboMeter, setComboMeter] = useState(0);
  const [rainbow, setRainbow] = useState(false);

  const moodRef = useRef("idle");
  const setMood = (m) => {
    moodRef.current = m;
    setMoodState(m);
  };
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const skinIdxRef = useRef(0);
  useEffect(() => {
    skinIdxRef.current = skinIdx;
  }, [skinIdx]);

  const sounds = useSounds(mutedRef);

  const phys = useRef({ x: 300, y: 300, vx: 0, vy: 0, scaleX: 1, scaleY: 1, rotation: 0, held: false, stuck: false });
  const bounds = useRef({ left: PAD, top: PAD, right: 800, bottom: 600 });
  const dragStart = useRef({ x: 0, y: 0, time: 0, blobX: 0, blobY: 0 });
  const lastMove = useRef({ x: 0, y: 0, time: 0 });
  const followTarget = useRef({ x: 300, y: 300 });
  const pointerOffset = useRef({ dx: 0, dy: 0 });
  const rubAccum = useRef(0);
  const totalWiggle = useRef(0);
  const sleepyMeter = useRef(0);
  const lastSoundTime = useRef(0);
  const lastSqueakTime = useRef(0);
  const lastTapTime = useRef(0);
  const comboCount = useRef(0);
  const doubleTapTimer = useRef(null);
  const forceReleased = useRef(false);
  const stuckTarget = useRef({ x: 0, y: 0 });
  const stuckEdge = useRef("bottom");
  const unstickTimer = useRef(null);
  const cursorPos = useRef({ x: 300, y: 300 });
  const rafRef = useRef(null);
  const lastSnoreTime = useRef(0);
  const lastInteraction = useRef(performance.now());
  const sleepyWarned = useRef(false);
  const spinUntil = useRef(0);
  const spinAxisSign = useRef(1);
  const growUntil = useRef(0);
  const hasScreamed = useRef(false);

  useEffect(() => {
    const updateBounds = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      bounds.current = { left: PAD, top: PAD, right: w - PAD, bottom: h - PAD };
      if (phys.current.x === 300 && phys.current.y === 300) {
        phys.current.x = w / 2;
        phys.current.y = h - HALF - 60;
        followTarget.current = { x: phys.current.x, y: phys.current.y };
      }
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);
    const onMove = (e) => {
      cursorPos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // ---------- keyboard controls: arrows nudge, space jumps ----------
  useEffect(() => {
    const onKey = (e) => {
      const p = phys.current;
      if (moodRef.current === "exploded" || p.held || p.stuck) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar"].includes(e.key)) e.preventDefault();
      markInteractionRef.current();
      if (e.key === "ArrowLeft") p.vx -= 6;
      else if (e.key === "ArrowRight") p.vx += 6;
      else if (e.key === "ArrowUp") {
        p.vy -= 10;
        sounds.jump();
      } else if (e.key === "ArrowDown") p.vy += 6;
      else if (e.key === " " || e.key === "Spacebar") {
        p.vy = -16;
        sounds.jump();
        setMsg("wheee!");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- sparkle spawner (mini catch game) ----------
  useEffect(() => {
    const spawn = () => {
      setSparkles((prev) => {
        if (prev.length >= 2) return prev;
        const b = bounds.current;
        const nx = b.left + 60 + Math.random() * (b.right - b.left - 120);
        const ny = b.top + 60 + Math.random() * (b.bottom - b.top - 220);
        return [...prev, { id: Date.now() + Math.random(), x: nx, y: ny }];
      });
    };
    const id = setInterval(spawn, 5000);
    const t0 = setTimeout(spawn, 2500);
    return () => {
      clearInterval(id);
      clearTimeout(t0);
    };
  }, []);

  // ---------- treat spawner (rarer, causes growth+burp) ----------
  useEffect(() => {
    const spawn = () => {
      setTreats((prev) => {
        if (prev.length >= 1) return prev;
        const b = bounds.current;
        const nx = b.left + 60 + Math.random() * (b.right - b.left - 120);
        const ny = b.top + 60 + Math.random() * (b.bottom - b.top - 220);
        return [{ id: Date.now() + Math.random(), x: nx, y: ny }];
      });
    };
    const id = setInterval(spawn, 16000);
    const t0 = setTimeout(spawn, 7000);
    return () => {
      clearInterval(id);
      clearTimeout(t0);
    };
  }, []);

  // ---------- helpers ----------
  const markInteraction = () => {
    lastInteraction.current = performance.now();
    sleepyWarned.current = false;
  };
  const markInteractionRef = useRef(markInteraction);
  markInteractionRef.current = markInteraction;

  const pulseSquish = (sx, sy) => {
    phys.current.scaleX = sx;
    phys.current.scaleY = sy;
  };

  const clearMoodSoon = (from, ms) => {
    setTimeout(() => {
      if (moodRef.current === from) setMood("idle");
    }, ms);
  };

  const triggerKiss = () => {
    sounds.kiss();
    setMood("happy");
    setMsg("mwah! 💕");
    pulseSquish(1.2, 1.2);
    const cx = phys.current.x;
    const cy = phys.current.y;
    const newHearts = Array.from({ length: 3 }).map((_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy - HALF * 0.4,
      delay: i * 0.12,
    }));
    setHearts((h) => [...h, ...newHearts]);
    setTimeout(() => setHearts((h) => h.filter((x) => !newHearts.includes(x))), 1200);
    clearMoodSoon("happy", 700);
  };

  const SPECIALS = ["spin", "hic", "rainbow", "grow", null, null, null];
  const triggerPoke = () => {
    const now = performance.now();
    if (now - lastTapTime.current < 650) comboCount.current += 1;
    else comboCount.current = 1;
    lastTapTime.current = now;
    setComboMeter(comboCount.current);

    if (comboCount.current >= EXPLODE_THRESHOLD) {
      clearTimeout(doubleTapTimer.current);
      explode();
      return;
    }

    const pitchBoost = Math.min(comboCount.current * 45, 500);
    sounds.poke(pitchBoost);
    const squash = Math.min(0.22 + comboCount.current * 0.04, 0.55);
    pulseSquish(1 + squash, 1 - squash);

    if (comboCount.current === 1) {
      const special = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];
      if (special === "spin") {
        spinUntil.current = now + 500;
        spinAxisSign.current = Math.random() < 0.5 ? 1 : -1;
        sounds.whee();
        setMsg("wheee!! 🌀");
      } else if (special === "hic") {
        sounds.hic();
        setMsg("*hic!*");
      } else if (special === "rainbow") {
        setRainbow(true);
        sounds.sparkle();
        setMsg("✨ ooh shiny ✨");
        setTimeout(() => setRainbow(false), 1100);
      } else if (special === "grow") {
        pulseSquish(1.5, 1.5);
        sounds.boop();
        setMsg("*big breath*");
      } else {
        setMsg(["hehe!", "hi!", ":)", "boop back?", "tehee~"][Math.floor(Math.random() * 5)]);
      }
      setMood("happy");
      clearMoodSoon("happy", 420);
    } else if (comboCount.current === 2) {
      // hold judgement: is this a deliberate double-tap (kiss) or the start of a mash?
      clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = setTimeout(() => {
        if (comboCount.current === 2) triggerKiss();
      }, 300);
      setMood("happy");
    } else {
      clearTimeout(doubleTapTimer.current);
      if (comboCount.current <= 5) setMsg(["hey!", "that tickles!", "again? ok!", "wheee"][Math.floor(Math.random() * 4)]);
      else if (comboCount.current <= 8) setMsg(["ok ok-", "getting dizzy...", "hehe stoppp"][Math.floor(Math.random() * 3)]);
      else setMsg(["uh oh...", "I'm gonna—", "brace for it—"][Math.floor(Math.random() * 3)]);
      setMood("happy");
      clearMoodSoon("happy", 420);
    }
  };

  const explode = () => {
    sounds.pop();
    setMood("exploded");
    setMsg("");
    setPopScore((s) => s + 1);
    comboCount.current = 0;
    setComboMeter(0);

    const skin = SKINS[skinIdxRef.current];
    const cx = phys.current.x;
    const cy = phys.current.y;
    const n = 16;
    const parts = Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const dist = 55 + Math.random() * 95;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        color: skin.particles[i % skin.particles.length],
        size: 8 + Math.random() * 16,
      };
    });
    setParticles(parts);
    setTimeout(() => setParticles([]), 900);

    if (wrapRef.current) {
      wrapRef.current.style.animation = "glubShake 0.4s ease";
      setTimeout(() => {
        if (wrapRef.current) wrapRef.current.style.animation = "";
      }, 400);
    }

    phys.current.vx = 0;
    phys.current.vy = 0;

    setTimeout(() => {
      const b = bounds.current;
      phys.current.x = (b.left + b.right) / 2;
      phys.current.y = b.bottom - HALF;
      phys.current.scaleX = 0.05;
      phys.current.scaleY = 0.05;
      sounds.reform();
      setMood("idle");
      setMsg(["*pop* ...I'm okay!", "again? teehee", "you win this round", "reassembled!"][Math.floor(Math.random() * 4)]);
      markInteraction();
    }, 850);
  };

  const nearestEdge = () => {
    const b = bounds.current;
    const { x, y } = phys.current;
    const dl = x - b.left,
      dr = b.right - x,
      dt = y - b.top,
      db = b.bottom - y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) return "left";
    if (m === dr) return "right";
    if (m === dt) return "top";
    return "bottom";
  };

  const edgeTarget = (edge) => {
    const b = bounds.current;
    if (edge === "left") return { x: b.left + HALF * 0.55, y: phys.current.y };
    if (edge === "right") return { x: b.right - HALF * 0.55, y: phys.current.y };
    if (edge === "top") return { x: phys.current.x, y: b.top + HALF * 0.55 };
    return { x: phys.current.x, y: b.bottom - HALF * 0.55 };
  };

  const applyStuckSquish = (edge) => {
    if (edge === "left" || edge === "right") pulseSquish(0.5, 1.3);
    else pulseSquish(1.3, 0.5);
  };

  const unstick = (early) => {
    clearTimeout(unstickTimer.current);
    phys.current.stuck = false;
    const edge = stuckEdge.current;
    phys.current.vx = edge === "left" ? 5 : edge === "right" ? -5 : (Math.random() - 0.5) * 4;
    phys.current.vy = edge === "top" ? 4 : -3;
    setMood("idle");
    setMsg(["ouchie...", "please be gentle!", "eep."][Math.floor(Math.random() * 3)]);
    if (!early) sounds.chirp();
  };

  const triggerHit = () => {
    sounds.gasp();
    setMood("scared");
    setMsg("EEK!");
    comboCount.current = 0;
    setComboMeter(0);
    clearTimeout(doubleTapTimer.current);
    const edge = nearestEdge();
    stuckEdge.current = edge;
    stuckTarget.current = edgeTarget(edge);
    phys.current.stuck = true;
    phys.current.held = false;
    applyStuckSquish(edge);
    clearTimeout(unstickTimer.current);
    unstickTimer.current = setTimeout(() => unstick(false), 2600);
  };

  const goToSleep = (auto = false) => {
    sleepyMeter.current = 0;
    sounds.yawn();
    setMood("asleep");
    setMsg(auto ? "*dozed off*  zzz" : "zzz...");
  };

  const collectSparkle = (id) => {
    setSparkles((prev) => prev.filter((s) => s.id !== id));
    setStarScore((s) => s + 1);
    sounds.sparkle();
    setMsg("✨ got one!");
    pulseSquish(1.2, 1.2);
    markInteraction();
    setTimeout(() => {
      if (moodRef.current === "idle") setMsg("hi! i'm Glub");
    }, 900);
  };

  const collectTreat = (id) => {
    setTreats((prev) => prev.filter((t) => t.id !== id));
    setTreatScore((s) => s + 1);
    sounds.munch();
    setMsg("yum! 🍬");
    growUntil.current = performance.now() + 1600;
    markInteraction();
    setTimeout(() => {
      sounds.hic();
      if (moodRef.current === "idle" || moodRef.current === "happy") setMsg("*burp* thanks!");
    }, 500);
  };

  // ---------- pointer handlers ----------
  const onPointerDown = (e) => {
    if (moodRef.current === "exploded") return;
    e.preventDefault();
    try {
      blobRef.current.setPointerCapture(e.pointerId);
    } catch (err) {}
    const now = performance.now();
    forceReleased.current = false;
    markInteraction();
    if (phys.current.stuck) {
      unstick(true);
      return;
    }
    phys.current.held = true;
    phys.current.vx = 0;
    phys.current.vy = 0;
    dragStart.current = { x: e.clientX, y: e.clientY, time: now, blobX: phys.current.x, blobY: phys.current.y };
    lastMove.current = { x: e.clientX, y: e.clientY, time: now };
    followTarget.current = { x: phys.current.x, y: phys.current.y };
    pointerOffset.current = { dx: e.clientX - phys.current.x, dy: e.clientY - phys.current.y };
    rubAccum.current = 0;
    totalWiggle.current = 0;

    if (moodRef.current === "asleep" || moodRef.current === "sleepy") {
      setMood("surprised");
      setMsg("!!");
      sounds.wake();
      sleepyMeter.current = 0;
      clearMoodSoon("surprised", 500);
    }
  };

  const onPointerMove = (e) => {
    if (!phys.current.held || forceReleased.current) return;
    markInteraction();
    const now = performance.now();
    const dx = e.clientX - lastMove.current.x;
    const dy = e.clientY - lastMove.current.y;
    const distFromStart = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);

    if (distFromStart < 55) {
      followTarget.current = {
        x: dragStart.current.blobX + (e.clientX - dragStart.current.x) * 0.35,
        y: dragStart.current.blobY + (e.clientY - dragStart.current.y) * 0.35,
      };
      const moveMag = Math.hypot(dx, dy);
      rubAccum.current += moveMag;
      totalWiggle.current += moveMag;
      if (rubAccum.current > 34) {
        rubAccum.current = 0;
        sleepyMeter.current += 7;
        pulseSquish(1.12, 0.9);
        if (now - lastSoundTime.current > 260) {
          sounds.giggle();
          lastSoundTime.current = now;
          if (moodRef.current !== "asleep") {
            setMood(sleepyMeter.current > 55 ? "sleepy" : "happy");
            setMsg(sleepyMeter.current > 55 ? "mmm...sleepy..." : "tehee~");
          }
        }
        if (sleepyMeter.current >= 100) goToSleep(false);
      }
    } else {
      followTarget.current = { x: e.clientX - pointerOffset.current.dx, y: e.clientY - pointerOffset.current.dy };
      if (moodRef.current !== "surprised") {
        setMood("surprised");
        setMsg("wheee!");
      }
    }
    lastMove.current = { x: e.clientX, y: e.clientY, time: now };
  };

  const onPointerUp = (e) => {
    if (!phys.current.held || forceReleased.current) return;
    phys.current.held = false;
    markInteraction();
    const now = performance.now();
    const duration = now - dragStart.current.time;
    const totalDist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    const speed = totalDist / Math.max(duration, 1);

    if (totalDist < 12 && duration < 220) {
      triggerPoke();
    } else if (duration < 180 && totalDist > 30 && speed > 0.35) {
      triggerHit();
    } else if (totalDist < 55) {
      if (totalWiggle.current > 25) {
        phys.current.vx = 0;
        phys.current.vy = 0;
        if (moodRef.current !== "asleep" && moodRef.current !== "sleepy") setMood("idle");
      } else {
        sounds.boing();
        pulseSquish(1.45, 0.6);
        setMsg(["ahh, relief", "that felt nice", "squishy!", "again please"][Math.floor(Math.random() * 4)]);
        phys.current.vx = 0;
        phys.current.vy = 0;
        setMood("happy");
        clearMoodSoon("happy", 500);
      }
    } else {
      sounds.whee();
      setMood("surprised");
      setMsg("weeeee!");
      clearMoodSoon("surprised", 650);
    }
  };

  const wriggleFree = () => {
    forceReleased.current = true;
    phys.current.held = false;
    sounds.raspberry();
    const dir = Math.random() < 0.5 ? -1 : 1;
    phys.current.vx = dir * (6 + Math.random() * 3);
    phys.current.vy = -9;
    setMood("surprised");
    setMsg("hehe, too much! *wriggles free*");
    clearMoodSoon("surprised", 700);
  };

  // ---------- physics + render loop ----------
  useEffect(() => {
    let blinkTimer = setTimeout(function loopBlink() {
      setBlink(true);
      setTimeout(() => setBlink(false), 130);
      blinkTimer = setTimeout(loopBlink, 2200 + Math.random() * 3200);
    }, 2000);

    const tick = () => {
      const p = phys.current;
      const b = bounds.current;
      const now = performance.now();

      if (moodRef.current === "exploded") {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      let squeezing = false;

      if (p.stuck) {
        p.x += (stuckTarget.current.x - p.x) * 0.35;
        p.y += (stuckTarget.current.y - p.y) * 0.35;
        p.vx = 0;
        p.vy = 0;
      } else if (p.held && !forceReleased.current) {
        const nvx = (followTarget.current.x - p.x) * FOLLOW_SPRING;
        const nvy = (followTarget.current.y - p.y) * FOLLOW_SPRING;
        p.x += nvx;
        p.y += nvy;
        p.vx = nvx;
        p.vy = nvy;

        const distFromStart = Math.hypot(lastMove.current.x - dragStart.current.x, lastMove.current.y - dragStart.current.y);
        const heldElapsed = now - dragStart.current.time;

        if (distFromStart < 25 && totalWiggle.current < 15 && heldElapsed > 150) {
          squeezing = true;
          if (heldElapsed > 1400) {
            wriggleFree();
          } else {
            const sf = Math.min((heldElapsed - 150) / 500, 1);
            p.scaleX = 1 + sf * 0.42;
            p.scaleY = 1 - sf * 0.48;
            if (now - lastSqueakTime.current > 380) {
              lastSqueakTime.current = now;
              sounds.squeak();
            }
          }
        } else {
          const speed = Math.hypot(nvx, nvy);
          const stretch = Math.min(speed / 18, 0.35);
          if (speed > 1.2) {
            const horizontal = Math.abs(nvx) > Math.abs(nvy);
            if (horizontal) pulseSquish(1 + stretch, 1 - stretch * 0.6);
            else pulseSquish(1 - stretch * 0.6, 1 + stretch);
          }
        }
      } else {
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= AIR_FRICTION;

        // scream on a fast fall
        if (!p.stuck && p.vy > 15 && moodRef.current !== "scared" && moodRef.current !== "asleep" && !hasScreamed.current) {
          hasScreamed.current = true;
          sounds.scream();
          setMood("falling");
          setMsg("AAAAH—");
        }

        const floorY = b.bottom - HALF;
        if (p.y > floorY) {
          p.y = floorY;
          if (Math.abs(p.vy) > 2) {
            pulseSquish(1.3, 0.65);
            sounds.land();
          }
          p.vy = -p.vy * FLOOR_BOUNCE;
          if (Math.abs(p.vy) < 1.2) p.vy = 0;
          p.vx *= 0.85;
          if (hasScreamed.current) {
            hasScreamed.current = false;
            if (moodRef.current === "falling") {
              setMood("idle");
              setMsg("phew!");
            }
          }
        }
        const leftX = b.left + HALF;
        const rightX = b.right - HALF;
        if (p.x < leftX) {
          p.x = leftX;
          p.vx = -p.vx * WALL_BOUNCE;
        }
        if (p.x > rightX) {
          p.x = rightX;
          p.vx = -p.vx * WALL_BOUNCE;
        }
        const topY = b.top + HALF;
        if (p.y < topY) {
          p.y = topY;
          p.vy = -p.vy * WALL_BOUNCE;
        }
      }

      // squish recovery toward baseline (with treat-growth override)
      let targetSX = 1,
        targetSY = 1;
      if (now < growUntil.current) {
        targetSX = 1.28;
        targetSY = 1.28;
      } else if (!p.held && !p.stuck) {
        const breathe = Math.sin(now / 480) * (moodRef.current === "asleep" ? 0.035 : 0.018);
        targetSX = 1 - breathe;
        targetSY = 1 + breathe;
      }
      if (!squeezing) {
        p.scaleX += (targetSX - p.scaleX) * RECOVERY;
        p.scaleY += (targetSY - p.scaleY) * RECOVERY;
      }

      // rotation (spin special move) settles back upright otherwise
      if (spinUntil.current > now) {
        p.rotation += 22 * spinAxisSign.current;
      } else {
        const nearest = Math.round(p.rotation / 360) * 360;
        p.rotation += (nearest - p.rotation) * 0.2;
      }

      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${p.x - HALF}px, ${p.y - HALF}px, 0) rotate(${p.rotation}deg) scale(${p.scaleX}, ${p.scaleY})`;
      }

      // pupils follow cursor when awake & calm; jitter with fear when scared
      if ((moodRef.current === "idle" || moodRef.current === "happy") && !p.held && !p.stuck) {
        const dx = cursorPos.current.x - p.x;
        const dy = cursorPos.current.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const range = 4.5;
        const ox = (dx / dist) * Math.min(range, dist / 18);
        const oy = (dy / dist) * Math.min(range, dist / 18);
        if (pupilLRef.current) pupilLRef.current.style.transform = `translate(${ox}px, ${oy}px)`;
        if (pupilRRef.current) pupilRRef.current.style.transform = `translate(${ox}px, ${oy}px)`;
      } else if (moodRef.current === "scared") {
        const jx = (Math.random() - 0.5) * 3;
        const jy = (Math.random() - 0.5) * 3;
        if (pupilLRef.current) pupilLRef.current.style.transform = `translate(${jx}px, ${jy}px)`;
        if (pupilRRef.current) pupilRRef.current.style.transform = `translate(${jx}px, ${jy}px)`;
      }

      if (moodRef.current === "asleep" && now - lastSnoreTime.current > 1600) {
        lastSnoreTime.current = now;
        sounds.snore();
      }

      // sparkle collision (blob touches a star -> collect)
      setSparkles((prev) => {
        if (prev.length === 0) return prev;
        let gained = 0;
        const remaining = prev.filter((s) => {
          const d = Math.hypot(s.x - p.x, s.y - p.y);
          if (d < HALF + 16) {
            gained++;
            return false;
          }
          return true;
        });
        if (gained > 0) {
          setStarScore((sc) => sc + gained);
          sounds.sparkle();
          setMsg("✨ got one!");
        }
        return gained > 0 ? remaining : prev;
      });

      // treat collision
      setTreats((prev) => {
        if (prev.length === 0) return prev;
        let gained = false;
        const remaining = prev.filter((t) => {
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < HALF + 16) {
            gained = true;
            return false;
          }
          return true;
        });
        if (gained) {
          setTreatScore((s) => s + 1);
          sounds.munch();
          setMsg("yum! 🍬");
          growUntil.current = now + 1600;
        }
        return gained ? remaining : prev;
      });

      // auto-sleep on inactivity
      if (!p.held && !p.stuck && moodRef.current !== "exploded" && moodRef.current !== "falling") {
        const idleFor = now - lastInteraction.current;
        if (idleFor > IDLE_SLEEPY_MS && idleFor < IDLE_ASLEEP_MS && moodRef.current === "idle" && !sleepyWarned.current) {
          sleepyWarned.current = true;
          setMood("sleepy");
          setMsg("*yaaawn*");
        }
        if (idleFor > IDLE_ASLEEP_MS && (moodRef.current === "idle" || moodRef.current === "sleepy")) {
          goToSleep(true);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(blinkTimer);
      clearTimeout(unstickTimer.current);
      clearTimeout(doubleTapTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAsleep = mood === "asleep";
  const isSleepy = mood === "sleepy";
  const isScared = mood === "scared";
  const isSurprised = mood === "surprised";
  const isFalling = mood === "falling";
  const isHappy = mood === "happy";
  const isExploded = mood === "exploded";
  const eyesClosed = blink && (mood === "idle" || mood === "happy");

  const skin = SKINS[skinIdx];
  const bodyGradient = isScared ? SCARED_GRAD : isAsleep || isSleepy ? SLEEPY_GRAD : skin.grad;
  const comboRatio = Math.min(comboMeter / EXPLODE_THRESHOLD, 1);
  const comboColor = comboRatio < 0.5 ? "#7ee8c1" : comboRatio < 0.8 ? "#f5d76a" : "#ff5c7a";

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 overflow-hidden select-none touch-none"
      style={{ background: "radial-gradient(circle at 20% 15%, #2b2660 0%, #1a1440 45%, #0f0c26 100%)" }}
      tabIndex={-1}
    >
      <style>{`
        @keyframes glubShake {
          0%, 100% { transform: translate(0,0); }
          20% { transform: translate(-8px,5px); }
          40% { transform: translate(8px,-5px); }
          60% { transform: translate(-6px,-7px); }
          80% { transform: translate(6px,7px); }
        }
        @keyframes glubParticle {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.15); opacity: 0; }
        }
        @keyframes glubHeart {
          0% { transform: translate(0,0) scale(0.6); opacity: 1; }
          100% { transform: translate(0,-70px) scale(1.1); opacity: 0; }
        }
        @keyframes glubSparkle {
          0%, 100% { transform: scale(0.85) rotate(0deg); opacity: 0.7; }
          50% { transform: scale(1.15) rotate(20deg); opacity: 1; }
        }
        @keyframes glubTreat {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50% { transform: translateY(-8px) rotate(8deg); }
        }
        @keyframes glubRainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* stars background */}
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => {
          const seed = (i * 37) % 100;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: seed % 3 === 0 ? 2 : 1,
                height: seed % 3 === 0 ? 2 : 1,
                left: `${(i * 53) % 100}%`,
                top: `${(i * 29) % 100}%`,
                opacity: 0.3 + (seed % 7) / 12,
              }}
            />
          );
        })}
      </div>

      {/* header */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-center px-5 py-3 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 max-w-sm">
        <h1 className="text-2xl text-teal-200 tracking-wide" style={{ fontFamily: "'Baloo 2', 'Fredoka', system-ui, sans-serif" }}>
          Glub
        </h1>
        <p className="text-xs text-violet-200/70 mt-1 leading-relaxed">
          poke twice for a kiss • hold to squeeze • arrow keys / space to move • tap fast at your own risk
        </p>
      </div>

      {/* score HUD */}
      <div className="absolute top-5 right-5 z-20 flex flex-col gap-2 items-end">
        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-violet-100 backdrop-blur-md flex gap-3">
          <span>✨ {starScore}</span>
          <span>🍬 {treatScore}</span>
          <span>💥 {popScore}</span>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-violet-100 backdrop-blur-md hover:bg-white/10 transition"
        >
          {muted ? "🔇 muted" : "🔊 sound"}
        </button>
      </div>

      {/* color picker - right side, vertical */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 px-2.5 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
        {SKINS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => {
              setSkinIdx(i);
              sounds.select();
              markInteraction();
            }}
            title={s.name}
            className="rounded-full transition-transform hover:scale-110"
            style={{
              width: 22,
              height: 22,
              background: s.swatch,
              border: i === skinIdx ? "2px solid white" : "2px solid rgba(255,255,255,0.25)",
              boxShadow: i === skinIdx ? "0 0 8px rgba(255,255,255,0.6)" : "none",
            }}
          />
        ))}
      </div>

      {/* combo / irritation meter */}
      {comboMeter >= 3 && !isExploded && (
        <div
          className="absolute z-20 rounded-full overflow-hidden bg-white/10 border border-white/20"
          style={{ width: 90, height: 8, transform: `translate3d(${phys.current.x - 45}px, ${phys.current.y - HALF - 66}px, 0)` }}
        >
          <div style={{ height: "100%", width: `${comboRatio * 100}%`, background: comboColor, transition: "width 0.12s, background 0.2s" }} />
        </div>
      )}

      {/* speech bubble */}
      {!isExploded && msg && (
        <div
          className="absolute z-20 px-3 py-1.5 rounded-full bg-white/90 text-[#1a1440] text-sm font-medium shadow-lg transition-all duration-200 pointer-events-none whitespace-nowrap"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${phys.current.x - 60}px, ${phys.current.y - HALF - 48}px, 0)`,
            opacity: 0.95,
          }}
        >
          {msg}
        </div>
      )}

      {/* sleep zzz */}
      {isAsleep && (
        <div
          className="absolute z-10 pointer-events-none text-cyan-100 font-bold"
          style={{ transform: `translate3d(${phys.current.x + 35}px, ${phys.current.y - HALF - 10}px, 0)` }}
        >
          <span className="block animate-bounce text-lg" style={{ animationDuration: "2.4s" }}>
            z Z z
          </span>
        </div>
      )}

      {/* floating hearts (kiss) */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute z-20 pointer-events-none text-xl"
          style={{ transform: `translate3d(${h.x}px, ${h.y}px, 0)`, animation: `glubHeart 1.1s ease-out ${h.delay}s forwards` }}
        >
          💕
        </div>
      ))}

      {/* sparkles mini-game */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          onClick={() => collectSparkle(s.id)}
          className="absolute z-10 cursor-pointer text-2xl"
          style={{ transform: `translate3d(${s.x - 14}px, ${s.y - 14}px, 0)`, animation: "glubSparkle 1.4s ease-in-out infinite" }}
        >
          ✨
        </div>
      ))}

      {/* treats mini-game */}
      {treats.map((t) => (
        <div
          key={t.id}
          onClick={() => collectTreat(t.id)}
          className="absolute z-10 cursor-pointer text-2xl"
          style={{ transform: `translate3d(${t.x - 14}px, ${t.y - 14}px, 0)`, animation: "glubTreat 1.6s ease-in-out infinite" }}
        >
          🍬
        </div>
      ))}

      {/* explosion particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute z-10 rounded-full pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animation: "glubParticle 0.85s ease-out forwards",
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}

      {/* the blob */}
      {!isExploded && (
        <div
          ref={blobRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute z-10 cursor-pointer active:cursor-grabbing"
          style={{ width: BLOB_SIZE, height: BLOB_SIZE, left: 0, top: 0, touchAction: "none" }}
        >
          <div
            className="w-full h-full rounded-full relative"
            style={{
              background: bodyGradient,
              boxShadow: "0 12px 30px rgba(0,0,0,0.35), inset -8px -10px 18px rgba(0,0,0,0.12), inset 6px 8px 14px rgba(255,255,255,0.35)",
              animation: rainbow ? "glubRainbow 1s linear" : "none",
            }}
          >
            {(isHappy || isSleepy) && (
              <>
                <div className="absolute rounded-full bg-pink-300/60" style={{ width: 20, height: 12, left: 20, top: 82 }} />
                <div className="absolute rounded-full bg-pink-300/60" style={{ width: 20, height: 12, right: 20, top: 82 }} />
              </>
            )}

            {/* eyebrows for fear */}
            {isScared && (
              <>
                <div style={{ position: "absolute", top: 40, left: 34, width: 26, height: 4, borderRadius: 2, background: "#7a1f36", transform: "rotate(-18deg)" }} />
                <div style={{ position: "absolute", top: 40, right: 34, width: 26, height: 4, borderRadius: 2, background: "#7a1f36", transform: "rotate(18deg)" }} />
              </>
            )}

            {!isAsleep && !isSleepy ? (
              <>
                {renderEye(pupilLRef, "left", mood, eyesClosed)}
                {renderEye(pupilRRef, "right", mood, eyesClosed)}
              </>
            ) : (
              <>
                <svg width="26" height="10" style={{ position: "absolute", left: 38, top: 68 }} viewBox="0 0 26 10">
                  <path d="M2 2 Q13 12 24 2" stroke="#1a1440" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="26" height="10" style={{ position: "absolute", right: 38, top: 68 }} viewBox="0 0 26 10">
                  <path d="M2 2 Q13 12 24 2" stroke="#1a1440" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </>
            )}

            <svg width="46" height="26" style={{ position: "absolute", left: "50%", marginLeft: -23, top: 92 }} viewBox="0 0 46 26">
              {isScared && <ellipse cx="23" cy="10" rx="9" ry="11" fill="#7a1f36" stroke="#1a1440" strokeWidth="2" />}
              {isHappy && <path d="M4 6 Q23 26 42 6" stroke="#1a1440" strokeWidth="3" fill="none" strokeLinecap="round" />}
              {(isSurprised || isFalling) && <ellipse cx="23" cy="10" rx="7" ry="8" fill="#1a1440" />}
              {(isAsleep || isSleepy) && <ellipse cx="23" cy="8" rx="5" ry="3" fill="#1a1440" opacity="0.8" />}
              {mood === "idle" && <path d="M8 4 Q23 16 38 4" stroke="#1a1440" strokeWidth="3" fill="none" strokeLinecap="round" />}
            </svg>
          </div>
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-0 h-px bg-white/5 pointer-events-none" />
    </div>
  );
}