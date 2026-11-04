/* Native content, faithfully adapted from current-canvas-source.tsx. No network dependencies. */
(() => {
  "use strict";
const projects = [
  { cat: "入门", name: "KimYx0207/AI-Coding-Guide-Zh", note: "中文零基础教程，Codex 和 WorkBuddy 都有学习线和练习", level: "入门", stars: "约6.4k", top: true },
  { cat: "入门", name: "AlephAITech/WorkBuddyGuide", note: "《WorkBuddy 实战蓝皮书》，办公、会议、文件案例加指令模板", level: "入门", stars: "约3.7k" },
  { cat: "技能包", name: "anthropics/skills", note: "Anthropic 官方技能库，Word/Excel/PPT/PDF 文件技能，还能自己做技能", level: "入门~进阶", stars: "约18.7万", top: true },
  { cat: "技能包", name: "jnMetaCode/agency-agents-zh", note: "300+ 个中文 AI 专家角色，有项目管理部和会议纪要专家", level: "入门", stars: "约2.2万" },
  { cat: "技能包", name: "liuqing0224/interior-design-skills", note: "室内设计全流程 15 个技能，从需求到预算到交付，支持 Codex", level: "进阶", stars: "11（新项目）", top: true },
  { cat: "MCP", name: "mhyrr/sketchup-mcp", note: "把 SketchUp 接到 AI 上，一句话建模、改材质", level: "进阶", stars: "约530" },
  { cat: "MCP", name: "laowang-wy/adai-sketchup-skill-mcp", note: "中文作者为 Codex 做的 SketchUp 技能加 MCP（Windows、SU 2018/2019）", level: "进阶·备选", stars: "约90" },
  { cat: "MCP", name: "ahujasid/mcp-for-blender", note: "AI 控制 Blender，搭白模、调灯光、出氛围图", level: "进阶", stars: "约3.3万" },
  { cat: "MCP", name: "jingcheng-chen/rhinomcp", note: "Rhino 8 和 Grasshopper 接 AI，做异形和参数化造型", level: "进阶", stars: "约1.2k" },
  { cat: "效果图", name: "Comfy-Org/ComfyUI", note: "主流开源节点式 AI 生图工具，可本地运行", level: "进阶", stars: "约14.5万" },
  { cat: "效果图", name: "amir84ferdos/ComfyUI-ArchAi3d-Qwen", note: "室内设计用 ComfyUI 插件，情绪板出图、清理现场、换材质", level: "进阶", stars: "73" },
];
const cats = [["全部", "All"], ["入门", "AI 助手入门"], ["技能包", "技能包"], ["MCP", "操作设计软件 MCP"], ["效果图", "AI 出效果图"]];
const P = "https://www.pinterest.com/61c0c5872feda21f4161cef3b6f3d6/";
const pins = [
  { t: "ONE THOUSAND", s: "LED 光装置", id: "725361083779457865" },
  { t: "Refik Anadol", s: "DATALAND", id: "725361083779457864" },
  { t: "Flux 2023", s: "互动光装置", id: "725361083779457863" },
  { t: "互动投影沙盘", s: "Interactive projection", id: "725361083779457856" },
  { t: "Touching the Future", s: "灵巧手", id: "725361083779457815" },
  { t: "Google 米兰展", s: "Lachlan Turczan", id: "725361083779457777" },
];
const boards = [
  { n: "建筑", c: 35, p: "%E5%BB%BA%E7%AD%91", g: "空间类" },
  { n: "AGIBOT", c: 34, p: "agibot", g: "空间类" },
  { n: "展示设计", c: 21, p: "%E5%B1%95%E7%A4%BA%E8%AE%BE%E8%AE%A1", g: "空间类" },
  { n: "大堂", c: 11, p: "%E5%A4%A7%E5%A0%82", g: "空间类" },
  { n: "屏风", c: 8, p: "%E5%B1%8F%E9%A3%8E", g: "空间类" },
  { n: "店铺", c: 1, p: "%E5%BA%97%E9%93%BA", g: "空间类" },
  { n: "电梯间", c: 1, p: "%E7%94%B5%E6%A2%AF%E9%97%B4", g: "空间类" },
  { n: "中望", c: 9, p: "%E4%B8%AD%E6%9C%9B", g: "项目类" },
  { n: "潮流文化", c: 15, p: "%E6%BD%AE%E6%B5%81%E6%96%87%E5%8C%96", g: "文化与艺术" },
  { n: "插画与海报", c: 1, p: "%E6%8F%92%E5%9B%BE%E4%B8%8E%E6%B5%B7%E6%8A%A5", g: "文化与艺术" },
];
// Folder slugs are stable even when a source board uses a different display spelling.
const boardSlugs = ['architecture', 'agibot', 'exhibition', 'lobby', 'screen', 'store', 'elevator', 'zhongwang', 'street-culture', 'illustration-poster'];
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
const plans = [
  ["空间设计案例库", "按办公、商业、展陈、住宅分，记亮点与可借鉴点"],
  ["材料与工艺", "材质样板、灯光做法、节点细节"],
  ["AI 提示词与工具对比", "Codex、WorkBuddy 实际用法"],
  ["项目管理模板", "进度表、汇报结构、客户沟通"],
  ["灵感随手记", "想法与好网站"],
];
const STORE = "https://cursor.com/canvas/store-7e786459-5757-43f9-8c11-12c7bc1f48d9/";
const URL03 = STORE + "86d0c0ac-16dc-4553-8f7e-998ec5804c71";
const URL02 = STORE + "fed40481-b35b-4a84-871d-2854cc594e20";
const URLALL = STORE + "119bd9c9-5e8d-4121-b1cb-fbcae8d75463";
const REPO = "https://github.com/1292974367-netizen/ai-workflow-collection";
const totalPins = boards.reduce((s, b) => s + b.c, 0);

/* fixed night-sky palette (user asked for dark in both host modes) */
const C = {
  bg: "#0a0f1e", panel: "rgba(13,19,38,0.9)", ink: "#e8ebf5", mute: "#a2aac4", faint: "#69718f",
  rule: "rgba(190,200,240,0.16)", hair: "rgba(190,200,240,0.08)",
  amber: "#f2b866", violet: "#a9a2ff", teal: "#6fd6d0", grey: "#8a90a6",
};


const moons = [
  { k: { k: "r03" }, label: "11-03 日报", sub: "LATEST", a: -40, pa: -35, done: true },
  { k: { k: "all" }, label: "11-03 全局梳理", sub: "OVERVIEW", a: 20, pa: 35, done: true },
  { k: { k: "r02" }, label: "11-02 日报", sub: "补发", a: -110, pa: -145, done: true },
  { k: { k: "wk" }, label: "周报 11-09", sub: "待生成", a: 110, pa: 145, done: false },
  { k: { k: "mo" }, label: "月报 12-01", sub: "待生成", a: 170, pa: 90, done: false },
];
const images = pins.map((_, i) => `assets/pin-${String(i + 1).padStart(2, "0")}.jpg`);
function getPanel(key, index = 0, cat = "全部") {
  const m = typeof key === "object" ? key : { k: key, i: index };
  if (!m || ((["pin","board","gh","plan"].includes(m.k)) && (!Number.isInteger(m.i) || m.i < 0 || m.i >= ({pin:pins,board:boards,gh:projects,plan:plans}[m.k]).length))) return null;
  if (m.k === "s1") return { hue: C.amber, kicker: "01 · Review", title: "工作复盘", body: [
    { t: "p", s: "最新：2026-11-03 日报（OB导播）—— 首个完整记录日。周报与月报由另一个助手生成。" },
    { t: "sub", s: "Timeline" },
    { t: "row", hue: C.amber, lead: "11-02", title: "工作日报 · 2026-11-02", sub: "补发 · 深夜约 70 分钟，启动三个助手", go: { k: "r02" } },
    { t: "row", hue: C.amber, lead: "11-03", title: "工作日报 · 2026-11-03", sub: "电脑活跃 8.6 小时 · 切换 162 次 · 动手设计 38 分钟", go: { k: "r03" } },
    { t: "row", hue: C.amber, lead: "11-03", title: "工作全局梳理 · 2026-11-03", sub: "4 个项目 · 5 个 bot · 建议", go: { k: "all" } },
    { t: "row", hue: C.faint, lead: "11-09", title: "周报", sub: "首份 00:30 生成（北京时间）", go: { k: "wk" } },
    { t: "row", hue: C.faint, lead: "12-01", title: "月报", sub: "首份 00:45 生成（北京时间）", go: { k: "mo" } },
  ] };
  if (m.k === "r03") return { hue: C.amber, kicker: "Daily Report · OB导播", title: "工作日报 · 2026-11-03", href: URL03, body: [
    { t: "p", s: "首个完整记录日。电脑活跃 8.6 小时，切换 162 次；Codex 占时最多，动手设计仅 38 分钟。晚上远程到 22:47，另有 22:00 会议。" },
    { t: "stats", items: [["10:14", "开工（手机）"], ["22:47", "最后操作"], ["8.6h", "电脑活跃", C.amber], ["162", "应用切换"]] },
    { t: "sub", s: "时间去向 · 按项目（分钟）" },
    ...([["Codex（项目不明）", 188], ["沟通", 135], ["AGIBOT", 96], ["美的", 36], ["Bot 与工具", 31], ["其他", 22], ["豆包·动线翻译", 18]]).map(([l, v]) => ({ t: "bar", l, v, max: 188, hue: C.amber })),
    { t: "sub", s: "一天的形状" },
    { t: "li", items: ["在公司 10:28–12:24、12:58–19:23（午间离开约 34 分钟）", "向日葵远程 20:10–22:47，次日 00:37 断开", "19:00 后 91 分钟 + 22:00 会议", "美的标牌 AI v15 → v21；AGIBOT 4F 模型 v01 → v02"] },
    { t: "sub", s: "待你处理（状态截至写报告时）" },
    { t: "li", items: ["P1 回复 Wuj：worken 是什么、五次跨越是什么（Miro）", "P1 验收 4F Blender v02 效果图与俯视图（AGIBOT）", "P1 确认美的标牌 AI v21 对齐是否定稿", "P2 确认 3F 平面已按 Miro 新 layout 更新", "P2 放宽 codex判官截图审批规则", "P3 Pinterest 2 条错存视频；图版是否私密", "P3 每天盯板？装 Excel 技能？"] },
    { t: "sub", s: "评价" },
    { t: "kv", k: "做得好", v: "太多就立刻叫停并给硬上限（100 张）；重视落盘位置；多线并行仍在推进" },
    { t: "kv", k: "留意", v: "162 次切换；动手设计只有 38 分钟（7%）；远程到 22:47" },
  ] };
  if (m.k === "r02") return { hue: C.amber, kicker: "Daily Report · 补发", title: "工作日报 · 2026-11-02", href: URL02, body: [
    { t: "p", s: "补发日报。白天无电脑记录；可见工作为深夜约 70 分钟，启动三个专职助手。" },
    { t: "stats", items: [["23:59–01:08", "可见时段", C.amber], ["3", "启动助手"], ["57", "AGIBOT 图版（当时）"]] },
    { t: "sub", s: "深夜协作（分钟）" },
    { t: "bar", l: "收集者", v: 69, max: 69, hue: C.amber, d: "23:59–01:08" },
    { t: "bar", l: "Pinterest打野", v: 51, max: 69, hue: C.amber, d: "00:07–00:58" },
    { t: "kv", k: "OB导播", v: "约 00:32 起；记录器约 00:40 上线" },
    { t: "sub", s: "AGIBOT 项目" },
    { t: "kv", k: "地点", v: "上海前滩源 T3" }, { t: "kv", k: "内容", v: "智元 AGIBOT 全球形象总部展厅 · 约 3,715 ㎡" }, { t: "kv", k: "叙事 / 阶段", v: "IT TAKES TWO · 投标第二轮" },
    { t: "sub", s: "交付" },
    { t: "li", items: ["收集者：10 仓清单 +《GitHub 入门指南》；ai-workflow-collection PR #1 于 01:08 合并", "Pinterest打野：读完 180 页方案后分三批收图，共 57 条", "OB导播：记录器上线，文件落 E 盘"] },
    { t: "sub", s: "待你处理" },
    { t: "li", items: ["2 条错存至「展示设计」的视频是否挪到 AGIBOT", "AGIBOT 图版是否改为私密", "是否在 Codex 安装 Excel 技能"] },
  ] };
  if (m.k === "all") return { hue: C.amber, kicker: "Overview · 全局梳理", title: "工作全局梳理 · 2026-11-03", href: URLALL, body: [
    { t: "p", s: "从「设计空间、出图」变成了「调度聊天线程」：方案散在多条 Codex 会话和三个沟通渠道里，没有一个当天的唯一目标。" },
    { t: "stats", items: [["4", "Codex 项目"], ["162", "应用切换"], ["36%", "Codex 窗口"], ["7%", "动手设计", C.amber]] },
    { t: "sub", s: "项目状态" },
    { t: "kv", k: "智元 AGIBOT", v: "投标第二轮 · 4F Blender v02 出图；3F 平面 V04 → 回 Wuj 评论、验收 4F、确认 3F" },
    { t: "kv", k: "美的", v: "10/28 反馈修改 · 标牌 AI v15→v21 → 确认 v21 定稿" },
    { t: "kv", k: "华子 / MM", v: "状态未知" },
    { t: "sub", s: "建议" },
    { t: "li", items: ["每天定一个目标：10:00 OB导播问一句，晚报对照", "一个项目只留一条 Codex 主线程，结论导出成文件", "按时间块干活：上午 AGIBOT，下午美的；消息 11:30 / 17:30 集中回", "bot 汇报合并；一周内不再新建 bot", "22:00 以后不再派新的 Codex 任务"] },
  ] };
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

window.CYH = { C, projects, cats, pins, boards, boardPins, allPins, plans, moons, totalPins, images, getPanel, renderPanelBody, escapeHTML, P, URL03, URL02, URLALL, REPO };
})();

