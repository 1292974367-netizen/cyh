/* Static data adapters and presentation templates. No network dependencies. */
(() => {
  "use strict";
const C = {
  bg: "#0a0f1e", panel: "rgba(13,19,38,0.9)", ink: "#e8ebf5", mute: "#a2aac4", faint: "#69718f",
  rule: "rgba(190,200,240,0.16)", hair: "rgba(190,200,240,0.08)",
  amber: "#f2b866", violet: "#a9a2ff", teal: "#6fd6d0", grey: "#8a90a6",
};
const projects = window.CYH_PROJECTS?.items || [];
const cats = window.CYH_PROJECTS?.cats || [];
const plans = window.CYH_PLANS || [];
const reviews = window.CYH_REVIEWS || [];
const reviewById = new Map(reviews.map(review => [review.id, review]));
const reviewTypes = {daily:"日报", weekly:"周报", monthly:"月报", overview:"全局梳理"};
const reviewGroups = Object.fromEntries(Object.keys(reviewTypes).map(type => [type, reviews.filter(review => review.type === type).sort((a,b) => String(a.date).localeCompare(String(b.date)))]));
const latestReview = reviewGroups.daily.at(-1);
const P = "https://www.pinterest.com/61c0c5872feda21f4161cef3b6f3d6/";
const REPO = "https://github.com/1292974367-netizen/ai-workflow-collection";
// These boards were removed from the site. Keep that presentation decision even
// when an upstream data snapshot still includes them; never mutate bot data.
const retiredBoardSlugs = new Set(['haokang', 'art', 'anime']);
const retiredBoardNames = new Set(['好康的', '艺术', '二次元']);
const boards = (window.CYH_BOARDS?.boards || []).filter(board => !retiredBoardSlugs.has(board.slug) && !retiredBoardNames.has(board.n)).map(board => ({...board}));
const boardSlugs = boards.map(board => board.slug);
const decodeTitle = value => String(value).replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code) => {
  if (code[0] !== '#') return ({amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' '})[code.toLowerCase()] || entity;
  const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
});
const allPins = (window.CYH_PIN_MANIFEST || []).filter(pin => boardSlugs.includes(pin.slug)).map((pin, index) => {
  const boardIndex = boardSlugs.indexOf(pin.slug);
  return {...pin, index, boardIndex, board: boards[boardIndex].n, title: decodeTitle(pin.title)};
});
const boardPins = boards.map((board, index) => allPins.filter(pin => pin.boardIndex === index));
boards.forEach((board, index) => { board.localCount = boardPins[index].length; });
const pins = (window.CYH_BOARDS?.featured || []).filter(pin => allPins.some(item => item.pin_id === pin.id));
const images = pins.map(pin => allPins.find(item => item.pin_id === pin.id)?.file || '');
const totalPins = boards.reduce((sum, board) => sum + (Number(board.c) || 0), 0);
const moons = reviews.map(review => {
  const group = reviewGroups[review.type] || [];
  const angle = -90 + group.indexOf(review) * 360 / Math.max(1, group.length);
  return {k:{k:review.id}, reviewId:review.id, type:review.type, review,
    label:review.label || review.title || `${review.date} ${reviewTypes[review.type] || ''}`,
    sub:review === latestReview ? 'LATEST' : review.moonSub || reviewTypes[review.type] || '',
    a:angle, pa:angle, done:true};
});
function reviewDetails(review) {
  const sections = [];
  const time = Array.isArray(review.time) ? review.time.filter(item => item && String(item.l || '').trim() && Number.isFinite(Number(item.min)) && Number(item.min) >= 0) : [];
  if (time.length) sections.push({field:'time', title:'时间去向', items:time});
  if (Array.isArray(review.shape) && review.shape.length === 24 && review.shape.every(value => Number.isFinite(Number(value))) && review.shape.some(value => Number(value) > 0)) {
    sections.push({field:'shape', title:'一天的形状', values:review.shape.map(Number)});
  }
  for (const [field, title] of [['todo','待处理'], ['notes','记录']]) {
    const items = Array.isArray(review[field]) ? review[field].filter(item => String(item ?? '').trim()) : [];
    if (items.length) sections.push({field, title, items});
  }
  return sections;
}
const hueValue = value => C[value] || value;
function reviewPanel(review) {
  const body = [];
  if (review.headline) body.push({t:'p',s:review.headline,color:C.ink});
  if (review.sub && review.sub !== review.headline) body.push({t:'p',s:review.sub});
  body.push({t:'stats',items:[[review.date || '—','日期',C.amber],[reviewTypes[review.type] || review.type,'类型']]});
  const details = reviewDetails(review);
  // Detail cards also describe explicitly empty fields. Only the satellite
  // view suppresses them; a report's own card keeps its complete record.
  for (const [field,title] of [['time','时间去向'],['shape','一天的形状'],['todo','待处理'],['notes','记录']]) {
    if (Object.hasOwn(review,field) && !details.some(detail => detail.field === field)) {
      details.push({field,title,empty:true,values:field === 'shape' && Array.isArray(review.shape) && review.shape.length === 24 ? review.shape.map(Number) : null});
    }
  }
  details.sort((a,b) => ['time','shape','todo','notes'].indexOf(a.field) - ['time','shape','todo','notes'].indexOf(b.field));
  for (const detail of details) {
    body.push({t:'sub',s:detail.title,field:detail.field});
    if (detail.empty) {
      body.push({t:'p',s:'暂无记录',color:C.faint});
      if (detail.values) body.push({t:'shape',values:detail.values});
      continue;
    }
    if (detail.field === 'time') {
      const max = Math.max(...detail.items.map(item => Number(item.min)), 1);
      body.push(...detail.items.map(item => ({t:'bar',l:item.l,v:Number(item.min),max,hue:C.amber,d:'分钟'})));
    } else if (detail.field === 'shape') body.push({t:'shape',values:detail.values});
    else body.push({t:'li',items:detail.items});
  }
  if (review.body?.length) body.push({t:'sub',s:'完整复盘正文'}, ...review.body.map(block => ({...block,
    ...(block.hue ? {hue:hueValue(block.hue)} : {}),
    ...(block.color ? {color:hueValue(block.color)} : {}),
    ...(block.t === 'stats' ? {items:block.items.map(([value,label,hue]) => [value,label,hueValue(hue)])} : {})
  })));
  body.push({t:'sub',s:'条目信息'});
  for (const [field,label] of [['id','条目 ID'],['label','星图标签'],['moonSub','星图副标']]) {
    if (review[field]) body.push({t:'kv',k:label,v:review[field]});
  }
  const known = new Set(['id','date','type','label','moonSub','sub','headline','kicker','title','href','body','time','shape','todo','notes']);
  for (const [field,value] of Object.entries(review)) {
    if (!known.has(field) && value != null) body.push({t:'kv',k:field,v:typeof value === 'object' ? JSON.stringify(value) : String(value)});
  }
  return {hue:C.amber, kicker:review.kicker || reviewTypes[review.type], title:review.title || review.label,
    href:review.href, hrefLabel:'打开原始复盘 ↗', review, body};
}
function getPanel(key, index = 0, cat = "全部") {
  const m = typeof key === "object" ? key : {k:key,i:index};
  if (!m || ((["pin","board","gh","plan"].includes(m.k)) && (!Number.isInteger(m.i) || m.i < 0 || m.i >= ({pin:pins,board:boards,gh:projects,plan:plans}[m.k]).length))) return null;
  if (reviewById.has(m.k)) return reviewPanel(reviewById.get(m.k));
  if (m.k === 's1') return {hue:C.amber,kicker:'01 · Review',title:'工作复盘',body:[
    {t:'p',s:latestReview ? `最新：${latestReview.headline || latestReview.title || latestReview.label}` : '每一份复盘，都留在自己的轨道上。'},
    ...['daily','weekly','monthly','overview'].flatMap(type => [
      {t:'sub',s:`${reviewTypes[type]} · ${reviewGroups[type].length}`},
      ...(reviewGroups[type].length ? reviewGroups[type].map(review => ({t:'row',hue:C.amber,lead:review.date?.slice(5) || '',title:review.title || review.label,sub:review.sub,go:{k:review.id}})) : [{t:'p',s:'暂无记录',color:C.faint}])
    ])
  ]};
  if (m.k === "s2") return { hue: C.violet, kicker: "02 · Pinterest · cyh", title: "视觉灵感", href: P, hrefLabel: "Pinterest 主页 ↗", body: [
    { t: "p", s: `${boards.length} 个画板 · ${totalPins} pins${window.CYH_BOARDS?.updated ? ` · 更新于 ${window.CYH_BOARDS.updated}` : ""}` },
    { t: "sub", s: "代表 pins（星系核心）" },
    ...pins.map((p, i) => ({ t: "row", hue: C.violet, lead: `0${i + 1}`, title: p.t, sub: p.s, go: { k: "pin", i } })),
    { t: "sub", s: `全部画板 · ${boards.length} · ${allPins.length} 张图片` },
    ...[...new Set(boards.map(board => board.g))].map(g => ({ t: "board-covers", label: g, indices: boards.map((board, i) => ({ board, i })).filter(({ board }) => board.g === g).map(({ i }) => i) })),
  ] };
  if (m.k === "pin") { const p = pins[m.i], sourcePin = allPins.find(pin => pin.pin_id === p.id), board = boards[sourcePin?.boardIndex]; return { hue: C.violet, kicker: `${board?.n || ""} · Pin ${String(m.i + 1).padStart(2, "0")}`, title: `${p.t} · ${p.s}`, href: `https://www.pinterest.com/pin/${p.id}/`, hrefLabel: "在 Pinterest 打开 ↗", body: [
    { t: "img", i: m.i },
    { t: "kv", k: "所属画板", v: board ? `${board.n}（${board.c} pins）` : "" },
    
  ] }; }
  if (m.k === "board") { const b = boards[m.i]; return { hue: C.violet, kicker: `Board · ${b.g}`, title: b.n, href: P + b.p + "/", hrefLabel: "在 Pinterest 打开 ↗", body: [
    { t: "stats", items: [[String(boardPins[m.i].length), "图片", C.violet], [b.g, "分组"]] },

    { t: "p", s: "点击图片放大查看，使用方向键或两侧按钮继续浏览。" },
    { t: "gallery", i: m.i },
  ] }; }
  if (m.k === "s3") { const shown = projects.map((p, i) => ({ p, i })).filter((o) => cat === "全部" || o.p.cat === cat); return { hue: C.teal, kicker: "03 · GitHub Archive", title: "AI 工作流收藏", href: REPO, hrefLabel: "1292974367-netizen/ai-workflow-collection ↗", body: [
    { t: "p", s: `${projects.length} 个 AI 项目${window.CYH_PROJECTS?.updated ? ` · 更新于 ${window.CYH_PROJECTS.updated}` : ""}`, size: 13 },
    { t: "sub", s: `推荐先试 · ${projects.filter(project => project.top).length}` },
    ...projects.map((p, i) => ({ p, i })).filter((o) => o.p.top).map(({ p, i }, j) => ({ t: "row", hue: C.teal, lead: `★${j + 1}`, title: p.name.split("/")[1], sub: p.note, go: { k: "gh", i } })),
    { t: "sub", s: "全部项目" },
    { t: "chips", hue: C.teal, items: cats.map(([v, l]) => ({ s: `${l} (${v === "全部" ? projects.length : projects.filter((p) => p.cat === v).length})`, on: cat === v, category: v })) },
    ...shown.map(({ p, i }) => ({ t: "row", hue: C.teal, lead: String(i + 1).padStart(2, "0"), title: `${p.name}${p.top ? " ●" : ""}`, sub: `${p.note} · ${p.level} · ★ ${p.stars}`, go: { k: "gh", i } })),
  ] }; }
  if (m.k === "gh") { const p = projects[m.i]; return { hue: C.teal, kicker: `GitHub · ${cats.find((c) => c[0] === p.cat)?.[1]}`, title: p.name, href: `https://github.com/${p.name}`, hrefLabel: "在 GitHub 打开 ↗", body: [
    { t: "p", s: p.note, size: 15, color: C.ink },
    { t: "stats", items: [[p.level, "难度", C.teal], [`★ ${p.stars}`, "Stars"], ...(p.top ? [["首推", "最推荐先试", C.teal]] : [])] },
  ] }; }
  if (m.k === "s4") return { hue: C.grey, kicker: "04 · 规划中 · Planned", title: "接下来可以加的栏目", body: plans.map(([h, d], i) => ({ t: "row", hue: C.grey, lead: `P.0${i + 1}`, title: h, sub: d, go: { k: "plan", i } })) };
  if (m.k === "plan") { const [h, d] = plans[m.i]; return { hue: C.grey, kicker: `规划中 · P.0${m.i + 1}`, title: h, body: [{ t: "p", s: d, size: 15, color: C.ink }] }; }
  return null;
}

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const openAttrs = go => `data-open="${escapeHTML(go.k)}"${go.i === undefined ? "" : ` data-index="${go.i}"`}`;

