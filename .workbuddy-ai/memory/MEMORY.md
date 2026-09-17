# 数字管理研究院 · 学术门户 —— 长期项目记忆

## 项目定位

学术门户站点（Astro 5 静态输出）+ 内容发布后台（Vite + React 19 + MUI v7，独立应用）。
内容唯一数据源是 `src/content/**` 的 MDX 文件；后台只是这些文件的图形界面。

## 技术基线（不要轻易改动）

| 层 | 选型 | 约束 |
|---|---|---|
| 站点 | **Astro 7** + TypeScript strict | **默认零 JS**，交互只走 React 岛（`client:visible`） |
| 样式 | Tailwind CSS v4（`@theme`） | `src/styles/tokens.css` 是设计令牌**唯一真源**，改颜色/字号只改这里 |
| 后台 | Vite + React 19 + MUI v7 | **不引入 MUI X**（ADR-02）；5 个图标用 `SvgIcon` 内联，不装 `@mui/icons-material` |
| 后台 API | `admin/server.mjs`，Node 原生 HTTP + js-yaml | 零框架依赖；只监听 127.0.0.1，**无鉴权**，不可暴露公网 |
| 图标 | 无图标库 | 装饰用 `AbstractFigure`（确定性 SVG），UI 图标手写内联 SVG（24×24 / `currentColor` / `aria-hidden`） |
| 搜索 | 构建期生成 `search-index.json` + 前端过滤 | 未用 Pagefind；>500 条或需中文分词时再评估 |
| 图片 | **仅 1 张位图** | `public/images/image-1789142094159-vkt8.png`（1.0 MB，被 `news/2026-award.md` 的 `cover` 引用）；无 `src/assets/`、无 `astro:assets` 流水线 |

> ⚠️ **版本号勘误（2026-09-17 实测）**：本文件与他处文档曾写「Astro 5」，但
> `package.json` 声明 `astro ^7.3.2`、`node_modules/astro` 实际为 **7.3.2**，
> 且下文「Astro 7 默认 Markdown 处理器是 Sätteri」那条记忆是**正确的**（已核实
> `node_modules/satteri` 与 `astro` 依赖 `@astrojs/markdown-satteri@0.4.1` 均存在）。
> 故基线应为 **Astro 7**；`README.md` / `PORTAL_FRAMEWORK.md` 中的「Astro 5」属遗留表述。
>
> ⚠️ **「全站无位图」已不成立**：实测 `public/images/` 下有 1 张 1.0 MB PNG，
> 被 `src/content/news/2026-award.md` 的 `cover: /images/image-1789142094159-vkt8.png` 引用，
> 出现在 `dist/index.html` 与 `dist/news/2026-award/index.html` 两页。
> 全站其余配图仍走 `AbstractFigure` 内联 SVG 回落。

## 内容交叉链接的可靠依据

一律**按姓名精确匹配**，不要用文本相似度：

- **项目 → 成员**：`project.members` 与 `people.data.name`；匹配到才链 `/people/:slug`，否则纯文本。
- **项目 → 成果**：`publication.authors` 与 `project.members` 有交集。
- **成员 → 项目**：反向同上（`projects.members` 含此人），在研优先。
- **成果 → 成员**：`publication.authors` 匹配 `people.data.name`；**外部合著者保持纯文本**，不要整行不可点。
- **成员/项目 → 方向**：**主证据是 `people.researchAreas` 与 `research.title` 完全相同**；
  关键词兜底（方向 `keywords` 出现在标题/摘要）只能作补充 —— 只靠兜底会长期为空（如「定价机制」不匹配任何 keyword）。
- **活动 → 相关活动**：同 `type` 优先，不足时用近期其他活动补足。

## 质量门禁补充：内部链接

`npm run audit` 校验 **3150 条内部链接**的路由与锚点（LINK-001 死链 / LINK-002 坏锚点）。
`/admin` 在白名单里（独立部署，不在 dist）；`rss.xml` 等非 HTML 端点也算合法目标。
**改完链接相关代码必须跑 audit。** 新增检查后务必做反向测试（注入坏链接确认会报警），否则可能是个永不触发的假检查。

## CSS 变量命名

