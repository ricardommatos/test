import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2, VolumeX, Box } from 'lucide-react';

// ============================================
// PALETTE (from the Firefly poster series)
// ============================================
const COLORS = {
  bg: 0x07060b,
  purple: 0xa855f7,
  purpleSoft: 0xc084fc,
  purpleDeep: 0x7c22ce,
  purpleWall: 0x150a22,
  orange: 0xff4f00,
  orangeSoft: 0xff7a2e,
  orangeWall: 0x1c0a02,
  blue: 0x2979ff,
  blueSoft: 0x5c9bff,
  blueWall: 0x040b28,
  red: 0xe8112d,
  cream: 0xf2ede2,
};

// ============================================
// GEOMETRY HELPERS
// ============================================
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Rounded slab extruded along local +z, depth 1 (scale.z drives extrusion)
function slabGeometry(w, h, r) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 10,
  });
  return geo;
}

function textTexture(lines, color, tag) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = color;
  g.font = '700 104px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
  g.textBaseline = 'alphabetic';
  const lineHeight = 118;
  const baseY = 360 - (lines.length - 1) * lineHeight;
  lines.forEach((line, i) => g.fillText(line, 36, baseY + i * lineHeight));
  g.font = '500 34px monospace';
  g.globalAlpha = 0.8;
  g.fillText(tag, 40, 452);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function softDotTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ============================================
// DISTRICT — one poster turned into a 3D scene
// ============================================
function buildDistrict({ wallColor, ringColor, cardColor, cardGhost, dotStyle, textLines, textColor, tag }, extrudables) {
  const group = new THREE.Group();

  // Poster background wall
  const wall = new THREE.Mesh(
    slabGeometry(20, 26, 1.4),
    new THREE.MeshBasicMaterial({ color: wallColor })
  );
  wall.scale.z = 0.8;
  wall.position.z = -0.8;
  group.add(wall);

  // Dot / ring grid across the wall
  const cols = 9;
  const rows = 12;
  const spacingX = 2.05;
  const spacingY = 2.0;
  const count = cols * rows;
  const m4 = new THREE.Matrix4();

  if (dotStyle === 'solid') {
    const dotGeo = new THREE.CylinderGeometry(0.62, 0.62, 1, 22);
    dotGeo.rotateX(Math.PI / 2);
    dotGeo.translate(0, 0, 0.5);
    const dots = new THREE.InstancedMesh(
      dotGeo,
      new THREE.MeshBasicMaterial({ color: ringColor }),
      count
    );
    let i = 0;
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        m4.makeScale(1, 1, 0.7 + Math.random() * 0.6);
        m4.setPosition((cx - (cols - 1) / 2) * spacingX, (cy - (rows - 1) / 2) * spacingY - 1.2, 0.05);
        dots.setMatrixAt(i++, m4);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    group.add(dots);
    extrudables.push(dots);
  } else {
    const ringGeo = new THREE.TorusGeometry(0.55, 0.13, 10, 28);
    const rings = new THREE.InstancedMesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: ringColor }),
      count
    );
    let i = 0;
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        m4.identity();
        m4.setPosition((cx - (cols - 1) / 2) * spacingX, (cy - (rows - 1) / 2) * spacingY - 1.2, 0.25 + Math.random() * 0.3);
        rings.setMatrixAt(i++, m4);
      }
    }
    rings.instanceMatrix.needsUpdate = true;
    group.add(rings);
  }

  // Layered card stack (the stacked translucent rectangles of the posters)
  if (cardColor !== null) {
    const cardGeo = slabGeometry(10, 14, 0.9);
    const layers = [
      { x: -1.6, y: 1.6, z: 0.8, opacity: 0.28, color: cardGhost },
      { x: -0.8, y: 0.8, z: 2.0, opacity: 0.5, color: cardGhost },
      { x: 0, y: 0, z: 3.2, opacity: 1.0, color: cardColor },
    ];
    layers.forEach((l) => {
      const mat = new THREE.MeshBasicMaterial({
        color: l.color,
        transparent: l.opacity < 1,
        opacity: l.opacity,
        depthWrite: l.opacity >= 1,
      });
      const card = new THREE.Mesh(cardGeo, mat);
      card.position.set(l.x, l.y + 0.5, l.z);
      card.scale.z = 0.7;
      card.userData.baseZ = 0.7;
      group.add(card);
      extrudables.push(card);
    });
  }

  // Headline text plane
  const tex = textTexture(textLines, textColor, tag);
  const textPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 6.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  textPlane.position.set(-1.5, -4.2, 6.6);
  group.add(textPlane);

  return group;
}

