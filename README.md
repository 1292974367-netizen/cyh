# cyh
## Bot 更新约定

网站是纯静态页（无构建、无 fetch）。每个板块的数据只放在一个文件里，由一个 bot 负责：

| 板块 | 负责 bot | 文件 | 结构 |
|---|---|---|---|
| 工作复盘 | OB导播 | `data/reviews.js` | `window.CYH_REVIEWS = [{ id, date, type, label, moonSub, sub, headline, kicker, title, href, body }]` |
| 视觉灵感 | Pinterest打野 | `data/boards.js` + `assets/boards/pins-manifest.json` + `assets/boards/pins-data.js` + `assets/boards/<slug>/<pin_id>.jpg` | `window.CYH_BOARDS = { updated, boards: [{ n, slug, p, g, c }], featured: [{ t, s, id }] }`；pin 记录为 `{ board, pin_id, title, file, slug, pin_url }` |
| AI 工作流 | github收集者 | `data/projects.js` | `window.CYH_PROJECTS = { updated, cats: [[值, 显示名]], items: [{ cat, name, note, level, stars, top? }] }` |
| 后续规划 | 任一 bot / 手动 | `data/plans.js` | `window.CYH_PLANS = [[标题, 说明]]` |

- 复盘：`id` 唯一（如 `r05`），`date` 为 `YYYY-MM-DD`，`type` 为 `daily` 或 `overview`。`body` 由块组成：`{t:"p",s}`、`{t:"sub",s}`、`{t:"stats",items:[[值,标签,颜色?]]}`、`{t:"bar",l,v,max,hue}`、`{t:"li",items}`、`{t:"kv",k,v}`。颜色写名字：`amber` / `violet` / `teal` / `grey` / `faint`。日期最新的日报会自动标成 LATEST；月亮、时间线、页脚计数、轨道角度都从数据自动生成。
- `pins-data.js` 必须和 `pins-manifest.json` 内容一致（`window.CYH_PIN_MANIFEST = <manifest JSON>;`）。

规则：
1. 提交前先 `git pull --rebase`。
2. 只改自己负责的文件。
3. 提交信息以 bot 名开头，如 `OB导播: add 11-05 复盘`、`Pinterest打野: …`、`github收集者: …`。
4. 这是公开网站：只写工作内容，不写性格评价，不写私人原话或隐私信息。
