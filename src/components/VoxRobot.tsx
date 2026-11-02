'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface VoxRobotHandle {
  setMood: (m: 'curious' | 'happy' | 'annoyed') => void;
  gesture: (n: 'wink' | 'nod' | 'shake' | 'surprise' | 'think' | 'sleepy' | 'excited' | 'tilt' | 'turn' | 'trick' | 'yes') => void;
  yes: () => void;
  no: () => void;
  grumpy: () => void;
  trick: () => void;
  gestures: string[];
  mood: string;
  baseMood: string;
  eyeContact: number;
  destroy: () => void;
}

declare global {
  interface Window {
    __voxRobot?: VoxRobotHandle | null;
  }
}

function hex(h: string): [number, number, number] {
  let clean = h.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function rgb(c: number[] | [number, number, number]): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function toHsl(c: number[] | [number, number, number]): [number, number, number] {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function fromHsl(h: [number, number, number]): [number, number, number] {
  const H = (((h[0] % 360) + 360) % 360) / 360;
  const S = h[1];
  const L = h[2];
  function f(p: number, q: number, t: number) {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  }
  if (!S) return [L * 255, L * 255, L * 255];
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  return [f(p, q, H + 1 / 3) * 255, f(p, q, H) * 255, f(p, q, H - 1 / 3) * 255];
}

// move colour a toward b by t, shortest way round the hue wheel (purple→orange passes through magenta and red)
function mixHue(a: number[], b: number[], t: number): [number, number, number] {
  const A = toHsl(a);
  const B = toHsl(b);
  const dh = ((B[0] - A[0] + 540) % 360) - 180;
  return fromHsl([A[0] + dh * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function bump(t: number): number {
  return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
}

// critically-damped spring matching the exact floating motion from reference
class Spring {
  v: number;
  target: number;
  vel: number;
  k: number;
  z: number;

  constructor(v: number, k = 40, z = 0.85) {
    this.v = v;
    this.target = v;
    this.vel = 0;
    this.k = k;
    this.z = z;
  }

  step(dt: number): number {
    const d = 2 * Math.sqrt(this.k) * this.z;
    const a = this.k * (this.target - this.v) - d * this.vel;
    this.vel += a * dt;
    this.v += this.vel * dt;
    return this.v;
  }
}

interface MountOptions {
  brand?: string;
  brand2?: string;
  autoplay?: boolean;
  onUpdate?: (state: { mood: string; gesture: string | null; eyeContact: number }) => void;
}

function squircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.bezierCurveTo(x + w - radius * 0.45, y, x + w, y + radius * 0.45, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.bezierCurveTo(x + w, y + h - radius * 0.45, x + w - radius * 0.45, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.bezierCurveTo(x + radius * 0.45, y + h, x, y + h - radius * 0.45, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.bezierCurveTo(x, y + radius * 0.45, x + radius * 0.45, y, x + radius, y);
  ctx.closePath();
}

export function mountVoxRobot(el: HTMLElement, opts: MountOptions = {}): VoxRobotHandle {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  el.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:pointer';
  canvas.setAttribute('aria-label', 'VoxSphere robot mascot');
  el.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  // Maintain sharp, crisp pixel density while preventing GPU fillrate stalls
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Use NoToneMapping so whites are pure brilliant #ffffff and gradients stay vivid
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.1, 7.6);
  camera.lookAt(0, -0.42, 0);

  // Modern Three.js divides light intensities by PI.
  // In r128 (the version voxsphere-hero.html was built with), lighting was legacy unscaled (1.05 + 0.55 = 1.60).
  // Scaling by Math.PI reproduces the exact brilliant, vibrant, luminous white robot appearance of Image 1!
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c0d0, 1.25 * Math.PI);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.75 * Math.PI);
  key.position.set(1.5, 4, 3);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xedf2ff, 0.45 * Math.PI);
  fill.position.set(-3, 0.5, 2);
  scene.add(fill);

  // Ambient fill to keep the white shell completely luminous and eliminate muddy shadows
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  // Soft contact shadow: radial blob matching Image 1
  const sc_ = document.createElement('canvas');
  sc_.width = sc_.height = 256;
  const sg = sc_.getContext('2d')!;
  const grd = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(36,42,56,0.75)');
  grd.addColorStop(0.35, 'rgba(36,42,56,0.5)');
  grd.addColorStop(0.7, 'rgba(36,42,56,0.14)');
  grd.addColorStop(1, 'rgba(40,46,60,0)');
  sg.fillStyle = grd;
  sg.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(sc_);
  shadowTex.generateMipmaps = false;
  shadowTex.minFilter = THREE.LinearFilter;
  shadowTex.magFilter = THREE.LinearFilter;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.position.set(0.1, -1.5, 0.4);
  scene.add(shadow);

  // ---- face painted onto the sphere ----
  const W = 1536;
  const H = 768;
  const fc = document.createElement('canvas');
  fc.width = W;
  fc.height = H;
  const g = fc.getContext('2d')!;
  const faceTex = new THREE.CanvasTexture(fc);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.generateMipmaps = false;
  faceTex.minFilter = THREE.LinearFilter;
  faceTex.magFilter = THREE.LinearFilter;

  const rc = document.createElement('canvas');
  rc.width = W;
  rc.height = H;
  const rg = rc.getContext('2d')!;
  const roughTex = new THREE.CanvasTexture(rc);
  roughTex.colorSpace = THREE.NoColorSpace;
  roughTex.generateMipmaps = false;
  roughTex.minFilter = THREE.LinearFilter;
  roughTex.magFilter = THREE.LinearFilter;

  const VW = 490;
  const VH = 300;
  const VR = 126;
  const RIM = 32;
  const CX = W / 2;
  const CY = H / 2 - 6;

  rg.fillStyle = '#9a9a9a';
  rg.fillRect(0, 0, W, H);
  squircle(rg, CX - VW / 2 - RIM, CY - VH / 2 - RIM, VW + RIM * 2, VH + RIM * 2, VR + RIM);
  rg.fillStyle = '#707070';
  rg.fill();
  squircle(rg, CX - VW / 2, CY - VH / 2, VW, VH, VR);
  rg.fillStyle = '#5a5a5a';
  rg.fill();
  roughTex.needsUpdate = true;

  // Use the vivid, electric default colors from Image 1: #c84dff (bright magenta-purple) and #4bb86f
  const brand = hex(opts.brand || '#c84dff');
  const brand2 = hex(opts.brand2 || '#4bb86f');

  const moods: Record<
    string,
    {
      c: [number[], number[], number[]];
      eyeW: number;
      eyeH: number;
      eyeY: number;
      anger: number;
      visor: number;
    }
  > = {
    curious: {
      c: [brand, [111, 91, 255], [56, 200, 255]],
      eyeW: 0.16,
      eyeH: 0.4,
      eyeY: -0.05,
      anger: 0,
      visor: 1.0,
    },
    happy: {
      c: [brand2, [110, 196, 96], [160, 214, 80]],
      eyeW: 0.22,
      eyeH: 0.52,
      eyeY: -0.03,
      anger: 0,
      visor: 1.04,
    },
    annoyed: {
      c: [[255, 70, 60], [255, 122, 47], [255, 172, 50]],
      eyeW: 0.2,
      eyeH: 0.42,
      eyeY: -0.08,
      anger: 1,
      visor: 0.96,
    },
  };

  const cur = {
    c: [brand.slice(), [111, 91, 255], [56, 200, 255]] as [number[], number[], number[]],
    eyeW: 0.16,
    eyeH: 0.4,
    eyeY: -0.05,
    anger: 0,
    visor: 1,
  };
  let mood = 'curious';

  // Fast Base Face Cache: Only re-renders heavy 18px shadowBlur and gradients when colors or visor scale change!
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = W;
  baseCanvas.height = H;
  const bg = baseCanvas.getContext('2d')!;
  let lastBaseKey = '';

  function renderBaseFace() {
    bg.clearRect(0, 0, W, H);
    // Pristine bright white shell with gentle soft shading at bottom
    bg.fillStyle = '#ffffff';
    bg.fillRect(0, 0, W, H);
    const sh = bg.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(165,172,186,0.18)');
    bg.fillStyle = sh;
    bg.fillRect(0, 0, W, H);

    const vs = cur.visor;
    const vw = VW * vs;
    const vh = VH * vs;
    const vr = VR * vs;
    const x = CX - vw / 2;
    const y = CY - vh / 2;

    // rim: vibrant three-stop diagonal gradient
    const gr = bg.createLinearGradient(x - RIM, y, x + vw + RIM, y + vh);
    gr.addColorStop(0, rgb(cur.c[0]));
    gr.addColorStop(0.5, rgb(cur.c[1]));
    gr.addColorStop(1, rgb(cur.c[2]));
    squircle(bg, x - RIM, y - RIM, vw + RIM * 2, vh + RIM * 2, vr + RIM);
    bg.fillStyle = gr;
    bg.fill();

    // soft outer shadow where rim meets the shell
    bg.save();
    bg.shadowColor = 'rgba(60,70,90,0.25)';
    bg.shadowBlur = 18;
    bg.shadowOffsetY = 6;
    bg.fillStyle = gr;
    bg.fill();
    bg.restore();

    // rim top highlight
    const hl = bg.createLinearGradient(0, y - RIM, 0, y + vh * 0.4);
    hl.addColorStop(0, 'rgba(255,255,255,0.4)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    bg.fillStyle = hl;
    bg.fill();

    // visor: near-black with faint recess shadow & cool sheen
    squircle(bg, x, y, vw, vh, vr);
    bg.fillStyle = '#0a0b0f';
    bg.fill();
    bg.save();
    bg.clip();
    const inner = bg.createRadialGradient(CX, CY, vh * 0.2, CX, CY, vw * 0.62);
    inner.addColorStop(0, 'rgba(0,0,0,0)');
    inner.addColorStop(1, 'rgba(0,0,0,0.35)');
    bg.fillStyle = inner;
    bg.fillRect(x, y, vw, vh);
    const sheen = bg.createLinearGradient(0, y, 0, y + vh * 0.55);
    sheen.addColorStop(0, 'rgba(170,190,230,0.18)');
    sheen.addColorStop(1, 'rgba(170,190,230,0)');
    bg.fillStyle = sheen;
    bg.fillRect(x, y, vw, vh);
    bg.restore();

    lastBaseKey = `${Math.round(cur.c[0][0])},${Math.round(cur.c[0][1])},${Math.round(cur.c[0][2])}_${Math.round(cur.c[1][0])}_${Math.round(cur.c[2][0])}_${Math.round(cur.visor * 100)}`;
  }

  function drawFace(f: {
    ex: number;
    ey: number;
    openL: number;
    openR: number;
    scale: number;
  }) {
    const currentKey = `${Math.round(cur.c[0][0])},${Math.round(cur.c[0][1])},${Math.round(cur.c[0][2])}_${Math.round(cur.c[1][0])}_${Math.round(cur.c[2][0])}_${Math.round(cur.visor * 100)}`;
    if (currentKey !== lastBaseKey) {
      renderBaseFace();
    }

    // Fast blit from pre-rendered base face canvas
    g.drawImage(baseCanvas, 0, 0);

    const vs = cur.visor;
    const vw = VW * vs;
    const vh = VH * vs;

    // Crisp pure-white glowing eyes
    const ew = vw * cur.eyeW * f.scale;
    const ehBase = vh * cur.eyeH * f.scale;
    const cy = CY + vh * cur.eyeY + f.ey * vh * 0.16;
    const sep = vw * 0.26;
    const a = cur.anger;
    g.fillStyle = '#ffffff';

    [-1, 1].forEach((s, i) => {
      const open = Math.max(0.05, i ? f.openR : f.openL);
      const eh = ehBase * open;
      const cx = CX + s * sep + f.ex * vw * 0.15;
      g.save();
      g.translate(cx, cy);
      g.rotate(s * 0.06);
      g.beginPath();
      g.ellipse(0, 0, ew / 2, eh / 2, 0, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      if (a > 0.002) {
        g.clip();
        const top = -eh / 2;
        const outerY = top + eh * 0.1 * a;
        const innerY = top + eh * 0.68 * a;
        g.beginPath();
        g.moveTo(s * ew, top - eh);
        g.lineTo(-s * ew, top - eh);
        g.lineTo(-s * ew, innerY + eh * 0.12 * a);
        g.lineTo(-s * ew * 0.5, innerY);
        g.lineTo(s * ew * 0.5, outerY);
        g.lineTo(s * ew, outerY - eh * 0.12 * a);
        g.closePath();
        g.fillStyle = '#0a0b0f';
        g.fill();
      }
      g.restore();
    });

    faceTex.needsUpdate = true;
  }

  const head = new THREE.Group();
  scene.add(head);
  const body = new THREE.Group();
  head.add(body);
  const sphereGeo = new THREE.SphereGeometry(1.2, 128, 96);
  sphereGeo.computeBoundingSphere();
  const shell = new THREE.Mesh(
    sphereGeo,
    new THREE.MeshPhysicalMaterial({
      map: faceTex,
      roughnessMap: roughTex,
      roughness: 0.85,
      metalness: 0.0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    })
  );
  shell.rotation.y = -Math.PI / 2;
  body.add(shell);

  // ---- state ----
  const pointer = new THREE.Vector2(0, 0);
  let hasPointer = false;
  let cachedRect = el.getBoundingClientRect();
  function updateRect() {
    cachedRect = el.getBoundingClientRect();
  }

  let tYaw = 0;
  let tPitch = 0;
  const sYaw = new Spring(0, 34, 0.8);
  const sPitch = new Spring(0, 34, 0.8);
  const sRoll = new Spring(0, 30, 0.9);
  const sX = new Spring(0, 22, 0.9);
  const sY = new Spring(0, 22, 0.9);
  const sScale = new Spring(1, 26, 0.9);
  let yaw = 0;
  let pitch = 0;
  let roll = 0;
  let blink = 0;
  let nextBlink = 2 + Math.random() * 3;
  let near = 0;
  let eyesHover = false;
  let baseMood = 'curious';
  let clickGrump = 0;
  let blinkedOut = false;
  let prevMood = 'curious';
  let happyT = 0;
  const glance = { t: 0, dur: 0, yaw: 0, pitch: 0 };
  let nextGlance = 5 + Math.random() * 4;
  let gesture: string | null = null;
  let gT = 0;
  let nextAuto = 7;
  let visible = true;
  let alive = true;
  let eyeOpenL = 1;
  let eyeOpenR = 1;
  let eyeScale = 1;
  let lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let elapsedTime = 0;
  const ray = new THREE.Raycaster();
  let moodTimer: ReturnType<typeof setTimeout> | null = null;
  let animId: number | null = null;

  const DUR: Record<string, number> = {
    wink: 0.9,
    nod: 1.3,
    shake: 1.2,
    surprise: 1.4,
    think: 2.4,
    sleepy: 3.2,
    excited: 1.8,
    tilt: 1.6,
    turn: 2.4,
    trick: 1.5,
    yes: 1.6,
  };

  let flashing = false;
  function setMood(m: 'curious' | 'happy' | 'annoyed') {
    if (moods[m]) {
      baseMood = m;
      mood = m;
    }
  }

  function flash(m: 'curious' | 'happy' | 'annoyed', ms: number) {
    setMood(m);
    flashing = true;
    if (moodTimer) clearTimeout(moodTimer);
    moodTimer = setTimeout(() => {
      flashing = false;
      if (baseMood === m) setMood('curious');
    }, ms);
  }

  function startGesture(n: string) {
    if (!gesture && DUR[n]) {
      gesture = n;
      gT = 0;
      if (n === 'excited') flash('happy', 2500);
    }
  }

  function yes() {
    flash('happy', 3000);
    gesture = null;
    startGesture('yes');
  }

  function trick() {
    gesture = null;
    startGesture('trick');
  }

  function no() {
    gesture = null;
    startGesture('shake');
  }

  function grumpy() {
    clickGrump = 1.2;
  }

  function betweenEyes(e: PointerEvent | MouseEvent) {
    const cx = cachedRect.left + cachedRect.width / 2;
    const cy = cachedRect.top + cachedRect.height / 2;
    if (
      Math.abs(e.clientX - cx) > cachedRect.width * 0.22 ||
      Math.abs(e.clientY - cy) > cachedRect.height * 0.2
    ) {
      return false;
    }

    const p = new THREE.Vector2(
      ((e.clientX - cachedRect.left) / cachedRect.width) * 2 - 1,
      -((e.clientY - cachedRect.top) / cachedRect.height) * 2 + 1
    );
    ray.setFromCamera(p, camera);
    const hit = ray.intersectObject(shell)[0];
    if (!hit || !hit.uv) return false;
    const du = hit.uv.x - 0.5;
    const dv = hit.uv.y - (1 - CY / H);
    const ex = (cur.visor * VW * 0.26) / W;
    return Math.abs(du) < ex * 0.55 && Math.abs(dv) < (VH * cur.visor * 0.22) / H;
  }

  let hoverT = 0;
  function onMove(x: number, y: number) {
    const cx = cachedRect.left + cachedRect.width / 2;
    const cy = cachedRect.top + cachedRect.height / 2;
    pointer.set(
      Math.max(-1, Math.min(1, (x - cx) / (window.innerWidth * 0.55))),
      Math.max(-1, Math.min(1, -(y - cy) / (window.innerHeight * 0.5)))
    );
    hasPointer = true;
    const dist = Math.hypot(x - cx, y - cy) / (Math.max(cachedRect.width, cachedRect.height) * 0.9);
    near = Math.max(0, 1 - dist);
  }

  function move(e: PointerEvent) {
    onMove(e.clientX, e.clientY);
    if (e.target !== canvas) {
      hoverT = 0;
      eyesHover = false;
    }
  }

  function leave() {
    hasPointer = false;
  }

  function down(e: PointerEvent) {
    if (betweenEyes(e)) grumpy();
  }

  function over(e: PointerEvent) {
    const b = betweenEyes(e);
    if (b) {
      hoverT += 1;
      if (hoverT > 2) eyesHover = true;
    } else {
      hoverT = 0;
      eyesHover = false;
    }
  }

  function out() {
    hoverT = 0;
    eyesHover = false;
  }

  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', over, { passive: true });
  canvas.addEventListener('pointerleave', out);

  function resize() {
    updateRect();
    const w = Math.max(1, cachedRect.width);
    const h = Math.max(1, cachedRect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.position.z = w / h < 1 ? 7.6 * Math.max(1, 1 / (w / h)) * 0.9 : 7.6;
  }

  const ro = typeof window !== 'undefined' && window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(el);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', updateRect, { passive: true });
  resize();

  const io =
    typeof window !== 'undefined' && window.IntersectionObserver
      ? new IntersectionObserver((en) => {
          visible = en[0].isIntersecting;
        })
      : null;
  if (io) io.observe(el);

  const fwd = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  let contact = 0;
  const AUTO = ['happy', 'happy', 'turn', 'wink', 'tilt', 'nod'];

  function frame() {
    if (!alive) return;
    animId = requestAnimationFrame(frame);
    if (!visible) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsedTime += dt;
    const t = elapsedTime;

    const idle = reduce ? 0 : 1;
    const k = 1 - Math.pow(0.0015, dt);

    clickGrump = Math.max(0, clickGrump - dt);
    mood = eyesHover || clickGrump > 0 ? 'annoyed' : baseMood;
    const m = moods[mood] || moods.curious;
    const viaHue = mood === 'annoyed' || prevMood === 'annoyed';
    const crate = prevMood === 'happy' && mood !== 'happy' ? k * 1.6 : k * 0.7;

    for (let j = 0; j < 3; j++) {
      cur.c[j] = viaHue
        ? mixHue(cur.c[j], m.c[j], crate)
        : [
            lerp(cur.c[j][0], m.c[j][0], crate),
            lerp(cur.c[j][1], m.c[j][1], crate),
            lerp(cur.c[j][2], m.c[j][2], crate),
          ];
    }

    if (mood !== prevMood) {
      if (mood === 'happy' && blink <= 0 && !gesture) blink = 0.18;
      happyT = 0;
    }
    happyT += dt;

    const ek = blink > 0 ? k * 3 : k * 0.5;
    cur.eyeW = lerp(cur.eyeW, m.eyeW, ek);
    cur.eyeH = lerp(cur.eyeH, m.eyeH, ek);
    cur.eyeY = lerp(cur.eyeY, m.eyeY, ek);
    const wasAngry = cur.anger > 0.5;
    cur.anger = lerp(cur.anger, m.anger, k * 0.8);
    if (wasAngry && m.anger === 0 && blink <= 0 && !blinkedOut) {
      blink = 0.2;
      blinkedOut = true;
    }
    if (m.anger === 1) blinkedOut = false;
    cur.visor = lerp(cur.visor, m.visor, k * 0.8);

    if (!reduce && opts.autoplay !== false) {
      nextAuto -= dt;
      if (nextAuto <= 0 && !gesture) {
        nextAuto = 9 + Math.random() * 7;
        const pick = AUTO[Math.floor(Math.random() * AUTO.length)];
        if (pick === 'happy') {
          if (!flashing) flash('happy', 4500);
        } else {
          startGesture(pick);
        }
      }
    }

    if (hasPointer) {
      tYaw = pointer.x * 0.55;
      tPitch = -pointer.y * 0.3;
    } else {
      tYaw = Math.sin(t * 0.35) * 0.4;
      tPitch = Math.cos(t * 0.5) * 0.12;
    }

    nextGlance -= dt;
    if (nextGlance <= 0 && glance.t <= 0 && !gesture) {
      glance.t = glance.dur = 0.8 + Math.random() * 0.6;
      glance.yaw = (Math.random() - 0.5) * 1.4;
      glance.pitch = (Math.random() - 0.5) * 0.5;
      nextGlance = 6 + Math.random() * 6;
    }
    if (glance.t > 0) {
      glance.t -= dt;
      const gg = bump(glance.t / glance.dur);
      tYaw += glance.yaw * gg;
      tPitch += glance.pitch * gg;
    }
    if (mood === 'annoyed') {
      tYaw *= 0.3;
      tPitch = tPitch * 0.3 + 0.08;
    }
    if (mood === 'happy' && happyT < 2.2) {
      const hf = 1 - Math.min(1, happyT / 2.2);
      tYaw *= 1 - 0.85 * hf;
      tPitch *= 1 - 0.85 * hf;
    }

    // gesture overrides
    let gYaw = 0;
    let gPitch = 0;
    let gRoll = 0;
    let gY = 0;
    let extraYaw = 0;
    let squash = 1;
    let oL = 1;
    let oR = 1;
    let eS = 1;

    if (gesture) {
      gT += dt;
      const p = Math.min(1, gT / DUR[gesture]);
      switch (gesture) {
        case 'wink':
          oR = 1 - bump(Math.min(1, p * 1.25)) * 0.98;
          gRoll = -bump(p) * 0.14;
          gPitch = bump(p) * 0.05;
          break;
        case 'nod':
          gPitch = Math.sin(p * Math.PI * 4) * 0.18 * bump(p * 0.9 + 0.05);
          break;
        case 'yes':
          if (gT > 0.5 && gT < 1.4) {
            const q = (gT - 0.5) / 0.9;
            gY = -Math.abs(Math.sin(q * Math.PI * 3)) * 0.2 * bump(q * 0.8 + 0.1);
            gPitch = Math.sin(q * Math.PI * 6) * 0.05;
          }
          if (gT > 0.72 && gT < 0.76 && blink <= 0) blink = 0.16;
          break;
        case 'shake':
          gYaw = Math.sin(p * Math.PI * 5) * 0.22 * bump(p * 0.9 + 0.05);
          break;
        case 'surprise':
          eS = 1 + bump(Math.min(1, p * 1.6)) * 0.28;
          gY = bump(Math.min(1, p * 2.5)) * 0.25;
          gPitch = -bump(p) * 0.1;
          break;
        case 'think':
          gYaw = -bump(p) * 0.5;
          gPitch = -bump(p) * 0.35;
          gRoll = bump(p) * 0.12;
          oL = oR = 1 - bump(p) * 0.35;
          break;
        case 'sleepy': {
          const d = bump(Math.min(1, p * 1.1));
          oL = oR = 1 - d * 0.72;
          gPitch = d * 0.22;
          gRoll = Math.sin(t * 2) * 0.03;
          if (p > 0.85) {
            const w = (p - 0.85) / 0.15;
            gYaw = Math.sin(w * Math.PI * 3) * 0.12;
            oL = oR = 1;
          }
          break;
        }
        case 'excited':
          gY = Math.abs(Math.sin(p * Math.PI * 3)) * 0.32;
          squash = 1 + Math.sin(p * Math.PI * 6) * 0.05;
          gRoll = Math.sin(p * Math.PI * 3) * 0.08;
          break;
        case 'tilt':
          gRoll = Math.sin(p * Math.PI) * 0.38;
          gYaw = Math.sin(p * Math.PI) * 0.1;
          break;
        case 'turn':
          extraYaw = Math.PI * 2 * easeInOut(p);
          break;
        case 'trick':
          if (gT < 0.45) extraYaw = Math.PI * 2 * easeInOut(gT / 0.45);
          else if (gT < 0.65) extraYaw = 0;
          else extraYaw = -Math.PI * 2 * easeInOut(Math.min(1, (gT - 0.65) / 0.8));
          break;
      }
      if (p >= 1) gesture = null;
    }

    const ny = (Math.sin(t * 0.9) * 0.5 + Math.sin(t * 1.7) * 0.3) * 0.06 * idle;
    const np = Math.sin(t * 1.1 + 1) * 0.02 * idle;
    sYaw.target = tYaw + ny + gYaw;
    sPitch.target = tPitch + np + gPitch;
    yaw = sYaw.step(dt);
    pitch = sPitch.step(dt);
    sRoll.target = -yaw * 0.16 + Math.sin(t * 0.6) * 0.03 * idle + gRoll;
    roll = sRoll.step(dt);

    sX.target = (hasPointer ? pointer.x : Math.sin(t * 0.35)) * 0.28;
    sY.target =
      (hasPointer ? pointer.y : 0) * 0.14 +
      (mood === 'annoyed' ? -0.08 : 0) +
      (mood === 'happy' ? 0.04 : 0);

    sScale.target = (mood === 'happy' ? 1.1 : mood === 'annoyed' ? 0.9 : 1) * (1 + near * 0.06);
    const sc = sScale.step(dt);
    head.rotation.set(pitch, yaw, roll);
    body.rotation.y = extraYaw;
    head.position.set(sX.step(dt), sY.step(dt), 0);
    body.position.y = Math.sin(t * 1.3) * 0.05 * idle + gY;
    body.scale.set(sc / Math.sqrt(squash), sc * squash, sc / Math.sqrt(squash));

    const lift = Math.max(0, (body.position.y + head.position.y + 0.05) * 0.9 + 0.05);
    const ss = sc * (1 - lift * 0.35);
    shadow.position.x = head.position.x * 0.9 + 0.1;
    shadow.scale.set(ss * 1.0, ss * 0.26, 1);
    (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.3, 1 - lift * 0.9);

    nextBlink -= dt;
    if (nextBlink <= 0 && gesture !== 'wink' && gesture !== 'sleepy') {
      blink = 0.16;
      nextBlink = 2.5 + Math.random() * 3.5;
    }
    let b = 1;
    if (blink > 0) {
      blink -= dt;
      b = 1 - Math.sin((blink / 0.16) * Math.PI) * 0.95;
    }
    eyeOpenL = lerp(eyeOpenL, Math.min(oL, b), k * 2.0);
    eyeOpenR = lerp(eyeOpenR, Math.min(oR, b), k * 2.0);
    eyeScale = lerp(eyeScale, eS, k * 1.2);

    drawFace({
      ex: (tYaw - yaw) * 0.6 + yaw * 0.12,
      ey: (tPitch - pitch) * 0.9,
      openL: eyeOpenL,
      openR: eyeOpenR,
      scale: eyeScale,
    });

    fwd.copy(Z).applyEuler(new THREE.Euler(0, body.rotation.y, 0)).applyEuler(head.rotation);
    contact = Math.max(0, Math.min(1, (fwd.z - 0.45) / 0.55));
    prevMood = mood;
    if (opts.onUpdate) opts.onUpdate({ mood: mood, gesture: gesture, eyeContact: contact });
    renderer.render(scene, camera);
  }

  renderBaseFace();
  drawFace({ ex: 0, ey: 0, openL: 1, openR: 1, scale: 1 });
  frame();

  return {
    setMood: setMood as (m: 'curious' | 'happy' | 'annoyed') => void,
    gesture: startGesture as (n: any) => void,
    yes: yes,
    no: no,
    grumpy: grumpy,
    trick: trick,
    gestures: Object.keys(DUR),
    get mood() {
      return mood;
    },
    get baseMood() {
      return baseMood;
    },
    get eyeContact() {
      return contact;
    },
    destroy: () => {
      alive = false;
      if (animId) cancelAnimationFrame(animId);
      if (moodTimer) clearTimeout(moodTimer);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', over);
      canvas.removeEventListener('pointerleave', out);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateRect);
      renderer.dispose();
      canvas.remove();
    },
  };
}

export const VoxRobot: React.FC<{
  brand?: string;
  brand2?: string;
  className?: string;
}> = ({ brand = '#c84dff', brand2 = '#4bb86f', className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const bot = mountVoxRobot(containerRef.current, {
      brand,
      brand2,
    });

    window.__voxRobot = bot;

    const attachInteractiveListeners = () => {
      const ctaHero = document.getElementById('cta');
      const ctaHeader = document.getElementById('cta-header');
      const sampleBtn = document.getElementById('sample');
      const navAbout = document.getElementById('nav-about');

      const onCtaEnter = () => {
        bot.setMood('happy');
        bot.gesture('yes');
      };
      const onCtaLeave = () => {
        bot.setMood('curious');
      };
      const onSampleEnter = () => {
        bot.gesture('wink');
      };
      const onAboutEnter = () => {
        bot.trick();
      };

      ctaHero?.addEventListener('mouseenter', onCtaEnter);
      ctaHero?.addEventListener('mouseleave', onCtaLeave);
      ctaHeader?.addEventListener('mouseenter', onCtaEnter);
      ctaHeader?.addEventListener('mouseleave', onCtaLeave);
      sampleBtn?.addEventListener('mouseenter', onSampleEnter);
      navAbout?.addEventListener('mouseenter', onAboutEnter);

      return () => {
        ctaHero?.removeEventListener('mouseenter', onCtaEnter);
        ctaHero?.removeEventListener('mouseleave', onCtaLeave);
        ctaHeader?.removeEventListener('mouseenter', onCtaEnter);
        ctaHeader?.removeEventListener('mouseleave', onCtaLeave);
        sampleBtn?.removeEventListener('mouseenter', onSampleEnter);
        navAbout?.removeEventListener('mouseenter', onAboutEnter);
      };
    };

    const cleanupListeners = attachInteractiveListeners();

    const handleCustomMood = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'happy' || customEvent.detail === 'curious' || customEvent.detail === 'annoyed') {
        bot.setMood(customEvent.detail as any);
      }
    };
    const handleCustomGesture = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      bot.gesture(customEvent.detail as any);
    };

    window.addEventListener('voxrobot:mood', handleCustomMood);
    window.addEventListener('voxrobot:gesture', handleCustomGesture);

    return () => {
      cleanupListeners();
      window.removeEventListener('voxrobot:mood', handleCustomMood);
      window.removeEventListener('voxrobot:gesture', handleCustomGesture);
      bot.destroy();
      window.__voxRobot = null;
    };
  }, [brand, brand2]);

  return (
    <div
      id="vox-robot"
      ref={containerRef}
      className={`absolute inset-0 select-none will-change-transform ${className}`}
    />
  );
};
