/* cyh · Personal Atlas VI — II 造物引擎 (AI workflow), IV 凝固空间 (cases), V 未知信标 (plans). */
(() => {
  'use strict';
  const K = window.CYH3D; if (!K || !K.makeSystem) return;
  const D = window.CYH, C = D.C;
  const { THREE, sr, srand, glow, sprite, RING, circle, lineMat, card, requestCard, textSprite, addNode, updaters, makeSystem, G } = K;

  /* ================= II · 造物引擎 (s3) ================= */
  {
    const sys = makeSystem('s3', 650, 5.55, -0.11, 0.0045);
    const body = new THREE.Group(); body.rotation.set(0.45, 0, -0.2); sys.anchor.add(body);
    const core = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(30, 1)), lineMat(0x6fd6d0, 0.85));
    const inner = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(18, 0)), lineMat(0xbff6f2, 0.7));
    const fresnel = new THREE.Mesh(new THREE.SphereGeometry(24, 32, 24), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x6fd6d0) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 uColor;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-max(dot(vN,vV),0.0),2.5);gl_FragColor=vec4(uColor*f,f);}',
    }));
    body.add(core, inner, fresnel, glow(0x6fd6d0, 120, 0.35), glow(0xdffcff, 26, 0.8));
    updaters.push(dt => { core.rotation.y += dt * 0.12; core.rotation.x += dt * 0.05; inner.rotation.y -= dt * 0.3; });

    const R = 74, station = new THREE.Group(); body.add(station);
    station.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.9, 6, 200), new THREE.MeshBasicMaterial({ color: 0x6fd6d0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
    station.children[0].rotation.x = Math.PI / 2;
    const outer = new THREE.Line(circle(100, 240), new THREE.LineDashedMaterial({ color: 0x6fd6d0, dashSize: 3, gapSize: 5, transparent: true, opacity: 0.4, depthWrite: false }));
    outer.computeLineDistances(); body.add(outer);
    updaters.push(dt => { station.rotation.y += dt * 0.04; outer.rotation.y -= dt * 0.06; });

    const cats = (D.cats || []).filter(([v]) => v !== '全部');
    const groups = cats.map(([v, l]) => ({ v, l, items: D.projects.map((p, i) => ({ p, i })).filter(o => o.p.cat === v) })).filter(g => g.items.length);
    const gap = 0.22, span = Math.PI * 2 - gap * groups.length, total = D.projects.length || 1, spokes = [];
    let a0 = 0;
    groups.forEach(g => {
      const arc = (span * g.items.length) / total, pts = [];
      for (let k = 0; k <= 40; k++) { const a = a0 + (arc * k) / 40; pts.push(new THREE.Vector3(Math.cos(a) * (R + 9), 0, Math.sin(a) * (R + 9))); }
      station.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0xbff6f2, 0.55)));
      const mid = a0 + arc / 2, label = textSprite(`${g.l} · ${g.items.length}`, '#9fe8e3', 7, 0.7);
      label.position.set(Math.cos(mid) * (R + 22), 3, Math.sin(mid) * (R + 22)); station.add(label);
      g.items.forEach(({ p, i }, k) => {
        const a = a0 + (arc * (k + 0.5)) / g.items.length, holder = new THREE.Group();
        holder.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); station.add(holder);
        const size = p.top ? 5.5 : 3.8;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(size), new THREE.MeshBasicMaterial({ color: p.top ? 0xdffcff : 0x6fd6d0, wireframe: true }));
        holder.add(gem, glow(0x6fd6d0, p.top ? 34 : 20, p.top ? 0.75 : 0.45));
        updaters.push(dt => { gem.rotation.y += dt * 0.8; });
        spokes.push(0, 0, 0, holder.position.x, 0, holder.position.z);
        addNode({ key: 'gh', index: i, galaxy: 's3', obj: holder, r: size + 3, hue: C.teal, title: p.name.split('/')[1] || p.name, sub: p.top ? '★ 推荐先试' : g.l, text: `${p.name} ${p.note} ${p.cat}` });
      });
      a0 += arc + gap;
    });
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(spokes, 3));
    station.add(new THREE.LineSegments(sg, lineMat(0x6fd6d0, 0.12)));
    addNode({ key: 's3', galaxy: 's3', obj: sys.anchor, r: 60, main: true, hue: C.teal, title: G.s3.title, sub: G.s3.sub, kicker: G.s3.kicker });
  }

  /* ================= IV · 凝固空间 (s4) ================= */
  {
    const sys = makeSystem('s4', 820, 1.05, 0.14, 0.0032);
    const body = new THREE.Group(); body.rotation.z = 0.3; sys.anchor.add(body);
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#4a2220'); grd.addColorStop(0.5, '#c46a56'); grd.addColorStop(1, '#3e1d1c');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${200 + srand() * 55 | 0},${110 + srand() * 60 | 0},${90 + srand() * 40 | 0},${0.05 + srand() * 0.12})`; g.fillRect(0, srand() * 256, 512, 2 + srand() * 14); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,220,200,${srand() * 0.08})`; g.beginPath(); g.arc(srand() * 512, srand() * 256, srand() * 6, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,215,190,.10)'; g.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    const tex = new THREE.CanvasTexture(c);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(38, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05, emissive: 0x2a0c08, emissiveIntensity: 0.5 }));
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(42.5, 48, 32), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xff9a80) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 uColor;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-max(dot(vN,vV),0.0),3.0);gl_FragColor=vec4(uColor*f*1.2,f);}',
    }));
    body.add(planet, atmo, glow(0xe08a78, 170, 0.2));
    updaters.push(dt => { planet.rotation.y += dt * 0.05; });
    // the city belt: every block is a built house
    const count = 220, belt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xf0c4b6, roughness: 0.5, emissive: 0x3a1410, emissiveIntensity: 0.6 }), count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + sr(-0.01, 0.01), r = sr(54, 64), h = 1 + Math.pow(srand(), 3) * 9;
      p.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); q.setFromAxisAngle(up, -a); s.set(sr(1.4, 3), h, sr(1.4, 3));
      m.compose(p, q, s); belt.setMatrixAt(i, m);
    }
    const beltGroup = new THREE.Group(); beltGroup.rotation.x = 0.18; beltGroup.add(belt); body.add(beltGroup);
    updaters.push(dt => { beltGroup.rotation.y += dt * 0.03; });

    const caseOrbit = new THREE.Group(); body.add(caseOrbit); caseOrbit.add(new THREE.Line(circle(86, 240), lineMat(0xe08a78, 0.3)));
    updaters.push(dt => { caseOrbit.rotation.y += dt * 0.02; });
    D.cases.forEach((item, i) => {
      const a = (i / D.cases.length) * Math.PI * 2 + 0.6, holder = new THREE.Group(); holder.position.set(Math.cos(a) * 86, 8, Math.sin(a) * 86); caseOrbit.add(holder);
      const src = item.images?.[0]?.thumb || item.cover;
      const cc = card(src, '#e08a78', 20); holder.add(cc, glow(0xe08a78, 50, 0.3)); requestCard(cc);
      addNode({ key: item.id, galaxy: 's4', obj: holder, r: 12, hue: C.coral, title: item.title, sub: [item.location, item.year].filter(Boolean).join(' · '), text: JSON.stringify(item) });
    });
    addNode({ key: 's4', galaxy: 's4', obj: sys.anchor, r: 44, main: true, hue: C.coral, title: G.s4.title, sub: G.s4.sub, kicker: G.s4.kicker });
  }

  /* ================= V · 未知信标 (s5) ================= */
  {
    const sys = makeSystem('s5', 1020, 4.35, -0.05, 0.0022);
    const body = new THREE.Group(); sys.anchor.add(body);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(22, 18, 12), new THREE.MeshBasicMaterial({ color: 0xa6b0d2, wireframe: true, transparent: true, opacity: 0.42 }));
    const sonar = sprite(RING, 0xb8c3e8, 44, 0.65);
    body.add(shell, sonar, glow(0x9aa6cc, 110, 0.42), glow(0xe6ecff, 22, 0.7));
    updaters.push((dt, t) => { shell.rotation.y += dt * 0.1; const k = (t * 0.25) % 1; sonar.scale.set(40 + k * 160, 40 + k * 160, 1); sonar.material.opacity = 0.5 * (1 - k); });
    const dash = [];
    D.plans.forEach(([title], i) => {
      const a = (i / D.plans.length) * Math.PI * 2, holder = new THREE.Group(); holder.position.set(Math.cos(a) * 66, sr(-14, 14), Math.sin(a) * 66); body.add(holder);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(4.5), new THREE.MeshBasicMaterial({ color: 0xc4cae0, wireframe: true }));
      const ping = sprite(RING, 0xc4cae0, 12, 0.6); holder.add(gem, ping, glow(0x8a90a6, 22, 0.5));
      const off = i * 0.37; updaters.push((dt, t) => { gem.rotation.y += dt * 0.5; const k = (t * 0.4 + off) % 1; ping.scale.set(10 + k * 22, 10 + k * 22, 1); ping.material.opacity = 0.6 * (1 - k); });
      dash.push(new THREE.Vector3(), holder.position.clone());
      addNode({ key: 'plan', index: i, galaxy: 's5', obj: holder, r: 7, hue: C.grey, title, sub: `P.0${i + 1} · 未探测`, text: D.plans[i].join(' ') });
    });
    const dl = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dash), new THREE.LineDashedMaterial({ color: 0x8a90a6, dashSize: 2, gapSize: 3, transparent: true, opacity: 0.45, depthWrite: false }));
    dl.computeLineDistances(); body.add(dl);
    addNode({ key: 's5', galaxy: 's5', obj: sys.anchor, r: 30, main: true, hue: C.grey, title: G.s5.title, sub: G.s5.sub, kicker: G.s5.kicker });
  }
})();