// ============================================
// GENERATIVE AMBIENT AUDIO (Web Audio API)
// Soft pad + airy noise + sparse particle blips
// ============================================
function createAmbientAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();

  const master = ctx.createGain();
  master.gain.value = 0;
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 2400;
  soften.Q.value = 0.3;
  master.connect(soften);
  soften.connect(ctx.destination);

  // Echo bus for the particle blips
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.46;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const fbFilter = ctx.createBiquadFilter();
  fbFilter.type = 'lowpass';
  fbFilter.frequency.value = 1300;
  delay.connect(feedback);
  feedback.connect(fbFilter);
  fbFilter.connect(delay);
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.55;
  delay.connect(echoOut);
  echoOut.connect(master);

  const stopFns = [];

  // Warm drone pad (D2 / A2 / D3 / F#3)
  [
    [73.42, 'sine', 0.055],
    [110.0, 'sine', 0.04],
    [146.83, 'triangle', 0.016],
    [185.0, 'sine', 0.009],
  ].forEach(([freq, type, level], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = i % 2 ? 4 : -3;
    const g = ctx.createGain();
    g.gain.value = level;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.027;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = level * 0.45;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    osc.connect(g);
    g.connect(master);
    osc.start();
    lfo.start();
    stopFns.push(() => {
      osc.stop();
      lfo.stop();
    });
  });

  // Distant airy wash (filtered brown-ish noise)
  const noiseLen = 4 * ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < noiseLen; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'bandpass';
  nFilter.frequency.value = 320;
  nFilter.Q.value = 0.6;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.05;
  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(master);
  noise.start();
  stopFns.push(() => noise.stop());

  // Sparse particle blips (D major pentatonic, long soft tails)
  const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];
  let blipTimer = null;
  let running = false;
  const blip = () => {
    if (running === false) return;
    const t = ctx.currentTime;
    const freq = SCALE[Math.floor(Math.random() * SCALE.length)] * (Math.random() < 0.2 ? 2 : 1);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const peak = 0.022 + Math.random() * 0.028;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.06 + Math.random() * 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 + Math.random() * 1.6);
    osc.connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      g.connect(pan);
      out = pan;
    }
    out.connect(master);
    g.connect(delay);
    osc.start(t);
    osc.stop(t + 3.4);
    blipTimer = setTimeout(blip, 400 + Math.random() * 1700);
  };

  return {
    start() {
      if (ctx.state === 'suspended') ctx.resume();
      running = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
      blip();
    },
    stop() {
      running = false;
      clearTimeout(blipTimer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    },
    dispose() {
      running = false;
      clearTimeout(blipTimer);
      stopFns.forEach((f) => {
        try {
          f();
        } catch (e) {
          /* already stopped */
        }
      });
      ctx.close().catch(() => {});
    },
  };
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function FireflyWorld({ onExit }) {
  const mountRef = useRef(null);
  const audioRef = useRef(null);

  const [extrusion, setExtrusion] = useState(1);
  const [speed, setSpeed] = useState(0.25);
  const [soundOn, setSoundOn] = useState(false);

  const extrusionRef = useRef(extrusion);
  const speedRef = useRef(speed);
  extrusionRef.current = extrusion;
  speedRef.current = speed;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    // --- Renderer / scene / camera ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    scene.fog = new THREE.FogExp2(COLORS.bg, 0.0058);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 500);

    // World hierarchy: tilt (pitch) -> yaw -> content
    const tiltGroup = new THREE.Group();
    const yawGroup = new THREE.Group();
    tiltGroup.add(yawGroup);
    scene.add(tiltGroup);
    tiltGroup.rotation.x = 0.12;

    const extrudables = [];

    // --- Four poster districts around a central plaza ---
    const districts = [
      {
        wallColor: COLORS.purpleWall,
        ringColor: COLORS.purpleDeep,
        cardColor: COLORS.purple,
        cardGhost: COLORS.purpleSoft,
        dotStyle: 'ring',
        textLines: ["Here's to the", 'next gen.'],
        textColor: '#f5f0ff',
        tag: 'firefly · prismlab',
      },
      {
        wallColor: COLORS.orangeWall,
        ringColor: COLORS.orange,
        cardColor: COLORS.orange,
        cardGhost: COLORS.orangeSoft,
        dotStyle: 'ring',
        textLines: ['Catch the', 'spark.'],
        textColor: '#fff5ef',
        tag: 'firefly · prismlab',
      },
      {
        wallColor: COLORS.blueWall,
        ringColor: COLORS.blue,
        cardColor: COLORS.blue,
        cardGhost: COLORS.blueSoft,
        dotStyle: 'ring',
        textLines: ["Here's to the", 'next gen.'],
        textColor: '#eef4ff',
        tag: 'firefly · prismlab',
      },
      {
        wallColor: COLORS.cream,
        ringColor: COLORS.red,
        cardColor: null,
        cardGhost: null,
        dotStyle: 'solid',
        textLines: ['Catch the', 'spark.'],
        textColor: '#16130e',
        tag: 'firefly · prismlab',
      },
    ];

    const RADIUS = 33;
    districts.forEach((d, i) => {
      const district = buildDistrict(d, extrudables);
      const angle = (i / districts.length) * Math.PI * 2 + Math.PI / 4;
      district.position.set(Math.sin(angle) * RADIUS, 1.5, Math.cos(angle) * RADIUS);
      district.rotation.y = angle + Math.PI;
      yawGroup.add(district);
    });

    // --- Central twisting totem of palette slabs ---
    const totem = new THREE.Group();
    const totemColors = [COLORS.purple, COLORS.orange, COLORS.blue, COLORS.red, COLORS.cream, COLORS.purpleSoft];
    const totemSlabs = [];
    totemColors.forEach((color, i) => {
      const slab = new THREE.Mesh(
        slabGeometry(7 - i * 0.55, 7 - i * 0.55, 1),
        new THREE.MeshBasicMaterial({ color })
      );
      slab.rotation.x = -Math.PI / 2;
      slab.rotation.z = i * 0.45;
      slab.scale.z = 1.1;
      slab.userData.baseZ = 1.1;
      slab.position.y = -10 + i * 2.6;
      totem.add(slab);
      totemSlabs.push(slab);
      extrudables.push(slab);
    });
    yawGroup.add(totem);

    // --- Floor field: a skyline of extrudable dots ---
    const FLOOR_N = 24;
    const floorGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    floorGeo.translate(0, 0.5, 0);
    const floorField = new THREE.InstancedMesh(
      floorGeo,
      new THREE.MeshBasicMaterial(),
      FLOOR_N * FLOOR_N
    );
    const floorPalette = [COLORS.purple, COLORS.purpleDeep, COLORS.orange, COLORS.blue, COLORS.red];
    const fm = new THREE.Matrix4();
    const fc = new THREE.Color();
    let fi = 0;
    for (let gx = 0; gx < FLOOR_N; gx++) {
      for (let gz = 0; gz < FLOOR_N; gz++) {
        const x = (gx - (FLOOR_N - 1) / 2) * 3.1;
        const z = (gz - (FLOOR_N - 1) / 2) * 3.1;
        const dist = Math.sqrt(x * x + z * z);
        const h = 0.6 + Math.abs(Math.sin(gx * 0.7) * Math.cos(gz * 0.9)) * 3.4 + Math.max(0, 14 - dist) * 0.18;
        fm.makeScale(1, h, 1);
        fm.setPosition(x, 0, z);
        floorField.setMatrixAt(fi, fm);
        fc.setHex(floorPalette[(gx * 7 + gz * 13) % floorPalette.length]);
        fc.multiplyScalar(0.16 + Math.random() * 0.3);
        floorField.setColorAt(fi, fc);
        fi++;
      }
    }
    floorField.instanceMatrix.needsUpdate = true;
    floorField.instanceColor.needsUpdate = true;
    floorField.position.y = -13.5;
    yawGroup.add(floorField);

    // --- Giant orbital rings around the whole world ---
    const orbitals = [];
    [
      { r: 48, color: COLORS.purpleDeep, tilt: 0.5 },
      { r: 56, color: COLORS.blue, tilt: -0.35 },
      { r: 64, color: COLORS.orange, tilt: 0.2 },
    ].forEach((o) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(o.r, 0.09, 8, 120),
        new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.35 })
      );
      ring.rotation.x = Math.PI / 2 + o.tilt;
      yawGroup.add(ring);
      orbitals.push(ring);
    });

    // --- Spark particles drifting upward ---
    const SPARKS = 900;
    const sparkGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(SPARKS * 3);
    const colors = new Float32Array(SPARKS * 3);
    const sparkSpeed = new Float32Array(SPARKS);
    const sparkPalette = [COLORS.purpleSoft, COLORS.orange, COLORS.blue, COLORS.red, 0xffffff];
    const sc = new THREE.Color();
    for (let i = 0; i < SPARKS; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = -16 + Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
      sc.setHex(sparkPalette[Math.floor(Math.random() * sparkPalette.length)]);
      colors[i * 3] = sc.r;
      colors[i * 3 + 1] = sc.g;
      colors[i * 3 + 2] = sc.b;
      sparkSpeed[i] = 0.4 + Math.random() * 1.4;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        size: 0.7,
        map: softDotTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    yawGroup.add(sparks);

    // --- Interaction state ---
    const drag = { active: false, lastX: 0, lastY: 0, velY: 0, velX: 0 };
    let camDist = 76;
    let camDistTarget = 76;
    let appliedExtrusion = -1;

    const onPointerDown = (e) => {
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      mount.setPointerCapture && renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.velY = dx * 0.005;
      drag.velX = dy * 0.004;
      yawGroup.rotation.y += drag.velY;
      tiltGroup.rotation.x = THREE.MathUtils.clamp(tiltGroup.rotation.x + drag.velX, -0.45, 0.7);
    };
    const onPointerUp = () => {
      drag.active = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      camDistTarget = THREE.MathUtils.clamp(camDistTarget + e.deltaY * 0.06, 38, 130);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Auto-rotation + drag inertia
      if (!drag.active) {
        yawGroup.rotation.y += speedRef.current * 0.25 * dt + drag.velY;
        drag.velY *= 0.94;
        drag.velX *= 0.94;
      }

      // Smooth extrusion towards slider value
      const target = extrusionRef.current;
      if (Math.abs(target - appliedExtrusion) > 0.001) {
        appliedExtrusion = appliedExtrusion < 0 ? target : appliedExtrusion + (target - appliedExtrusion) * 0.12;
        extrudables.forEach((m) => {
          m.scale.z = appliedExtrusion * (m.userData.baseZ || 1);
        });
        floorField.scale.y = appliedExtrusion;
      }

      // Totem twist
      totemSlabs.forEach((slab, i) => {
        slab.rotation.z = i * 0.45 + t * 0.18 * (i % 2 ? 1 : -1);
        slab.position.y = -10 + i * 2.6 + Math.sin(t * 0.6 + i) * 0.35;
      });

      // Orbitals breathe
      orbitals.forEach((ring, i) => {
        ring.rotation.z = t * 0.04 * (i % 2 ? -1 : 1);
      });

      // Sparks drift upward and wrap
      const pos = sparkGeo.attributes.position.array;
      for (let i = 0; i < SPARKS; i++) {
        pos[i * 3 + 1] += sparkSpeed[i] * dt;
        if (pos[i * 3 + 1] > 36) pos[i * 3 + 1] = -16;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      // Camera ease
      camDist += (camDistTarget - camDist) * 0.08;
      camera.position.set(0, 13, camDist);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Audio lifecycle
  useEffect(() => () => audioRef.current && audioRef.current.dispose(), []);

  const toggleSound = () => {
    if (!soundOn) {
      if (!audioRef.current) audioRef.current = createAmbientAudio();
      audioRef.current.start();
    } else if (audioRef.current) {
      audioRef.current.stop();
    }
    setSoundOn(!soundOn);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Title */}
      <div className="absolute top-5 left-6 pointer-events-none">
        <h1 className="text-white text-2xl font-bold tracking-tight">Firefly World</h1>
        <p className="text-white/50 text-xs font-mono mt-1">catch the spark · arrasta para rodar · scroll para zoom</p>
      </div>

      {/* Back to PrismLab */}
      {onExit && (
        <button
          onClick={onExit}
          className="absolute top-5 right-6 flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur transition-colors"
        >
          <Box size={14} />
          Prism Lab
        </button>
      )}

      {/* Controls */}
      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 px-5 py-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
          <div className="w-44">
            <div className="flex justify-between text-[11px] font-mono text-white/60 mb-1.5">
              <span>extrusão</span>
              <span>{extrusion.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={extrusion}
              onChange={(e) => setExtrusion(parseFloat(e.target.value))}
              className="slider w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="w-44">
            <div className="flex justify-between text-[11px] font-mono text-white/60 mb-1.5">
              <span>rotação</span>
              <span>{speed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="slider w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button
            onClick={toggleSound}
            title={soundOn ? 'Desligar som' : 'Som ambiente'}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              soundOn ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
        <p className="text-white/30 text-[11px] font-mono pb-1">prismlab · firefly world</p>
      </div>
    </div>
  );
}
