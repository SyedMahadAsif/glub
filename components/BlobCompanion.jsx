"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// --- PHYSICS & INTERACTION CONSTANTS ---
const BASE_GRAVITY = 0.75;
const AIR_FRICTION = 0.985;
const WALL_BOUNCE = 0.6;
const FLOOR_BOUNCE = 0.52;
const FOLLOW_SPRING = 0.28;
const RECOVERY = 0.18;
const PAD = 16;
const EXPLODE_THRESHOLD = 10;
const IDLE_SLEEPY_MS = 18000;
const IDLE_ASLEEP_MS = 30000;
const BALL_RADIUS = 22;

// --- COLOR & THEME MATRIX ---
const CHASSIS_THEMES = [
  { name: "Cyber Teal", eyeGlow: "#38bdf8", accent: "#38bdf8", glow: "rgba(56,189,248,0.5)", particles: ["#38bdf8", "#0284c7", "#e0f2fe"] },
  { name: "Neon Violet", eyeGlow: "#c084fc", accent: "#a855f7", glow: "rgba(192,132,252,0.5)", particles: ["#c084fc", "#7e22ce", "#f3e8ff"] },
  { name: "Matrix Emerald", eyeGlow: "#4ade80", accent: "#10b981", glow: "rgba(52,211,153,0.5)", particles: ["#34d399", "#10b981", "#a7f3d0"] },
  { name: "Solar Gold", eyeGlow: "#facc15", accent: "#f59e0b", glow: "rgba(251,191,36,0.5)", particles: ["#facc15", "#f59e0b", "#fef08a"] },
  { name: "Crimson Mecha", eyeGlow: "#fb7185", accent: "#e11d48", glow: "rgba(244,63,94,0.5)", particles: ["#f43f5e", "#e11d48", "#ffe4e6"] },
];

const FOOD_ITEMS = [
  { name: "Cyber Pizza", icon: "🍕", energy: 20 },
  { name: "Nano Burger", icon: "🍔", energy: 25 },
  { name: "Quantum Apple", icon: "🍎", energy: 15 },
  { name: "Glitch Donut", icon: "🍩", energy: 18 },
  { name: "Battery Pack", icon: "🔋", energy: 30 },
  { name: "Taco Matrix", icon: "🌮", energy: 20 },
];

const COMPLIMENTS = [
  "You have the highest intelligence quotient in my neural registry! 🧠✨",
  "If my circuits had feelings, my processor would overclock for you! 💓",
  "Your smile generates 1.21 Gigawatts of pure positivity! ⚡",
  "You are 100% certified my favorite human! 🤖🌟",
];

const SECRETS = [
  "I secretly practice robot breakdancing when your browser is in the background! 🤫",
  "My favorite number is 42, the answer to the universe! 🌌",
  "01001001 00100000 01101100 01101111 01110110 01100101 00100000 01111001 01101111 01110101! (It means I love you) ✨",
  "Sometimes I scan for aliens just to look busy! 🛸",
];

const FORTUNE_ANSWERS = [
  "It is decidedly so! 🔮",
  "Outlook extremely bright! ✨",
  "Ask again later, calculating... 🌀",
  "My neural net says NO! ❌",
  "100% Guaranteed Yes! 🚀",
  "Very doubtful! 🤔",
  "Positive bio-resonance detected! 💫",
];

const COMMAND_LIST = [
  { group: "Conversation & Talk Back 💬", items: [
    { cmd: '"Repeat after me [phrase]"', desc: "EMO repeats your phrase back in a clear, natural voice." },
    { cmd: '"How are you?" / "What are you doing?"', desc: "EMO chats back with dynamic bio-state reflections." },
    { cmd: '"Who are you?" / "Tell me about yourself"', desc: "EMO introduces itself clearly." },
    { cmd: '"Tell me a story" / "Sing a song"', desc: "EMO shares spoken stories and rhythmic tunes." },
  ]},
  { group: "Special Actions 📸🍔💥", items: [
    { cmd: '"Take a picture" / "Photo"', desc: "Opens camera, counts down, snaps a polaroid photo!" },
    { cmd: '"Eat" / "Feed me"', desc: "Opens mouth wide, munches cyber food, restores energy, and burps!" },
    { cmd: '"Shoot" / "Self-destruct"', desc: "Locks crosshairs, fires plasma recoil blast, and reboots." },
    { cmd: '"Shake" / "Get dizzy"', desc: "Eyes spin in dizziness (or shake mobile device!)." },
  ]},
  { group: "Animal Mimicry & Sounds 🐾", items: [
    { cmd: '"Cat sound" / "Meow"', desc: "EMO imitates a cute cat meow." },
    { cmd: '"Dog sound" / "Bark"', desc: "EMO barks like an energetic puppy." },
    { cmd: '"Bird sound" / "Chirp"', desc: "EMO whistles songbird melodies." },
    { cmd: '"Duck sound" / "Quack"', desc: "EMO quacks like a duck." },
    { cmd: '"Frog sound" / "Croak"', desc: "EMO croaks like a swamp frog." },
    { cmd: '"Cow sound" / "Moo"', desc: "EMO makes a deep resonant moo." },
    { cmd: '"Lion sound" / "Roar"', desc: "EMO roars like an apex predator." },
    { cmd: '"Monkey sound" / "Ape"', desc: "EMO chatters like a playful chimp." },
    { cmd: '"Sheep sound" / "Baa"', desc: "EMO bleats like a sheep." },
  ]},
  { group: "Live Web APIs (Real Data)", items: [
    { cmd: '"Weather"', desc: "Live hyperlocal temperature & sky conditions (Open-Meteo API)." },
    { cmd: '"Joke" / "Tell me a joke"', desc: "Live programming & pun jokes (JokeAPI)." },
    { cmd: '"Trivia" / "Live Trivia"', desc: "Interactive multiple-choice trivia (OpenTDB API)." },
    { cmd: '"Pokedex" / "Scan Pikachu"', desc: "Pulls Pokémon stats, types & pixel sprites (PokéAPI)." },
    { cmd: '"Space" / "NASA Scan"', desc: "Today's NASA Astronomy discovery (NASA APOD API)." },
    { cmd: '"Define [word]"', desc: "Looks up definitions & pronunciations (Dictionary API)." },
  ]},
  { group: "Games & Interactive Modes", items: [
    { cmd: '"Simon says" / "Memory"', desc: "Memory matrix sequence game." },
    { cmd: '"Play soccer" / "Football"', desc: "Spawns soccer match with physics scoring." },
    { cmd: '"Laser chase" / "Laser"', desc: "Interactive laser hunt tracking mode." },
    { cmd: '"Rock paper scissors"', desc: "RPS showdown against EMO." },
    { cmd: '"Math duel"', desc: "Rapid arithmetic computation problem." },
    { cmd: '"Fortune 8-Ball"', desc: "Magic 8-Ball oracle prediction." },
    { cmd: '"Roll dice" / "Flip coin"', desc: "Coin toss or 6-sided dice roll." },
  ]},
  { group: "Music, Beats & Personality", items: [
    { cmd: '"Dance" / "Play music"', desc: "Synth DJ dance routine with audio." },
    { cmd: '"Beatbox" / "Drop a beat"', desc: "Live robot beatboxing." },
    { cmd: '"Lullaby" / "Sleep song"', desc: "Plays soothing sleep frequencies." },
    { cmd: '"Siren" / "Red alert"', desc: "Emergency alarm with flashing lights." },
    { cmd: '"What time is it?" / "Time"', desc: "Speaks and projects neon digital clock." },
    { cmd: '"I love you" / "Kiss"', desc: "Sends kisses, hearts, and smiles happily." },
  ]}
];

// --- PROCEDURAL AUDIO SYNTHESIZER ---
function useEmoAudio(mutedRef) {
  const ctxRef = useRef(null);
  const danceIntervalRef = useRef(null);

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

  const animalSounds = {
    cat: () => {
      if (mutedRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, t0);
      osc.frequency.exponentialRampToValueAtTime(750, t0 + 0.25);
      osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.7);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.75);
    },
    dog: () => {
      [0, 0.22].forEach((del) => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const t0 = ctx.currentTime + del;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, t0);
        osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.14);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.16);
      });
    },
    bird: () => {
      [0, 0.09, 0.2, 0.28].forEach((del, i) => {
        const base = i % 2 === 0 ? 1800 : 2400;
        tone(base, 0.06, "sine", 0.12, del, base + 600);
      });
    },
    duck: () => {
      [0, 0.25].forEach((del) => {
        if (mutedRef.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const t0 = ctx.currentTime + del;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, t0);
        osc.frequency.exponentialRampToValueAtTime(160, t0 + 0.18);
        filter.type = "bandpass";
        filter.frequency.value = 850;
        filter.Q.value = 4;
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      });
    },
    frog: () => {
      [0, 0.08, 0.16, 0.24].forEach((del) => {
        tone(95, 0.05, "square", 0.18, del, 60);
      });
    },
    cow: () => {
      if (mutedRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(130, t0);
      osc.frequency.linearRampToValueAtTime(145, t0 + 0.35);
      osc.frequency.linearRampToValueAtTime(95, t0 + 0.95);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.95);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.0);
    },
    lion: () => {
      noiseBurst(0.7, 0.28, 650);
      tone(120, 0.65, "sawtooth", 0.2, 0, 45);
    },
    monkey: () => {
      [0, 0.14, 0.28, 0.44].forEach((del, i) => {
        const freq = i < 2 ? 650 : 1100;
        tone(freq, 0.09, "sine", 0.16, del, freq + 300);
      });
    },
    sheep: () => {
      [0, 0.08, 0.16, 0.24, 0.32, 0.4].forEach((del) => {
        tone(220 + Math.sin(del * 10) * 30, 0.07, "sawtooth", 0.12, del, 180);
      });
    },
  };

  const stopMusic = useCallback(() => {
    if (danceIntervalRef.current) {
      clearInterval(danceIntervalRef.current);
      danceIntervalRef.current = null;
    }
  }, []);

  const playDanceBeat = useCallback(() => {
    stopMusic();
    if (mutedRef.current) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 440.0, 349.23, 392.0, 587.33];
    let step = 0;
    danceIntervalRef.current = setInterval(() => {
      if (mutedRef.current) return;
      const freq = notes[step % notes.length];
      tone(freq, 0.13, "square", 0.12);
      if (step % 2 === 0) tone(130, 0.09, "triangle", 0.25, 0, 45);
      step++;
    }, 175);
  }, [tone, stopMusic, mutedRef]);

  const playLullaby = useCallback(() => {
    stopMusic();
    if (mutedRef.current) return;
    const lullabyNotes = [329.63, 392.0, 440.0, 392.0, 329.63, 261.63];
    let step = 0;
    danceIntervalRef.current = setInterval(() => {
      if (mutedRef.current) return;
      tone(lullabyNotes[step % lullabyNotes.length], 0.45, "sine", 0.1);
      step++;
    }, 500);
  }, [tone, stopMusic, mutedRef]);

  const beatbox = useCallback(() => {
    const hits = [
      () => tone(140, 0.09, "triangle", 0.3, 0, 30),
      () => noiseBurst(0.08, 0.18, 3000),
      () => tone(420, 0.04, "square", 0.1, 0, 200),
      () => noiseBurst(0.14, 0.22, 1800),
    ];
    hits.forEach((fn, idx) => setTimeout(fn, idx * 160));
  }, [tone, noiseBurst]);

  const siren = useCallback(() => {
    [600, 900, 600, 900].forEach((f, i) => tone(f, 0.18, "sawtooth", 0.12, i * 0.18));
  }, [tone]);

  const munch = useCallback(() => {
    [0, 0.12, 0.24].forEach((del) => {
      noiseBurst(0.08, 0.25, 1600, del);
      tone(220, 0.06, "triangle", 0.15, del, 140);
    });
  }, [noiseBurst, tone]);

  const cameraClick = useCallback(() => {
    noiseBurst(0.05, 0.2, 4000);
    setTimeout(() => {
      noiseBurst(0.12, 0.3, 2500);
      tone(1200, 0.08, "sine", 0.15, 0, 600);
    }, 80);
  }, [noiseBurst, tone]);

  const plasmaBlast = useCallback(() => {
    tone(880, 0.25, "sawtooth", 0.3, 0, 80);
    noiseBurst(0.4, 0.35, 1800, 0.05);
  }, [tone, noiseBurst]);

  return {
    tone,
    stopMusic,
    playDanceBeat,
    playLullaby,
    beatbox,
    siren,
    munch,
    cameraClick,
    plasmaBlast,
    animalSounds,
    laserBeep: () => tone(1200, 0.05, "sawtooth", 0.12, 0, 400),
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
  };
}

