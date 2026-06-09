import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, RefreshCw, Play, Pause } from 'lucide-react';

// ============================================================
// Seeded randomness + noise
// ============================================================

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fract = (x) => x - Math.floor(x);

function hash2(x, z, seed) {
  return fract(Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123);
}

const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  const u = smooth(xf);
  const v = smooth(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z, seed) {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    total += valueNoise(x * freq, z * freq, seed + i * 17) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total;
}

// ============================================================
// Color palette (sampled from the aurora reference image:
// deep purple -> magenta -> ember orange -> gold -> periwinkle)
// ============================================================

const GRADIENT_STOPS = [
  [0.0, 49, 16, 87],
  [0.12, 126, 34, 206],
  [0.22, 190, 24, 93],
  [0.32, 226, 60, 30],
  [0.44, 245, 130, 32],
  [0.58, 252, 190, 80],
  [0.72, 196, 168, 250],
  [0.86, 160, 175, 252],
  [1.0, 118, 130, 246],
];

function sampleGradient(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    if (t <= GRADIENT_STOPS[i][0]) {
      const [t0, r0, g0, b0] = GRADIENT_STOPS[i - 1];
      const [t1, r1, g1, b1] = GRADIENT_STOPS[i];
      const f = (t - t0) / (t1 - t0);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  const last = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
  return [last[1], last[2], last[3]];
}

// Depth fog: 5 alpha bands, near = bright, far = faint
const DEPTH_ALPHA = [0.14, 0.28, 0.45, 0.68, 0.92];

// ============================================================
// Particle generation: a ridged noise landscape of vertical
// streaks, with a dense core and sparse spires (pixel-sort look)
// ============================================================

const SPREAD_X = 300;
const SPREAD_Z = 150;

function generateParticles(count, seed) {
  const rand = mulberry32(seed);
  const particles = [];

  for (let i = 0; i < count; i++) {
    const x = (rand() * 2 - 1) * SPREAD_X;
    const z = (rand() * 2 - 1) * SPREAD_Z;

    const n = fbm(x * 0.006 + 31.7, z * 0.006 + 11.3, seed);
    const ridge = Math.pow(1 - Math.abs(2 * n - 1), 2.2);
    const hUp = 18 + ridge * 235 + fbm(x * 0.02, z * 0.02, seed + 5) * 40;
    const hDn = 30 + fbm(x * 0.01 + 7, z * 0.01 + 3, seed + 9) * 110;

    let y;
    let heightRatio; // 0 at the core, 1 at the spire tips
    const upper = rand() < 0.64;
    if (upper) {
      heightRatio = Math.pow(rand(), 1.7);
      y = hUp * heightRatio;
    } else {
      heightRatio = Math.pow(rand(), 2.2);
      y = -hDn * heightRatio;
    }

    // Hue sweeps left-to-right, with noise jitter so regions interleave
    let t = (x / SPREAD_X + 1) / 2;
    t += (fbm(x * 0.012 + 3.1, z * 0.012 + 9.4, seed + 23) - 0.5) * 0.45;
    t += (rand() - 0.5) * 0.08;
    let [r, g, b] = sampleGradient(t);

    if (upper) {
      // Spire tips wash out toward pale lavender, like the streak ends
      const tip = Math.pow(heightRatio, 2) * 0.45;
      r += (235 - r) * tip;
      g += (228 - g) * tip;
      b += (255 - b) * tip;
    } else {
      // The hanging mass below is darker and cooler
      r *= 0.55;
      g *= 0.55;
      b *= 0.75;
    }

    // Dense core glows the most, tips stay wispy
    const brightness =
      (upper ? 1 - heightRatio * 0.55 : 0.8 - heightRatio * 0.4) *
      (0.6 + ridge * 0.4);

    const ri = Math.round(r);
    const gi = Math.round(g);
    const bi = Math.round(b);
    const colors = DEPTH_ALPHA.map(
      (a) => `rgba(${ri},${gi},${bi},${Math.min(1, a * brightness).toFixed(3)})`
    );

    particles.push({
      x,
      y,
      z,
      len: 5 + rand() * 20 + ridge * 35 * rand(),
      colors,
      phase: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 1.1,
      amp: 2 + rand() * 7,
      // A few particles slowly rise through the spires and wrap around
      drift: rand() < 0.1 ? 12 + rand() * 30 : 0,
      driftRange: hUp * 1.25 + 20,
    });
  }

  return particles;
}

// ============================================================
// Component
// ============================================================

const ParticleWorld = () => {
  const [count, setCount] = useState(9000);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [streakScale, setStreakScale] = useState(1);
  const [trails, setTrails] = useState(0.55);
  const [autoRotate, setAutoRotate] = useState(true);
  const [seed, setSeed] = useState(1337);

  const canvasRef = useRef(null);
  const rotationRef = useRef({ yaw: 0.35, pitch: 0.18 });
  const zoomRef = useRef(1.2);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const paramsRef = useRef({ motionSpeed, streakScale, trails, autoRotate });

  useEffect(() => {
    paramsRef.current = { motionSpeed, streakScale, trails, autoRotate };
  }, [motionSpeed, streakScale, trails, autoRotate]);

  const particles = useMemo(() => generateParticles(count, seed), [count, seed]);

  // ----------------------------------------------------------
  // Render loop
  // ----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#050308';
      ctx.fillRect(0, 0, w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const PERSPECTIVE = 700;
    let rafId;
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const time = now * 0.001;
      const { motionSpeed, streakScale, trails, autoRotate } = paramsRef.current;

      if (autoRotate && !draggingRef.current) {
        rotationRef.current.yaw += dt * 0.12;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cyScreen = h * 0.52;

      // Fading clear: leftover frames become motion trails / glow
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(5,3,8,${(1 - trails * 0.9).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';

      const { yaw, pitch } = rotationRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const zoom = zoomRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed = p.speed * motionSpeed;

        let py = p.y + Math.sin(time * speed + p.phase) * p.amp * motionSpeed;
        if (p.drift) {
          // Rising sparks wrap from the core back up through the tips
          py =
            ((p.y + 40 + time * p.drift * motionSpeed) % p.driftRange) - 40 +
            Math.sin(time * speed + p.phase) * p.amp;
        }

        const flicker = 0.7 + 0.3 * Math.sin(time * (speed * 1.7 + 0.3) + p.phase * 2.3);
        const len = p.len * streakScale * flicker;

        // Yaw (Y axis)
        const xr = p.x * cosY + p.z * sinY;
        const zr = -p.x * sinY + p.z * cosY;

        // Pitch (X axis) applied to both streak endpoints
        const y1 = py - len * 0.5;
        const y2 = py + len * 0.5;
        const ya = y1 * cosP - zr * sinP;
        const za = y1 * sinP + zr * cosP;
        const yb = y2 * cosP - zr * sinP;
        const zb = y2 * sinP + zr * cosP;

        const s1 = (PERSPECTIVE / (PERSPECTIVE - za)) * zoom;
        const s2 = (PERSPECTIVE / (PERSPECTIVE - zb)) * zoom;
        if (s1 <= 0 || s2 <= 0) continue;

        // Depth fog band: za in roughly [-340, 340]
        let band = Math.floor(((za + 340) / 680) * DEPTH_ALPHA.length);
        if (band < 0) band = 0;
        if (band >= DEPTH_ALPHA.length) band = DEPTH_ALPHA.length - 1;

        ctx.strokeStyle = p.colors[band];
        ctx.beginPath();
        ctx.moveTo(cx + xr * s1, cyScreen - ya * s1);
        ctx.lineTo(cx + xr * s2, cyScreen - yb * s2 + 0.01);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [particles]);

  // ----------------------------------------------------------
  // Pointer interaction: drag to rotate, wheel to zoom
  // ----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e) => {
      draggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      rotationRef.current.yaw += dx * 0.005;
      rotationRef.current.pitch = Math.min(
        1.2,
        Math.max(-1.2, rotationRef.current.pitch + dy * 0.005)
      );
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.001);
      zoomRef.current = Math.min(3, Math.max(0.35, zoomRef.current * factor));
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------
  const Slider = ({ label, value, onChange, min, max, step, format }) => (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-violet-300">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-black text-gray-200">
      {/* Sidebar */}
      <div className="w-72 bg-gray-950 border-r border-gray-800 p-5 flex flex-col gap-5 overflow-y-auto">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2 text-violet-300">
            <Sparkles size={18} /> Particle World
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Drag to rotate &middot; Scroll to zoom
          </p>
        </div>

        <Slider
          label="Particles"
          value={count}
          onChange={setCount}
          min={1000}
          max={14000}
          step={500}
        />
        <Slider
          label="Motion"
          value={motionSpeed}
          onChange={setMotionSpeed}
          min={0}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
        />
        <Slider
          label="Streak length"
          value={streakScale}
          onChange={setStreakScale}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
        />
        <Slider
          label="Trails / glow"
          value={trails}
          onChange={setTrails}
          min={0}
          max={0.95}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <button
          onClick={() => setAutoRotate((v) => !v)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          {autoRotate ? <Pause size={14} /> : <Play size={14} />}
          {autoRotate ? 'Pause rotation' : 'Auto-rotate'}
        </button>

        <button
          onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <RefreshCw size={14} /> New world
        </button>

        <p className="text-[11px] leading-relaxed text-gray-600 mt-auto">
          A ridged-noise landscape of glowing vertical streaks rendered with a
          hand-rolled 3D pipeline on a 2D canvas &mdash; no 3D library.
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
        />
      </div>
    </div>
  );
};

export default ParticleWorld;
