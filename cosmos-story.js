/* cyh · Personal Atlas VI — cross-galaxy constellations, narrative tour, navigation & keys. */
(() => {
  'use strict';
  const K = window.CYH3D, UI = window.CYHUI, X = window.CYHCosmos, D = window.CYH;
  if (!K || !X) return;
  const { THREE, G, ORDER } = K;
  const $ = s => document.querySelector(s), esc = D.escapeHTML;

  /* ---------- constellations: one topic lights up every node that mentions it ---------- */
  const CANDIDATES = [
    ['AGIBOT', /agibot|智元/i], ['美的', /美的/], ['德国 ISH', /\bISH\b/], ['中望', /中望/],
    ['SketchUp', /sketchup|草图大师/i], ['Codex', /codex/i], ['展厅 / 展陈', /展厅|展陈|展示设计|展会|exhibition/i],
    ['光与装置', /灯光|光装置|LED|发光|互动投影/i], ['AI 出图', /comfyui|效果图|出图/i],
  ];
  const topics = CANDIDATES.map(([label, re]) => {
    const hits = X.nodes.filter(n => !n.main && n.text && re.test(n.text));
    return { label, hits, ids: new Set(hits.map(n => n.id)), galaxies: new Set(hits.map(n => n.galaxy)) };
  }).filter(tp => tp.hits.length >= 2 && tp.galaxies.size >= 2).slice(0, 6);
  const host = $('#topics');
  host.innerHTML = topics.length ? `<span class="topics-title">CONSTELLATIONS · 跨星系星座</span>${topics.map((tp, i) => `<button type="button" data-topic="${i}" aria-pressed="false">${esc(tp.label)}<b>${tp.hits.length}</b></button>`).join('')}` : '';

  const MAX = 120, linePos = new Float32Array(MAX * 3);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  line.frustumCulled = false; line.visible = false; K.scene.add(line);
  const pulse = K.glow(0xfff0c8, 40, 0.9); pulse.visible = false; K.scene.add(pulse);
  const markers = Array.from({ length: 40 }, () => { const m = K.sprite(K.RING, 0xffd27a, 20, 0.8); m.visible = false; K.scene.add(m); return m; });
  const card = $('#topic-card');
  function setTopic(i) {
    const tp = topics[i];
    if (!tp || X.S.topic === tp) { clearTopic(); return; }
    stopTour(); UI.closePanel();
    tp.chain = tp.hits.slice().sort((a, b) => ORDER.indexOf(a.galaxy) - ORDER.indexOf(b.galaxy));
    X.S.topic = tp; X.S.selected = null; line.visible = pulse.visible = true;
    if (tp.hits.some(n => n.galaxy === 's2')) K.loadS2();
    X.fit(tp.hits.map(n => n.world || n.obj.getWorldPosition(new THREE.Vector3())));
    host.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.topic) === i)));
    const byG = ORDER.filter(g => tp.galaxies.has(g));
    card.innerHTML = `<header><p>CONSTELLATION</p><h3>${esc(tp.label)}</h3><button type="button" class="icon-button" data-topic-close aria-label="关闭星座">✕</button></header>
      <p class="topic-desc">${tp.hits.length} 颗星，横跨 ${byG.length} 个星系：${byG.map(g => G[g].title).join(' → ')}</p>
      ${byG.map(g => `<section><h4 style="--hue:${G[g].hue}">${G[g].title}</h4>${tp.chain.filter(n => n.galaxy === g).map(n => `<button type="button" class="topic-row" data-node-open="${esc(n.id)}" style="--hue:${n.hue}"><strong>${esc(n.title)}</strong>${n.sub ? `<small>${esc(n.sub)}</small>` : ''}</button>`).join('')}</section>`).join('')}`;
    card.hidden = false;
    document.querySelector('#site')?.classList.add('has-topic');
  }
  function clearTopic() {
    X.S.topic = null; line.visible = pulse.visible = false; markers.forEach(m => { m.visible = false; });
    host.querySelectorAll('[data-topic]').forEach(b => b.setAttribute('aria-pressed', 'false')); card.hidden = true;
    document.querySelector('#site')?.classList.remove('has-topic');
  }

  /* ---------- narrative tour: 灵感尘埃 → 造物引擎 → 创作脉搏 → 凝固空间 → 未知星域 ---------- */
  const tour = $('#tour-card'); let step = -1, timer = 0, auto = true;
  function goStep(i) {
    step = (i + ORDER.length) % ORDER.length; const key = ORDER[step], g = G[key];
    UI.closePanel(); X.focusGalaxy(key, false);
    tour.style.setProperty('--hue', g.hue);
    tour.innerHTML = `<div class="tour-progress">${ORDER.map((k, j) => `<i class="${j <= step ? 'on' : ''}" style="--hue:${G[k].hue}"></i>`).join('')}</div>
      <p class="tour-kicker">CHAPTER 0${step + 1} / 05 · ${esc(g.kicker)}</p><h3>${esc(g.chapter)}<span>${esc(g.title)}</span></h3><p class="tour-line">${esc(g.line)}</p>
      <div class="tour-actions"><button type="button" data-tour="prev">‹ 上一章</button><button type="button" data-tour="enter">进入星系 ↗</button><button type="button" data-tour="next">${step === ORDER.length - 1 ? '回到全景' : '下一章 ›'}</button><button type="button" class="icon-button" data-tour="stop" aria-label="结束巡航">✕</button></div>`;
    tour.hidden = false; clearTimeout(timer);
    if (auto) timer = setTimeout(() => (step === ORDER.length - 1 ? endTour() : goStep(step + 1)), 11000);
  }
  function startTour() { clearTopic(); auto = true; document.querySelector('#site')?.classList.add('is-touring'); goStep(0); }
  function stopTour() { clearTimeout(timer); step = -1; tour.hidden = true; document.querySelector('#site')?.classList.remove('is-touring'); }
  function endTour() { stopTour(); X.reset(); }
  const pauseAuto = () => { auto = false; clearTimeout(timer); };

  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-topic]'); if (tb) { setTopic(Number(tb.dataset.topic)); return; }
    if (e.target.closest('[data-topic-close]')) { clearTopic(); return; }
    const row = e.target.closest('[data-node-open]'); if (row) { X.focusNode(X.nodeFor(...row.dataset.nodeOpen.split(':')), true); return; }
    const tr = e.target.closest('[data-tour]');
    if (tr) {
      const a = tr.dataset.tour; pauseAuto();
      if (a === 'prev') goStep(step - 1); else if (a === 'next') (step === ORDER.length - 1 ? endTour() : goStep(step + 1));
      else if (a === 'enter') { const key = ORDER[step]; stopTour(); X.focusGalaxy(key, true); } else stopTour();
      return;
    }
    if (e.target.closest('#tour-start')) { startTour(); return; }
    const nav = e.target.closest('[data-galaxy]'); if (nav) { stopTour(); clearTopic(); X.focusGalaxy(nav.dataset.galaxy, true); }
  });
  document.addEventListener('keydown', e => {
    if (UI.viewerOpen) { if (e.key === 'Escape') { e.preventDefault(); UI.closeViewer(); } return; }
    if (e.key === 'Escape') { e.preventDefault(); if (step >= 0) stopTour(); else if (UI.panelOpen) UI.closePanel(); else if (X.S.topic) clearTopic(); else X.reset(); return; }
    if (e.target.closest('input,textarea,#preview')) return;
    if (e.key === '+' || e.key === '=') X.goal.r *= 0.8; else if (e.key === '-') X.goal.r /= 0.8;
    else if (e.key === 'ArrowLeft') X.goal.theta += 0.12; else if (e.key === 'ArrowRight') X.goal.theta -= 0.12;
    else if (e.key === 'ArrowUp') X.goal.phi = Math.max(0.12, X.goal.phi - 0.1); else if (e.key === 'ArrowDown') X.goal.phi = Math.min(2.2, X.goal.phi + 0.1);
    else if (step >= 0 && (e.key === ']' || e.key === 'PageDown')) goStep(step + 1);
    else return;
    X.touch();
  });

  let pt = 0;
  function frame(dt) {
    const tp = X.S.topic; if (!tp) return;
    const pts = tp.chain.slice(0, MAX).map(n => n.world).filter(Boolean);
    pts.forEach((p, i) => linePos.set([p.x, p.y, p.z], i * 3));
    lineGeo.setDrawRange(0, pts.length); lineGeo.attributes.position.needsUpdate = true;
    markers.forEach((m, i) => { const p = pts[i]; m.visible = Boolean(p); if (p) m.position.copy(p); });
    if (pts.length > 1) {
      pt = (pt + dt * 0.12) % 1; const f = pt * (pts.length - 1), i = Math.floor(f);
      pulse.position.lerpVectors(pts[i], pts[Math.min(i + 1, pts.length - 1)], f - i);
    }
  }
  window.CYHStory = { frame, stopTour, pauseAuto, clearTopic, startTour };
})();