吸顶高度只有一个令牌：**`--nav-h`**（52/48/44px）。历史上还有同义别名 `--header-h`，已移除
—— 两个名字同值是漂移隐患，别加回来。侧栏吸顶偏移统一 `calc(var(--nav-h) + 1.5rem)`；
筛选栏这类要紧贴导航的用 `var(--nav-h)`。

描边令牌是 **`--color-line` / `--color-line-strong`**（不是 `--color-border`，文档里曾写错，已校正）。
`--color-masthead-soft` 与 `--color-info` 引用数为 0，已删除。

## 配色：先量后改，不靠肉眼

配色是主观的，但**对比度是可测量的**。改颜色前先算一遍：
色相分布（是否只有一个 accent、是否混了冷暖灰）+ WCAG 对比度。
**改完必须跑 `npm run contrast`**，它会逐条核对 22 组真实在用的文字组合。

**美学方向 = Institutional Academia（学术机构风）**，不是 Editorial Academia。

**中性层一律 H0 / S0%（纯中性灰），禁止暖调米白。**
依据是抓四家真实研究机构样式表解析色值的实测结论（清华国情院 / 北大国发院 / NBER）：
**中性饱和度全在 0-7%，没有一家用暖米白**。暖调画布（历史值 `#F7F7F5`，H60 S11%）会读成
「杂志 / 设计工作室」而不是机构。主色深靛 `#1D4E89` 保留（冷调蓝是 NBER 一路的机构用色）。

**已固化的事实**：
- 单一 accent `#1D4E89`，纯中性灰打底 —— 不要引入第二个彩色。
- **`--color-ink-tertiary: #686868`** 承载 10-12px 小字（76 处调用）。
  **最不利背景是 `--color-accent-soft` `#eaf0f7`（4.86:1），不是 surface-subtle** ——
  历史值 `#6e6e66` 在其上仅 4.48:1，会被 `npm run contrast` 拦下。别再调浅。
- 深底文字层级统一走 `--color-on-masthead*`（由 `ink-invert` 经 `color-mix` 派生）+ `--color-scrim`。
  **不要再往组件里写 `rgba(247,247,245,·)` 或 `text-white`** —— 那是画布色的副本，改配色时不会跟着变。
- 语义色（success/warning/error）当前**一处未用**，且**不在 contrast 门禁覆盖内**（该门禁只收真实在用组合）。
- `--color-fig-d: #7a8798` 已从暖铜 `#a98c62` 校正为同族冷灰蓝。

**同一机制禁止写两套令牌**：焦点环曾有 `outline` + `--shadow-focus` 两套并存，
属同义双写漂移隐患（同 `--header-h` 与 `--nav-h` 那类），`--shadow-focus` **已删除**。

## 必守约定

1. **每个页面有且只有一个 `h1`，标题层级不跳级。** `SectionHeading` 默认渲染 `h2`，传 `level={3}` 前必须先确认中间有 `h2`，否则 `npm run audit` 会报跳级。
2. **新增交互脚本必须遵守 `docs/PAGE_SPECIFICATION.md` §2.6**：页面用 `ClientRouter`（View Transitions）换页后，脚本不会重新执行。Mega Menu 的 `openedByClick` 就是为规避「悬停打开后点击立即关闭」而设。
3. **筛选状态必须写入 URL query**，保证可分享可恢复。
4. `src/content.config.ts` 与 `admin/server.mjs` 的 `COLLECTIONS` **必须保持一致**，否则后台能存、站点构建失败。
5. `<title>` 上限 60 字符，超长由 `SeoHead.astro` 自动截断，不要去改内容标题。
6. **`theme-color` meta 由构建期从 tokens.css 派生**（用 Vite `?raw` 导入）。
   不能用 `import.meta.url` + `readFileSync` —— 组件打包进 `dist/.prerender/chunks/` 后相对路径 ENOENT，构建直接失败。
7. **`.astro` 里的开发注释一律写 `{/* */}`，不要写 `<!-- -->`。**
   Astro 会**原样输出** `<!-- -->` 到 HTML（不像 JSX 自动剥注释），等于把内部备注发给访客，
   且 `taste.mjs` 会先剥注释再分析，永远发现不了。已固化为 `HYG-001`。
