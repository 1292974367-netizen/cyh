/* cyh · Personal Atlas VI — camera rig, render loop, labels, picking. */
(() => {
  'use strict';
  const K = window.CYH3D, UI = window.CYHUI, D = window.CYH;
  const $ = s => document.querySelector(s);
  const site = $('#site'), atlas = $('.atlas'), labelsHost = $('#map-labels'), tip = $('#cos-tooltip');
  if (!K || !K.nodes) {
    site.classList.add('no-webgl');
    document.addEventListener('click', e => { const b = e.target.closest('[data-galaxy]'); if (b) UI.openPanel(b.dataset.galaxy); });
    return;
  }
  const { THREE, renderer, camera, U, nodes, nodeFor, updaters, G, sky, farGroup, dust, cards } = K;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const W = { w: innerWidth, h: innerHeight }; let phone = W.w < 760;
  const homeR = () => {
    const asp = Math.max(0.42, W.w / Math.max(1, W.h));
    return phone ? clamp(2750 / Math.min(0.9, asp), 3000, 5600) : clamp(2750 / Math.min(1.22, Math.max(0.62, asp)), 2450, 4400);
  };
  const homePhi = () => (phone ? 0.78 : 0.96);
  const HOME = { r: homeR(), theta: 0.55, phi: homePhi() };
  const cam = { target: new THREE.Vector3(), r: HOME.r * 2.5, theta: -1.1, phi: 0.42 };
  const goal = { target: new THREE.Vector3(), ...HOME };
  const FOCUS_R = { s1: 560, s2: 430, s3: 340, s4: 320, s5: 300 };
  const S = { follow: null, focusKey: null, selected: null, hovered: null, topic: null, lastInteract: performance.now(), introUntil: performance.now() + 3600, snappyUntil: 0, viewOff: 0, viewOffY: 0 };
  const tmp = new THREE.Vector3(), v = new THREE.Vector3();
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hitPt = new THREE.Vector3(), camDir = new THREE.Vector3();
  const selRing = K.sprite(K.RING, 0xffffff, 1, 0); K.scene.add(selRing);

  function resize() {
    W.w = innerWidth; W.h = innerHeight; phone = W.w < 760;
    camera.fov = phone ? 54 : 46;
    HOME.r = homeR(); HOME.phi = homePhi();
    if (!S.follow && !S.topic) { goal.r = HOME.r; goal.phi = HOME.phi; }
    renderer.setSize(W.w, W.h); U.pr.value = renderer.getPixelRatio();
    camera.aspect = W.w / W.h; camera.updateProjectionMatrix();
  }
  const touch = (snappy = false) => {
    const now = performance.now();
    S.lastInteract = now; S.introUntil = 0;
    if (snappy) S.snappyUntil = now + 450;
  };
  function focusGalaxy(key, open = true) {
    const n = nodeFor(key); if (!n) return;
    S.follow = n.obj; S.focusKey = key; S.selected = n; touch();
    goal.r = FOCUS_R[key] * (phone ? 1.45 : 1); goal.phi = clamp(goal.phi, 0.75, 1.2);
    if (key === 's2') K.loadS2();
    if (open) UI.openPanel(key, 0);
    $('#view-status').textContent = `正在飞往${G[key].title}`;
  }
  function focusNode(n, open = true) {
    if (!n) return;
    if (n.main) { focusGalaxy(n.key, open); return; }
    S.follow = n.obj; S.focusKey = n.galaxy; S.selected = n; touch();
    goal.r = (n.key === 'image' ? 70 : n.galaxy === 's1' ? 170 : 130) * (phone ? 1.4 : 1);
    if (n.galaxy === 's2') K.loadS2();
    if (open) { if (n.key === 'image') UI.openImage(n.index); else UI.openPanel(n.key, n.index); }
  }
  function reset() {
    S.follow = null; S.focusKey = null; S.selected = null; UI.closePanel();
    goal.target.set(0, 0, 0); Object.assign(goal, { r: HOME.r, phi: HOME.phi, theta: cam.theta });
    $('#view-status').textContent = '已返回宇宙全景';
  }
  function fit(points) {
    if (!points.length) return;
    const c = new THREE.Vector3(); points.forEach(p => c.add(p)); c.divideScalar(points.length);
    const r = Math.max(...points.map(p => p.distanceTo(c)));
    S.follow = null; S.focusKey = null; goal.target.copy(c); goal.r = clamp(r * 2.6 + 260, 420, 3400) * (phone ? 1.3 : 1); goal.phi = 0.85;
  }
  UI.on('navigate', cur => { const n = nodeFor(cur.k, cur.i); if (n) focusNode(n, false); });

  /* ---------- labels ---------- */
  function labelEl(n) {
    if (n.el) return n.el;
    const el = document.createElement('button'); el.type = 'button';
    el.className = `cos-label ${n.main ? 'is-main' : 'is-child'}`; el.dataset.node = n.id; el.style.setProperty('--hue', n.hue);
    el.innerHTML = n.main ? `<span class="k">${D.escapeHTML(n.kicker)}</span><span class="t">${D.escapeHTML(n.title)}</span><span class="s">${D.escapeHTML(n.sub)}</span>`
      : `<span class="t">${D.escapeHTML(n.title)}</span>${n.sub ? `<span class="s">${D.escapeHTML(n.sub)}</span>` : ''}`;
    el.setAttribute('aria-label', `${n.title}，飞近并查看`); el.hidden = true;
    labelsHost.append(el); n.el = el; n.w = el.offsetWidth; n.h = el.offsetHeight; return el;
  }
  function project(n) {
    n.obj.getWorldPosition(tmp); n.world = n.world || new THREE.Vector3(); n.world.copy(tmp);
    v.copy(tmp).project(camera);
    n.sx = (v.x + 1) / 2 * W.w; n.sy = (1 - v.y) / 2 * W.h; n.front = v.z < 1 && v.z > -1;
    const dist = camera.position.distanceTo(tmp); n.dist = dist;
    n.pr = (n.r * W.h / 2) / (dist * Math.tan((camera.fov * Math.PI) / 360));
  }
  const childActive = n => n.galaxy === S.focusKey || (S.topic && S.topic.ids.has(n.id)) || n === S.hovered || n === S.selected;
  function layoutLabels() {
    const placed = [];
    const list = nodes.filter(n => n.label && n.front && (n.main || childActive(n)) && n.sx > -50 && n.sx < W.w + 50 && n.sy > 60 && n.sy < W.h - 80);
    list.sort((a, b) => (b.main - a.main) || ((b === S.selected) - (a === S.selected)) || (a.dist - b.dist));
    const shown = new Set();
    for (const n of list) {
      const el = labelEl(n); if (!n.w) { n.w = el.offsetWidth; n.h = el.offsetHeight; }
      if (n.main && S.focusKey && n.key !== S.focusKey && !S.topic) { /* keep, but dim */ }
      const off = Math.max(n.pr, n.main ? 12 : 6) + (n.main ? (phone ? 10 : 16) : 8);
      const tries = [[n.sx + off, n.sy - n.h / 2], [n.sx - off - n.w, n.sy - n.h / 2], [n.sx - n.w / 2, n.sy + off], [n.sx - n.w / 2, n.sy - off - n.h]];
      const sheetOpen = phone && (UI.panelOpen || Boolean(S.topic));
      const topEdge = phone ? (sheetOpen ? 12 : 112) : 10;
      const bottomEdge = phone ? (sheetOpen ? W.h * 0.36 - 8 : W.h - 142) : W.h - 10;
      const rightEdge = UI.panelOpen && !phone ? W.w - Math.min(490, W.w * 0.45) - 16 : W.w - 10;
      const spot = tries.find(([x, y]) => x > 10 && y > topEdge && x + n.w < rightEdge && y + n.h < bottomEdge && !placed.some(r => x < r.x + r.w + 10 && x + n.w + 10 > r.x && y < r.y + r.h + 8 && y + n.h + 8 > r.y));
      if (!spot) continue;
      placed.push({ x: spot[0], y: spot[1], w: n.w, h: n.h }); shown.add(n);
      el.hidden = false; el.style.transform = `translate3d(${spot[0].toFixed(1)}px,${spot[1].toFixed(1)}px,0)`;
      const dim = n.main && S.focusKey && n.key !== S.focusKey ? 0.45 : 1;
      el.style.opacity = String(dim);
      el.classList.toggle('is-hot', n === S.hovered || n === S.selected);
      el.classList.toggle('is-topic', Boolean(S.topic && S.topic.ids.has(n.id)));
    }
    nodes.forEach(n => { if (n.el && !shown.has(n)) n.el.hidden = true; });
  }
  function pick(x, y) {
    let best = null, bd = Infinity;
    for (const n of nodes) {
      if (!n.front) continue;
      if (!n.main && !childActive(n) && n.pr < 7) continue;
      const d = Math.hypot(n.sx - x, n.sy - y), lim = Math.max(n.main ? (phone ? 34 : 26) : (phone ? 22 : 14), n.pr + (phone ? 8 : 4));
      if (d < lim && d - (n.main ? 0 : 6) < bd) { bd = d; best = n; }
    }
    return best;
  }

  /* ---------- pointer / wheel ---------- */
  const pointers = new Map(); let gesture = null, lastTap = null;
  const pinch = () => { const [a, b] = [...pointers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)) }; };
  function anchorAt(clientX, clientY) {
    ndc.set((clientX / W.w) * 2 - 1, -(clientY / W.h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    camera.getWorldDirection(camDir);
    const hit = pick(clientX, clientY);
    if (hit?.world) {
      plane.setFromNormalAndCoplanarPoint(camDir, hit.world);
      if (raycaster.ray.intersectPlane(plane, hitPt)) return hitPt;
    }
    // Prefer the horizontal orbital plane through goal.target when the ray meets it within scene bounds
    plane.set(new THREE.Vector3(0, 1, 0), -goal.target.y);
    if (raycaster.ray.intersectPlane(plane, hitPt) && hitPt.distanceTo(goal.target) <= Math.max(1800, goal.r * 1.6)) {
      return hitPt;
    }
    // Fallback: camera-facing focal plane through goal.target (always finite, even edge-on)
    plane.setFromNormalAndCoplanarPoint(camDir, goal.target);
    return raycaster.ray.intersectPlane(plane, hitPt) ? hitPt : null;
  }
  function zoomAt(factor, clientX, clientY) {
    touch(true);
    window.CYHStory?.pauseAuto();
    const minR = 30, maxR = 6000;
    const oldR = goal.r;
    const newR = clamp(oldR * factor, minR, maxR);
    if (Math.abs(newR - oldR) < 1e-4) return;
    if (clientX !== undefined && clientY !== undefined) {
      const anchor = anchorAt(clientX, clientY);
      if (anchor) {
        S.follow = null;
        const ratio = newR / oldR;
        goal.target.x = anchor.x + (goal.target.x - anchor.x) * ratio;
        goal.target.y = anchor.y + (goal.target.y - anchor.y) * ratio;
        goal.target.z = anchor.z + (goal.target.z - anchor.z) * ratio;
        if (goal.target.length() > 2600) goal.target.setLength(2600);
      }
    }
    goal.r = newR;
  }
  function panBy(dx, dy) {
    S.follow = null; const k = (cam.r * 2 * Math.tan((camera.fov * Math.PI) / 360)) / W.h;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    goal.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
  }
  atlas.addEventListener('contextmenu', e => e.preventDefault());
  atlas.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); atlas.setPointerCapture(e.pointerId); touch(true); window.CYHStory?.pauseAuto();
    if (pointers.size === 1) gesture = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, pinched: false, pan: e.button === 2 || e.shiftKey, type: e.pointerType, node: e.target.closest('[data-node]')?.dataset.node || null };
    else if (gesture) { gesture.moved = true; gesture.pinched = true; gesture.pinch = pinch(); }
    atlas.classList.add('is-dragging'); tip.hidden = true;
  });
  atlas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'touch') return;
      const label = e.target.closest('[data-node]'); const n = label ? nodes.find(x => x.id === label.dataset.node) : pick(e.clientX, e.clientY);
      S.hovered = n || null; atlas.classList.toggle('is-hovering', Boolean(n));
      if (n && (!n.el || n.el.hidden)) { tip.hidden = false; tip.textContent = n.title; tip.style.transform = `translate3d(${e.clientX + 14}px,${e.clientY + 12}px,0)`; } else tip.hidden = true;
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!gesture) return; touch(true);
    if (pointers.size >= 2) {
      const p = pinch(), q = gesture.pinch || p;
      if (p.d > 10 && q.d > 10) zoomAt(q.d / p.d, p.x, p.y);
      panBy(p.x - q.x, p.y - q.y); gesture.pinch = p; return;
    }
    const dx = e.clientX - gesture.lx, dy = e.clientY - gesture.ly; gesture.lx = e.clientX; gesture.ly = e.clientY;
    const slop = gesture.type === 'touch' ? 12 : 5;
    if (Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > slop) gesture.moved = true;
    if (!gesture.moved) return;
    const rotX = gesture.type === 'touch' ? 0.0072 : 0.0055, rotY = gesture.type === 'touch' ? 0.0058 : 0.0045;
    if (gesture.pan) panBy(dx, dy); else { goal.theta -= dx * rotX; goal.phi = clamp(goal.phi - dy * rotY, 0.12, 2.2); }
  });
  function endPointer(e, cancelled = false) {
    if (!pointers.has(e.pointerId)) return; pointers.delete(e.pointerId);
    if (pointers.size) {
      if (gesture) {
        const [rem] = pointers.values();
        gesture.lx = rem.x; gesture.ly = rem.y; gesture.pinch = null;
      }
      return;
    }
    atlas.classList.remove('is-dragging');
    if (!cancelled && gesture && !gesture.moved && !gesture.pinched) {
      const n = gesture.node ? nodes.find(x => x.id === gesture.node) : pick(e.clientX, e.clientY);
      if (n) { window.CYHStory?.stopTour(); focusNode(n, true); lastTap = null; }
      else if (gesture.type === 'touch') {
        const now = performance.now();
        if (lastTap && now - lastTap.at < 340 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) {
          window.CYHStory?.stopTour(); window.CYHStory?.clearTopic(); reset(); lastTap = null;
        } else {
          lastTap = { x: e.clientX, y: e.clientY, at: now };
        }
      }
    }
    gesture = null;
  }
  atlas.addEventListener('pointerup', e => endPointer(e, false)); atlas.addEventListener('pointercancel', e => endPointer(e, true));
  labelsHost.addEventListener('click', e => { if (e.detail !== 0) return; const b = e.target.closest('[data-node]'); if (b) { const n = nodes.find(x => x.id === b.dataset.node); if (n) { window.CYHStory?.stopTour(); focusNode(n, true); } } });
  atlas.addEventListener('dblclick', e => { if (!pick(e.clientX, e.clientY)) reset(); });
  atlas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W.h : 1);
    zoomAt(Math.exp(clamp(delta * 0.0012, -0.4, 0.4)), e.clientX, e.clientY);
  }, { passive: false });
  $('#zoom-in').addEventListener('click', () => zoomAt(0.75));
  $('#zoom-out').addEventListener('click', () => zoomAt(1 / 0.75));
  $('#reset-view').addEventListener('click', () => { window.CYHStory?.stopTour(); window.CYHStory?.clearTopic(); reset(); });

  /* ---------- loop ---------- */
  let last = 0, t = 0;
  function tick(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const still = motion.matches; t += still ? 0 : dt; U.time.value = t;
    updaters.forEach(fn => fn(still ? 0 : dt, t));
    if (S.follow) { S.follow.getWorldPosition(tmp); goal.target.copy(tmp); }
    if (!S.follow && !S.topic && !still && now - S.lastInteract > 7000) goal.theta += dt * 0.022;
    const speed = now < S.introUntil ? 1.25 : now < S.snappyUntil ? 8.5 : 3.6;
    const k = still ? 1 : 1 - Math.exp(-dt * speed);
    cam.target.lerp(goal.target, k); cam.theta += (goal.theta - cam.theta) * k; cam.phi += (goal.phi - cam.phi) * k;
    cam.r = now < S.snappyUntil ? cam.r + (goal.r - cam.r) * k : Math.exp(Math.log(cam.r) + (Math.log(goal.r) - Math.log(cam.r)) * k);
    const sp = Math.sin(cam.phi);
    camera.position.set(cam.target.x + cam.r * sp * Math.sin(cam.theta), cam.target.y + cam.r * Math.cos(cam.phi), cam.target.z + cam.r * sp * Math.cos(cam.theta));
    camera.lookAt(cam.target);
    const wantX = UI.panelOpen && !phone ? (Math.min(470, W.w - 40) + 20) / 2 : 0, wantY = (UI.panelOpen || Boolean(S.topic)) && phone ? W.h * 0.31 : 0;
    S.viewOff += (wantX - S.viewOff) * (1 - Math.exp(-dt * 5)); S.viewOffY += (wantY - S.viewOffY) * (1 - Math.exp(-dt * 5));
    if (Math.abs(S.viewOff) < 0.5 && Math.abs(S.viewOffY) < 0.5) { if (camera.view?.enabled) camera.clearViewOffset(); }
    else camera.setViewOffset(W.w, W.h, S.viewOff, S.viewOffY, W.w, W.h);
    sky.position.copy(camera.position); farGroup.position.copy(camera.position); dust.rotation.y += dt * 0.004;
    cards.forEach(c => { if (c.userData.loaded && c.material.opacity < 1) c.material.opacity = Math.min(1, c.material.opacity + dt * 1.5); });
    if (!K.loadedS2Check && camera.position.distanceTo(nodeFor('s2').obj.getWorldPosition(tmp)) < 750) { K.loadedS2Check = true; K.loadS2(); }
    camera.updateMatrixWorld();
    nodes.forEach(project);
    if (S.selected?.world) { selRing.position.copy(S.selected.world); const s = Math.max(S.selected.r * 3.2, 10); selRing.scale.set(s, s, 1); selRing.material.opacity += ((S.selected.main ? 0 : 0.7) - selRing.material.opacity) * 0.1; }
    else selRing.material.opacity *= 0.9;
    window.CYHStory?.frame(dt, t);
    renderer.render(K.scene, camera);
    layoutLabels();
    $('#zoom-level').value = `${(HOME.r / cam.r).toFixed(1)}×`;
    document.querySelectorAll('[data-galaxy]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.galaxy === S.focusKey)));
    raf = requestAnimationFrame(tick);
  }
  let raf = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { last = 0; raf = requestAnimationFrame(tick); } });
  addEventListener('resize', resize, { passive: true });
  resize();
  if (motion.matches) { Object.assign(cam, { r: HOME.r, theta: HOME.theta, phi: HOME.phi }); }
  raf = requestAnimationFrame(tick);

  window.CYHCosmos = { S, cam, goal, focusGalaxy, focusNode, reset, fit, nodes, nodeFor, touch, get phone() { return phone; } };
})();
