"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// --- CONSTANTS & CONFIG ---
const BLOB_SIZE = 140;
const HALF = BLOB_SIZE / 2;
const BASE_GRAVITY = 0.72;
const AIR_FRICTION = 0.988;
const WALL_BOUNCE = 0.6;
const FLOOR_BOUNCE = 0.52;
const FOLLOW_SPRING = 0.26;
const RECOVERY = 0.18;
const PAD = 16;
const EXPLODE_THRESHOLD = 10;
const IDLE_SLEEPY_MS = 12000;
const IDLE_ASLEEP_MS = 20000;

const BALL_RADIUS = 20;

const SKINS = [
  { name: "Minty", grad: "radial-gradient(circle at 35% 30%, #d4ffe9, #5eead4 55%, #14b8a6 100%)", swatch: "#5eead4", particles: ["#5eead4", "#14b8a6", "#ccfbf1"] },
  { name: "Bubblegum", grad: "radial-gradient(circle at 35% 30%, #ffe4f3, #f472b6 55%, #db2777 100%)", swatch: "#f472b6", particles: ["#f472b6", "#db2777", "#fce7f3"] },
  { name: "Solar Flare", grad: "radial-gradient(circle at 35% 30%, #fef08a, #fb923c 55%, #ea580c 100%)", swatch: "#fb923c", particles: ["#fb923c", "#fef08a", "#ea580c"] },
  { name: "Cyber Iris", grad: "radial-gradient(circle at 35% 30%, #f3e8ff, #c084fc 55%, #7e22ce 100%)", swatch: "#c084fc", particles: ["#c084fc", "#7e22ce", "#f3e8ff"] },
  { name: "Electric Blue", grad: "radial-gradient(circle at 35% 30%, #e0f2fe, #38bdf8 55%, #0284c7 100%)", swatch: "#38bdf8", particles: ["#38bdf8", "#0284c7", "#e0f2fe"] },
  { name: "Matcha", grad: "radial-gradient(circle at 35% 30%, #ecfccb, #a3e635 55%, #65a30d 100%)", swatch: "#a3e635", particles: ["#a3e635", "#65a30d", "#ecfccb"] },
];

const SCARED_GRAD = "radial-gradient(circle at 35% 30%, #fee2e2, #f87171 55%, #dc2626 100%)";
const SLEEPY_GRAD = "radial-gradient(circle at 35% 30%, #e0f2fe, #7dd3fc 55%, #0ea5e9 100%)";

// --- AUDIO SYNTH ENGINE ---
function useSounds(mutedRef) {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current && typeof window !== "undefined") {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    if (ctxRef.current && ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const tone = useCallback((freq, dur, type = "sine", vol = 0.15, delay = 0, freqEnd = null) => {
    if (mutedRef.current) return;
    try {
      const ctx = getCtx();
      if (!ctx) return;
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
    } catch {}
  }, [mutedRef]);

  const noiseBurst = useCallback((dur = 0.15, vol = 0.18, cutoff = 1200, delay = 0) => {
    if (mutedRef.current) return;
    try {
      const ctx = getCtx();
      if (!ctx) return;
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
    } catch {}
  }, [mutedRef]);

  return {
    poke: (pitchBoost = 0) => tone(560 + pitchBoost, 0.08, "sine", 0.15, 0, 380 + pitchBoost),
    boop: () => tone(320, 0.1, "sine", 0.16, 0, 180),
    giggle: () => [660, 780, 720, 880].forEach((f, i) => tone(f, 0.07, "triangle", 0.1, i * 0.07)),
    yawn: () => tone(260, 0.6, "sine", 0.08, 0, 110),
    snore: () => tone(140, 0.45, "sine", 0.04, 0, 100),
    gasp: () => {
      noiseBurst(0.1, 0.14, 2200);
      tone(220, 0.2, "sawtooth", 0.12, 0.02, 90);
    },
    scream: () => tone(950, 0.35, "sawtooth", 0.12, 0, 320),
    whee: () => tone(440, 0.28, "sine", 0.12, 0, 800),
    wake: () => tone(520, 0.12, "sine", 0.14, 0, 700),
    chirp: () => tone(880, 0.06, "sine", 0.08, 0, 1050),
    land: () => tone(180, 0.08, "sine", 0.12, 0, 90),
    squeak: () => tone(700 + Math.random() * 250, 0.05, "triangle", 0.06, 0, 950),
    boing: () => {
      tone(180, 0.12, "sine", 0.14, 0, 520);
      tone(520, 0.08, "sine", 0.09, 0.1, 240);
    },
    ballHit: () => {
      tone(260, 0.08, "sine", 0.22, 0, 520);
      noiseBurst(0.04, 0.12, 2000);
    },
    goalFanfare: () => {
      [523, 659, 783, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.2, i * 0.1));
    },
    laserBeep: () => tone(1200, 0.04, "sine", 0.04, 0, 800),
    pop: () => {
      noiseBurst(0.28, 0.25, 3400);
      tone(130, 0.3, "sawtooth", 0.2, 0, 35);
    },
    kiss: () => {
      tone(950, 0.05, "sine", 0.1, 0, 700);
      noiseBurst(0.04, 0.08, 1900, 0.04);
    },
    reform: () => [240, 360, 480, 720].forEach((f, i) => tone(f, 0.1, "sine", 0.1, i * 0.07)),
    jump: () => tone(350, 0.12, "sine", 0.14, 0, 600),
    toySelect: () => tone(600, 0.06, "triangle", 0.08, 0, 850),
  };
}

