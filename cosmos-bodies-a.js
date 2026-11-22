/* cyh · Personal Atlas VI — node registry, orbital systems, III 创作恒星 (reviews) + I 灵感星云 (inspiration). */
(() => {
  'use strict';
  const K = window.CYH3D; if (!K) return;
  const D = window.CYH, C = D.C;
  const { THREE, scene, U, NOISE, sr, srand, gauss, glow, sprite, RING, FLARE, circle, lineMat, card, requestCard } = K;

  const nodes = [], nodeIndex = new Map(), updaters = [], systems = {};
  const addNode = o => {
    const n = { index: 0, r: 6, label: true, main: false, text: '', ...o };
    n.id = `${n.key}:${Number(n.index) || 0}`; nodes.push(n); nodeIndex.set(n.id, n); return n;
  };
  const nodeFor = (k, i = 0) => nodeIndex.get(`${k}:${Number(i) || 0}`);

  const daily = D.reviewGroups.daily, weekly = D.reviewGroups.weekly, monthly = D.reviewGroups.monthly, overview = D.reviewGroups.overview;
  const hoursOf = r => { const m = String(r?.sub || r?.headline || '').match(/活跃\s*([\d.]+)\s*小时/); return m ? Number(m[1]) : 0; };
  const G = {
    s2: { hue: C.violet, kicker: 'I · INSPIRATION NEBULA', title: '灵感星云', sub: `视觉灵感 · ${D.boards.length} 画板 · ${D.totalPins} pins`, chapter: '采集星尘',
      line: `一切从收集开始。${D.boards.length} 个画板、${D.totalPins} 张图像漂浮成一团星云——展厅、光装置、机器人、潮流文化，都是还没成形的原材料。` },
    s3: { hue: C.teal, kicker: 'II · AI FOUNDRY', title: '造物引擎', sub: `AI 工作流 · ${D.projects.length} 个项目`, chapter: '铸造工具',
      line: `${D.projects.length} 个 AI 项目组成一座轨道工坊：SketchUp、Rhino、Blender、3ds Max 的 MCP 接口与 ComfyUI 出图，把灵感加工成可以落地的方案。` },
    s1: { hue: C.amber, kicker: 'III · CORE PULSE', title: '创作恒星', sub: `工作复盘 · ${daily.length} 日报 · ${weekly.length} 周报`, chapter: '每日脉搏',
      line: `每天的工作都会在恒星周围留下一颗卫星：${daily.length} 篇日报在外轨，${weekly.length} 篇周报在中轨。${D.latestReview ? `最新：${D.latestReview.sub || D.latestReview.headline}。` : ''}恒星亮度随最近一天的工作强度变化，赤道上的光柱是那一天的 24 小时。` },
    s4: { hue: C.coral, kicker: 'IV · BUILT WORLDS', title: '凝固空间', sub: `设计案例 · ${D.cases.length} 个`, chapter: '空间凝结',
      line: `灵感最终凝固为真实的空间。${D.cases.length} 个案例环绕这颗实体行星，记录亮点与可借鉴点；环带上的每一个体块，都是一座建成的房子。` },
    s5: { hue: C.grey, kicker: 'V · UNCHARTED', title: '未知信标', sub: `接下来 · ${D.plans.length} 个规划`, chapter: '远方坐标',
      line: `星系最外缘还有 ${D.plans.length} 座未点亮的信标：材料与工艺、提示词对比、项目模板……当它们被填满，就会坍缩成新的星球。` },
  };
  const ORDER = ['s2', 's3', 's1', 's4', 's5'];

  function makeSystem(key, radius, angle, incl, speed) {
    const pivot = new THREE.Group(); pivot.rotation.set(incl, 0, incl * 0.6); scene.add(pivot);
    const anchor = new THREE.Group(); pivot.add(anchor);
    pivot.add(new THREE.Line(circle(radius, 400), lineMat(G[key].hue, 0.16)));
    const s = { key, pivot, anchor, radius, angle, speed }; systems[key] = s;
    updaters.push(dt => { s.angle += s.speed * dt; anchor.position.set(Math.cos(s.angle) * radius, 0, Math.sin(s.angle) * radius); });
    anchor.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    return s;
  }

  /* ================= III · 创作恒星 (s1, the centre) ================= */
  {
    const anchor = new THREE.Group(); scene.add(anchor); systems.s1 = { key: 's1', anchor };
    const heat = Math.max(0.85, Math.min(1.3, 0.78 + hoursOf(D.latestReview) / 16));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uHeat: { value: heat } },
      vertexShader: 'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: `uniform float uTime;uniform float uHeat;varying vec3 vP;varying vec3 vN;varying vec3 vV;${NOISE}
void main(){float n=fbm(vP*0.07+vec3(0.0,uTime*0.05,0.0));float n2=fbm(vP*0.16-vec3(uTime*0.08));
vec3 col=mix(vec3(0.75,0.25,0.06),vec3(1.0,0.56,0.18),n);col=mix(col,vec3(1.0,0.88,0.55),smoothstep(0.55,0.8,n2));
float rim=pow(1.0-max(dot(vN,vV),0.0),2.0);col+=vec3(1.0,0.72,0.38)*rim;gl_FragColor=vec4(col*uHeat,1.0);}`,
    });
    const star = new THREE.Mesh(new THREE.SphereGeometry(46, 64, 48), starMat); anchor.add(star);
    const corona = [glow(0xfff1d6, 150, 0.95), glow(0xffb45a, 340, 0.5 * heat), glow(0xff7a30, 760, 0.18 * heat)];
    corona.forEach(s => anchor.add(s));
    const flare = sprite(FLARE, 0xffcf8a, 1, 0.35); flare.scale.set(1100, 26, 1); anchor.add(flare);
    anchor.add(new THREE.PointLight(0xffdcb0, 2.1, 0, 0));
    updaters.push((dt, t) => {
      star.rotation.y += dt * 0.04;
      const p = 1 + Math.sin(t * 1.3 * heat) * 0.04; corona[1].scale.set(340 * p, 340 * p, 1); corona[2].material.opacity = 0.16 * heat + Math.sin(t * 0.7) * 0.03;
    });

    const rings = new THREE.Group(); rings.rotation.set(0.34, 0, 0.1); anchor.add(rings);
    // the shape of the latest recorded day: 24 hourly light bars around the equator
    const shaped = daily.slice().reverse().find(r => Array.isArray(r.shape) && r.shape.length === 24 && r.shape.some(v => Number(v) > 0));
    if (shaped) {
      const barMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      shaped.shape.forEach((v, h) => {
        const len = 2 + (Math.min(60, Number(v)) / 60) * 22, a = (h / 24) * Math.PI * 2 - Math.PI / 2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 2.2), barMat);
        bar.position.set(Math.cos(a) * (58 + len / 2), 0, Math.sin(a) * (58 + len / 2)); bar.rotation.y = -a; rings.add(bar);
      });
    }
    const orbit = (list, r, color, speed, sizeOf, dashed = false) => {
      const g = new THREE.Group(); rings.add(g);
      const line = new THREE.Line(circle(r, 300), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 5, gapSize: 6, transparent: true, opacity: 0.35, depthWrite: false }) : lineMat(color, 0.32));
      if (dashed) line.computeLineDistances(); rings.add(line);
      updaters.push(dt => { g.rotation.y += dt * speed; });
      list.forEach((review, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, list.length), size = sizeOf(review);
        const holder = new THREE.Group(); holder.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(holder);
        holder.add(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.25 })));
        holder.add(glow(color, size * 5, 0.5));
        const latest = review === D.latestReview;
        if (latest) { const ring = sprite(RING, 0xffffff, size * 4.2, 0.8); holder.add(ring); updaters.push((dt, t) => { const k = 1 + (t % 2) * 0.6; ring.scale.set(size * 4.2 * k, size * 4.2 * k, 1); ring.material.opacity = 0.8 * (1 - (t % 2) / 2); }); }
        addNode({ key: review.id, galaxy: 's1', obj: holder, r: size + 3, hue: C.amber, title: review.label || review.date, sub: latest ? 'LATEST' : (review.moonSub || ''), text: JSON.stringify(review), review });
      });
    };
    orbit(daily, 142, 0xf2b866, 0.025, r => 2.4 + Math.min(10, hoursOf(r)) * 0.35);
    orbit(weekly, 104, 0xffe0a8, -0.018, () => 5.5);
    orbit(monthly, 78, 0xfff2d8, 0.012, () => 7, true);
    if (overview.length) {
      const og = new THREE.Group(); og.rotation.set(-0.5, 0, 0.25); anchor.add(og); og.add(new THREE.Line(circle(196, 300), lineMat(0xf2b866, 0.14)));
      overview.forEach((review, i) => {
        const a = 0.6 + i * 0.5, holder = new THREE.Group(); holder.position.set(Math.cos(a) * 196, 0, Math.sin(a) * 196); og.add(holder);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(7), new THREE.MeshBasicMaterial({ color: 0xf2b866, wireframe: true })); holder.add(gem, glow(0xf2b866, 30, 0.45));
        updaters.push(dt => { gem.rotation.y += dt * 0.6; });
        addNode({ key: review.id, galaxy: 's1', obj: holder, r: 9, hue: C.amber, title: review.label || '全局梳理', sub: '全局梳理', text: JSON.stringify(review), review });
      });
    }
    addNode({ key: 's1', galaxy: 's1', obj: anchor, r: 50, main: true, hue: C.amber, title: G.s1.title, sub: G.s1.sub, kicker: G.s1.kicker });
  }

  /* ================= I · 灵感星云 (s2) ================= */
  const s2Cards = [];
  {
    const sys = makeSystem('s2', 430, 3.6, 0.07, 0.006);
    const body = new THREE.Group(); sys.anchor.add(body); updaters.push(dt => { body.rotation.y += dt * 0.018; });
    // spiral dust cloud
    const N = innerWidth < 760 ? 1400 : 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N);
    const pal = [[0.66, 0.62, 1], [0.86, 0.55, 0.95], [0.5, 0.62, 1], [1, 0.8, 0.95]];
    for (let i = 0; i < N; i++) {
      const t = Math.pow(srand(), 0.7), arm = i % 2, a = arm * Math.PI + t * 4.2 + gauss() * 0.28, r = 8 + t * 140;
      pos.set([Math.cos(a) * r + gauss() * 6, gauss() * (14 - t * 8), Math.sin(a) * r + gauss() * 6], i * 3);
      const c = pal[i % pal.length], b = sr(0.35, 1); col.set([c[0] * b, c[1] * b, c[2] * b], i * 3); size[i] = sr(2, 7); phase[i] = srand();
    }
    const cloud = K.starField(1, 1, 2, 1, 1, true); // reuse the twinkle shader
    cloud.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cloud.geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    cloud.geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); cloud.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    body.add(cloud);
    for (let i = 0; i < 9; i++) { const g = glow([0x7a62ff, 0xb05cd8, 0x5a7cff][i % 3], sr(120, 260), 0.1); g.position.set(gauss() * 50, gauss() * 12, gauss() * 50); body.add(g); }
    body.add(glow(0xd9ccff, 60, 0.6));

    // boards = bright stars on the spiral arms; pins orbit them as image cards
    const groupsLine = {};
    D.boards.forEach((b, i) => {
      const t = i / Math.max(1, D.boards.length - 1), a = (i % 2) * Math.PI + 0.5 + t * 3.4, r = 52 + t * 82;
      const holder = new THREE.Group(); holder.position.set(Math.cos(a) * r, sr(-12, 12), Math.sin(a) * r); body.add(holder);
      holder.add(glow(0xa9a2ff, 28, 0.75), glow(0xffffff, 7, 0.95));
      (groupsLine[b.g] = groupsLine[b.g] || []).push(holder.position.clone());
      addNode({ key: 'board', index: i, galaxy: 's2', obj: holder, r: 8, hue: C.violet, title: b.n, sub: `${D.boardPins[i].length} pins`, text: b.n + ' ' + D.boardPins[i].map(p => p.title).join(' ') });
      const spin = new THREE.Group(); holder.add(spin); const sp = sr(0.08, 0.2) * (i % 2 ? 1 : -1); updaters.push(dt => { spin.rotation.y += dt * sp; });
      D.boardPins[i].slice(0, 6).forEach((pin, j) => {
        const c = card(pin.file, '#a9a2ff', 9 + (j ? 0 : 2)), aa = j * 1.05 + sr(0, 0.5), rr = 13 + j * 2.2;
        c.position.set(Math.cos(aa) * rr, sr(-5, 5), Math.sin(aa) * rr); spin.add(c); c.userData.priority = j ? 1 : 0; s2Cards.push(c);
        addNode({ key: 'image', index: pin.index, galaxy: 's2', obj: c, r: 5, label: false, hue: C.violet, title: `${b.n} · ${pin.title}` });
      });
    });
    Object.values(groupsLine).forEach(pts => { if (pts.length > 1) body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0xa9a2ff, 0.28))); });

    // featured pins = the nebula core
    const core = new THREE.Group(); body.add(core); updaters.push(dt => { core.rotation.y -= dt * 0.05; });
    D.pins.forEach((p, i) => {
      const pin = D.allPins.find(x => x.pin_id === p.id); if (!pin) return;
      const a = (i / D.pins.length) * Math.PI * 2, c = card(pin.file, '#d9ccff', 15);
      c.position.set(Math.cos(a) * 30, i % 2 ? 5 : -5, Math.sin(a) * 30); core.add(c); c.userData.priority = 0; s2Cards.push(c);
      addNode({ key: 'pin', index: i, galaxy: 's2', obj: c, r: 8, hue: C.violet, title: p.t, sub: p.s, text: `${p.t} ${p.s} ${pin.board}` });
    });
    s2Cards.filter(c => c.userData.priority === 0).forEach(requestCard);
    addNode({ key: 's2', galaxy: 's2', obj: sys.anchor, r: 70, main: true, hue: C.violet, title: G.s2.title, sub: G.s2.sub, kicker: G.s2.kicker });
  }
  let s2Loaded = false;
  const loadS2 = () => { if (s2Loaded) return; s2Loaded = true; s2Cards.forEach(requestCard); };

  Object.assign(K, { nodes, nodeFor, addNode, updaters, systems, G, ORDER, makeSystem, loadS2, hoursOf });
})();