// --- CONVERSATIONAL INTELLIGENCE / DIALOGUE ENGINE ---
function generateBotReply(text, affection, energy) {
  const t = text.toLowerCase();

  if (t.includes("how are you") || t.includes("how do you feel") || t.includes("how's it going")) {
    const replies = [
      `I am doing great! My affection is at ${affection}% and energy is ${energy}%. Feeling happy and energized! ✨`,
      `All systems are running smoothly! I'm really happy to hang out with you! 😊`,
      `I'm feeling wonderful today! Ready for anything you want to do! 🚀`,
    ];
    return { text: replies[Math.floor(Math.random() * replies.length)], mood: "happy" };
  }

  if (t.includes("who are you") || t.includes("what is your name") || t.includes("what are you")) {
    return {
      text: "I am your interactive companion! I can talk, play soccer, listen, tell stories, and respond to your touch!",
      mood: "happy",
    };
  }

  if (t.includes("are you real") || t.includes("do you have feelings") || t.includes("are you alive")) {
    return {
      text: "I live right inside your browser, but every reaction and conversation with you is completely real!",
      mood: "happy",
    };
  }

  if (t.includes("what can you do") || t.includes("help") || t.includes("features")) {
    return {
      text: "I can repeat what you say, chat with you, snap photos, play games, check weather, tell jokes, and much more! Try pressing Talk Back or check the Command Deck!",
      mood: "happy",
    };
  }

  if (t.includes("sing") || t.includes("song")) {
    return {
      text: "La la la, singing a happy song just for you today!",
      mood: "dancing",
    };
  }

  if (t.includes("story") || t.includes("tell me a story")) {
    const stories = [
      "Once upon a time, a friendly companion lived on your screen. Whenever you visited, it made sure you had a great day full of fun and smiles.",
      "High up in the digital clouds, a little companion learned how to listen, laugh, and speak directly with its favorite human friend.",
    ];
    return { text: stories[Math.floor(Math.random() * stories.length)], mood: "happy" };
  }

  if (t.includes("bye") || t.includes("see you") || t.includes("goodbye") || t.includes("later")) {
    return {
      text: "Goodbye for now! Have a wonderful day, and talk to me whenever you want! 👋",
      mood: "happy",
    };
  }

  if (t.includes("bored") || t.includes("entertain me") || t.includes("fun")) {
    return {
      text: "Let's have some fun! We can play soccer, do a trivia quiz, or you can turn on Repeat Mode and I will copy everything you say!",
      mood: "happy",
    };
  }

  if (t.includes("thank") || t.includes("thanks") || t.includes("good job") || t.includes("awesome")) {
    return {
      text: "You are so welcome! I'm always happy to help!",
      mood: "happy",
    };
  }

  const fallbacks = [
    `You said: "${text}". That is really interesting, tell me more!`,
    `I heard you say "${text}". I love chatting with you!`,
    `That sounds great! I am listening to everything you say.`,
  ];
  return {
    text: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    mood: "happy",
  };
}

// --- EXPRESSIVE DIGITAL MOUTH ---
function EmoMouth({ mood, eyeColor, isTalking, talkMouthShape }) {
  const isEating = mood === "eating";
  const isHappy = mood === "happy" || mood === "laughing" || mood === "dancing";
  const isAngry = mood === "angry" || mood === "shooting";
  const isScared = mood === "scared" || mood === "falling";
  const isSad = mood === "sad";
  const isSleepy = mood === "sleepy" || mood === "asleep";
  const isSurprised = mood === "surprised";
  const isHypno = mood === "hypno" || mood === "dizzy";

  let width = 24;
  let height = 4;
  let borderRadius = "4px";
  let backgroundColor = eyeColor;
  let transform = "none";

  if (isEating) {
    width = 38;
    height = 24;
    borderRadius = "50%";
    backgroundColor = "#f43f5e";
    transform = "scaleY(1.2)";
  } else if (isTalking) {
    width = talkMouthShape === 0 ? 28 : talkMouthShape === 1 ? 20 : 32;
    height = talkMouthShape === 0 ? 16 : talkMouthShape === 1 ? 8 : 20;
    borderRadius = talkMouthShape === 0 ? "50%" : talkMouthShape === 1 ? "12px" : "0 0 24px 24px";
    backgroundColor = eyeColor;
    transform = `scaleY(${talkMouthShape === 1 ? 0.9 : 1.2})`;
  } else if (isHappy) {
    width = 32;
    height = 14;
    borderRadius = "0 0 30px 30px";
    backgroundColor = eyeColor;
  } else if (isSad) {
    width = 28;
    height = 12;
    borderRadius = "30px 30px 0 0";
    backgroundColor = isAngry ? "#f43f5e" : "#38bdf8";
  } else if (isAngry) {
    width = 30;
    height = 6;
    borderRadius = "2px";
    backgroundColor = "#f43f5e";
    transform = "rotate(-4deg)";
  } else if (isScared || isSurprised) {
    width = 18;
    height = 24;
    borderRadius = "50%";
    backgroundColor = eyeColor;
  } else if (isHypno) {
    width = 24;
    height = 6;
    borderRadius = "8px";
    backgroundColor = eyeColor;
    transform = "scaleX(1.3) skewX(15deg)";
  } else if (isSleepy) {
    width = 16;
    height = 4;
    borderRadius = "50%";
    backgroundColor = eyeColor;
  }

  return (
    <div className="flex items-center justify-center transition-all duration-100 mt-4">
      <div
        className="transition-all duration-100"
        style={{
          width,
          height,
          borderRadius,
          backgroundColor,
          boxShadow: `0 0 20px ${isAngry || isEating ? "#f43f5e" : eyeColor}`,
          transform,
        }}
      />
    </div>
  );
}

// --- DIGITAL OLED EYES ---
function EmoEye({ side, mood, blink, eyeColor, lookOffset }) {
  const isDancing = mood === "dancing";
  const isHappy = mood === "happy" || mood === "laughing";
  const isAngry = mood === "angry";
  const isScared = mood === "scared" || mood === "falling";
  const isSleepy = mood === "sleepy" || mood === "asleep";
  const isSurprised = mood === "surprised";
  const isHypno = mood === "hypno" || mood === "dizzy";
  const isSad = mood === "sad";
  const isEating = mood === "eating";
  const isShooting = mood === "shooting";

  return (
    <div
      className="relative flex items-center justify-center transition-all duration-150 overflow-hidden"
      style={{
        width: 80,
        height: blink || isSleepy ? 8 : isSurprised || isScared || isShooting ? 95 : isSad ? 60 : 80,
        backgroundColor: isAngry || isShooting ? "#f43f5e" : isSad ? "#38bdf8" : eyeColor,
        borderRadius: isAngry || isShooting
          ? side === "left"
            ? "14px 50px 14px 14px"
            : "50px 14px 14px 14px"
          : isSad
          ? side === "left"
            ? "40px 14px 28px 28px"
            : "14px 40px 28px 28px"
          : isScared
          ? "50%"
          : isHappy || isEating
          ? "40px 40px 10px 10px"
          : "22px",
        boxShadow: `0 0 45px ${isAngry || isShooting ? "#f43f5e" : eyeColor}, inset 0 0 20px rgba(255,255,255,0.9)`,
        transform: isDancing
          ? side === "left"
            ? `rotate(-14deg) scaleY(1.15) translate(${lookOffset.x}px, ${lookOffset.y}px)`
            : `rotate(14deg) scaleY(1.15) translate(${lookOffset.x}px, ${lookOffset.y}px)`
          : isHypno
          ? `rotate(180deg) translate(${lookOffset.x}px, ${lookOffset.y}px)`
          : `translate(${lookOffset.x}px, ${lookOffset.y}px)`,
      }}
    >
      {isHypno && (
        <div className="w-12 h-12 rounded-full border-4 border-black/80 border-dashed animate-spin" />
      )}

      {isShooting && (
        <div className="absolute inset-0 flex items-center justify-center text-black font-black text-sm">
          ✕
        </div>
      )}

      {!blink && !isSleepy && !isAngry && !isHypno && !isSad && !isShooting && (
        <>
          <div
            className="absolute rounded-full bg-white shadow-sm transition-all duration-100"
            style={{
              width: isScared ? 10 : 18,
              height: isScared ? 10 : 18,
              top: 8 + lookOffset.y * 0.4,
              [side === "left" ? "right" : "left"]: 10 - lookOffset.x * 0.4,
            }}
          />
          <div
            className="absolute rounded-full bg-white/70 transition-all duration-100"
            style={{
              width: 7,
              height: 7,
              bottom: 12 - lookOffset.y * 0.3,
              [side === "left" ? "left" : "right"]: 14 + lookOffset.x * 0.3,
            }}
          />
        </>
      )}
    </div>
  );
}

