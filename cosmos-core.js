/* cyh · Personal Atlas VI — renderer core, shared helpers, deep-space background. */
(() => {
  'use strict';
  const canvas = document.querySelector('#universe-canvas');
  let renderer = null;
  try { if (window.THREE) renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { window.CYH3D = null; return; }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a16, 0.00016);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 1, 40000);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x03050c, 1);
  const U = { time: { value: 0 }, pr: { value: renderer.getPixelRatio() } };

  // seeded random → stable layout every visit
  let seed = 20261122;
  const srand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const sr = (a, b) => a + srand() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (!u) u = srand(); while (!v) v = srand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const NOISE = `
float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
return mix(mix(mix(hash(i),hash(i+vec3(1.0,0.0,0.0)),f.x),mix(hash(i+vec3(0.0,1.0,0.0)),hash(i+vec3(1.0,1.0,0.0)),f.x),f.y),
mix(mix(hash(i+vec3(0.0,0.0,1.0)),hash(i+vec3(1.0,0.0,1.0)),f.x),mix(hash(i+vec3(0.0,1.0,1.0)),hash(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=0.5;}return v;}
`;

  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  };
  const GLOW = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const RING = canvasTex(128, 128, (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 0.4; g.lineWidth = 1.5; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.stroke();
  });
  const FLARE = canvasTex(512, 32, (g) => {
    const gr = g.createLinearGradient(0, 0, 512, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; const v = g.createLinearGradient(0, 0, 0, 32);
    g.fillRect(0, 14, 512, 4); g.globalAlpha = 0.25; g.fillRect(0, 8, 512, 16); void v;
  });

  const sprite = (map, color, size, opacity = 1, additive = true) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.scale.set(size, size, 1); return s;
  };
  const glow = (color, size, opacity = 1) => sprite(GLOW, color, size, opacity);
  const circle = (r, seg = 256) => {
    const pts = []; for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    return new THREE.BufferGeometry().setFromPoints(pts);
  };
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const textSprite = (text, color = '#8f9bc8', h = 10, opacity = 0.55) => {
    const fs = 44, font = `${fs}px Consolas, "Cascadia Code", "Microsoft YaHei", monospace`;
    const probe = document.createElement('canvas').getContext('2d'); probe.font = font;
    const w = Math.ceil(probe.measureText(text).width) + 16, hh = fs + 16;
    const t = canvasTex(w, hh, (g) => { g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 8, hh / 2); });
    const s = sprite(t, 0xffffff, h, opacity, false); s.scale.set((h * w) / hh, h, 1); return s;
  };

  /* image cards (pins, case covers): lazy-loaded, framed in the galaxy colour */
  const cards = [];
  function card(src, hue, height) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false }));
    s.scale.set(height, height, 1);
    s.userData = { src, hue, height, loading: false, loaded: false, fade: 0 };
    cards.push(s); return s;
  }
  function requestCard(s) {
    const d = s.userData; if (d.loading || !d.src) return; d.loading = true;
    const makeFallback = () => {
      const t = canvasTex(96, 120, (g, cw, ch) => {
        const gr = g.createLinearGradient(0, 0, cw, ch);
        gr.addColorStop(0, 'rgba(20,28,56,.92)'); gr.addColorStop(1, 'rgba(9,13,28,.96)');
        g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
        g.strokeStyle = d.hue; g.globalAlpha = 0.85; g.lineWidth = 3; g.strokeRect(2, 2, cw - 4, ch - 4);
        g.globalAlpha = 0.25; g.fillStyle = d.hue; g.beginPath(); g.arc(cw / 2, ch / 2, 18, 0, Math.PI * 2); g.fill();
      });
      s.material.map = t; s.material.needsUpdate = true;
      s.scale.set(d.height * 0.8, d.height, 1); d.loaded = true;
    };
    if (location.protocol === 'file:') { makeFallback(); return; }
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 300 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const t = canvasTex(w + 8, h + 8, (g, cw, ch) => {
        g.fillStyle = 'rgba(8,12,26,.92)'; g.fillRect(0, 0, cw, ch); g.drawImage(img, 4, 4, w, h);
        g.strokeStyle = d.hue; g.globalAlpha = 0.9; g.lineWidth = 2; g.strokeRect(1, 1, cw - 2, ch - 2);
      });
      s.material.map = t; s.material.needsUpdate = true;
      s.scale.set((d.height * (w + 8)) / (h + 8), d.height, 1); d.loaded = true;
    };
    img.onerror = makeFallback;
    img.src = d.src;
  }

  /* ---------- deep space: nebula sky, star layers, distant galaxies, survey grid ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(16000, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uTime: U.time }, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uTime;varying vec3 vDir;${NOISE}
void main(){vec3 d=normalize(vDir);float t=uTime*0.006;vec3 q=d*2.3+vec3(t,0.0,-t);
float n=fbm(q+fbm(q*1.6+t)*1.25);
float band=exp(-pow(d.y*2.4+0.35*sin(d.x*3.0+d.z*1.7),2.0));
vec3 col=vec3(0.010,0.014,0.036);
col=mix(col,vec3(0.075,0.065,0.20),smoothstep(0.35,0.85,n)*0.9);
col=mix(col,vec3(0.24,0.10,0.32),smoothstep(0.55,0.95,n)*band*0.85);
col+=vec3(0.50,0.28,0.15)*pow(smoothstep(0.58,1.0,fbm(q*3.1-t)),2.0)*band*0.6;
col+=vec3(0.03,0.17,0.21)*smoothstep(0.5,0.9,fbm(q*1.3+5.0))*(1.0-band)*0.45;
float dust=smoothstep(0.45,0.72,fbm(q*4.2+2.0));col*=mix(1.0,0.5,dust*band);
col+=vec3(0.6,0.55,0.85)*band*0.03;gl_FragColor=vec4(col,1.0);}`,
  }));
  scene.add(sky);

  const farGroup = new THREE.Group(); scene.add(farGroup); // follows the camera: infinitely far
  function starField(count, rMin, rMax, sMin, sMax, atten, flat = 1) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count);
    const pal = [[1, 1, 1], [0.72, 0.82, 1], [1, 0.84, 0.62], [0.86, 0.78, 1], [0.62, 0.92, 1]];
    for (let i = 0; i < count; i++) {
      let x = gauss(), y = gauss(), z = gauss(); const l = Math.hypot(x, y, z) || 1, r = sr(rMin, rMax);
      pos.set([(x / l) * r, (y / l) * r * flat, (z / l) * r], i * 3);
      const c = pal[Math.floor(srand() * pal.length)], b = sr(0.5, 1); col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      size[i] = sMin + Math.pow(srand(), 3) * (sMax - sMin); phase[i] = srand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uPR: U.pr, uAtten: { value: atten ? 1 : 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `attribute vec3 aColor;attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uPR;uniform float uAtten;varying vec3 vColor;varying float vTw;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;vTw=0.62+0.38*sin(uTime*(0.5+aPhase*1.8)+aPhase*40.0);vColor=aColor;
gl_PointSize=aSize*uPR*(uAtten>0.5?clamp(900.0/-mv.z,0.35,4.0):1.0);}`,
      fragmentShader: `varying vec3 vColor;varying float vTw;void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);float a=pow(smoothstep(0.5,0.0,d),2.0);
float x=max(0.0,1.0-abs(c.x)*14.0)*max(0.0,1.0-abs(c.y)*2.2)+max(0.0,1.0-abs(c.y)*14.0)*max(0.0,1.0-abs(c.x)*2.2);
float k=(a+x*0.3)*vTw;gl_FragColor=vec4(vColor*k,k);}`,
    }));
  }
  const phoneish = innerWidth < 760;
  farGroup.add(starField(phoneish ? 3500 : 7000, 9000, 13000, 1.2, 3.6, false));
  const midStars = starField(phoneish ? 1200 : 2600, 1800, 6000, 1.5, 6, true); scene.add(midStars);
  const dust = starField(phoneish ? 1200 : 2400, 200, 1700, 1, 3.2, true, 0.04); scene.add(dust);

  const spiralTex = (a, b) => canvasTex(256, 256, (g) => {
    g.translate(128, 128);
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 42); core.addColorStop(0, 'rgba(255,238,215,.95)'); core.addColorStop(1, 'rgba(255,238,215,0)');
    g.fillStyle = core; g.fillRect(-128, -128, 256, 256);
    for (let i = 0; i < 1600; i++) {
      const t = srand(), ang = (i % 2) * Math.PI + t * 5.6 + (srand() - 0.5) * 0.7, r = 8 + t * 112;
      g.fillStyle = srand() < 0.5 ? a : b; g.globalAlpha = (1 - t) * 0.5 * srand();
      g.beginPath(); g.arc(Math.cos(ang) * r, Math.sin(ang) * r, srand() * 2.2 + 0.4, 0, 7); g.fill();
    }
  });
  [[-0.55, 0.32, -0.8, '#b9a8ff', '#ffd2a8', 1900, 0.42, 0.6], [0.7, -0.18, 0.66, '#8fe6ff', '#ffffff', 1300, 0.55, 2.1], [0.1, 0.62, 0.78, '#ffb7a8', '#d9c8ff', 900, 0.32, 1.1]]
    .forEach(([x, y, z, c1, c2, size, squash, rot]) => {
      const s = sprite(spiralTex(c1, c2), 0xffffff, size, 0.5);
      s.material.rotation = rot; s.scale.set(size, size * squash, 1);
      s.position.set(x, y, z).normalize().multiplyScalar(11000); farGroup.add(s);
    });

  // survey grid on the ecliptic: an architect's viewport laid over the sky
  const grid = new THREE.Group(); scene.add(grid);
  for (let r = 250; r <= 1500; r += 250) grid.add(new THREE.Line(circle(r, 320), lineMat(0x8fa0d8, r % 500 ? 0.045 : 0.08)));
  const radial = [], ticks = [];
  for (let d = 0; d < 360; d += 15) { const a = (d * Math.PI) / 180; radial.push(Math.cos(a) * 140, 0, Math.sin(a) * 140, Math.cos(a) * 1500, 0, Math.sin(a) * 1500); }
  for (let d = 0; d < 360; d += 2) { const a = (d * Math.PI) / 180, l = d % 10 ? 10 : 26; ticks.push(Math.cos(a) * 1560, 0, Math.sin(a) * 1560, Math.cos(a) * (1560 + l), 0, Math.sin(a) * (1560 + l)); }
  const seg = (arr, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return new THREE.LineSegments(g, lineMat(0x8fa0d8, op)); };
  grid.add(seg(radial, 0.035), seg(ticks, 0.16), new THREE.Line(circle(1560, 360), lineMat(0x8fa0d8, 0.12)));
  [0, 90, 180, 270].forEach(d => { const a = (d * Math.PI) / 180, s = textSprite(`${String(d).padStart(3, '0')}°`, '#8f9bc8', 18, 0.5); s.position.set(Math.cos(a) * 1640, 0, Math.sin(a) * 1640); grid.add(s); });
  [500, 1000, 1500].forEach(r => { const s = textSprite(`R ${r}`, '#8f9bc8', 13, 0.35); s.position.set(r + 30, 0, 18); grid.add(s); });

  scene.add(new THREE.AmbientLight(0x3a4470, 0.55));

  window.CYH3D = {
    THREE, renderer, scene, camera, U, NOISE, srand, sr, gauss, GLOW, RING, FLARE,
    sprite, glow, circle, lineMat, textSprite, card, requestCard, cards, starField,
    sky, farGroup, dust, grid,
  };
})();
