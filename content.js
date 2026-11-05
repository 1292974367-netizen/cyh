/* Native content, faithfully adapted from current-canvas-source.tsx. No network dependencies. */
(() => {
  "use strict";
const projectsData = window.CYH_PROJECTS || { items: [], cats: [] };
const projects = projectsData.items || [];
const projectsUpdated = projectsData.updated || "";
const cats = projectsData.cats || [["全部", "All"]];
const P = "https://www.pinterest.com/61c0c5872feda21f4161cef3b6f3d6/";
const pins = (window.CYH_BOARDS && window.CYH_BOARDS.featured) || [];
const boards = ((window.CYH_BOARDS && window.CYH_BOARDS.boards) || []).map(b => ({ ...b }));
// Folder slugs are stable even when a source board uses a different display spelling.
const boardSlugs = boards.map(b => b.slug);
const decodeTitle = value => String(value).replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code) => {
  if (code[0] !== '#') return ({amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' '})[code.toLowerCase()] || entity;
  const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
});
const allPins = (window.CYH_PIN_MANIFEST || []).filter(pin => boardSlugs.includes(pin.slug)).map((pin, index) => {
  const boardIndex = boardSlugs.indexOf(pin.slug);
  return { index, boardIndex, board: boards[boardIndex]?.n || pin.board, title: decodeTitle(pin.title), file: pin.file, pin_url: pin.pin_url, pin_id: pin.pin_id, slug: pin.slug };
});
const boardPins = boards.map((board, index) => allPins.filter(pin => pin.boardIndex === index));
boards.forEach((board, index) => { board.localCount = boardPins[index].length; board.slug = boardSlugs[index]; });
const plans = window.CYH_PLANS || [];
const reviews = (window.CYH_REVIEWS || []).filter(r => r && r.id && r.date);
const dailies = reviews.filter(r => r.type === "daily");
const latestDaily = dailies.slice().sort((a, b) => b.date.localeCompare(a.date))[0] || null;
const reviewsAsc = reviews.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.type === "daily" ? -1 : 1));
const REPO = "https://github.com/1292974367-netizen/ai-workflow-collection";
const totalPins = boards.reduce((s, b) => s + b.c, 0);

/* fixed night-sky palette (user asked for dark in both host modes) */
const C = {
  bg: "#0a0f1e", panel: "rgba(13,19,38,0.9)", ink: "#e8ebf5", mute: "#a2aac4", faint: "#69718f",
  rule: "rgba(190,200,240,0.16)", hair: "rgba(190,200,240,0.08)",
  amber: "#f2b866", violet: "#a9a2ff", teal: "#6fd6d0", grey: "#8a90a6",
};


// Review moons are derived from data/reviews.js: newest first, latest daily marked LATEST.
const reviewMoons = reviews.slice().sort((a, b) => b.date.localeCompare(a.date) || (a.type === "daily" ? -1 : 1))
  .map(r => ({ k: { k: r.id }, label: r.label, sub: r === latestDaily ? "LATEST" : (r.moonSub || ""), done: true }));