// --- EXPRESSIVE VECTOR EYE ---
function RenderEye({ pupilRef, side, mood, blink }) {
  const isScared = mood === "scared";
  const isSurprised = mood === "surprised" || mood === "falling";
  const size = isScared || isSurprised ? 32 : 26;
  const iris = Math.round(size * 0.58);
  const pupilSize = isScared ? Math.round(iris * 0.38) : Math.round(iris * 0.5);

  return (
    <div
      style={{
        position: "absolute",
        [side]: 34,
        top: isSurprised ? 48 : 54,
        width: size,
        height: blink ? 3 : size,
        borderRadius: "50%",
        background: "#ffffff",
        overflow: "hidden",
        transition: "height 0.08s ease, width 0.15s, top 0.15s",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.1)",
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
            background: "#1e1b4b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.05s ease-out",
          }}
        >
          <div
            style={{
              width: pupilSize,
              height: pupilSize,
              borderRadius: "50%",
              background: "#030712",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: pupilSize * 0.45,
                height: pupilSize * 0.45,
                borderRadius: "50%",
                background: "white",
                top: pupilSize * 0.06,
                left: pupilSize * 0.1,
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
  const ballElemRef = useRef(null);
  const pupilLRef = useRef(null);
  const pupilRRef = useRef(null);

  // States
  const [mood, setMoodState] = useState("idle");
  const [blink, setBlink] = useState(false);
  const [msg, setMsg] = useState("tap me, move me, make me explode");
  const [skinIdx, setSkinIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeToy, setActiveToy] = useState("hand");
  const [gravityFlipped, setGravityFlipped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [goalCelebration, setGoalCelebration] = useState(null);

  // Scores
  const [playerScore, setPlayerScore] = useState(0);
  const [glubScore, setGlubScore] = useState(0);
  const [popScore, setPopScore] = useState(0);

  // Particles & Visuals
  const [particles, setParticles] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [comboMeter, setComboMeter] = useState(0);
  const [rainbow, setRainbow] = useState(false);
  const [laserPos, setLaserPos] = useState(null);

  const moodRef = useRef("idle");
  const setMood = (m) => {
    moodRef.current = m;
    setMoodState(m);
  };

  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const activeToyRef = useRef(activeToy);
  useEffect(() => {
    activeToyRef.current = activeToy;
  }, [activeToy]);

  const skinIdxRef = useRef(0);
  useEffect(() => {
    skinIdxRef.current = skinIdx;
  }, [skinIdx]);

  const sounds = useSounds(mutedRef);

  // Physics refs
  const phys = useRef({ x: 300, y: 300, vx: 0, vy: 0, scaleX: 1, scaleY: 1, rotation: 0, held: false, stuck: false });
  const ballPhys = useRef({ x: 180, y: 180, vx: 6, vy: -5, held: false, active: true, lastHitBy: "player" });
  const bounds = useRef({ left: PAD, top: PAD, right: 800, bottom: 600 });
  const dragStart = useRef({ x: 0, y: 0, time: 0, blobX: 0, blobY: 0 });
  const ballDragStart = useRef({ x: 0, y: 0, time: 0, ballX: 0, ballY: 0, lastX: 0, lastY: 0, lastTime: 0 });
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
  const gravityDir = useRef(1);
  const goalCooldown = useRef(false);

  // Resize & Boundary & Pointer Setup
  useEffect(() => {
    const updateBounds = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      bounds.current = { left: PAD, top: PAD, right: w - PAD, bottom: h - PAD };
      if (phys.current.x === 300 && phys.current.y === 300) {
        phys.current.x = w / 2;
        phys.current.y = h - HALF - 80;
        followTarget.current = { x: phys.current.x, y: phys.current.y };
        ballPhys.current.x = w / 2 - 120;
        ballPhys.current.y = h / 2;
      }
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);

    const updateLaserTarget = (clientX, clientY) => {
      cursorPos.current = { x: clientX, y: clientY };
      if (activeToyRef.current === "laser") {
        setLaserPos({ x: clientX, y: clientY });
      }
    };

    const onMouseMove = (e) => {
      updateLaserTarget(e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        updateLaserTarget(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchMove);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      const p = phys.current;
      if (moodRef.current === "exploded" || p.held || p.stuck) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
      }
      markInteractionRef.current();
      if (e.key === "ArrowLeft") p.vx -= 8;
      else if (e.key === "ArrowRight") p.vx += 8;
      else if (e.key === "ArrowUp") {
        p.vy -= 13 * gravityDir.current;
        sounds.jump();
      } else if (e.key === "ArrowDown") p.vy += 8 * gravityDir.current;
      else if (e.key === " " || e.key === "Spacebar") {
        p.vy = -18 * gravityDir.current;
        sounds.jump();
        setMsg("Wheee! 🚀");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sounds]);

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

  const triggerGoal = (scorer) => {
    if (goalCooldown.current) return;
    goalCooldown.current = true;
    sounds.goalFanfare();

    const isPlayer = scorer === "You";
    if (isPlayer) {
      setPlayerScore((s) => s + 1);
      setMood("surprised");
      setMsg("GOAAAL! What a strike! 🏆🔥");
      setGoalCelebration("GOAL! YOU SCORED! 🎉");
    } else {
      setGlubScore((s) => s + 1);
      setMood("happy");
      setMsg("GOAAAL for Glub! Top bin! ⚽⚡");
      setGoalCelebration("GLUB SCORED! 🌟");
    }

    pulseSquish(1.35, 0.7);

    // Goal confetti burst
    const b = bounds.current;
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    const n = 24;
    const parts = Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const dist = 90 + Math.random() * 140;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy - 40,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 50,
        color: ["#facc15", "#38bdf8", "#f43f5e", "#4ade80", "#c084fc"][i % 5],
        size: 10 + Math.random() * 12,
      };
    });
    setParticles(parts);
    setTimeout(() => setParticles([]), 1100);

    // Reset ball to center
    setTimeout(() => {
      ballPhys.current.x = (b.left + b.right) / 2;
      ballPhys.current.y = (b.top + b.bottom) / 2 - 80;
      ballPhys.current.vx = (Math.random() - 0.5) * 8;
      ballPhys.current.vy = -6;
      setGoalCelebration(null);
      goalCooldown.current = false;
      clearMoodSoon("happy", 800);
      clearMoodSoon("surprised", 800);
    }, 1600);
  };

  const triggerKiss = () => {
    sounds.kiss();
    setMood("happy");
    setMsg("Mwah! 💕");
    pulseSquish(1.2, 1.2);
    const cx = phys.current.x;
    const cy = phys.current.y;
    const newHearts = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 50,
      y: cy - HALF * 0.4,
      delay: i * 0.1,
    }));
    setHearts((h) => [...h, ...newHearts]);
    setTimeout(() => setHearts((h) => h.filter((x) => !newHearts.includes(x))), 1200);
    clearMoodSoon("happy", 800);
  };

  const triggerPoke = () => {
    const now = performance.now();
    if (now - lastTapTime.current < 650) comboCount.current += 1;
    else comboCount.current = 1;
    lastTapTime.current = now;
    setComboMeter(comboCount.current);

    if (comboCount.current >= EXPLODE_THRESHOLD) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      explode();
      return;
    }

    const pitchBoost = Math.min(comboCount.current * 45, 500);
    sounds.poke(pitchBoost);
    const squash = Math.min(0.22 + comboCount.current * 0.04, 0.55);
    pulseSquish(1 + squash, 1 - squash);

    if (comboCount.current === 1) {
      const special = ["spin", "hic", "rainbow", "grow", null, null][Math.floor(Math.random() * 6)];
      if (special === "spin") {
        spinUntil.current = now + 520;
        spinAxisSign.current = Math.random() < 0.5 ? 1 : -1;
        sounds.whee();
        setMsg("Spin cycle! 🌀");
      } else if (special === "hic") {
        sounds.boop();
        setMsg("*hiccup!* 🫧");
      } else if (special === "rainbow") {
        setRainbow(true);
        sounds.chirp();
        setMsg("✨ Prismatic Glub! ✨");
        setTimeout(() => setRainbow(false), 1200);
      } else if (special === "grow") {
        pulseSquish(1.4, 1.4);
        sounds.boop();
        setMsg("*big inhale!*");
      } else {
        setMsg(["Hehe!", "Hi friend!", "Boop!", "Squishy~"][Math.floor(Math.random() * 4)]);
      }
      setMood("happy");
      clearMoodSoon("happy", 450);
    } else if (comboCount.current === 2) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = setTimeout(() => {
        if (comboCount.current === 2) triggerKiss();
      }, 300);
      setMood("happy");
    } else {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      if (comboCount.current <= 5) setMsg(["Tickles!", "Again?!", "Whoa!"][Math.floor(Math.random() * 3)]);
      else if (comboCount.current <= 8) setMsg(["Dizzy dizzy...", "Okay stoppp haha!"][Math.floor(Math.random() * 2)]);
      else setMsg(["Brace for impact!", "I'm gonna burst! 💥"][Math.floor(Math.random() * 2)]);
      setMood("happy");
      clearMoodSoon("happy", 450);
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
    const n = 18;
    const parts = Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const dist = 60 + Math.random() * 110;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        color: skin.particles[i % skin.particles.length],
        size: 9 + Math.random() * 18,
      };
    });
    setParticles(parts);
    setTimeout(() => setParticles([]), 950);

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
      setMsg(["*Pop* I'm back in one piece!", "That was intense!", "Reassembled! 🦾"][Math.floor(Math.random() * 3)]);
      markInteraction();
    }, 900);
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

  const unstick = (early) => {
    if (unstickTimer.current) clearTimeout(unstickTimer.current);
    phys.current.stuck = false;
    const edge = stuckEdge.current;
    phys.current.vx = edge === "left" ? 6 : edge === "right" ? -6 : (Math.random() - 0.5) * 5;
    phys.current.vy = edge === "top" ? 5 : -4;
    setMood("idle");
    setMsg(["Ouchie!", "Gentle throws please!", "Eep!"][Math.floor(Math.random() * 3)]);
    if (!early) sounds.chirp();
  };

  const triggerHit = () => {
    sounds.gasp();
    setMood("scared");
    setMsg("EEK! 💥");
    comboCount.current = 0;
    setComboMeter(0);
    if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    const edge = nearestEdge();
    stuckEdge.current = edge;
    stuckTarget.current = edgeTarget(edge);
    phys.current.stuck = true;
    phys.current.held = false;
    pulseSquish(edge === "left" || edge === "right" ? 0.5 : 1.3, edge === "left" || edge === "right" ? 1.3 : 0.5);
    if (unstickTimer.current) clearTimeout(unstickTimer.current);
    unstickTimer.current = setTimeout(() => unstick(false), 2400);
  };

  const goToSleep = (auto = false) => {
    sleepyMeter.current = 0;
    sounds.yawn();
    setMood("asleep");
    setMsg(auto ? "*dozed off* zzz" : "Nighty night... 💤");
  };

  // Ball Pointer Handlers
  const onBallPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    markInteraction();
    ballPhys.current.held = true;
    ballPhys.current.vx = 0;
    ballPhys.current.vy = 0;
    ballPhys.current.lastHitBy = "player";
    const now = performance.now();
    ballDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      time: now,
      ballX: ballPhys.current.x,
      ballY: ballPhys.current.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
    };
  };

  const onBallPointerMove = (e) => {
    if (!ballPhys.current.held) return;
    markInteraction();
    const now = performance.now();
    ballPhys.current.x = e.clientX;
    ballPhys.current.y = e.clientY;

    const dt = Math.max(now - ballDragStart.current.lastTime, 1);
    ballPhys.current.vx = ((e.clientX - ballDragStart.current.lastX) / dt) * 16;
    ballPhys.current.vy = ((e.clientY - ballDragStart.current.lastY) / dt) * 16;

    ballDragStart.current.lastX = e.clientX;
    ballDragStart.current.lastY = e.clientY;
    ballDragStart.current.lastTime = now;
  };

  const onBallPointerUp = () => {
    if (!ballPhys.current.held) return;
    ballPhys.current.held = false;
    ballPhys.current.lastHitBy = "player";
    sounds.whee();
  };

  // Background pointer handlers to support laser dot touching on phones
  const onCanvasPointerDown = (e) => {
    if (activeToyRef.current === "laser") {
      setLaserPos({ x: e.clientX, y: e.clientY });
      sounds.laserBeep();
    }
  };

  const onCanvasPointerMove = (e) => {
    if (activeToyRef.current === "laser") {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  // Blob Pointer Handlers
  const onPointerDown = (e) => {
    if (moodRef.current === "exploded") return;
    e.preventDefault();
    try {
      blobRef.current?.setPointerCapture(e.pointerId);
    } catch {}
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
      setMsg("I'm awake! 👀");
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

    if (distFromStart < 50) {
      followTarget.current = {
        x: dragStart.current.blobX + (e.clientX - dragStart.current.x) * 0.35,
        y: dragStart.current.blobY + (e.clientY - dragStart.current.y) * 0.35,
      };
      const moveMag = Math.hypot(dx, dy);
      rubAccum.current += moveMag;
      totalWiggle.current += moveMag;
      if (rubAccum.current > 32) {
        rubAccum.current = 0;
        sleepyMeter.current += 6;
        pulseSquish(1.12, 0.9);
        if (now - lastSoundTime.current > 250) {
          sounds.giggle();
          lastSoundTime.current = now;
          if (moodRef.current !== "asleep") {
            setMood(sleepyMeter.current > 50 ? "sleepy" : "happy");
            setMsg(sleepyMeter.current > 50 ? "So cozy... 🥱" : "Hehehe~");
          }
        }
        if (sleepyMeter.current >= 100) goToSleep(false);
      }
    } else {
      followTarget.current = { x: e.clientX - pointerOffset.current.dx, y: e.clientY - pointerOffset.current.dy };
      if (moodRef.current !== "surprised") {
        setMood("surprised");
        setMsg("Wheee!");
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

    if (totalDist < 12 && duration < 240) {
      triggerPoke();
    } else if (duration < 180 && totalDist > 32 && speed > 0.35) {
      triggerHit();
    } else if (totalDist < 50) {
      sounds.boing();
      pulseSquish(1.4, 0.65);
      setMsg(["Squishy squish!", "That felt great!", "Hehe!"][Math.floor(Math.random() * 3)]);
      phys.current.vx = 0;
      phys.current.vy = 0;
      setMood("happy");
      clearMoodSoon("happy", 500);
    } else {
      sounds.whee();
      setMood("surprised");
      setMsg("Flying Glub! 🎈");
      clearMoodSoon("surprised", 650);
    }
  };

  // Main Loop
  useEffect(() => {
    let blinkTimer = setTimeout(function loopBlink() {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
      blinkTimer = setTimeout(loopBlink, 2200 + Math.random() * 3400);
    }, 2000);

    const tick = () => {
      const p = phys.current;
      const bp = ballPhys.current;
      const b = bounds.current;
      const now = performance.now();

      const grav = BASE_GRAVITY * gravityDir.current;

      // 1. UPDATE BLOB PHYSICS & AI
      if (moodRef.current !== "exploded") {
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

          const heldElapsed = now - dragStart.current.time;
          const distFromStart = Math.hypot(lastMove.current.x - dragStart.current.x, lastMove.current.y - dragStart.current.y);

          if (distFromStart < 25 && totalWiggle.current < 15 && heldElapsed > 180) {
            const sf = Math.min((heldElapsed - 180) / 450, 1);
            p.scaleX = 1 + sf * 0.4;
            p.scaleY = 1 - sf * 0.45;
            if (now - lastSqueakTime.current > 360) {
              lastSqueakTime.current = now;
              sounds.squeak();
            }
          }
        } else {
          // Autonomous Goal Striker / Laser AI
          if (activeToyRef.current === "ball" && bp.active && !bp.held && !goalCooldown.current) {
            const bdx = bp.x - p.x;
            const bdy = bp.y - p.y;
            const distToBall = Math.hypot(bdx, bdy);

            // Glub actively moves to kick or head the ball towards the player's goal
            if (distToBall < 480) {
              p.vx += (bdx / distToBall) * 0.65;
              if (bdy < -30 && Math.abs(p.y - (b.bottom - HALF)) < 25 && Math.random() < 0.08) {
                p.vy = -12 * gravityDir.current;
                sounds.jump();
              }
            }
          } else if (activeToyRef.current === "laser" && laserPos) {
            const ldx = laserPos.x - p.x;
            const ldy = laserPos.y - p.y;
            const ldist = Math.hypot(ldx, ldy);
            if (ldist > 25 && ldist < 700) {
              p.vx += (ldx / ldist) * 0.85;
              if (ldy < -30 && Math.abs(p.y - (b.bottom - HALF)) < 25) {
                p.vy = -11 * gravityDir.current;
                sounds.laserBeep();
              }
            }
          }

          // Gravity & movement
          p.vy += grav;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= AIR_FRICTION;

          // Screaming on fast falls
          if (!p.stuck && Math.abs(p.vy) > 16 && moodRef.current !== "scared" && moodRef.current !== "asleep" && !hasScreamed.current) {
            hasScreamed.current = true;
            sounds.scream();
            setMood("falling");
            setMsg("AAAAHHH! 💨");
          }

          // Floor / Ceiling Bounce
          const floorY = gravityDir.current > 0 ? b.bottom - HALF : b.top + HALF;
          const hitFloor = gravityDir.current > 0 ? p.y > floorY : p.y < floorY;

          if (hitFloor) {
            p.y = floorY;
            if (Math.abs(p.vy) > 2) {
              pulseSquish(1.3, 0.65);
              sounds.land();
            }
            p.vy = -p.vy * FLOOR_BOUNCE;
            if (Math.abs(p.vy) < 1.2) p.vy = 0;
            p.vx *= 0.86;
            if (hasScreamed.current) {
              hasScreamed.current = false;
              if (moodRef.current === "falling") {
                setMood("idle");
                setMsg("Landed safely! 🎯");
              }
            }
          }

          // Left/Right Walls
          if (p.x < b.left + HALF) {
            p.x = b.left + HALF;
            p.vx = -p.vx * WALL_BOUNCE;
          }
          if (p.x > b.right - HALF) {
            p.x = b.right - HALF;
            p.vx = -p.vx * WALL_BOUNCE;
          }

          const ceilingY = gravityDir.current > 0 ? b.top + HALF : b.bottom - HALF;
          if (gravityDir.current > 0 ? p.y < ceilingY : p.y > ceilingY) {
            p.y = ceilingY;
            p.vy = -p.vy * WALL_BOUNCE;
          }
        }

        // Recovery toward circular
        let targetSX = 1,
          targetSY = 1;
        if (now < growUntil.current) {
          targetSX = 1.3;
          targetSY = 1.3;
        } else if (!p.held && !p.stuck) {
          const breathe = Math.sin(now / 450) * (moodRef.current === "asleep" ? 0.035 : 0.018);
          targetSX = 1 - breathe;
          targetSY = 1 + breathe;
        }
        p.scaleX += (targetSX - p.scaleX) * RECOVERY;
        p.scaleY += (targetSY - p.scaleY) * RECOVERY;

        // Rotation settle
        if (spinUntil.current > now) {
          p.rotation += 22 * spinAxisSign.current;
        } else {
          const nearest = Math.round(p.rotation / 360) * 360;
          p.rotation += (nearest - p.rotation) * 0.2;
        }

        if (blobRef.current) {
          blobRef.current.style.transform = `translate3d(${p.x - HALF}px, ${p.y - HALF}px, 0) rotate(${p.rotation}deg) scale(${p.scaleX}, ${p.scaleY})`;
        }
      }

      // 2. UPDATE SOCCER BALL PHYSICS & GOAL DETECTION
      if (activeToyRef.current === "ball" && bp.active) {
        if (!bp.held) {
          bp.vy += grav * 0.88;
          bp.x += bp.vx;
          bp.y += bp.vy;
          bp.vx *= 0.992;

          const goalTop = b.bottom - 170;
          const inGoalHeight = bp.y > goalTop && bp.y < b.bottom;

          // Check Left Goal
          if (bp.x < b.left + 24 && inGoalHeight) {
            triggerGoal(bp.lastHitBy === "player" ? "You" : "Glub");
          } else if (bp.x < b.left + BALL_RADIUS) {
            bp.x = b.left + BALL_RADIUS;
            bp.vx = -bp.vx * 0.8;
          }

          // Check Right Goal
          if (bp.x > b.right - 24 && inGoalHeight) {
            triggerGoal(bp.lastHitBy === "player" ? "You" : "Glub");
          } else if (bp.x > b.right - BALL_RADIUS) {
            bp.x = b.right - BALL_RADIUS;
            bp.vx = -bp.vx * 0.8;
          }

          // Floor / Ceiling
          if (bp.y > b.bottom - BALL_RADIUS) {
            bp.y = b.bottom - BALL_RADIUS;
            bp.vy = -bp.vy * 0.78;
            bp.vx *= 0.92;
            if (Math.abs(bp.vy) < 0.6) bp.vy = 0;
          }
          if (bp.y < b.top + BALL_RADIUS) {
            bp.y = b.top + BALL_RADIUS;
            bp.vy = -bp.vy * 0.78;
          }

          // Collision: Ball <-> Glub
          if (moodRef.current !== "exploded") {
            const bdx = bp.x - p.x;
            const bdy = bp.y - p.y;
            const bdist = Math.hypot(bdx, bdy);
            const minDist = HALF + BALL_RADIUS;

            if (bdist < minDist) {
              const nx = bdx / (bdist || 1);
              const ny = bdy / (bdist || 1);
              const overlap = minDist - bdist;

              bp.x += nx * overlap;
              bp.y += ny * overlap;

              const relVx = bp.vx - p.vx;
              const relVy = bp.vy - p.vy;
              const impulse = relVx * nx + relVy * ny;

              if (impulse < 0) {
                bp.vx -= 1.65 * impulse * nx;
                bp.vy -= 1.65 * impulse * ny;
                p.vx += 0.75 * impulse * nx;
                p.vy += 0.75 * impulse * ny;

                bp.lastHitBy = "glub";
                sounds.ballHit();
                pulseSquish(1.22, 0.78);

                if (Math.hypot(relVx, relVy) > 13) {
                  setMood("surprised");
                  setMsg(["HEADSHOT! ⚽", "Rocket shot! 🔥", "BOOM!"][Math.floor(Math.random() * 3)]);
                  clearMoodSoon("surprised", 600);
                } else {
                  setMood("happy");
                  setMsg(["Nice pass! ⚽", "Heading it back!", "Corner kick!"][Math.floor(Math.random() * 3)]);
                  clearMoodSoon("happy", 500);
                }
              }
            }
          }
        }

        if (ballElemRef.current) {
          ballElemRef.current.style.transform = `translate3d(${bp.x - BALL_RADIUS}px, ${bp.y - BALL_RADIUS}px, 0)`;
        }
      }

      // 3. EYE TRACKING (Looks at ball, laser, or touch/mouse)
      let targetGazeX = cursorPos.current.x;
      let targetGazeY = cursorPos.current.y;

      if (activeToyRef.current === "ball" && bp.active) {
        targetGazeX = bp.x;
        targetGazeY = bp.y;
      } else if (activeToyRef.current === "laser" && laserPos) {
        targetGazeX = laserPos.x;
        targetGazeY = laserPos.y;
      }

      if ((moodRef.current === "idle" || moodRef.current === "happy") && !p.held && !p.stuck) {
        const dx = targetGazeX - p.x;
        const dy = targetGazeY - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const range = 5.5;
        const ox = (dx / dist) * Math.min(range, dist / 18);
        const oy = (dy / dist) * Math.min(range, dist / 18);
        if (pupilLRef.current) pupilLRef.current.style.transform = `translate(${ox}px, ${oy}px)`;
        if (pupilRRef.current) pupilRRef.current.style.transform = `translate(${ox}px, ${oy}px)`;
      } else if (moodRef.current === "scared") {
        const jx = (Math.random() - 0.5) * 4;
        const jy = (Math.random() - 0.5) * 4;
        if (pupilLRef.current) pupilLRef.current.style.transform = `translate(${jx}px, ${jy}px)`;
        if (pupilRRef.current) pupilRRef.current.style.transform = `translate(${jx}px, ${jy}px)`;
      }

      // Snoring audio when asleep
      if (moodRef.current === "asleep" && now - lastSnoreTime.current > 1800) {
        lastSnoreTime.current = now;
        sounds.snore();
      }

      // Inactivity Sleep Trigger
      if (!p.held && !p.stuck && moodRef.current !== "exploded" && moodRef.current !== "falling") {
        const idleFor = now - lastInteraction.current;
        if (idleFor > IDLE_SLEEPY_MS && idleFor < IDLE_ASLEEP_MS && moodRef.current === "idle" && !sleepyWarned.current) {
          sleepyWarned.current = true;
          setMood("sleepy");
          setMsg("*Yaaawn* Getting sleepy... 🥱");
        }
        if (idleFor > IDLE_ASLEEP_MS && (moodRef.current === "idle" || moodRef.current === "sleepy")) {
          goToSleep(true);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(blinkTimer);
      if (unstickTimer.current) clearTimeout(unstickTimer.current);
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    };
  }, [sounds, laserPos]);

  const toggleGravity = () => {
    gravityDir.current = gravityDir.current * -1;
    setGravityFlipped((g) => !g);
    sounds.whee();
    setMsg(gravityDir.current < 0 ? "Antigravity active! 🛸" : "Gravity normalized! 🌍");
  };

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
  const comboColor = comboRatio < 0.5 ? "#5eead4" : comboRatio < 0.8 ? "#facc15" : "#f43f5e";

  return (
    <div
      ref={wrapRef}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      className="fixed inset-0 overflow-hidden select-none touch-none"
      style={{
        background: "radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 60%, #030712 100%)",
        cursor: activeToy === "laser" ? "crosshair" : "default",
      }}
      tabIndex={-1}
    >
      <style>{`
        @keyframes glubShake {
          0%, 100% { transform: translate(0,0); }
          20% { transform: translate(-8px, 6px); }
          40% { transform: translate(8px, -6px); }
          60% { transform: translate(-6px, -6px); }
          80% { transform: translate(6px, 6px); }
        }
        @keyframes glubParticle {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
        }
        @keyframes glubHeart {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          100% { transform: translate(0, -80px) scale(1.15); opacity: 0; }
        }
        @keyframes glubRainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>

      {/* Ambient background particles */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-200"
            style={{
              width: i % 3 === 0 ? 3 : 1.5,
              height: i % 3 === 0 ? 3 : 1.5,
              left: `${(i * 47) % 100}%`,
              top: `${(i * 31) % 100}%`,
              opacity: 0.3 + (i % 5) / 10,
            }}
          />
        ))}
      </div>

      {/* SOCCER GOAL POSTS */}
      {activeToy === "ball" && (
        <>
          {/* Left Goal */}
          <div
            className="absolute left-0 bottom-0 pointer-events-none z-10 flex flex-col justify-end"
            style={{ width: 48, height: 170 }}
          >
            <div className="w-full h-full border-r-4 border-t-4 border-emerald-400/80 rounded-tr-2xl bg-emerald-500/10 backdrop-blur-xs flex items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-300 -rotate-90 tracking-widest uppercase">Goal L</span>
            </div>
          </div>

          {/* Right Goal */}
          <div
            className="absolute right-0 bottom-0 pointer-events-none z-10 flex flex-col justify-end"
            style={{ width: 48, height: 170 }}
          >
            <div className="w-full h-full border-l-4 border-t-4 border-emerald-400/80 rounded-tl-2xl bg-emerald-500/10 backdrop-blur-xs flex items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-300 rotate-90 tracking-widest uppercase">Goal R</span>
            </div>
          </div>
        </>
      )}

      {/* GOAL BANNER NOTIFICATION */}
      {goalCelebration && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-bounce pointer-events-none">
          <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white font-extrabold text-lg shadow-2xl tracking-wide border border-white/30 whitespace-nowrap">
            {goalCelebration}
          </div>
        </div>
      )}

      {/* TOP HEADER & CONTROL HUB */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-start justify-between">
        {/* Left: Brand Title */}
        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          {/* <h1 className="text-sm font-bold tracking-wider text-white font-mono">GLUB.OS</h1> */}
        </div>

        {/* Right: Scoreboard & Dropdown Hub */}
        <div className="flex items-center gap-2">
          {/* Soccer Match Score */}
          {activeToy === "ball" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-xs font-mono font-bold text-white shadow-xl">
              <span className="text-cyan-300">YOU {playerScore}</span>
              <span className="text-slate-400">:</span>
              <span className="text-emerald-300">{glubScore} GLUB</span>
            </div>
          )}

          {/* Quick Sound Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition backdrop-blur-xl border border-white/15 text-white text-xs"
            title={muted ? "Unmute Sound" : "Mute Sound"}
          >
            {muted ? "🔇" : "🔊"}
          </button>

          {/* Settings & Toys Dropdown Menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-xl"
            >
              <span>⚙️ Controls</span>
              <span className={`text-[10px] transition-transform ${menuOpen ? "rotate-180" : ""}`}>▼</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-64 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col gap-3 text-white text-xs z-50">
                {/* Section 1: Toys & Modes */}
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Activity Mode</span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    <button
                      onClick={() => {
                        setActiveToy("hand");
                        sounds.toySelect();
                        setMenuOpen(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 font-medium transition ${
                        activeToy === "hand" ? "bg-white text-slate-900 shadow-md font-bold" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-base">👋</span>
                      <span>Pet</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveToy("ball");
                        ballPhys.current.active = true;
                        sounds.toySelect();
                        setMenuOpen(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 font-medium transition ${
                        activeToy === "ball" ? "bg-white text-slate-900 shadow-md font-bold" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-base">⚽</span>
                      <span>Soccer</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveToy("laser");
                        sounds.toySelect();
                        setMenuOpen(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 font-medium transition ${
                        activeToy === "laser" ? "bg-white text-slate-900 shadow-md font-bold" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-base">🔴</span>
                      <span>Laser</span>
                    </button>
                  </div>
                </div>

                {/* Section 2: Gravity Flip */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-slate-300">Antigravity</span>
                  <button
                    onClick={() => {
                      toggleGravity();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                      gravityFlipped ? "bg-violet-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {gravityFlipped ? "ON 🛸" : "OFF 🌍"}
                  </button>
                </div>

                {/* Section 3: Skins / Color Palette */}
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Skins</span>
                  <div className="grid grid-cols-6 gap-1.5 mt-2">
                    {SKINS.map((s, i) => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setSkinIdx(i);
                          sounds.toySelect();
                          markInteraction();
                        }}
                        title={s.name}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: s.swatch,
                          border: i === skinIdx ? "2px solid #ffffff" : "2px solid rgba(255,255,255,0.2)",
                          boxShadow: i === skinIdx ? `0 0 10px ${s.swatch}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Section 4: Explosions Count */}
                <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
                  <span>Blob Explosions:</span>
                  <span className="font-bold text-white">💥 {popScore}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* FLOATING SPEECH BANNER */}
      {!isExploded && msg && (
        <div
          className="absolute z-30 transition-all duration-200 pointer-events-none whitespace-nowrap"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${phys.current.x - 70}px, ${phys.current.y - HALF - 44}px, 0)`,
          }}
        >
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-white/20 backdrop-blur-md text-white text-xs font-medium shadow-xl">
            {msg}
          </div>
        </div>
      )}

      {/* COMBO METER */}
      {comboMeter >= 3 && !isExploded && (
        <div
          className="absolute z-20 rounded-full overflow-hidden bg-white/10 border border-white/20"
          style={{
            width: 90,
            height: 6,
            transform: `translate3d(${phys.current.x - 45}px, ${phys.current.y - HALF - 60}px, 0)`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${comboRatio * 100}%`,
              background: comboColor,
              transition: "width 0.12s, background 0.2s",
            }}
          />
        </div>
      )}

      {/* SOCCER BALL OBJECT */}
      {activeToy === "ball" && ballPhys.current.active && (
        <div
          ref={ballElemRef}
          onPointerDown={onBallPointerDown}
          onPointerMove={onBallPointerMove}
          onPointerUp={onBallPointerUp}
          className="absolute z-20 cursor-grab active:cursor-grabbing touch-none"
          style={{
            width: BALL_RADIUS * 2,
            height: BALL_RADIUS * 2,
            left: 0,
            top: 0,
          }}
        >
          <div
            className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 35%, #ffffff, #e2e8f0 65%, #94a3b8 100%)",
              boxShadow: "0 8px 18px rgba(0,0,0,0.4), inset -2px -3px 6px rgba(0,0,0,0.3), inset 2px 3px 6px rgba(255,255,255,0.8)",
            }}
          >
            {/* Classic Soccer Pentagons */}
            <div className="w-3.5 h-3.5 bg-slate-900 rounded-sm rotate-45" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-slate-900 rounded-b" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-slate-900 rounded-t" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-2 bg-slate-900 rounded-r" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-2 bg-slate-900 rounded-l" />
          </div>
        </div>
      )}

      {/* LASER POINTER DOT */}
      {activeToy === "laser" && laserPos && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            transform: `translate3d(${laserPos.x - 8}px, ${laserPos.y - 8}px, 0)`,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_18px_5px_rgba(239,68,68,0.95)] animate-pulse" />
        </div>
      )}

      {/* EXPLOSION & GOAL PARTICLES */}
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
            animation: "glubParticle 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}

      {/* HEARTS */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute z-20 pointer-events-none text-xl"
          style={{
            transform: `translate3d(${h.x}px, ${h.y}px, 0)`,
            animation: `glubHeart 1.1s ease-out ${h.delay}s forwards`,
          }}
        >
          💕
        </div>
      ))}

      {/* SLEEP ZZZ */}
      {isAsleep && (
        <div
          className="absolute z-10 pointer-events-none text-cyan-200 font-bold font-mono tracking-widest"
          style={{ transform: `translate3d(${phys.current.x + 35}px, ${phys.current.y - HALF - 10}px, 0)` }}
        >
          <span className="block animate-bounce text-base">z Z z...</span>
        </div>
      )}

      {/* THE BLOB (GLUB) */}
      {!isExploded && (
        <div
          ref={blobRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute z-10 cursor-pointer active:cursor-grabbing touch-none"
          style={{
            width: BLOB_SIZE,
            height: BLOB_SIZE,
            left: 0,
            top: 0,
          }}
        >
          <div
            className="w-full h-full rounded-full relative"
            style={{
              background: bodyGradient,
              boxShadow:
                "0 16px 36px rgba(0,0,0,0.4), inset -8px -10px 18px rgba(0,0,0,0.15), inset 6px 8px 16px rgba(255,255,255,0.45)",
              animation: rainbow ? "glubRainbow 1s linear" : "none",
            }}
          >
            {/* Blushing cheeks */}
            {(isHappy || isSleepy) && (
              <>
                <div className="absolute rounded-full bg-pink-400/50 blur-[2px]" style={{ width: 22, height: 12, left: 18, top: 78 }} />
                <div className="absolute rounded-full bg-pink-400/50 blur-[2px]" style={{ width: 22, height: 12, right: 18, top: 78 }} />
              </>
            )}

            {/* Scared Eyebrows */}
            {isScared && (
              <>
                <div className="absolute top-9 left-8 w-6 h-1 rounded-full bg-rose-900 -rotate-12" />
                <div className="absolute top-9 right-8 w-6 h-1 rounded-full bg-rose-900 rotate-12" />
              </>
            )}

            {/* Eyes */}
            {!isAsleep && !isSleepy ? (
              <>
                <RenderEye pupilRef={pupilLRef} side="left" mood={mood} blink={eyesClosed} />
                <RenderEye pupilRef={pupilRRef} side="right" mood={mood} blink={eyesClosed} />
              </>
            ) : (
              <>
                <svg width="26" height="10" style={{ position: "absolute", left: 34, top: 64 }} viewBox="0 0 26 10">
                  <path d="M2 2 Q13 12 24 2" stroke="#1e1b4b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="26" height="10" style={{ position: "absolute", right: 34, top: 64 }} viewBox="0 0 26 10">
                  <path d="M2 2 Q13 12 24 2" stroke="#1e1b4b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </svg>
              </>
            )}

            {/* Mouth */}
            <svg width="46" height="26" style={{ position: "absolute", left: "50%", marginLeft: -23, top: 88 }} viewBox="0 0 46 26">
              {isScared && <ellipse cx="23" cy="10" rx="9" ry="11" fill="#881337" stroke="#1e1b4b" strokeWidth="2" />}
              {isHappy && <path d="M4 6 Q23 26 42 6" stroke="#1e1b4b" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
              {(isSurprised || isFalling) && <ellipse cx="23" cy="10" rx="7" ry="9" fill="#1e1b4b" />}
              {(isAsleep || isSleepy) && <ellipse cx="23" cy="8" rx="5" ry="3" fill="#1e1b4b" opacity="0.8" />}
              {mood === "idle" && <path d="M8 5 Q23 16 38 5" stroke="#1e1b4b" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}