8. **整卡可点用 `.stretched-link`，不要用 `<a>` 套 `<a>`。**
   卡片本体用 `<div class="relative">`，主链接加 `.stretched-link`（`::after` 铺满整卡），
   卡内次要链接加 `.stretched-link-above`（`relative z-1`）。嵌套 anchor 是非法 HTML。

## 首页区块设计：不要三块长一样

`PORTAL_FRAMEWORK.md` §58 的意图是**「非对称双栏、细发丝分隔线、网格可打破 —— 区别于卡片堆叠的模板化门户」**。
2026-09-13 之前首页有 3 个区块（要闻 / 研究方向 / 专题）用同一套 `.portal-card`，**与这条自述意图矛盾**。
现状（改后）：

- **要闻**：非对称 —— 头条占 2/3 带图 + 右栏 2 条纯文字简讯（用「有图/无图」建立层级）。
- **研究方向**：**不配图**，发丝线分隔的排版式四栏（`gap-px` + `bg-line`），底部显示「负责人」（stretched-link 链到 `/people/:slug`）。
- **专题专栏**：保留图卡（首页仅剩的图卡网格）。
- **数据统计**：`gap-px` + `bg-[var(--color-on-masthead-line)]` 画发丝线，读作一张数据表。

**新增图卡前先想清楚**：全站无位图，卡片配图全是 `AbstractFigure` 内联 SVG（**每个约 2 KB 直接进 HTML**）。
首页精简掉 6 个内联图形后从 **101.5 KB 降到 88.6 KB**。图形不是免费的。

**首页 h2 = 9、眉标签 = 3，正好卡在 `TASTE-001` 上限 `ceil(9/3)=3`**：
加区块可以（加 h2 会抬高上限），但**不能凭空再加眉标签**。

## 质量门禁（改动后必跑）

```bash
export CODEBUDDY_SAFE_DELETE_ENABLED=0   # 沙箱 safe-delete 会拦截 dist 清理
npm run build && npm run audit && npm run taste && npm run contrast && npm run docs:tokens && npm run smoke
```

- `audit` —— 静态扫 `dist/`：a11y（h1 唯一、标题跳级、alt、可访问名称、表单 label）+ SEO（title/description/canonical/og）+ JSON-LD 可解析与类型分布 + 内部链接 + 资源体积 + **产物洁净度 `HYG-001`**。发现问题**退出码 1**。
  - `HYG-001`：产物 HTML 里不得出现**有内容**的注释（Astro 自身的空 `<!-- -->` 与 `<!--astro:end-->` 不算）。
    由来：4 个源文件的 21 处 `<!-- -->` 渲染到 51 页共 **472 处 / 16.5 KB**，把内部备注发给了访客。
  - 该规则可**直接往 `dist/index.html` 注入注释来反向测试**，不必重新构建。
- `taste` —— 设计品位门禁（`scripts/taste.mjs`）：破折号清零、眉标签克制、圆角尺度单一等 8 条。
  **只收能正则可靠判定的项**；对齐/节奏/图片质量静态查不出，宁可不查也不放假检查。
- `contrast` —— 色彩对比度门禁（`scripts/contrast.mjs`）：解析 tokens.css，22 组真实在用文字组合一律 ≥ 4.5:1。
  **统一从严取 4.5:1 不分级**（判断"大字能否只到 3:1"要跑完整 CSS 层叠算字号，成本高易误判）。
  半透明层级按**合成后实色**算。配对表**只收真实在用组合**，不收"以后可能用"的（否则变假检查）。
- `docs:tokens` —— 文档 / 令牌一致性（`scripts/docs-tokens.mjs`）：反查 docs/ 引用的每个令牌是否都有定义。
  跳过 `---`、通配前缀、以及 DELETED 白名单（故意警告"已删除"的）。
- `smoke` —— 30 条 HTTP 断言：状态码 + 内容片段 + Content-Type。
- 三项都零依赖，不引入测试框架。**新增检查必须做反向测试**（注入坏数据确认会报警），否则可能是永不触发的假检查。

## 设计品位硬规则（taste-skill 落地后固化）

- **眉标签克制**：`SectionHeading` 的 `eyebrow` **可选，默认不写**。每页眉标签数 ≤ `ceil(区块数/3)`。
  首页 9 个区块只保留 3 个（`Notices` / `Research` / `Topics`），间隔 ≥3 区块。
  `PageHero` 的 `eyebrow` 是页面级标签，每页 1 个，不受此限。