const moons = [
  ...reviewMoons,
  { k: { k: "wk" }, label: "周报 11-09", sub: "待生成", done: false, pending: true },
  { k: { k: "mo" }, label: "月报 12-01", sub: "待生成", done: false, pending: true },
];
/* Orbit angles: first two reviews and pending moons keep the original positions; extra reviews fan out over the left arc. */
const moonAngles = (() => {
  const n = reviewMoons.length, out = [];
  for (let i = 0; i < n; i++) out.push(i === 0 ? -.65 : i === 1 ? .42 : (n === 3 ? -2.3 : -1.25 - (i - 2) * (1.35 / Math.max(1, n - 3))));
  return [...out, 1.65, 2.9];
})();
const hueify = v => Array.isArray(v) ? v.map(hueify) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hueify(x)])) : (typeof v === "string" && C[v] && !["bg","panel","ink","mute","rule","hair"].includes(v) ? C[v] : v);
/* Footer totals derived from data. */
(() => {
  const el = typeof document !== "undefined" && document.querySelector(".totals");
  if (!el) return;
  const pad = n => String(n).padStart(2, "0");
  const vals = [[pad(dailies.length), "日报", "amber"], [pad(boards.length), "画板", "violet"], [String(allPins.length), "pins", "violet"], [pad(projects.length), "AI 项目", "teal"], [pad(plans.length), "规划", "grey"]];
  el.setAttribute("aria-label", vals.map(([n, l]) => `${n} ${l}`).join(" · "));
  el.innerHTML = vals.map(([n, l, c]) => `<span><b class="${c}">${n}</b> ${l}</span>`).join("<i>·</i>");
})();
const images = pins.map((_, i) => `assets/pin-${String(i + 1).padStart(2, "0")}.jpg`);
function getPanel(key, index = 0, cat = "全部") {
  const m = typeof key === "object" ? key : { k: key, i: index };
  if (!m || ((["pin","board","gh","plan"].includes(m.k)) && (!Number.isInteger(m.i) || m.i < 0 || m.i >= ({pin:pins,board:boards,gh:projects,plan:plans}[m.k]).length))) return null;
  if (m.k === "s1") return { hue: C.amber, kicker: "01 · Review", title: "工作复盘", body: [
    ...(latestDaily ? [{ t: "p", s: `最新：${latestDaily.headline || latestDaily.title}。周报与月报由另一个助手生成。` }] : []),
    { t: "sub", s: "Timeline" },
    ...reviewsAsc.map(r => ({ t: "row", hue: C.amber, lead: r.date.slice(5), title: r.title, sub: r.sub, go: { k: r.id } })),
    { t: "row", hue: C.faint, lead: "11-09", title: "周报", sub: "首份 00:30 生成（北京时间）", go: { k: "wk" } },
    { t: "row", hue: C.faint, lead: "12-01", title: "月报", sub: "首份 00:45 生成（北京时间）", go: { k: "mo" } },
  ] };
  const review = reviews.find(r => r.id === m.k);
  if (review) return { hue: C.amber, kicker: review.kicker, title: review.title, href: review.href, body: hueify(review.body) };
  if (m.k === "wk" || m.k === "mo") { const wk = m.k === "wk"; return { hue: C.amber, kicker: "Scheduled · 尚未生成", title: wk ? "周报" : "月报", body: [
    { t: "p", s: wk ? "第一份周报将于 2026-11-09 00:30（北京时间）生成。" : "第一份月报将于 2026-12-01 00:45（北京时间）生成。" },
    { t: "stats", items: [[wk ? "11-09" : "12-01", "首次日期", C.amber], [wk ? "00:30" : "00:45", "北京时间"]] },
    { t: "p", s: "由另一个助手生成。", size: 13, color: C.faint },
  ] }; }
  if (m.k === "s2") return { hue: C.violet, kicker: "02 · Pinterest · cyh", title: "视觉灵感", href: P, hrefLabel: "Pinterest 主页 ↗", body: [
    { t: "p", s: "AGIBOT · 34 pins · 公开 —— 智元机器人上海总部展厅投标参考——白色弧形空间、橡木材质、紫色灯光、LED 与沉浸投影、互动装置、机器人手。" },
    { t: "sub", s: "代表 pins（星系核心）" },
    ...pins.map((p, i) => ({ t: "row", hue: C.violet, lead: `0${i + 1}`, title: p.t, sub: p.s, go: { k: "pin", i } })),
    { t: "sub", s: `全部画板 · ${boards.length} · ${allPins.length} 张图片` },
    ...["空间类", "项目类", "文化与艺术"].map(g => ({ t: "board-covers", label: g, indices: boards.map((board, i) => ({ board, i })).filter(({ board }) => board.g === g).map(({ i }) => i) })),
  ] };
  if (m.k === "pin") { const p = pins[m.i]; return { hue: C.violet, kicker: `AGIBOT · Pin ${String(m.i + 1).padStart(2, "0")}`, title: `${p.t} · ${p.s}`, href: `https://www.pinterest.com/pin/${p.id}/`, hrefLabel: "在 Pinterest 打开 ↗", body: [
    { t: "img", i: m.i },
    { t: "kv", k: "所属画板", v: "AGIBOT（34 pins，公开）" },
    { t: "kv", k: "用途", v: "智元机器人上海总部展厅投标参考——白色弧形空间、橡木材质、紫色灯光、LED 与沉浸投影、互动装置、机器人手" },
  ] }; }
  if (m.k === "board") { const b = boards[m.i]; return { hue: C.violet, kicker: `Board · ${b.g}`, title: b.n, href: P + b.p + "/", hrefLabel: "在 Pinterest 打开 ↗", body: [
    { t: "stats", items: [[String(boardPins[m.i].length), "图片", C.violet], [b.g, "分组"]] },
    ...(b.n === "AGIBOT" ? [{ t: "kv", k: "说明", v: "智元机器人上海总部展厅投标参考（公开）" }] : []),
    { t: "p", s: "点击图片放大查看，使用方向键或两侧按钮继续浏览。" },
    { t: "gallery", i: m.i },
  ] }; }
  if (m.k === "s3") { const shown = projects.map((p, i) => ({ p, i })).filter((o) => cat === "全部" || o.p.cat === cat); return { hue: C.teal, kicker: "03 · GitHub Archive", title: "AI 工作流收藏", href: REPO, hrefLabel: "1292974367-netizen/ai-workflow-collection ↗", body: [
    { t: "p", s: "助手维护 · 自 2026-11-09 起每周一 10:00（北京时间）更新 · 以仓库 README 为准", size: 13 },
    { t: "sub", s: "最推荐先试的 3 个" },
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
    if (b.t === "bar") return `<div class="preview-bar"><span class="preview-bar-label">${escapeHTML(b.l)}</span><span class="preview-bar-track" aria-hidden="true"><i style="width:${100 * b.v / b.max}%;background:${b.hue}"></i></span><strong>${b.v}</strong>${b.d ? `<small>${escapeHTML(b.d)}</small>` : ""}</div>`;
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
      return `<figure class="preview-image">${pin ? `<button type="button" class="board-pin-image" data-image="${pin.index}" aria-label="放大查看：${escapeHTML(pin.title)}" aria-haspopup="dialog" aria-controls="image-viewer">${image}</button>` : image}<figcaption>${escapeHTML(pins[b.i].t)} <span>AGIBOT / ${String(b.i + 1).padStart(2,"0")}</span></figcaption></figure>`;
    }
    return "";
  }).join("");
}

window.CYH = { C, projects, projectsUpdated, cats, pins, boards, boardPins, allPins, plans, reviews, dailies, latestDaily, moons, moonAngles, totalPins, images, getPanel, renderPanelBody, escapeHTML, P, REPO };
})();