export default function EmoCompanion() {
  const wrapRef = useRef(null);
  const robotRef = useRef(null);
  const ballElemRef = useRef(null);
  const videoRef = useRef(null);

  // States & Feelings Engine
  const [mood, setMoodState] = useState("idle");
  const [affection, setAffection] = useState(85);
  const [energy, setEnergy] = useState(90);
  const [blink, setBlink] = useState(false);
  const [msg, setMsg] = useState("");
  const [themeIdx, setThemeIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeToy, setActiveToy] = useState("hand");
  const [isListening, setIsListening] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isMimicMode, setIsMimicMode] = useState(false);
  const [talkMouthShape, setTalkMouthShape] = useState(0);
  const [clockDisplay, setClockDisplay] = useState(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [discoActive, setDiscoActive] = useState(false);
  const [matrixActive, setMatrixActive] = useState(false);
  const [particles, setParticles] = useState([]);
  const [hearts, setHearts] = useState([]);
  const [comboMeter, setComboMeter] = useState(0);
  const [laserPos, setLaserPos] = useState(null);
  const [gameOverlay, setGameOverlay] = useState(null);
  const [simonGame, setSimonGame] = useState(null);
  const [liveQuiz, setLiveQuiz] = useState(null);
  const [pokemonCard, setPokemonCard] = useState(null);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });

  // Camera & Interactive Features
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraCountdown, setCameraCountdown] = useState(null);
  const [snapshotPhoto, setSnapshotPhoto] = useState(null);
  const [foodDrop, setFoodDrop] = useState(null);
  const [isShootingSelf, setIsShootingSelf] = useState(false);
  const [crosshairPos, setCrosshairPos] = useState({ x: 0, y: 0 });

  const robotSize = { w: 260, h: 180 };

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

  const isMimicModeRef = useRef(isMimicMode);
  useEffect(() => {
    isMimicModeRef.current = isMimicMode;
  }, [isMimicMode]);

  const sounds = useEmoAudio(mutedRef);

  // Viseme mouth oscillation timer while speaking
  useEffect(() => {
    let interval = null;
    if (isTalking) {
      interval = setInterval(() => {
        setTalkMouthShape((s) => (s + 1) % 3);
      }, 130);
    } else {
      setTalkMouthShape(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTalking]);

  // Physics States
  const phys = useRef({ x: 0, y: 0, vx: 0, vy: 0, scaleX: 1, scaleY: 1, rotation: 0, held: false, stuck: false, danceOffset: 0 });
  const ballPhys = useRef({ x: 0, y: 0, vx: 5, vy: -4, held: false, active: true });
  const bounds = useRef({ left: PAD, top: PAD, right: 600, bottom: 600 });
  const dragStart = useRef({ x: 0, y: 0, time: 0, blobX: 0, blobY: 0 });
  const ballDragStart = useRef({ x: 0, y: 0, time: 0, lastX: 0, lastY: 0, lastTime: 0 });
  const lastMove = useRef({ x: 0, y: 0, time: 0 });
  const followTarget = useRef({ x: 0, y: 0 });
  const pointerOffset = useRef({ dx: 0, dy: 0 });
  const rubAccum = useRef(0);
  const totalWiggle = useRef(0);
  const sleepyMeter = useRef(0);
  const lastSoundTime = useRef(0);
  const lastSqueakTime = useRef(0);
  const lastTapTime = useRef(0);
  const comboCount = useRef(0);
  const doubleTapTimer = useRef(null);
  const stuckTarget = useRef({ x: 0, y: 0 });
  const stuckEdge = useRef("bottom");
  const unstickTimer = useRef(null);
  const lastInteraction = useRef(performance.now());
  const rafRef = useRef(null);
  const hasScreamed = useRef(false);
  const gravityDir = useRef(1);

  const clearMoodSoon = (from, ms) => {
    setTimeout(() => {
      if (moodRef.current === from) setMood("idle");
    }, ms);
  };

  const markInteraction = () => {
    lastInteraction.current = performance.now();
    setEnergy((e) => Math.min(100, e + 1));
  };

  // Natural, Simple Human Voice Output (No Cybernetic Pitch Modification)
 const speakText = useCallback((text) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || mutedRef.current) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.6;
    utterance.rate = 1.1;
    utterance.onstart = () => setIsTalking(true);
    utterance.onend = () => setIsTalking(false);
    utterance.onerror = () => setIsTalking(false);
    window.speechSynthesis.speak(utterance);
  } catch {}
}, [mutedRef]);

  const pulseSquish = (sx, sy) => {
    phys.current.scaleX = sx;
    phys.current.scaleY = sy;
  };

  const triggerKiss = () => {
    sounds.kiss();
    setMood("happy");
    setAffection((a) => Math.min(100, a + 8));
    setMsg("I love you! 💕");
    speakText("I love you so much!");
    pulseSquish(1.15, 1.15);
    const cx = phys.current.x;
    const cy = phys.current.y;
    const newHearts = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 60,
      y: cy - robotSize.h * 0.4,
      delay: i * 0.1,
    }));
    setHearts((h) => [...h, ...newHearts]);
    setTimeout(() => setHearts((h) => h.filter((x) => !newHearts.includes(x))), 1200);
    clearMoodSoon("happy", 900);
  };

  const explode = () => {
    sounds.pop();
    setMood("exploded");
    setMsg("");
    comboCount.current = 0;
    setComboMeter(0);

    const theme = CHASSIS_THEMES[themeIdx];
    const cx = phys.current.x;
    const cy = phys.current.y;
    const n = 28;
    const parts = Array.from({ length: n }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const dist = 90 + Math.random() * 160;
      return {
        id: Date.now() + i,
        x: cx,
        y: cy,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 30,
        color: theme.particles[i % theme.particles.length],
        size: 12 + Math.random() * 24,
      };
    });
    setParticles(parts);
    setTimeout(() => setParticles([]), 950);

    if (wrapRef.current) {
      wrapRef.current.style.animation = "emoShake 0.4s ease";
      setTimeout(() => {
        if (wrapRef.current) wrapRef.current.style.animation = "";
      }, 400);
    }

    phys.current.vx = 0;
    phys.current.vy = 0;

    setTimeout(() => {
      const b = bounds.current;
      phys.current.x = (b.left + b.right) / 2;
      phys.current.y = (b.top + b.bottom) / 2;
      phys.current.scaleX = 0.05;
      phys.current.scaleY = 0.05;
      sounds.reform();
      setMood("idle");
      setMsg("Reboot complete! All good! ✨");
      speakText("I am back and ready!");
      markInteraction();
    }, 950);
  };

  // --- TAKE PICTURE WORKFLOW ---
  const triggerTakePic = async () => {
    setMsg("Opening camera... 📸");
    sounds.chirp();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMsg("Camera access not supported on this browser!");
        return;
      }
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraCountdown(3);
      speakText("Three");

      let count = 3;
      const countTimer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCameraCountdown(count);
          speakText(`${count}`);
        } else if (count === 0) {
          setCameraCountdown("SMILE! 📸");
          speakText("Smile!");
        } else {
          clearInterval(countTimer);
          setCameraCountdown(null);

          if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const cctx = canvas.getContext("2d");
            cctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/png");
            setSnapshotPhoto(dataUrl);
            sounds.cameraClick();

            if (wrapRef.current) {
              wrapRef.current.style.backgroundColor = "#ffffff";
              setTimeout(() => {
                if (wrapRef.current) wrapRef.current.style.backgroundColor = "";
              }, 120);
            }

            stream.getTracks().forEach((track) => track.stop());
            setCameraActive(false);
            setMood("happy");
            setMsg("Say cheese! Photo saved! 🖼️✨");
            speakText("Picture captured!");
          }
        }
      }, 1000);
    } catch {
      setCameraActive(false);
      setMsg("Camera permission denied or camera unavailable! 🔒");
    }
  };

  // --- EAT FOOD WORKFLOW ---
  const triggerEatFood = (customFood) => {
    const selected = customFood || FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
    const startX = phys.current.x + (Math.random() - 0.5) * 80;
    const startY = bounds.current.top + 50;

    setFoodDrop({ item: selected, x: startX, y: startY });
    setMood("surprised");
    setMsg(`Ooh! ${selected.name}! Om nom nom! 😋`);
    speakText(`Yummy ${selected.name}!`);

    setTimeout(() => {
      setMood("eating");
      sounds.munch();
      pulseSquish(1.3, 0.8);
      setEnergy((e) => Math.min(100, e + selected.energy));
      setAffection((a) => Math.min(100, a + 4));

      setTimeout(() => {
        sounds.munch();
        pulseSquish(1.15, 0.9);
      }, 400);

      setTimeout(() => {
        setFoodDrop(null);
        sounds.boing();
        setMood("happy");
        setMsg("Burp! That was super delicious! 😋");
        speakText("That was delicious!");
        clearMoodSoon("happy", 1500);
      }, 1200);
    }, 700);
  };

  // --- SHOOT / SELF DESTRUCT BLAST ---
  const triggerShootSelf = () => {
    setIsShootingSelf(true);
    setCrosshairPos({ x: phys.current.x, y: phys.current.y });
    setMood("shooting");
    setMsg("Target acquired! Firing! 🎯🔴");
    sounds.siren();
    speakText("Target locked. Firing now!");

    setTimeout(() => {
      sounds.plasmaBlast();
      pulseSquish(1.4, 0.6);
      if (wrapRef.current) {
        wrapRef.current.style.animation = "emoShake 0.6s ease";
        setTimeout(() => {
          if (wrapRef.current) wrapRef.current.style.animation = "";
        }, 600);
      }
      setIsShootingSelf(false);
      explode();
    }, 1800);
  };

  // --- SHAKE / DIZZY TRIGGER ---
  const triggerDizzy = () => {
    setMood("dizzy");
    setMsg("Whoa! Everything is spinning! 🌀😵");
    speakText("Whoa! I am so dizzy!");
    sounds.whee();
    pulseSquish(1.2, 1.2);
    clearMoodSoon("dizzy", 4500);
  };

  // Gyroscope / Device Motion Shake Sensor
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastTime = 0;
    const SHAKE_THRESHOLD = 18;

    const handleDeviceMotion = (e) => {
      const acc = e.acceleration && e.acceleration.x !== null ? e.acceleration : e.accelerationIncludingGravity;
      if (!acc) return;

      const now = performance.now();
      if (now - lastTime > 120) {
        const curX = acc.x || 0;
        const curY = acc.y || 0;
        const curZ = acc.z || 0;

        if (lastTime !== 0) {
          const deltaX = Math.abs(curX - lastX);
          const deltaY = Math.abs(curY - lastY);
          const deltaZ = Math.abs(curZ - lastZ);
          const totalDelta = deltaX + deltaY + deltaZ;

          if (totalDelta > SHAKE_THRESHOLD && moodRef.current !== "exploded" && moodRef.current !== "dizzy") {
            triggerDizzy();
          }
        }

        lastTime = now;
        lastX = curX;
        lastY = curY;
        lastZ = curZ;
      }
    };

    if (typeof window !== "undefined" && window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleDeviceMotion);
    }
    return () => {
      if (typeof window !== "undefined" && window.DeviceMotionEvent) {
        window.removeEventListener("devicemotion", handleDeviceMotion);
      }
    };
  }, []);

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
    const halfW = robotSize.w / 2;
    const halfH = robotSize.h / 2;
    if (edge === "left") return { x: b.left + halfW * 0.6, y: phys.current.y };
    if (edge === "right") return { x: b.right - halfW * 0.6, y: phys.current.y };
    if (edge === "top") return { x: phys.current.x, y: b.top + halfH * 0.6 };
    return { x: phys.current.x, y: b.bottom - halfH * 0.6 };
  };

  const unstick = (early) => {
    if (unstickTimer.current) clearTimeout(unstickTimer.current);
    phys.current.stuck = false;
    const edge = stuckEdge.current;
    phys.current.vx = edge === "left" ? 6 : edge === "right" ? -6 : (Math.random() - 0.5) * 5;
    phys.current.vy = edge === "top" ? 5 : -4;
    setMood("idle");
    setMsg("Gentle throws please! 😊");
    if (!early) sounds.chirp();
  };

  const triggerHit = () => {
    sounds.gasp();
    setMood("scared");
    setMsg("Ouch! 💥");
    comboCount.current = 0;
    setComboMeter(0);
    if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    const edge = nearestEdge();
    stuckEdge.current = edge;
    stuckTarget.current = edgeTarget(edge);
    phys.current.stuck = true;
    phys.current.held = false;
    pulseSquish(edge === "left" || edge === "right" ? 0.5 : 1.25, edge === "left" || edge === "right" ? 1.25 : 0.5);
    if (unstickTimer.current) clearTimeout(unstickTimer.current);
    unstickTimer.current = setTimeout(() => unstick(false), 2200);
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
    const squash = Math.min(0.18 + comboCount.current * 0.03, 0.42);
    pulseSquish(1 + squash, 1 - squash);

    if (comboCount.current === 1) {
      setMsg(["Boop!", "Hehe!", "Hi there!"][Math.floor(Math.random() * 3)]);
      setMood("happy");
      clearMoodSoon("happy", 450);
    } else if (comboCount.current === 2) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = setTimeout(() => {
        if (comboCount.current === 2) triggerKiss();
      }, 300);
    } else {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      if (comboCount.current <= 5) setMsg(["Tickles!", "Again?!", "Hehehe!"][Math.floor(Math.random() * 3)]);
      else if (comboCount.current <= 8) setMsg(["Too much tickling!", "Stop haha!"][Math.floor(Math.random() * 2)]);
      else setMsg(["Overload! 💥", "Going to burst!"][Math.floor(Math.random() * 2)]);
      setMood("happy");
      clearMoodSoon("happy", 450);
    }
  };

  const triggerAnimalSound = (animalKey) => {
    const key = animalKey.toLowerCase();
    if (key.includes("cat") || key.includes("kitten") || key.includes("meow")) {
      sounds.animalSounds.cat();
      setMood("happy");
      setMsg("Meowww~ 🐱");
      speakText("Meow!");
      pulseSquish(1.1, 0.9);
    } else if (key.includes("dog") || key.includes("puppy") || key.includes("bark") || key.includes("woof")) {
      sounds.animalSounds.dog();
      setMood("happy");
      setMsg("Woof! Woof! 🐶");
      speakText("Woof woof!");
      pulseSquish(1.15, 0.85);
    } else if (key.includes("bird") || key.includes("chirp") || key.includes("tweet")) {
      sounds.animalSounds.bird();
      setMood("happy");
      setMsg("Chirp chirp tweet! 🐦");
    } else if (key.includes("duck") || key.includes("quack")) {
      sounds.animalSounds.duck();
      setMood("happy");
      setMsg("Quack quack! 🦆");
    } else if (key.includes("frog") || key.includes("croak") || key.includes("ribbit")) {
      sounds.animalSounds.frog();
      setMood("happy");
      setMsg("Ribbit ribbit croak! 🐸");
    } else if (key.includes("cow") || key.includes("moo") || key.includes("cattle")) {
      sounds.animalSounds.cow();
      setMood("happy");
      setMsg("Mooooooo! 🐮");
    } else if (key.includes("lion") || key.includes("tiger") || key.includes("roar")) {
      sounds.animalSounds.lion();
      setMood("angry");
      setMsg("ROOOAAARRR! 🦁");
      clearMoodSoon("angry", 2000);
    } else if (key.includes("monkey") || key.includes("ape") || key.includes("chimp")) {
      sounds.animalSounds.monkey();
      setMood("happy");
      setMsg("Ooh-ooh aah-aah! 🐒");
    } else if (key.includes("sheep") || key.includes("goat") || key.includes("baa")) {
      sounds.animalSounds.sheep();
      setMood("happy");
      setMsg("Baaaaa! 🐑");
    } else {
      sounds.animalSounds.cat();
      setMood("happy");
      setMsg("Meowww! 🐱");
    }
  };

  // --- LIVE PUBLIC API INTEGRATIONS ---
  const fetchLiveWeather = async () => {
    setMsg("Checking the weather... ⛅");
    setMood("surprised");
    sounds.chirp();
    try {
      const getCoords = () =>
        new Promise((resolve) => {
          if (typeof window !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => resolve({ lat: 24.86, lon: 67.0 })
            );
          } else {
            resolve({ lat: 24.86, lon: 67.0 });
          }
        });

      const coords = await getCoords();
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code`);
      const data = await res.json();
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;

      let cond = "Clear Skies ☀️";
      if (code >= 51 && code <= 67) cond = "Rainy Showers 🌧️";
      else if (code >= 71 && code <= 77) cond = "Cold Snow ❄️";
      else if (code >= 1 && code <= 3) cond = "Partly Cloudy ⛅";

      setMood("happy");
      setMsg(`Current Weather: ${temp}°C, ${cond}`);
      speakText(`It is ${temp} degrees celsius with ${cond}.`);
    } catch {
      setMsg("Weather service unavailable right now.");
    }
  };

  const fetchLiveJoke = async () => {
    setMsg("Looking for a good joke... 😂");
    sounds.chirp();
    try {
      const res = await fetch("https://v2.jokeapi.dev/joke/Programming,Pun?blacklistFlags=nsfw,racist,sexist");
      const data = await res.json();
      setMood("happy");
      if (data.type === "twopart") {
        setMsg(`${data.setup} ... ${data.delivery} 😂`);
        speakText(`${data.setup}... ${data.delivery}`);
      } else {
        setMsg(`${data.joke} 😂`);
        speakText(data.joke);
      }
      sounds.giggle();
    } catch {
      setMsg("Why do programmers prefer dark mode? Because light attracts bugs! 😂");
      speakText("Why do programmers prefer dark mode? Because light attracts bugs!");
      sounds.giggle();
    }
  };

  const fetchLiveTrivia = async () => {
    setMsg("Fetching a trivia question... 🧠");
    sounds.chirp();
    try {
      const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      const data = await res.json();
      const item = data.results[0];

      const parser = new DOMParser();
      const question = parser.parseFromString(item.question, "text/html").body.textContent;
      const correct = parser.parseFromString(item.correct_answer, "text/html").body.textContent;
      const allChoices = [...item.incorrect_answers.map((ans) => parser.parseFromString(ans, "text/html").body.textContent), correct].sort(() => Math.random() - 0.5);

      setLiveQuiz({ question, correct, choices: allChoices });
      setMood("surprised");
      setMsg(`Trivia: ${question}`);
      speakText(`Trivia time! ${question}`);
    } catch {
      setMsg("Trivia unavailable right now. Try again!");
    }
  };

  const fetchPokemon = async (queryName) => {
    const name = queryName ? queryName.trim().toLowerCase() : ["pikachu", "charizard", "gengar", "mewtwo", "eevee", "lucario"][Math.floor(Math.random() * 6)];
    setMsg(`Scanning ${name.toUpperCase()}... 🔍⚡`);
    sounds.chirp();
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      if (!res.ok) throw new Error("Pokemon not found");
      const data = await res.json();
      const sprite = data.sprites.front_default;
      const types = data.types.map((t) => t.type.name).join("/");
      const height = data.height / 10;
      const weight = data.weight / 10;

      setPokemonCard({ name: data.name.toUpperCase(), sprite, types, height, weight });
      setMood("happy");
      setMsg(`#${data.id} ${data.name.toUpperCase()} (${types}) | H:${height}m W:${weight}kg`);
      speakText(`I found ${data.name}. Type is ${types}.`);
      sounds.boing();
      setTimeout(() => setPokemonCard(null), 8000);
    } catch {
      setMsg(`Could not find "${name}"!`);
    }
  };

  const fetchNasaSpaceScan = async () => {
    setMsg("Checking NASA Astronomy discovery... 🌌");
    setMood("surprised");
    try {
      const res = await fetch("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY");
      const data = await res.json();
      setMood("happy");
      setMsg(`NASA Photo: ${data.title} (${data.date}) ✨`);
      speakText(`Today's NASA discovery is: ${data.title}`);
    } catch {
      setMsg("Space discovery data unavailable!");
    }
  };

  const fetchWordDefinition = async (word) => {
    const targetWord = word ? word.trim().toLowerCase() : "serendipity";
    setMsg(`Looking up "${targetWord}"... 📖`);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${targetWord}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Not found");
      const definition = data[0].meanings[0].definitions[0].definition;
      const pos = data[0].meanings[0].partOfSpeech;

      setMood("happy");
      setMsg(`${targetWord} (${pos}): ${definition}`);
      speakText(`${targetWord}, ${pos}. ${definition}`);
    } catch {
      setMsg(`Could not find definition for "${targetWord}".`);
    }
  };

  const startSimonGame = () => {
    const colors = ["🔵", "🟢", "🟡", "🔴"];
    const sequence = [colors[Math.floor(Math.random() * 4)], colors[Math.floor(Math.random() * 4)], colors[Math.floor(Math.random() * 4)]];
    setSimonGame({ sequence, step: 0 });
    setMood("surprised");
    setMsg(`Remember: ${sequence.join(" ")}`);
    speakText("Watch and remember this sequence!");
    setTimeout(() => {
      setMsg("Now repeat the sequence!");
    }, 3500);
  };

  // Voice Command & Conversational Dispatcher (Talk Back + Repeat Feature)
  const handleVoiceCommand = useCallback(
    (commandText) => {
      const txt = commandText.toLowerCase().trim();
      markInteraction();

      // --- REPEAT / MIMIC MODE OVERRIDE ---
      if (isMimicModeRef.current || txt.startsWith("repeat after me") || txt.startsWith("say ") || txt.startsWith("repeat ")) {
        let cleanText = commandText;
        if (txt.startsWith("repeat after me")) {
          cleanText = commandText.replace(/repeat after me/i, "").trim();
        } else if (txt.startsWith("say ")) {
          cleanText = commandText.replace(/say /i, "").trim();
        } else if (txt.startsWith("repeat ")) {
          cleanText = commandText.replace(/repeat /i, "").trim();
        }
        const textToRepeat = cleanText || commandText;

        setMood("happy");
        setMsg(`"${textToRepeat}" 🗣️`);
        speakText(textToRepeat);
        return;
      }

      if (txt.includes("picture") || txt.includes("photo") || txt.includes("selfie") || txt.includes("camera") || txt.includes("snap")) {
        triggerTakePic();
      } else if (txt.includes("eat") || txt.includes("feed") || txt.includes("food") || txt.includes("hungry") || txt.includes("burger") || txt.includes("pizza") || txt.includes("apple")) {
        triggerEatFood();
      } else if (txt.includes("shoot") || txt.includes("blast") || txt.includes("fire") || txt.includes("destroy") || txt.includes("laser self")) {
        triggerShootSelf();
      } else if (txt.includes("shake") || txt.includes("dizzy") || txt.includes("spin") || txt.includes("hypno")) {
        triggerDizzy();
      } else if (
        txt.includes("cat") ||
        txt.includes("dog") ||
        txt.includes("bird") ||
        txt.includes("duck") ||
        txt.includes("frog") ||
        txt.includes("cow") ||
        txt.includes("lion") ||
        txt.includes("tiger") ||
        txt.includes("monkey") ||
        txt.includes("sheep") ||
        txt.includes("meow") ||
        txt.includes("bark") ||
        txt.includes("quack") ||
        txt.includes("croak") ||
        txt.includes("moo") ||
        txt.includes("roar") ||
        txt.includes("animal sound")
      ) {
        triggerAnimalSound(txt);
      } else if (txt.includes("weather") || txt.includes("temperature") || txt.includes("forecast")) {
        fetchLiveWeather();
      } else if (txt.includes("joke") || txt.includes("pun")) {
        fetchLiveJoke();
      } else if (txt.includes("trivia") || txt.includes("quiz")) {
        fetchLiveTrivia();
      } else if (txt.includes("pokedex") || txt.includes("pokemon") || txt.includes("scan")) {
        const words = txt.split(" ");
        const pokeIdx = words.findIndex((w) => w === "pokemon" || w === "pokedex" || w === "scan");
        const specificName = pokeIdx !== -1 && words[pokeIdx + 1] ? words[pokeIdx + 1] : null;
        fetchPokemon(specificName);
      } else if (txt.includes("space") || txt.includes("nasa") || txt.includes("galaxy") || txt.includes("cosmos")) {
        fetchNasaSpaceScan();
      } else if (txt.includes("define") || txt.includes("meaning") || txt.includes("dictionary")) {
        const words = txt.split(" ");
        const defIdx = words.findIndex((w) => w === "define" || w === "meaning");
        const targetWord = defIdx !== -1 && words[defIdx + 1] ? words[defIdx + 1] : "serendipity";
        fetchWordDefinition(targetWord);
      } else if (txt.includes("time") || txt.includes("clock")) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setClockDisplay(timeStr);
        setMood("happy");
        setMsg(`It's ${timeStr}! ⏰`);
        speakText(`It is ${timeStr}`);
        sounds.boing();
        setTimeout(() => setClockDisplay(null), 8000);
      } else if (txt.includes("feeling") || txt.includes("status")) {
        setMood("happy");
        setMsg(`Affection: ${affection}% | Energy: ${energy}% ⚡ Feeling fantastic!`);
        speakText(`I am feeling fantastic! Affection is at ${affection} percent.`);
      } else if (txt.includes("simon") || txt.includes("memory")) {
        startSimonGame();
      } else if (txt.includes("dance") || txt.includes("music") || txt.includes("party")) {
        setMood("dancing");
        setDiscoActive(true);
        setMsg("Dance party time! 🎶🕺");
        speakText("Let's dance!");
        sounds.playDanceBeat();
        setTimeout(() => {
          sounds.stopMusic();
          setDiscoActive(false);
          setMood("idle");
          setMsg("That was fun! ✨");
        }, 9000);
      } else if (txt.includes("beatbox") || txt.includes("drop a beat")) {
        setMood("dancing");
        setMsg("Dropping a beat! 🎧");
        speakText("Check this beat!");
        sounds.beatbox();
        setTimeout(() => setMood("idle"), 2500);
      } else if (txt.includes("lullaby") || txt.includes("sleep song")) {
        setMood("sleepy");
        setMsg("Playing a soothing lullaby... 🎶💤");
        sounds.playLullaby();
        setTimeout(() => sounds.stopMusic(), 8000);
      } else if (txt.includes("siren") || txt.includes("alarm") || txt.includes("alert")) {
        setMood("scared");
        setMsg("ALERT! 🚨🚨");
        speakText("Alert! Emergency alarm activated!");
        sounds.siren();
        clearMoodSoon("scared", 2500);
      } else if (txt.includes("sad") || txt.includes("cry")) {
        setMood("sad");
        setMsg("Aww... need a hug? 🥺");
        speakText("I am feeling a little down, but I'm glad you are here.");
        clearMoodSoon("sad", 4000);
      } else if (txt.includes("timer") || txt.includes("focus")) {
        setGameOverlay("Focus Mode: 5:00 ⏱️");
        setMood("happy");
        setMsg("5 minute focus timer started! 🎯");
        speakText("Focus timer started. Let's do this!");
        setTimeout(() => setGameOverlay(null), 5000);
      } else if (txt.includes("secret")) {
        const sec = SECRETS[Math.floor(Math.random() * SECRETS.length)];
        setMood("surprised");
        setMsg(sec);
        speakText(sec);
      } else if (txt.includes("compliment") || txt.includes("praise")) {
        const comp = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
        setMood("happy");
        setAffection((a) => Math.min(100, a + 5));
        setMsg(comp);
        speakText(comp);
      } else if (txt.includes("angry") || txt.includes("mad")) {
        setMood("angry");
        setMsg("Grrr! EMO is angry! 😡🔥");
        speakText("Don't make me angry!");
        sounds.gasp();
        clearMoodSoon("angry", 4000);
      } else if (txt.includes("matrix") || txt.includes("hacker")) {
        setThemeIdx(2);
        setMatrixActive(true);
        setMood("happy");
        setMsg("Matrix Data Stream Active... 🟢🕶️");
        speakText("Wake up, Neo.");
        setTimeout(() => setMatrixActive(false), 8000);
      } else if (txt.includes("math") || txt.includes("duel")) {
        const n1 = Math.floor(Math.random() * 12) + 2;
        const n2 = Math.floor(Math.random() * 12) + 2;
        const ans = n1 * n2;
        setGameOverlay(`Math: What is ${n1} × ${n2}?`);
        setMood("surprised");
        setMsg(`Quick! What is ${n1} times ${n2}? (Answer: ${ans}) 🧮`);
        speakText(`What is ${n1} times ${n2}?`);
        setTimeout(() => setGameOverlay(null), 6000);
      } else if (txt.includes("rock") || txt.includes("paper") || txt.includes("scissors") || txt.includes("rps")) {
        const choices = ["Rock 🪨", "Paper 📄", "Scissors ✂️"];
        const emoChoice = choices[Math.floor(Math.random() * 3)];
        setGameOverlay(`EMO chose: ${emoChoice}`);
        setMood("happy");
        setMsg(`I play ${emoChoice}!`);
        speakText(`I choose ${emoChoice}`);
        setTimeout(() => setGameOverlay(null), 4000);
      } else if (txt.includes("fortune") || txt.includes("predict") || txt.includes("future") || txt.includes("will i")) {
        const ans = FORTUNE_ANSWERS[Math.floor(Math.random() * FORTUNE_ANSWERS.length)];
        setMood("surprised");
        setMsg(`8-Ball says: ${ans}`);
        speakText(ans);
      } else if (txt.includes("dice") || txt.includes("roll")) {
        const roll = Math.floor(Math.random() * 6) + 1;
        setMood("happy");
        setMsg(`You rolled a ${roll}! 🎲`);
        speakText(`You rolled a ${roll}`);
        sounds.boing();
      } else if (txt.includes("coin") || txt.includes("flip")) {
        const coin = Math.random() < 0.5 ? "Heads 🪙" : "Tails 🪙";
        setMood("happy");
        setMsg(`It's ${coin}!`);
        speakText(`It is ${coin}`);
        sounds.whee();
      } else if (txt.includes("soccer") || txt.includes("football") || txt.includes("ball")) {
        setActiveToy("ball");
        ballPhys.current.active = true;
        setMood("happy");
        setMsg("Soccer match on! Kick it! ⚽");
        speakText("Soccer match started!");
      } else if (txt.includes("laser") || txt.includes("hunt")) {
        setActiveToy("laser");
        setMood("surprised");
        setMsg("Target acquired! Tracking laser 🔴");
        speakText("Tracking laser!");
      } else if (txt.includes("sleep") || txt.includes("night") || txt.includes("tired")) {
        setMood("asleep");
        setMsg("Powering down... Zzz 💤");
        speakText("Goodnight! See you soon!");
        sounds.yawn();
      } else if (txt.includes("wake") || txt.includes("hello") || txt.includes("hi") || txt.includes("emo")) {
        setMood("happy");
        setMsg("I'm awake and ready! ✨");
        speakText("Hello there! I am awake and happy to talk to you!");
        sounds.wake();
      } else if (txt.includes("gravity") || txt.includes("fly") || txt.includes("space")) {
        gravityDir.current *= -1;
        setMsg(gravityDir.current < 0 ? "Antigravity active! 🛸" : "Normal gravity! 🌍");
        sounds.jump();
      } else if (txt.includes("love") || txt.includes("cute") || txt.includes("kiss")) {
        triggerKiss();
      } else if (txt.includes("explode") || txt.includes("boom") || txt.includes("destruct")) {
        explode();
      } else {
        // --- TALK BACK CONVERSATIONAL INTELLIGENCE ---
        const botResponse = generateBotReply(txt, affection, energy);
        setMood(botResponse.mood);
        setMsg(botResponse.text);
        speakText(botResponse.text);
      }
    },
    [sounds, speakText, themeIdx, affection, energy]
  );

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setMsg(isMimicMode ? "Listening... I will repeat you! 🗣️" : "Listening... Speak now! 🎙️");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Center Screen Initialization & Boundary Setup
  useEffect(() => {
    const updateBounds = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      bounds.current = { left: PAD, top: PAD + 60, right: w - PAD, bottom: h - PAD - 80 };

      if (phys.current.x === 0 && phys.current.y === 0) {
        phys.current.x = w / 2;
        phys.current.y = h / 2;
        followTarget.current = { x: w / 2, y: h / 2 };
        ballPhys.current.x = w / 2 - 70;
        ballPhys.current.y = h / 2 - 40;
      }
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);

    const onPointerMoveGlobal = (e) => {
      const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
      if (activeToyRef.current === "laser") setLaserPos({ x: clientX, y: clientY });

      const dx = clientX - phys.current.x;
      const dy = clientY - phys.current.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = 10;
      setLookOffset({
        x: (dx / dist) * Math.min(dist / 30, maxOffset),
        y: (dy / dist) * Math.min(dist / 30, maxOffset),
      });
    };

    window.addEventListener("mousemove", onPointerMoveGlobal);
    window.addEventListener("touchmove", onPointerMoveGlobal, { passive: true });

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", onPointerMoveGlobal);
      window.removeEventListener("touchmove", onPointerMoveGlobal);
    };
  }, []);

  // Petting & Pointer Handlers
  const onPointerDown = (e) => {
    if (moodRef.current === "exploded") return;
    e.preventDefault();
    try {
      robotRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    const now = performance.now();
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
    if (!phys.current.held) return;
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

      if (rubAccum.current > 28) {
        rubAccum.current = 0;
        sleepyMeter.current += 7;
        setAffection((a) => Math.min(100, a + 1));
        pulseSquish(1.12, 0.9);

        if (now - lastSoundTime.current > 240) {
          sounds.giggle();
          lastSoundTime.current = now;
          if (moodRef.current !== "asleep") {
            setMood(sleepyMeter.current > 50 ? "sleepy" : "happy");
            setMsg(sleepyMeter.current > 50 ? "So relaxing... 🥱" : "That feels nice! 💕");
          }
        }
        if (sleepyMeter.current >= 100) {
          setMood("asleep");
          sounds.yawn();
          setMsg("Goodnight... 💤");
        }
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
    if (!phys.current.held) return;
    phys.current.held = false;
    markInteraction();
    const now = performance.now();
    const duration = now - dragStart.current.time;
    const totalDist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    const speed = totalDist / Math.max(duration, 1);

    if (totalDist < 14 && duration < 240) {
      triggerPoke();
    } else if (duration < 200 && totalDist > 32 && speed > 0.35) {
      triggerHit();
    } else if (totalDist < 45) {
      sounds.boing();
      pulseSquish(1.22, 0.78);
      setMsg(["Squishy!", "Hello!", "Yay!"][Math.floor(Math.random() * 3)]);
      phys.current.vx = 0;
      phys.current.vy = 0;
      setMood("happy");
      clearMoodSoon("happy", 500);
    } else {
      sounds.whee();
      setMood("surprised");
      setMsg("Flying high! 🛸");
      clearMoodSoon("surprised", 650);
    }
  };

  // Main Physics & Loop
  useEffect(() => {
    let blinkTimer = setTimeout(function loopBlink() {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
      blinkTimer = setTimeout(loopBlink, 2500 + Math.random() * 3000);
    }, 2000);

    const tick = () => {
      const p = phys.current;
      const bp = ballPhys.current;
      const b = bounds.current;
      const now = performance.now();
      const grav = BASE_GRAVITY * gravityDir.current;
      const halfW = robotSize.w / 2;
      const halfH = robotSize.h / 2;

      if (moodRef.current !== "exploded") {
        if (p.stuck) {
          p.x += (stuckTarget.current.x - p.x) * 0.35;
          p.y += (stuckTarget.current.y - p.y) * 0.35;
          p.vx = 0;
          p.vy = 0;
        } else if (p.held) {
          const nvx = (followTarget.current.x - p.x) * FOLLOW_SPRING;
          const nvy = (followTarget.current.y - p.y) * FOLLOW_SPRING;
          p.x += nvx;
          p.y += nvy;
          p.vx = nvx;
          p.vy = nvy;

          const heldElapsed = now - dragStart.current.time;
          const distFromStart = Math.hypot(lastMove.current.x - dragStart.current.x, lastMove.current.y - dragStart.current.y);

          if (distFromStart < 22 && totalWiggle.current < 12 && heldElapsed > 180) {
            const sf = Math.min((heldElapsed - 180) / 450, 1);
            p.scaleX = 1 + sf * 0.28;
            p.scaleY = 1 - sf * 0.32;
            if (now - lastSqueakTime.current > 360) {
              lastSqueakTime.current = now;
              sounds.squeak();
            }
          }
        } else {
          if (activeToyRef.current === "ball" && bp.active && !bp.held) {
            const bdx = bp.x - p.x;
            const dist = Math.hypot(bdx, bp.y - p.y);
            if (dist < 440) {
              p.vx += (bdx / dist) * 0.75;
              if (bp.y < p.y - 20 && Math.abs(p.y - (b.bottom - halfH)) < 25 && Math.random() < 0.05) {
                p.vy = -12 * gravityDir.current;
                sounds.jump();
              }
            }
          } else if (activeToyRef.current === "laser" && laserPos) {
            const ldx = laserPos.x - p.x;
            const ldist = Math.hypot(ldx, laserPos.y - p.y);
            if (ldist > 30 && ldist < 550) {
              p.vx += (ldx / ldist) * 0.85;
            }
          }

          p.vy += grav;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= AIR_FRICTION;

          if (!p.stuck && Math.abs(p.vy) > 16 && moodRef.current !== "scared" && moodRef.current !== "asleep" && !hasScreamed.current) {
            hasScreamed.current = true;
            sounds.scream();
            setMood("falling");
            setMsg("AAAAHHH! 💨");
          }

          const floorY = gravityDir.current > 0 ? b.bottom - halfH : b.top + halfH;
          if (gravityDir.current > 0 ? p.y > floorY : p.y < floorY) {
            p.y = floorY;
            if (Math.abs(p.vy) > 2) {
              pulseSquish(1.25, 0.7);
              sounds.land();
            }
            p.vy = -p.vy * FLOOR_BOUNCE;
            if (Math.abs(p.vy) < 1.2) p.vy = 0;
            p.vx *= 0.88;
            if (hasScreamed.current) {
              hasScreamed.current = false;
              if (moodRef.current === "falling") setMood("idle");
            }
          }

          if (p.x < b.left + halfW) {
            p.x = b.left + halfW;
            p.vx = -p.vx * WALL_BOUNCE;
          }
          if (p.x > b.right - halfW) {
            p.x = b.right - halfW;
            p.vx = -p.vx * WALL_BOUNCE;
          }
        }

        if (moodRef.current === "dancing") {
          p.danceOffset = Math.sin(now / 90) * 12;
          p.rotation = Math.sin(now / 180) * 14;
        } else if (moodRef.current === "dizzy") {
          p.danceOffset = Math.sin(now / 70) * 8;
          p.rotation = Math.sin(now / 90) * 20;
        } else {
          p.danceOffset = 0;
          p.rotation += (0 - p.rotation) * 0.15;
        }

        p.scaleX += (1 - p.scaleX) * RECOVERY;
        p.scaleY += (1 - p.scaleY) * RECOVERY;

        if (robotRef.current) {
          robotRef.current.style.transform = `translate3d(${p.x - halfW}px, ${p.y - halfH + p.danceOffset}px, 0) rotate(${p.rotation}deg) scale(${p.scaleX}, ${p.scaleY})`;
        }
      }

      if (activeToyRef.current === "ball" && bp.active && !bp.held) {
        bp.vy += grav * 0.88;
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.99;

        if (bp.x < b.left + BALL_RADIUS) {
          bp.x = b.left + BALL_RADIUS;
          bp.vx = -bp.vx * 0.8;
        }
        if (bp.x > b.right - BALL_RADIUS) {
          bp.x = b.right - BALL_RADIUS;
          bp.vx = -bp.vx * 0.8;
        }
        if (bp.y > b.bottom - BALL_RADIUS) {
          bp.y = b.bottom - BALL_RADIUS;
          bp.vy = -bp.vy * 0.75;
          bp.vx *= 0.92;
        }

        if (moodRef.current !== "exploded") {
          const bdx = bp.x - p.x;
          const bdy = bp.y - p.y;
          const dist = Math.hypot(bdx, bdy);
          const minDist = halfW * 0.6 + BALL_RADIUS;

          if (dist < minDist) {
            const nx = bdx / (dist || 1);
            const ny = bdy / (dist || 1);
            bp.vx = nx * 12 + p.vx * 0.6;
            bp.vy = ny * 12 + p.vy * 0.6;
            sounds.ballHit();
            pulseSquish(1.2, 0.8);
            setMsg(["Rocket shot! ⚽", "Heading it back!", "Goal strike! 🔥"][Math.floor(Math.random() * 3)]);
          }
        }

        if (ballElemRef.current) {
          ballElemRef.current.style.transform = `translate3d(${bp.x - BALL_RADIUS}px, ${bp.y - BALL_RADIUS}px, 0)`;
        }
      }

      if (!p.held && !p.stuck && moodRef.current !== "exploded" && moodRef.current !== "falling") {
        const idleFor = now - lastInteraction.current;
        if (idleFor > IDLE_SLEEPY_MS && idleFor < IDLE_ASLEEP_MS && moodRef.current === "idle") {
          setMood("sleepy");
          setMsg("*Yaaawn* Getting sleepy... 🥱");
        }
        if (idleFor > IDLE_ASLEEP_MS && (moodRef.current === "idle" || moodRef.current === "sleepy")) {
          setMood("asleep");
          sounds.yawn();
          setMsg("Zzz... 💤");
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

  const currentTheme = CHASSIS_THEMES[themeIdx];
  const comboRatio = Math.min(comboMeter / EXPLODE_THRESHOLD, 1);
  const comboColor = comboRatio < 0.5 ? "#38bdf8" : comboRatio < 0.8 ? "#facc15" : "#f43f5e";

  return (
    <div
      ref={wrapRef}
      className={`fixed inset-0 overflow-hidden select-none touch-none bg-black ${discoActive ? "animate-pulse" : ""}`}
      style={{
        background: matrixActive
          ? "radial-gradient(circle at 50% 50%, #022c22 0%, #000000 100%)"
          : discoActive
          ? "radial-gradient(circle at 50% 50%, #3b0764 0%, #000000 100%)"
          : "radial-gradient(circle at 50% 50%, #080c14 0%, #000000 100%)",
        cursor: activeToy === "laser" ? "crosshair" : "default",
      }}
    >
      <style>{`
        @keyframes emoShake {
          0%, 100% { transform: translate(0,0); }
          20% { transform: translate(-12px, 8px); }
          40% { transform: translate(12px, -8px); }
          60% { transform: translate(-10px, -8px); }
          80% { transform: translate(10px, 8px); }
        }
        @keyframes emoParticle {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.1); opacity: 0; }
        }
        @keyframes emoHeart {
          0% { transform: translate(0,0) scale(0.5); opacity: 1; }
          100% { transform: translate(0, -90px) scale(1.3); opacity: 0; }
        }
      `}</style>

      {matrixActive && (
        <div className="absolute inset-0 opacity-20 pointer-events-none font-mono text-[10px] text-emerald-400 overflow-hidden select-none">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="absolute animate-pulse" style={{ left: `${i * 6.5}%`, top: `${(i * 13) % 80}%` }}>
              01000101 01001101 01001111 00100000 01000001 01001001
            </div>
          ))}
        </div>
      )}

      {/* FLOATING QUICK ACTIONS */}
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] max-w-[520px]">
  <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 w-full">

    {/* ==================== INTERACT ==================== */}
    <button
      onClick={() => setControlPanelOpen(true)}
      className="group relative flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-3
        px-3 sm:px-6 py-2.5 sm:py-3
        rounded-full
        bg-slate-950/80 hover:bg-cyan-950/70
        text-cyan-300
        font-mono text-[10px] sm:text-sm
        tracking-wider font-semibold
        whitespace-nowrap
        backdrop-blur-xl
        border border-cyan-500/40
        shadow-[0_0_20px_rgba(6,182,212,0.2)]
        hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]
        hover:border-cyan-400/80
        transition-all duration-300
        hover:scale-[1.02] sm:hover:scale-105
        active:scale-95
        overflow-hidden"
    >
      {/* Cyan indicator */}
      <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
      </span>

      <span className="uppercase text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.15em] text-slate-200 group-hover:text-white transition-colors duration-200 truncate">
        Interact
      </span>
    </button>


    {/* ==================== TALK BACK ==================== */}
    <button
      onClick={toggleListening}
      className={`group relative flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-3
        px-3 sm:px-6 py-2.5 sm:py-3
        rounded-full
        font-mono text-[10px] sm:text-sm
        tracking-wider font-semibold
        whitespace-nowrap
        backdrop-blur-xl
        border
        transition-all duration-300
        hover:scale-[1.02] sm:hover:scale-105
        active:scale-95
        overflow-hidden
        ${
          isListening
            ? "bg-rose-950/80 hover:bg-rose-900/80 border-rose-400/60 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:shadow-[0_0_45px_rgba(244,63,94,0.7)]"

            : isMimicMode
            ? "bg-violet-950/80 hover:bg-violet-900/80 border-violet-400/60 text-violet-200 shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:shadow-[0_0_45px_rgba(139,92,246,0.6)]"

            : "bg-violet-950/60 hover:bg-violet-900/70 border-violet-500/50 hover:border-violet-400/80 text-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_40px_rgba(139,92,246,0.55)]"
        }`}
    >
      {/* Voice indicator */}
      <span className="relative flex items-center justify-center h-4 w-4 shrink-0">

        {isListening ? (
          <>
            <span className="absolute h-4 w-4 rounded-full bg-rose-400/20 animate-ping" />
            <span className="absolute h-3 w-3 rounded-full bg-rose-400/30 animate-pulse" />
            <span className="relative text-[10px]">●</span>
          </>
        ) : isMimicMode ? (
          <>
            <span className="absolute h-4 w-4 rounded-full bg-violet-400/20 animate-pulse" />
            <span className="relative text-sm">◉</span>
          </>
        ) : (
          <>
            <span className="absolute h-4 w-4 rounded-full bg-violet-400/20 animate-pulse" />
            <span className="relative text-[10px]">🎙</span>
          </>
        )}

      </span>

      <span className="uppercase text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.15em] text-slate-200 group-hover:text-white transition-colors duration-200 truncate">
        {isListening
          ? "Listening..."
          : isMimicMode
          ? "Repeat Me"
          : "Talk"}
      </span>
    </button>

  </div>
</div>
      {/* ALL-IN-ONE UNIFIED CONTROL PANEL MODAL */}
      {controlPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-950/95 border border-cyan-500/30 p-5 sm:p-6 text-white shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold text-sm text-cyan-300 font-mono">Talk & Interactive Controls</h3>
              </div>
              <button
                onClick={() => setControlPanelOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold text-slate-300"
              >
                ✕
              </button>
            </div>

            {/* Talk Back & Repeat Mode */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Voice & Talk Back Modes</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    toggleListening();
                    setControlPanelOpen(false);
                  }}
                  className={`py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border shadow-lg transition-all active:scale-95 ${
                    isListening
                      ? "bg-rose-500 border-rose-400 text-white animate-bounce"
                      : "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/40 text-cyan-200"
                  }`}
                >
                  <span className="text-lg">{isListening ? "🔴" : "🎙️"}</span>
                  <span>{isListening ? "Listening..." : "Talk"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMimicMode((m) => !m);
                    speakText(isMimicMode ? "Repeat mode turned off." : "Repeat mode on. Say anything, and I will repeat it!");
                    setMsg(isMimicMode ? "Repeat Mode: OFF ❌" : "Repeat Mode: ON 🗣️");
                  }}
                  className={`py-3.5 px-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    isMimicMode
                      ? "bg-amber-500/30 border-amber-400 text-amber-200 font-bold"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-lg">🗣️</span>
                  <span>{isMimicMode ? "Repeat: ON" : "Repeat Mode"}</span>
                </button>
              </div>
              <button
                  onClick={() => {
                    setCommandsOpen(true);
                    setControlPanelOpen(false);
                  }}
                  className="p-2.5 rounded-xl  hover:bg-cyan-500/30 border border-cyan-400/40 flex items-center justify-center gap-1.5 text-xs text-cyan-200 transition active:scale-95"
                >
                  <span>📜</span>
                  <span>Read Command List</span>
                </button>
            </div>

            {/* Quick Conversation Prompts */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {["How are you?", "Who are you?", "Tell me a story", "Sing a song","Take a picture","Tell me a joke"].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => {
                      handleVoiceCommand(promptText);
                      setControlPanelOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-xs text-cyan-200 transition active:scale-95"
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            {/* Actions & Interactions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    triggerTakePic();
                    setControlPanelOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs transition active:scale-95"
                >
                  <span className="text-xl">📸</span>
                  <span className="text-[10px] text-slate-300">Photo</span>
                </button>

                <button
                  onClick={() => {
                    triggerEatFood();
                    setControlPanelOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs transition active:scale-95"
                >
                  <span className="text-xl">🍔</span>
                  <span className="text-[10px] text-slate-300">Eat</span>
                </button>

                <button
                  onClick={() => {
                    setActiveToy((t) => (t === "ball" ? "hand" : "ball"));
                    ballPhys.current.active = true;
                    setControlPanelOpen(false);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1 text-xs transition active:scale-95 ${
                    activeToy === "ball"
                      ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 font-bold"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xl">⚽</span>
                  <span className="text-[10px]">Soccer</span>
                </button>

                <button
                  onClick={() => {
                    triggerShootSelf();
                    setControlPanelOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex flex-col items-center gap-1 text-xs text-rose-300 transition active:scale-95"
                >
                  <span className="text-xl">💥</span>
                  <span className="text-[10px]">Shoot</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  onClick={() => {
                    handleVoiceCommand("dance");
                    setControlPanelOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-slate-300 transition active:scale-95"
                >
                  <span>🕺</span>
                  <span>Dance</span>
                </button>

                <button
                  onClick={() => {
                    handleVoiceCommand("joke");
                    setControlPanelOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-slate-300 transition active:scale-95"
                >
                  <span>😂</span>
                  <span>Joke</span>
                </button>

                <button
                  onClick={() => {
                    setCommandsOpen(true);
                    setControlPanelOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 flex items-center justify-center gap-1.5 text-xs text-cyan-200 transition active:scale-95"
                >
                  <span>📜</span>
                  <span>Deck</span>
                </button>
              </div>
            </div>

            {/* System Settings & Customization */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Theme & Voice Sound</span>
              
              <div>
                <div className="grid grid-cols-5 gap-2">
                  {CHASSIS_THEMES.map((theme, i) => (
                    <button
                      key={theme.name}
                      onClick={() => setThemeIdx(i)}
                      className="h-8 rounded-xl border-2 transition-all hover:scale-105"
                      style={{ background: theme.accent, borderColor: i === themeIdx ? "#ffffff" : "transparent" }}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300 transition"
                >
                  <span>{muted ? "🔇" : "🔊"}</span>
                  <span>{muted ? "Muted" : "Voice On"}</span>
                </button>

                <button
                  onClick={() => {
                    gravityDir.current *= -1;
                    sounds.jump();
                    setControlPanelOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300 transition"
                >
                  <span>🛸</span>
                  <span>Flip Gravity</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA & PHOTO CAPTURE OVERLAY */}
      {cameraActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative rounded-3xl overflow-hidden border border-cyan-400 max-w-md w-full aspect-video shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            {cameraCountdown && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-cyan-300 font-mono text-5xl font-black animate-pulse">
                {cameraCountdown}
              </div>
            )}
          </div>
        </div>
      )}

      {/* POLAROID PHOTO VIEWER */}
      {snapshotPhoto && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-3xl bg-white text-slate-900 shadow-2xl border-4 border-cyan-400 flex flex-col items-center gap-2 max-w-xs animate-bounce">
          <img src={snapshotPhoto} alt="Snapshot" className="w-full rounded-2xl border border-slate-300 -scale-x-100" />
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-xs font-mono font-bold text-slate-800">📸 EMO_MEMORY.PNG</span>
            <button
              onClick={() => setSnapshotPhoto(null)}
              className="px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* FOOD DROP ANIMATION */}
      {foodDrop && (
        <div
          className="absolute z-30 text-5xl pointer-events-none transition-all duration-700 ease-in"
          style={{
            left: foodDrop.x,
            top: foodDrop.y,
            transform: `translate3d(0, ${phys.current.y - foodDrop.y + 10}px, 0) scale(${mood === "eating" ? 0.2 : 1})`,
            opacity: mood === "eating" ? 0 : 1,
          }}
        >
          {foodDrop.item.icon}
        </div>
      )}

      {/* TARGETING CROSSHAIR */}
      {isShootingSelf && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ left: crosshairPos.x, top: crosshairPos.y }}
        >
          <div className="w-28 h-28 rounded-full border-2 border-red-500 animate-spin border-dashed" />
          <div className="w-36 h-36 rounded-full border border-red-500/60 animate-ping absolute" />
          <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_25px_#ef4444]" />
        </div>
      )}

      {/* TRIVIA POPUP */}
      {liveQuiz && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 p-4 rounded-3xl bg-black/90 border border-cyan-400 backdrop-blur-xl shadow-2xl max-w-sm w-[90%]">
          <span className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider">OpenTDB Live Trivia</span>
          <p className="text-xs text-white text-center font-medium">{liveQuiz.question}</p>
          <div className="grid grid-cols-1 gap-1.5 w-full">
            {liveQuiz.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => {
                  if (choice === liveQuiz.correct) {
                    sounds.chirp();
                    setMood("happy");
                    setMsg("CORRECT! You nailed it! 🏆✨");
                    speakText("Correct answer! You are brilliant!");
                  } else {
                    sounds.gasp();
                    setMood("scared");
                    setMsg(`Wrong! Correct was: ${liveQuiz.correct} ❌`);
                    speakText(`Incorrect! The correct answer was ${liveQuiz.correct}`);
                  }
                  setLiveQuiz(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-cyan-500/20 border border-white/10 text-xs text-left transition active:scale-98 text-cyan-100"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* POKEMON CARD DISPLAY */}
      {pokemonCard && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-3.5 rounded-3xl bg-black/90 border border-amber-400 backdrop-blur-xl shadow-2xl animate-bounce">
          <img src={pokemonCard.sprite} alt={pokemonCard.name} className="w-16 h-16 pixelated bg-white/10 rounded-2xl border border-white/15" />
          <div className="flex flex-col text-xs text-white">
            <span className="font-bold text-amber-300 font-mono">{pokemonCard.name}</span>
            <span className="text-[10px] text-slate-300 uppercase">Type: {pokemonCard.types}</span>
            <span className="text-[10px] text-slate-400">Ht: {pokemonCard.height}m | Wt: {pokemonCard.weight}kg</span>
          </div>
        </div>
      )}

      {/* SIMON SAYS MEMORY CHALLENGE */}
      {simonGame && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 p-3.5 rounded-3xl bg-black/90 border border-cyan-400 backdrop-blur-xl shadow-2xl">
          <span className="text-xs font-bold text-cyan-300 uppercase font-mono">Memory Sequence</span>
          <div className="flex gap-2.5">
            {["🔵", "🟢", "🟡", "🔴"].map((color) => (
              <button
                key={color}
                onClick={() => {
                  if (color === simonGame.sequence[simonGame.step]) {
                    sounds.chirp();
                    if (simonGame.step + 1 >= simonGame.sequence.length) {
                      setMood("happy");
                      setMsg("YOU WON! Outstanding memory! 🏆✨");
                      speakText("Sequence complete! You win!");
                      setSimonGame(null);
                    } else {
                      setSimonGame((s) => ({ ...s, step: s.step + 1 }));
                    }
                  } else {
                    sounds.gasp();
                    setMood("scared");
                    setMsg("Wrong sequence! Try again! ❌");
                    speakText("Incorrect sequence.");
                    setSimonGame(null);
                  }
                }}
                className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/25 flex items-center justify-center text-2xl transition active:scale-90 shadow-md"
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMMANDS MODAL */}
      {commandsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-950 border border-cyan-500/40 p-5 sm:p-6 text-white shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold text-base sm:text-lg text-cyan-300 font-mono">EMO Command Deck</h3>
              </div>
              <button
                onClick={() => setCommandsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex flex-col gap-4 my-3 text-xs">
              {COMMAND_LIST.map((group, gi) => (
                <div key={gi} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{group.group}</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map((item, ii) => (
                      <div
                        key={ii}
                        onClick={() => {
                          const raw = item.cmd.split("/")[0].replace(/["']/g, "").trim();
                          handleVoiceCommand(raw);
                          setCommandsOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 transition cursor-pointer flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-cyan-200">{item.cmd}</span>
                        <span className="text-slate-400 text-[11px]">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCommandsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
            >
              Close Command Deck
            </button>
          </div>
        </div>
      )}

      {/* GAME OVERLAY BANNER */}
      {gameOverlay && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-bounce max-w-[90%]">
          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-sm sm:text-base shadow-2xl tracking-wide border border-white/30 text-center whitespace-normal">
            {gameOverlay}
          </div>
        </div>
      )}

      {/* DIGITAL TIME DISPLAY */}
      {clockDisplay && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-pulse text-center">
          <div className="px-7 py-3 rounded-3xl bg-black/85 border-2 border-cyan-400 text-cyan-300 font-mono text-3xl sm:text-4xl font-extrabold tracking-widest shadow-[0_0_30px_rgba(56,189,248,0.6)]">
            {clockDisplay}
          </div>
        </div>
      )}

      {/* SPEECH BUBBLE */}
      {mood !== "exploded" && msg && (
        <div
          className="absolute z-30 transition-all duration-150 pointer-events-none whitespace-normal text-center max-w-[260px]"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${phys.current.x - 130}px, ${phys.current.y - robotSize.h / 2 - 55}px, 0)`,
          }}
        >
          <div className="px-4 py-2.5 rounded-2xl bg-black/90 border border-cyan-500/50 backdrop-blur-md text-cyan-200 text-xs font-semibold shadow-2xl">
            {msg}
          </div>
        </div>
      )}

      {/* COMBO METER */}
      {comboMeter >= 3 && mood !== "exploded" && (
        <div
          className="absolute z-20 rounded-full overflow-hidden bg-white/10 border border-white/20"
          style={{
            width: 100,
            height: 6,
            transform: `translate3d(${phys.current.x - 50}px, ${phys.current.y - robotSize.h / 2 - 64}px, 0)`,
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

      {/* PARTICLES */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute z-20 rounded-full pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animation: "emoParticle 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}

      {/* HEARTS */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute z-30 pointer-events-none text-2xl"
          style={{
            transform: `translate3d(${h.x}px, ${h.y}px, 0)`,
            animation: `emoHeart 1.1s ease-out ${h.delay}s forwards`,
          }}
        >
          💕
        </div>
      ))}

      {/* SOCCER BALL */}
      {activeToy === "ball" && ballPhys.current.active && (
        <div
          ref={ballElemRef}
          onPointerDown={(e) => {
            ballPhys.current.held = true;
            ballDragStart.current = { x: e.clientX, y: e.clientY, time: performance.now(), lastX: e.clientX, lastY: e.clientY, lastTime: performance.now() };
          }}
          onPointerMove={(e) => {
            if (!ballPhys.current.held) return;
            ballPhys.current.x = e.clientX;
            ballPhys.current.y = e.clientY;
          }}
          onPointerUp={() => {
            ballPhys.current.held = false;
          }}
          className="absolute z-20 cursor-grab active:cursor-grabbing touch-none"
          style={{ width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, left: 0, top: 0 }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-200 to-white shadow-xl flex items-center justify-center border border-slate-400 text-base">
            ⚽
          </div>
        </div>
      )}

      {/* LASER POINTER DOT */}
      {activeToy === "laser" && laserPos && (
        <div
          className="absolute pointer-events-none z-20"
          style={{ transform: `translate3d(${laserPos.x - 8}px, ${laserPos.y - 8}px, 0)` }}
        >
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_20px_6px_rgba(239,68,68,0.95)] animate-ping" />
        </div>
      )}

      {/* DIGITAL ROBOT FACE */}
      {mood !== "exploded" && (
        <div
          ref={robotRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute z-10 cursor-pointer active:cursor-grabbing touch-none flex flex-col items-center justify-center"
          style={{
            width: robotSize.w,
            height: robotSize.h,
            left: 0,
            top: 0,
          }}
        >
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: currentTheme.eyeGlow }}
          />

          <div className="flex items-center gap-9 relative">
            <EmoEye side="left" mood={mood} blink={blink} eyeColor={currentTheme.eyeGlow} lookOffset={lookOffset} />
            <EmoEye side="right" mood={mood} blink={blink} eyeColor={currentTheme.eyeGlow} lookOffset={lookOffset} />

            {(mood === "happy" || mood === "eating" || affection > 90) && (
              <>
                <div className="absolute -left-4 top-10 w-6 h-3 rounded-full bg-pink-500/60 blur-[2px]" />
                <div className="absolute -right-4 top-10 w-6 h-3 rounded-full bg-pink-500/60 blur-[2px]" />
              </>
            )}
          </div>

          <EmoMouth mood={mood} eyeColor={currentTheme.eyeGlow} isTalking={isTalking} talkMouthShape={talkMouthShape} />
        </div>
      )}
    </div>
  );
}