- **破折号清零**：可见文本里不出现 `—` / `–`。并列用 `、`/`/`，区间用半角 `-`（`2024.09-2027.08`）。
  代码注释不受限（不进入 dist）。
- **阴影色相向背景偏**：暖灰画布 `#f7f7f5` 上不用冷调近黑 `rgba(26,26,26,·)`，用 `rgba(60,57,48,·)`。
- **圆角只有 3 / 6 / 10px 三档**，不引入 pill / 2xl。
- 与项目 ADR 的**已知冲突**（有意保留，勿擅自"修正"）：
  §4.8「必须用真实图片」↔ ADR「全站无位图」；§3.C「禁止手写 SVG 图标」↔ ADR-02「不引图标库」。
  这两条要改必须先问用户。

## 环境坑（会重复踩）

- **`export CODEBUDDY_SAFE_DELETE_ENABLED=0`**：否则 `astro build` 清 `dist` 时报 `[vite] ✗ Build failed`，是沙箱拦截不是代码问题。
- **npm install 在此沙箱会卡死在 reify**（多次尝试累计约 45 分钟，换镜像无效）。`admin/` 因嵌套在站点内，直接复用站点 `node_modules`（Node/Vite 向上查找），不要再尝试安装。
- ~~**`admin/node_modules` 处于半解包状态**（`@mui/material/package.json` 缺失）~~ **此条已过时（2026-09-17 实测）**：
  `admin/node_modules/@mui/material/package.json` 存在，顶层 86 个包，`@mui/x-data-grid` 无残留目录，
  且 `cd admin && npm run build` **通过（exit 0）**，产物 hash 与已存 `dist/assets/index-Cv1BEE28.js` 一致。
  即后台依赖已完好，无需再 `rm -rf node_modules && npm install`。
- **`agent-browser` 不可靠**：`eval` / `snapshot` / 截图对真实页面返回空值（已用静态站对照确认）。Lighthouse、axe、四档视口视觉回归**无法在本沙箱完成**，需在 CI 或有 GUI 环境补跑。
- 预览用 `http://localhost:4321`，不要 `127.0.0.1`（Astro 绑 IPv6 会 502）。每次构建后**重启预览服务器**，否则 cwd 陈旧返回目录列表。
- **Edit 工具偶发静默回滚**：每次编辑后用 `grep` 立即验证，否则会以为改了其实没改（本次发生过 4 次）。
- **`taskkill //PID` 在 Git Bash 下报「无效参数/选项」**（参数被路径转换吃掉）。杀进程改用 PowerShell 的 `Stop-Process -Id <pid> -Force`。
- **后台预览服务不要用裸 `&`**：`npm run preview &` 跨工具调用不可靠会死掉（smoke 报 ECONNREFUSED）。
  用 Bash 工具的 `run_in_background: true` 托管，结束用 `TaskStop`。
- **内联 `node -e` 的正则会被 bash 吃掉反斜杠**（`\s` → `s`，直接 SyntaxError 或静默算错）。
  **一律写真实 `.mjs` 文件**再执行，不要用 `node -e`。此坑已重复踩多次。
- **Tailwind 会把 `rgba(58,58,58,0.05)` 压成 8 位 hex `#3a3a3a0d`**；
  `color-mix` 产物是 `color-mix(in srgb, var(...) 82%, transparent)`（**逗号后有空格**）
  且**同时输出预计算 fallback + `@supports` 包裹**。
  用字面量 grep 验证"令牌有没有产出"时极易误判 —— 先 `grep -o` 看真实形态再下结论。
- **构建期读取源文件用 Vite 的 `?raw` 导入**（`import x from '../styles/tokens.css?raw'`）。
  `import.meta.url` + `readFileSync` 在打包后会指向 `dist/.prerender/chunks/`，构建直接 ENOENT 失败。
- **`dist/.prerender/` 构建完成后会被清理**，不要指望事后去 grep 中间 chunk 来验证构建期逻辑；
  要验证就做端到端反向测试（注入哨兵值 → 构建 → 看产物 → 还原）。