/** All controls remain in-page. External source links are supplied separately by the panel. */
function renderPanelBody(panel) {
  if (!panel) return "";
  return panel.body.map(b => {
    if (b.t === "p") return `<p class="preview-p"${b.color ? ` style="color:${b.color}"` : ""}>${escapeHTML(b.s)}</p>`;
    if (b.t === "sub") return `<h3 class="preview-sub">${escapeHTML(b.s)}</h3>`;
    if (b.t === "stats") return `<div class="preview-stats">${b.items.map(([v,l,h]) => `<div class="preview-stat"><strong${h ? ` style="color:${h}"` : ""}>${escapeHTML(v)}</strong><span>${escapeHTML(l)}</span></div>`).join("")}</div>`;
    if (b.t === "kv") return `<div class="preview-kv"><span>${escapeHTML(b.k)}</span><p>${escapeHTML(b.v)}</p></div>`;
    if (b.t === "li") return `<ul class="preview-list">${b.items.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>`;
    if (b.t === "bar") return `<div class="preview-bar"><span class="preview-bar-label">${escapeHTML(b.l)}</span><span class="preview-bar-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,100 * Number(b.v) / (Number(b.max) || 1)))}%;background:${b.hue}"></i></span><strong>${escapeHTML(b.v)}</strong>${b.d ? `<small>${escapeHTML(b.d)}</small>` : ""}</div>`;
    if (b.t === "shape") {
      const max = Math.max(60, ...b.values), barWidth = 9, gap = 4;
      return `<figure class="review-shape"><svg viewBox="0 0 312 94" role="img" aria-label="24 小时活跃时长，单位分钟"><title>${escapeHTML(b.values.map((value,hour) => `${String(hour).padStart(2,'0')}:00 ${value} 分钟`).join('；'))}</title>${b.values.map((value,hour) => `<rect x="${hour*(barWidth+gap)+1}" y="${70-Math.max(1,value/max*60)}" width="${barWidth}" height="${Math.max(1,value/max*60)}" rx="2" fill="${C.amber}" opacity="${value ? .9 : .16}"><title>${String(hour).padStart(2,'0')}:00 · ${value} 分钟</title></rect>`).join('')}${[0,6,12,18,23].map(hour => `<text x="${hour*13+1}" y="89" fill="${C.mute}" font-size="9">${String(hour).padStart(2,'0')}</text>`).join('')}</svg><figcaption>00–23 时 · 每小时活跃分钟</figcaption><details><summary>查看 24 小时数值</summary><p class="preview-p">${escapeHTML(b.values.map((value,hour) => `${String(hour).padStart(2,'0')}:00 · ${value} 分钟`).join(' / '))}</p></details></figure>`;
    }
    if (b.t === "row") return `<button type="button" class="preview-row" ${openAttrs(b.go)}><span class="preview-row-lead" style="color:${b.hue}">${escapeHTML(b.lead)}</span><span class="preview-row-text"><strong>${escapeHTML(b.title)}</strong>${b.sub ? `<small>${escapeHTML(b.sub)}</small>` : ""}</span><span class="preview-row-arrow" aria-hidden="true">↗</span></button>`;
    if (b.t === "chips") return `<div class="preview-chip-group">${b.label ? `<span class="preview-chip-label">${escapeHTML(b.label)}</span>` : ""}<div class="preview-chips">${b.items.map(it => `<button type="button" class="preview-chip${it.on ? " is-active" : ""}" ${it.go ? openAttrs(it.go) : `data-category="${escapeHTML(it.category)}" aria-pressed="${Boolean(it.on)}"`}>${escapeHTML(it.s)}${it.n ? ` <span>${escapeHTML(it.n)}</span>` : ""}</button>`).join("")}</div></div>`;
    if (b.t === "board-covers") return `<section class="board-cover-section"><h4 class="preview-chip-label">${escapeHTML(b.label)}</h4><div class="board-cover-grid">${b.indices.map(i => {
      const board = boards[i], cover = boardPins[i][0];
      return `<button type="button" class="board-cover" ${openAttrs({k:'board', i})}>${cover ? `<img class="board-cover-image" src="${escapeHTML(cover.file)}" alt="${escapeHTML(board.n + '画板预览：' + cover.title)}" loading="lazy" decoding="async" width="240" height="160">` : ''}<span class="board-cover-text"><strong>${escapeHTML(board.n)}</strong><small>${boardPins[i].length} 张图片 · ${escapeHTML(board.g)}</small></span></button>`;
    }).join('')}</div></section>`;
    if (b.t === "gallery") return `<div class="board-gallery" aria-label="${escapeHTML(boards[b.i].n)}的全部图片">${boardPins[b.i].map(pin => `<article class="board-pin"><button type="button" class="board-pin-image" data-image="${pin.index}" aria-label="放大查看：${escapeHTML(pin.title)}" aria-haspopup="dialog" aria-controls="image-viewer"><img src="${escapeHTML(pin.file)}" alt="${escapeHTML(pin.title)}" loading="lazy" decoding="async" width="240" height="240"></button><div class="board-pin-meta"><h4 class="board-pin-title">${escapeHTML(pin.title)}</h4><p class="board-pin-board">所属画板 · ${escapeHTML(pin.board)}</p><a class="pin-source" href="${escapeHTML(pin.pin_url)}" target="_blank" rel="noopener noreferrer">在 Pinterest 打开 <span aria-hidden="true">↗</span></a></div></article>`).join('')}</div>`;
    if (b.t === "img") {
      const pin = allPins.find(pin => pin.pin_id === pins[b.i].id);
      const image = `<img src="${escapeHTML(pin?.file || images[b.i])}" alt="${escapeHTML(pins[b.i].t + ' · ' + pins[b.i].s)}">`;
      return `<figure class="preview-image">${pin ? `<button type="button" class="board-pin-image" data-image="${pin.index}" aria-label="放大查看：${escapeHTML(pin.title)}" aria-haspopup="dialog" aria-controls="image-viewer">${image}</button>` : image}<figcaption>${escapeHTML(pins[b.i].t)} <span>${escapeHTML(pin?.board || "")} / ${String(b.i + 1).padStart(2,"0")}</span></figcaption></figure>`;
    }
    return "";
  }).join("");
}

window.CYH = { C, projects, cats, pins, boards, boardPins, allPins, plans, reviews, reviewById, reviewGroups, latestReview, reviewDetails, moons, totalPins, images, getPanel, renderPanelBody, escapeHTML, P, REPO };
const totals = document.querySelector('.totals');
if (totals) {
  const counts = [[reviewGroups.daily.length,'日报','amber'],[boards.length,'画板','violet'],[totalPins,'pins','violet'],[projects.length,'AI 项目','teal'],[plans.length,'规划','grey']];
  totals.setAttribute('aria-label',counts.map(([count,label]) => `${count} ${label}`).join(' · '));
  totals.innerHTML = counts.map(([count,label,hue]) => `<span><b class="${hue}">${String(count).padStart(2,'0')}</b> ${label}</span>`).join('<i>·</i>');
}
})();