- **Astro 7 默认 Markdown 处理器是 Sätteri，`markdown.remarkPlugins` / `rehypePlugins` 不再是默认管线。**
  在 `astro.config.mjs` 写 `markdown.remarkPlugins` 会直接 config 校验失败：
  「run on the `unified` processor from `@astrojs/markdown-remark`, which is no longer installed by default...
  Install it with: npm install @astrojs/markdown-remark」。
  **要给 `.md`/`.mdx` 加 remark/rehype 插件，必须先 `npm i @astrojs/markdown-remark`**（沙箱装不了，会卡死）。
  当前正文富文本靠 MDX 原生渲染 + `typography.css` 的 `prose-academic` 扩展（h4 / figure / figcaption）支撑。

## ✅ 版本控制：已迁出父仓库并独立初始化（2026-09-17）

**历史**：本站原位于 `D:/Research/Python数据工作台_2026-07-22/数字管理研究院网站`，
被父仓库 `.gitignore` 第 78 行显式排除、自身无 `.git` → `git ls-files .` 返回 0，等于完全没有版本控制，
`.github/workflows/ci.yml` 永不触发。`git status` 显示 "clean" 是假象。

**现状**：2026-09-17 已整体迁移到 **`D:\数字管理研究院网站`**（用户确认「直接移动、原位置删除」），
并 `git init` 建了**独立仓库**（`git rev-parse --show-toplevel` = `D:/数字管理研究院网站`）。
**尚未做首次提交**（用户选择「初始化但不提交」），142 个源文件处于未跟踪状态。
`.gitignore` 已补 `admin/tmp/` 与 `admin/.tmp-*`（构建/调试临时产物，非源码）。

**迁移副作用（已实测，属改善非回归）**：CSS 产物由 76 KB 降到 48 KB（gzip 14.6 → 9.4 KB）。
原因是 Tailwind v4 会自动向上探测内容，原先站点嵌在父仓库内，把父仓库的
`src/styles.css`(111 KB)、`src/notebook.css`(37 KB) 等文件的词当成类名候选，
凭空生成了 482 个本站从未使用的选择器（`.float-end`、`.bg-red-500`、`.align-text-bottom` 等）。
移出后探测范围只剩站点自身，垃圾自然消失。**已验证 HTML 用到的 class 覆盖率新旧完全一致**
（新旧 CSS 都是同样 3 个"孤儿"，且那 3 个是我正则漏转义 `+` 的假阳性，规则真实存在）。

## 首页焦点轮播（唯一自动播放，受严格约束）

`src/components/ui/Carousel.astro`（5 屏 / 5.5s / 循环）。它是站内**唯一**允许自动播放的组件，
必须满足：可暂停按钮、`prefers-reduced-motion` 默认静止、悬停与焦点暂停、`document.hidden` 不计时、方向键可达。
**不得扩展到成果 / 活动 / 专题等任何列表或详情页。**

初始化挂在 `astro:page-load` 上。**已踩过的坑**：`initCarousel()` 首次加载执行两次（末尾手动调用 + `page-load` 触发），
若每次 init 都清空全部定时器，第二次会清掉第一次的、又因幂等标记提前 return 不重建 → 自动播放永远不动。
正解是 `Map<HTMLElement, number>` 记每个 root 的定时器，**只在 `!root.isConnected`（换页后旧 DOM）时清理**。

slide 标题一律 `h2`（首页 `h1` 在报头，轮播出现 `h1` 会破坏唯一 h1 审计）。

## 体积预算：一律以 gzip 后为准

未压缩的 Tailwind 产物会误导判断（CSS 未压缩 73 KB，gzip 后仅 14.3 KB，压缩率 19%）。
`npm run audit` 会同时打印压缩前后两项，并按 **JS ≤ 30 KB / CSS ≤ 20 KB（gzip）** 校验。

两条**已被实测排除**的误判，勿再排查：
1. ~~轮播导致 CSS 膨胀~~ —— A/B：75,083 vs 74,901，轮播只贡献 182 字节；其自写样式 3.1 KB 被 Astro 内联进 `index.html`，只在首页加载。
2. ~~`@source` 扫到 `src/content` 的 MDX~~ —— 收窄后 75,128 B，几乎无变化。（收窄仍保留，属正确性问题：MDX 正文不应当类名来源。）

体积主体是 Tailwind utilities 层（46 KB 未压缩 / 约 1000 条规则），是工具类 CSS 的固有形态。
真要压，方向是减少 `index.astro` 的**任意值写法**（`text-[1.1875rem]` 这类），改为在 `tokens.css` 定义语义令牌。

## 当前基线（2026-09-13 首页区块重塑后复验）

**51 页** · 内容 43 条（成果 10 / 通知 7 / 新闻 6 / 活动 5 / 人员 4 / 方向 4 / 项目 4 / 专题 3）
· audit 零告警（**3537 条内部链接** + 83 个 JSON-LD 块 + HYG-001 洁净度）· taste ✅ ·
contrast 22/22 ✅ · docs:tokens ✅ · smoke 30/30
· HTML 均值 37 KB/页（**最大 88.6 KB 首页**，此前 101.5 KB）· gzip JS 8.6 KB / CSS 14.5 KB · dist 1.85 MB。
BibTeX 引用键 10/10 唯一。

结构化数据：`ResearchOrganization`×51 · `ScholarlyArticle`×10 · `NewsArticle`×6 · `Event`×5 ·
`Person`×4 · `CreativeWork`×4 · `CollectionPage`×3。

CI：`.github/workflows/ci.yml` —— `build → audit → taste → contrast → docs:tokens → smoke`
+ 单独构建 `admin/`，两个 job 都用 `npm ci`。
（⚠️ 但本站未被任何 git 仓库跟踪，CI 实际不会触发 —— 见「版本控制」一节。）

**未完成**：`/500`（静态站由托管平台兜底，不实现）。
未选做的候补：`/datasets` 集合化、`/notices/:slug` + `/join` 集合化、英文版（i18n）。

## 专题（topics）聚合的铁律

专题页靠 `keywords` 聚合成果/活动/项目/动态/人员，**各区块是条件渲染**：
关键词匹配不到 → 整块静默消失 → 静态审计不报错 → 只有肉眼看才发现。
**新增/修改专题后必须 grep dist 里的交叉链接数确认非空。**

关键词必须取自其他集合**真实使用**的词。踩过两次：专题写「公共数据开放」而项目/活动用的是
「公共数据授权运营」；写「可解释性」匹配不到「可解释决策」。宁可多写一个更短的兜底词。
聚合结果为空要判断是「规则失效」还是「真实内容缺口」——后者不要靠硬塞关键词凑数。

## 写文档的经验

设计文档天然混入「打算做」的内容。收尾时**必须做一次名词反查**：把文档里每个组件名、路由名、依赖名拿去 `find` / `grep` 验一遍。
本次靠这一步查出 4 类失真（一半组件不存在、Lucide 未安装、「6 个模板」实为 1 个文件、搜索写的是 Pagefind 实为自建索引）。

**这一步已固化为门禁**：`npm run docs:tokens`（`scripts/docs-tokens.mjs`）反查 docs/ 里引用的每个
`--xxx` 令牌是否都在 tokens.css 有定义。`DESIGN_SYSTEM.md` 已两次漂移（列过不存在的
`--color-border` / `--color-info` / `--shadow-focus`），靠人肉守不住。

**第二次反查的战果（§3 组件表）**：8 个写成组件的名字里，**只有 `Skeleton` 是真幻觉**（全站 0 引用），
其余是**样式类**（`Button`→`.btn-*`、`Tag`→`.tag-quiet`、`Card`→`.portal-card`）或
**内联模式**（`FilterBar`/`Dialog`/`MegaMenu`/`BibTeXBlock`）。
→ 教训：反查要区分「不存在」与「存在但形态不同」，**判据是 `find src/components -name "<名字>.astro"`**；
§3 已加「形态」列（组件 / 样式类 / 内联模式）。别把样式类误报成缺失功能。

**文档里的令牌名与数值都要能被验证**：`DESIGN_SYSTEM.md` §1.7 的阴影表曾漂移成旧的
`rgba(26,26,26,·)`（实际早改成中性灰），§1.1 曾断言"对比度全部满足 AA"而实际不满足。
→ 现在 §1.1 的对比度列直接标注"即 `npm run contrast` 的实测输出"，文档与门禁同源。
