# 数字管理技术研究院 · 学术门户网站前端框架

> 版本：v1.0（框架基线）
> 状态：待评审
> 适用仓库：`数字管理研究院网站/`（目录名沿用建站时的旧称，研究院现用名为数字管理技术研究院）

---

## 0. 框架依据

本框架不是凭空设计，而是由三类既有资产推导而来：

| 来源 | 位置 | 采纳内容 |
|---|---|---|
| 前端设计规范（既有产品基线） | `../docs/DESIGN_TOKENS.md`、`INTERACTIONS.md`、`ACCESSIBILITY.md`、`APP_SHELL.md`、`INFORMATION_ARCHITECTURE.md` | 令牌结构、间距与字号阶梯、动效时长与缓动、无障碍基线（WCAG 2.2 AA）、响应式断点策略 |
| 前端技能 `frontend-design` | 插件市场 `codebuddy-plugins-official/plugins/frontend-design` | 先定美学方向再写代码；拒绝通用 AI 审美（不用 Inter/Roboto/紫渐变）；字体要有性格；动效服务状态而非装饰 |
| 前端技能 `ui-ux-pro-max` | `cb_teams_marketplace/plugins/modern-webapp/skills/ui-ux-pro-max` | 设计系统检索结果：学术门户 → **Exaggerated Minimalism** 风格、**EB Garamond / Crimson Text** 衬线标题、中性灰 + 链接蓝、反模式「导航贫弱 + 无搜索」 |
| 前端技能 `frontend-design-pro` | `external_plugins/frontend-design-pro/skills/design-wizard` | 设计原则、无障碍准则、反模式清单（作为交付前自检） |

---

## 1. 定位与受众

### 1.1 站点定位

数字管理技术研究院的**学术门户**：对外承载机构身份、研究方向、人才队伍、学术产出与学术活动；对内作为成果归档与检索入口。它不是营销落地页，也不是在线教学平台（教学平台是既有 `Python Data Studio`，本门户通过外链衔接，不重复实现）。

### 1.2 目标受众与核心任务

| 受众 | 核心任务 | 首要页面 |
|---|---|---|
| 同行研究者 | 检索论文与成果、了解研究方向、找到合作对象 | 学术成果、研究方向、团队 |
| 潜在研究生 / 应聘者 | 了解导师与团队、招生招聘信息 | 研究团队、招生招聘 |
| 产业合作方 | 了解机构能力与在研项目 | 研究院概况、科研项目 |
| 媒体与公众 | 获取新闻动态、学术活动信息 | 新闻动态、学术活动 |
| 站点维护者 | 发布/更新内容，不改代码 | 内容集合（MDX） |

### 1.3 设计目标（可验证）

- 访客在 **10 秒内**判断「这是什么机构、研究什么」；
- 任何一篇论文/一位成员**不超过 3 次点击**可达；
- 全站搜索一次输入即可命中成果、人员、新闻三类实体；
- 首屏 LCP < 2.5s，CLS < 0.1，Lighthouse 性能 ≥ 90、无障碍 ≥ 95；
- 320px 视口无页面级横向滚动，200% 缩放核心任务可用。

---

## 2. 设计方向（美学主张）

> 依据 `frontend-design` 要求：先确定一个明确、可执行的美学方向，而非折中。

**方向名称：Institutional Academia（学术机构风）**

一句话：*像一本装帧考究的学术期刊，而不是一个企业官网。*

| 维度 | 决策 | 理由 |
|---|---|---|
| 基调 | 克制、纸感、编辑排版 | 学术可信度来自留白与秩序，而非装饰 |
| 排版 | 衬线标题 + 无衬线正文，超大标题字号对比 | 建立「期刊感」的第一视觉信号 |
| 色彩 | 纯中性灰底 + 墨黑文字 + 单一深靛主色 | 中性层一律 H0/S0%（不偏暖），依据是四家真实研究机构样式表的实测采样；高对比、低饱和，避免企业蓝泛滥。详见 `DESIGN_SYSTEM.md` §1.1 |
| 布局 | 非对称双栏、细发丝分隔线、网格可打破 | 区别于卡片堆叠的模板化门户 |
| 动效 | 极简：滚动揭示 + 悬停反馈 + **首页焦点轮播**，全部可降级 | 内容优先，动效只解释状态；**任何自动播放必须可暂停**（见 §4.1 与 §14） |
| 差异化记忆点 | **成果条目排版**：作者、标题、期刊、年份按学术引用格式排布，悬停浮现 DOI/PDF 操作条 | 这是门户最常用、也最容易被做丑的地方 |

---

## 3. 信息架构

### 3.1 站点地图

```text
数字管理技术研究院
├─ 首页  /
├─ 研究院概况  /about
│   ├─ 研究院简介
│   ├─ 组织架构
│   └─ 发展历程
├─ 研究方向  /research
│   └─ 方向详情  /research/:slug
├─ 研究团队  /people
│   └─ 成员详情  /people/:slug
├─ 学术成果  /publications
│   ├─ 期刊论文 / 会议论文 / 著作 / 专利 / 报告（筛选维度）
│   └─ 成果详情  /publications/:slug      ← 已实现（BibTeX 导出 + ScholarlyArticle）
├─ 科研项目  /projects
│   └─ 项目详情  /projects/:slug
├─ 新闻动态  /news
│   ├─ 新闻详情  /news/:slug
│   └─ 分页      /news/page/:page
├─ 通知公告  /notices
├─ 学术活动  /events
│   └─ 活动详情  /events/:slug
├─ 专题专栏  /topics
│   └─ 专题详情  /topics/:slug   ← 跨内容类型的横向聚合层
├─ 数据集与资源  /datasets       ← 内容集合驱动（`src/content/datasets/`），条目锚点为 `#<slug>`
├─ 招生招聘  /join
├─ 联系我们  /contact
├─ 全站搜索  /search?q=
├─ 错误页    /404
└─ 机器可读端点
    ├─ /rss.xml              RSS 2.0（news + notices，最近 30 条）
    ├─ /search-index.json    全站搜索索引
    └─ /sitemap-index.xml    由 @astrojs/sitemap 生成
```

> **实现状态说明**：上表全部为已生成路由。当前产出 **51 个 HTML 页面**
> （10 篇成果详情 · 6 篇新闻详情 · 5 场活动详情 · 4 位成员主页 · 4 个方向详情 · 4 个项目详情 · 3 个专题详情）。
>
> `/500` 不实现：静态站无服务端渲染，5xx 由托管平台默认页兜底（见 `PAGE_SPECIFICATION.md` §4.16）。

### 3.2 路由设计原则

- 路由只表达**可分享、可恢复**的状态；筛选条件（`?type=journal&year=2025&tag=xxx`）进入 URL query，展开态、滚动位置不进入。
- 列表页筛选可分享：复制 URL 即还原筛选结果。
- 详情页使用 `:slug`（语义化、利于 SEO），不使用自增 ID。
- 全站保留一条 `404` 与一条 `500` 兜底路由。

### 3.3 全局导航（三段式报头）

参照机构门户（如 `cas.cn`）的信息密度，报头改为**三段式**，不再整体固定：

| 层级 | 高度令牌 | 行为 | 内容 |
|---|---|---|---|
| 顶部工具条 | `--utility-h` 34px | 静态，随页面滚走；`< 640px` 隐藏 | 中文 / EN、`全站搜索`、`内容发布后台` |
| 报头 | `--masthead-h` 84 / 64 / 60px | 静态 | 院徽标记 + 中英文院名 + 站内搜索表单 + 快捷入口 |
| 主导航 | `--nav-h` 52 / 48 / 44px | **`position: sticky; top: 0`** | 一级导航 + Mega Menu；移动端汉堡与搜索按钮 |

- 一级导航 7 项以内：`首页 / 机构 / 研究 / 成果与动态 / 加入我们`；
- 「机构」「研究」「成果与动态」使用 **Mega Menu**（分组 + 描述 + 快捷入口），其余为普通链接；
- 由于报头不再是固定定位，**移除 `body { padding-top }` 补偿**；锚点跳转与吸顶侧栏统一用 `calc(var(--nav-h) + 1.5rem)` 作为偏移；
- 站内搜索两处入口：报头表单（`GET /search`，无 JS 可用）与移动端导航上的 ⌘K 弹层；
- 移动端：汉堡抽屉 + 搜索独立按钮，抽屉为全高 Drawer。

---

## 4. 页面模板清单

按模板归类，避免每页重复设计。**共 6 个模板 + 1 套区块库**。

> **重要**：下表是**逻辑模板**，不是文件清单。仓库中只有 `src/layouts/BaseLayout.astro` 一个布局文件，
> 其余 5 个模板是「`BaseLayout` + 固定区块顺序」的组合约定，直接写在各页面里。
> 这是有意的 —— 这些模板各自只服务 1–3 个路由，抽成文件会让每次改动都要跨两层跳转。
> **当某个模板被第 4 个路由复用时，才把它提升为独立文件。**

| 模板 | 适用路由 | 结构要点 |
|---|---|---|
| `BaseLayout` | 全站 | Skip Link、Header、`<main>`、Footer、SEO head、面包屑插槽 |
| `HomeLayout` | `/` | Hero 主张 → 研究方向矩阵 → 最新成果 → 新闻与活动 → 加入我们 |
| `ListingLayout` | `/research`、`/publications`、`/news`、`/events`、`/projects`、`/datasets` | 标题区 + 筛选栏（可分享 URL）+ 结果计数 + 列表/网格 + 分页 + 空状态 |
| `ProfileLayout` | `/people/:slug` | 头像/简介侧栏 + 学术主页正文 + 代表性成果 + 联系方式 |
| `DetailLayout` | `/research/:slug`、`/news/:slug`、`/publications/:slug` | 文章头部（标题、元信息、分享）+ 正文排版 + 相关推荐 + 上下篇 |
| `ContentPageLayout` | `/about`、`/join`、`/contact`、`/datasets` | 单栏长文 + 锚点侧栏目录（H2/H3） |
| `ErrorLayout` | `/404` | 明确说明 + 返回主路径入口，不使用模糊文案 |

`DetailLayout` 的三种变体差异集中在**头部元信息区**与**右侧栏**，正文排版与相关推荐共用：

| 变体 | 头部元信息 | 结构化数据 | 侧栏 |
|---|---|---|---|
| `/research/:slug` | 方向标签、负责人 | `ResearchOrganization` | 相关成果 / 相关项目 |
| `/news/:slug` | 发布日期、栏目、阅读时长 | **`NewsArticle`** | 最新新闻 |
| `/publications/:slug` | 作者、期刊/会议、年份、DOI | **`ScholarlyArticle`** | 同作者其他成果 + **BibTeX 复制** |

`/people/:slug` 额外输出 `Person` 结构化数据；全站每页输出 `ResearchOrganization`。

### 4.1 首页区块顺序（信息优先级）

改为机构门户式的高密度分区，机构身份由**报头**承载，因此首页不再放大字 Hero：

1. **机构定位条**：一句话定位 + 四个方向概览（单条，紧凑）。
2. **焦点图区**：左为**焦点轮播**（5 屏，首屏为焦点新闻，其余按日期倒序；配抽象图形 + 标题 + 摘要），右为**通知公告**列表（6 条，日期等宽右对齐）。桌面 `1.5fr : 1fr`。
3. **要闻**：3 张新闻卡（配图 + 日期 + 标题 + 摘要，摘要 `line-clamp-3`）。
4. **学术活动 | 科研项目**：双栏并置，活动左（含日期块）、在研项目右（要点列表）。
5. **研究方向**：4 张方向卡（配抽象图形 + 编号 + 标题 + 一句话）。
6. **学术成果**：按引用格式排布最近 5 条。
7. **研究团队**：4 张成员卡。
8. **数据统计带**：深底，成立年份 / 方向 / 成果 / 人员四项。
9. **专题专栏**：3 张专题卡（配抽象图形）。
10. **加入我们**：招生招聘 CTA 条。
11. **Footer**：友情链接条 → 多列导航 + 联系 → 深底备案条。

#### 4.1.1 焦点轮播 `Carousel`（首页区块 2 左栏）

自动播放在本站是被严格限制的例外，**只此一处**。之所以允许，是因为它满足全部降级条件；
任何不满足下表的自动播放都应拒绝合入。

| 要求 | 实现 |
|---|---|
| 可暂停（WCAG 2.2.2） | `data-carousel-pause` 按钮，`aria-label` 在「暂停/继续自动播放」间切换 |
| 减弱动效默认不播放 | `autoPaused = reduce.matches`，`prefers-reduced-motion: reduce` 下默认静止，用户可手动开启 |
| 悬停暂停 | `mouseenter` / `mouseleave` |
| 焦点暂停 | `focusin` / `focusout`（键盘用户浏览时不推进） |
| 后台标签页不计时 | `document.hidden` 为 true 时不推进 |
| 键盘可达 | `ArrowLeft` / `ArrowRight` 切换；圆点按钮 `aria-label="跳转到第 N 张"` + `aria-current` |
| 语义 | `aria-roledescription="carousel"` / `"slide"`，`role="group"` + `aria-label="N / total"`，视口 `aria-live="polite"`，当前圆点 `aria-current="true"` |
| 无 JS 降级 | 第一张无 `hidden`、其余带 `hidden`，控件默认 `display:none`；脚本就绪后加 `data-ready="true"` 才切换为堆叠淡入淡出 |
| 高度稳定 | 所有 slide 叠在同一网格格（`grid-area: 1/1`），容器高度取最高一张，**切换不跳高** |
| 标题层级 | slide 标题一律 **`h2`** —— 首页 `h1` 在报头；轮播里出现 `h1` 会破坏全站唯一 h1 审计 |

**幻灯片来源**：`featured`（或最新一条）优先，其余按 `date` 倒序补足，取 5 条。
`interval` 默认 **5500ms**，通过 `data-interval` 传给脚本。

> **实现陷阱（已踩过，勿重蹈）**：`initCarousel()` 首次加载会执行**两次**（末尾手动调用 + `astro:page-load` 触发）。
> 若每次 init 都清空全部定时器，第二次会清掉第一次建的定时器，又因幂等标记提前 `return` 而不重建，
> 结果**自动播放永远不动**。正确做法是用 `Map<HTMLElement, number>` 记录每个 root 的定时器，
> **只在 root 已脱离文档（`!root.isConnected`，即换页后的旧 DOM）时才清理**。
> 更完整的逐条规范见 `PAGE_SPECIFICATION.md` §4.1「焦点轮播」。

### 4.2 列表页分栏

列表页统一为 `grid lg:grid-cols-[1fr_320px]`，左主内容、右为吸顶信息栏：

| 页面 | 右栏内容 |
|---|---|
| `/news`、`/news/page/:n` | 通知公告（5 条）、热门标签（链接到 `/search?q=`）、相关入口 |
| `/events` | 活动类型统计、常用场地、参与与咨询 |
| `/projects` | 资助来源统计、参与人员统计、相关入口 |
| `/people` | 团队构成、研究方向分布、加入我们 |
| `/datasets` | 使用说明、许可协议统计、数据咨询 |
| `/about` | 本页锚点目录（吸顶）、关键数字、相关入口 |
| `/publications` | 不用右栏；改为筛选器上方的「按类型 / 按年份」统计条，避免与 Explorer 的吸顶筛选栏争夺宽度 |

右栏统一使用 `AsideBox`（顶部发丝线 + 眉标题 + 插槽），吸顶偏移为 `calc(var(--nav-h) + 1.5rem)`。

---

## 5. 技术栈与选型理由

### 5.1 推荐方案（内容型门户优先）

> **决策已定（2026-09-11）**：采用「Astro 5 + React 19 岛屿」路线。站点保持零 JS 静态输出以保住 SEO 与性能，后台独立为 Vite + React 19 SPA。理由与备选对比见 §5.4。

#### 站点（对外门户）

| 层级 | 选型 | 理由 |
|---|---|---|
| 框架 | **Astro 5** | 内容型站点首选：默认零 JS、岛屿架构、`Content Collections` 提供类型安全的前置元数据、MDX 支持、图片优化、SEO 友好 |
| 语言 | **TypeScript 5**（strict） | 内容 schema 与组件 props 类型安全 |
| 样式 | **Tailwind CSS v4**（CSS-first `@theme`） | 令牌单一数据源直接映射；容器查询做组件级响应式；原子化产出可控 |
| 色彩空间 | **OKLCH** | 感知均匀，明度/彩度可预期，便于生成可访问的色阶与深色主题 |
| 内容 | **Astro Content Collections + MDX** | 论文/新闻/成员以文件形式版本化，维护者不碰代码 |
| 交互岛屿 | **React 19**（`client:visible` / `client:idle`） | 仅在筛选、搜索、图表等需要状态处水合；其余保持静态。可用 React 19 的 `useTransition` / `useOptimistic` 做乐观更新 |
| 页面过渡 | **View Transitions（`ClientRouter`）** | 原生 View Transitions API，多页站点获得类 SPA 的连续感，且不引入客户端路由框架 |
| 预取 | **Astro `prefetch`**（`prefetchAll: true`，`defaultStrategy: viewport`） | 进入视口的链接自动预取；内部按浏览器能力在 `link rel=prefetch` 与 Speculation Rules 之间选择，无需手工标注 |
| 浮层 | **原生 `<dialog>` + Popover API** | 浏览器原生焦点陷阱、`Esc` 关闭、顶层渲染，省掉弹层库 |
| 图标 | **不引入图标库**：装饰配图 `AbstractFigure`（确定性 SVG）＋ UI 图标手写内联 SVG，统一 24×24 / `currentColor` / `aria-hidden` | 禁止 emoji 充当图标；UI 图标实际只有 6–8 个，为一个图标库增加依赖不划算 |
| 字体 | **自托管子集**（`public/fonts/`，由 `npm run fonts` 裁剪）+ 本地回退，`display=swap` | 不依赖外部字体 CDN；子集按站点实际用字生成，5 族合计 955 KB。详见 `README.md`「字体（自托管子集）」 |
| 质量门禁 | **`scripts/audit.mjs` + `scripts/smoke.mjs`**（零依赖 Node 脚本） | 静态 a11y/SEO 扫描 + 20 条 HTTP 断言，见 §13 验收标准 |
| 部署 | 静态托管（任意 CDN / 对象存储） | 纯静态输出，成本低、抗压 |

#### 后台（内容发布）

| 层级 | 选型 | 理由 |
|---|---|---|
| 构建 | **Vite 7** | 冷启动快、HMR 稳定，与站点构建工具同源 |
| 框架 | **React 19** | 与站点岛屿同一套心智与类型；团队既有 React 栈可直接复用 |
| 视图切换 | React 本地状态 | 后台只有「列表 + 编辑弹层」两个视图，引入路由库属于过度设计；未来若增至 5 个以上视图再评估 TanStack Router |
| 数据获取 | 原生 `fetch` + 薄封装（`src/api.ts`） | 接口只有 7 个，缓存与失效策略简单；引入 TanStack Query 收益不足 |
| 语言 | **TypeScript 5**（strict） | 与站点共用内容类型契约 |
| UI 组件 | **MUI v7（Material UI）** | 团队既有技术栈，无障碍与键盘行为成熟；后台是内部工具，Material 观感不构成问题 |
| 复杂组件 | **MUI core**（`Table` + `TableSortLabel` / `Dialog` / `Snackbar` / `SvgIcon`） | 见下方 ADR-02：最终未采用 MUI X |
| 主题 | **MUI `createTheme` 映射站点设计令牌** | 后台与站点视觉同源：色彩、字体、圆角、间距取自同一份 `tokens.css` |
| 样式 | MUI `sx` 作为唯一样式入口 | 不与 MUI 争夺组件职责；不引入第二套样式方案，禁止用 `!important` 覆盖 `.Mui*` 内部类 |
| 表单 | **React 19 Actions + 受控字段** | 内置 pending / error 状态，减少手写样板 |
| 接口 | **零依赖 Node HTTP 服务**（`admin/server.mjs`） | 直接读写 `src/content/**`，不引入框架与数据库，部署面最小 |

### 5.2 已评估但未采用的方案

| 方案 | 优势 | 未采用的原因 |
|---|---|---|
| **Next.js 15（App Router + RSC）** | 生态最主流、招聘最容易、前后台同仓一体、Server Actions 减少接口样板 | 站点从「零 JS 静态」退化为「依赖 JS 运行时」，对以阅读与检索为主的学术门户是净损失；RSC 心智成本与调试复杂度高于本项目所需 |
| **Svelte 5（runes）/ SolidJS 岛屿** | 运行时最小、响应式模型最新 | 与团队既有 React 技术栈脱节；生态与人才储备弱，长期维护成本最高；收益（再省几 KB）对本项目不显著 |
| **纯 SPA（Vite + React，无静态输出）** | 交互能力强、实现直接 | 对外门户依赖 SEO 与首屏速度，纯 SPA 是明确的反模式 |

### 5.3 决策记录（ADR 摘要）

- **决策**：站点 = Astro 5 + React 19 岛屿 + Tailwind v4；后台 = Vite 7 + React 19 + TypeScript + MUI v7；二者通过 `src/content/**` 文件交换数据。
- **MUI 的适用边界**：TypeScript 两端通用；**MUI 只用于后台，不用于对外站点**。原因是 MUI 依赖 Emotion 运行时，会破坏站点「零 JS 静态输出」的优势；且 Material 观感与本站的学术机构风（Institutional Academia）直接冲突。
- **ADR-02：后台不引入 MUI X**。原计划用 MUI X 的 `DataGrid` / `DatePicker`，实际落地时放弃，改用 MUI core 的 `Table` + `TableSortLabel` 与原生 `<input type="date">`。理由：① 每个内容集合只有几十条条目，DataGrid 的排序/筛选/虚拟化并无用武之地，却要付出约 400 KB 的体积与一个重量级依赖；② `@mui/icons-material` 同理（2000+ 文件、仅用到 5 个图标），改为 `SvgIcon` 包裹内联路径。取舍后的后台产物约 605 KB（gzip 187 KB），对内部工具可接受。**复查触发条件**：单集合条目超过 500 条、或需要列筛选 / 行内编辑 / 批量勾选时，再引入 MUI X `DataGrid`。
- **核心权衡**：以「站点零 JS、后台强交互」换取 SEO 与性能的最优解，同时用 React 统一两端心智。
- **可逆性**：页面组件与数据访问层分离，不把业务逻辑写进 Astro 专有 API。若未来需要账号体系或服务端数据，可将后台升级为独立服务，站点仍保持静态——**站点不需要重写**。
- **复查触发条件**：若出现「门户本身需要登录态 / 个性化推荐 / 服务端实时数据」，重新评估站点是否需要 SSR。

### 5.3.1 ADR-03：前端粒度管理采用运行时配置解析（2026-09-18）

**背景**：新增「前端粒度管理」模块，需求方明确要求配置**由后台运行时动态构建、前台运行时拉取应用**，
不预编译进前台静态产物。

**这条决策与 §5.2/§5.3 的「零 JS 静态输出」直接冲突**，且触发了 §281 的复查触发条件。
经与需求方确认后选择**静态壳 + 运行时应用**，而非 SSR。此处如实记录代价，不静默推翻既有 ADR：

| 代价 | 说明 |
|---|---|
| **被禁用页面无法服务端拦截** | 静态 HTML 已构建，客户端只能读到配置后替换为提示页。**内容仍在 HTML 源码里**，懂技术的人可查看。真正隔离必须 SSR |
| 首次可能有一闪 | 默认内容先渲染，配置到达后替换。已用「默认不解藏 + 3s 超时兜底」压到最低 |
| 站点不再零 JS | 新增约 4.5 KB（gzip）配置运行时；`audit` 预算 JS ≤ 30 KB，当前 13.1 KB，仍充裕 |

**未配置时行为与改动前逐字节一致**（`scripts/config-regression-guard.py` 守护，51/51 页），
因此既有页面不受影响。

**前后端分离**：配置存储在 `src/data/site-config.json`，由后台读写；
接口为新增的 `/api/frontend-config*`，**未改动任何既有接口的返回结构与语义**；
前台产物不含后台代码。详见 `docs/FRONTEND_CONFIG.md`。

**复查触发条件**：若「被禁用页面仍可被读取」不可接受，或需要真正的权限隔离，则应引入 SSR adapter
——那是一次独立改造，不在本模块范围内。

### 5.4 依赖门禁

沿用既有规范：引入新依赖必须满足「提供难以自研的核心能力 / 明显减少重复 / 有明确使用位置 / 不与现有库争夺职责」之一，禁止为「技术栈丰富」而装包。

---

## 6. 目录结构（脚手架）

```text
数字管理研究院网站/
├─ docs/                        # 本框架与设计系统文档
│   ├─ PORTAL_FRAMEWORK.md
│   └─ DESIGN_SYSTEM.md
├─ public/
│   ├─ fonts/                   # 自托管 woff2
│   ├─ images/                  # 静态图（头像、活动照片）
│   └─ favicon/
├─ src/
│   ├─ components/
│   │   ├─ layout/              # Header.astro（含 Mega Menu / Drawer）、Footer.astro
│   │   ├─ ui/                  # PageHero · SectionHeading · AsideBox · EmptyState
│   │   │                       # Pagination · AbstractFigure
│   │   ├─ content/             # PublicationItem · PublicationExplorer.tsx（岛）
│   │   │                       # PersonCard · NewsCard · NewsList · NoticeList · EventItem
│   │   └─ seo/                 # SeoHead.astro · JsonLd.astro
│   ├─ content/                 # 内容集合（MDX + YAML 前置元数据）—— 唯一内容源
│   │   ├─ news/  notices/  publications/  people/  events/  research/  projects/
│   ├─ content.config.ts        # 7 个集合的 schema（构建期校验）
│   ├─ layouts/BaseLayout.astro # 全站唯一布局（其余「模板」为页内区块组合，非独立文件）
│   ├─ lib/                     # bibtex.ts（引用导出） · pagination.ts
│   ├─ data/                    # site.ts · nav.ts · links.ts · topics.ts
│   ├─ pages/                   # 路由（见 §3.1）
│   │   ├─ index.astro · about.astro · join.astro · contact.astro
│   │   ├─ datasets.astro · search.astro · notices.astro · 404.astro
│   │   ├─ research/index.astro · [slug].astro
│   │   ├─ people/index.astro · [slug].astro
│   │   ├─ publications/index.astro · [slug].astro
│   │   ├─ projects/index.astro          # [slug] 二期
│   │   ├─ news/index.astro · [slug].astro · page/[page].astro
│   │   ├─ events/index.astro            # [slug] 二期
│   │   ├─ rss.xml.ts                    # RSS 2.0 端点
│   │   └─ search-index.json.ts          # 搜索索引端点
│   └─ styles/
│       ├─ tokens.css           # 设计令牌（Tailwind v4 @theme）—— 唯一真源
│       ├─ typography.css       # 排版基线与正文样式
│       └─ global.css           # reset + 工具类（btn/card/tag/section…）
├─ scripts/                     # audit.mjs（静态 a11y+SEO 审计）· smoke.mjs（HTTP 冒烟）
├─ public/                      # favicon.svg · robots.txt（原样拷贝，不参与构建）
├─ admin/                       # 内容发布后台（独立应用，见 §5）
├─ astro.config.mjs
├─ tsconfig.json
└─ package.json
```

> **无 `src/assets/`**：全站不使用位图。配图由 `AbstractFigure` 确定性生成 SVG，头像用文字首字母，
> 因此没有图片优化流水线、`dist` 仅 1.37 MB。
> **无 `tests/`**：e2e 以 `scripts/smoke.mjs`（20 条 HTTP 断言）+ `scripts/audit.mjs`（静态扫描）实现，
> 不引入测试框架，保持启动成本为零。

**边界约定**：`src/content/` 是唯一内容源，`src/pages/` 只做路由与组合，`src/components/` 不直接读取文件系统。

---

## 7. 组件清单（首期 · 实际落地）

### 7.1 组件文件（`src/components/**`）

| 分类 | 文件 | 说明 |
|---|---|---|
| 布局 | `layout/Header.astro`、`layout/Footer.astro` | 报头 / 主导航 / 页脚 |
| 模板 | `layouts/BaseLayout.astro` | 全站骨架：Skip Link、`<main>`、JSON-LD、ClientRouter |
| UI 基础 | `ui/PageHero.astro`、`ui/SectionHeading.astro`、`ui/AsideBox.astro`、`ui/EmptyState.astro`、`ui/Pagination.astro`、`ui/AbstractFigure.astro`、`ui/Carousel.astro` | 区块与状态单元；`Carousel` 是站内**唯一**自动播放组件，规范见 §4.1.1 |
| 内容 | `content/PublicationItem.astro`、`content/PersonCard.astro`、`content/NewsCard.astro`、`content/NewsList.astro`、`content/NoticeList.astro`、`content/EventItem.astro` | 门户核心表达单元 |
| 交互岛 | `content/PublicationExplorer.tsx` | React 岛（`client:visible`），成果筛选，状态写 URL |
| SEO | `seo/SeoHead.astro`、`seo/JsonLd.astro` | `JsonLd` 输出 `@graph`，类型分布由 `npm run audit` 校验 |
| 逻辑 | `lib/bibtex.ts`、`lib/pagination.ts` | BibTeX 生成（键唯一）、分页计算 |

### 7.2 内联实现（未拆独立文件，勿在文档中当作组件引用）

内联是有意为之 —— 这些结构只在一处使用，拆文件反而增加跳转成本：

- **Mega Menu / 移动端 Drawer / ⌘K 搜索弹层** → 内联于 `Header.astro`；
- **Skip Link** → 内联于 `BaseLayout.astro`（`<a href="#main" class="skip-link">`）；
- **面包屑** → 内联于 `PageHero.astro`（`<nav aria-label="面包屑">`）；
- **筛选栏（FilterBar）** → 内联于 `PublicationExplorer.tsx`。

### 7.3 CSS 工具类（非组件，无运行时）

`btn-primary` / `btn-secondary` / `btn-ghost`、`card`、`tag`、`tag-quiet`、`stat-band`、`portal-card`、`brief-list`、`hairline`、`eyebrow`、`numeric`、`container-page`、`section`、`skip-link`、`sr-only`。
定义于 `src/styles/global.css`。

### 7.4 规划中（未实现，勿在文档中标注为已完成）

`Skeleton`（骨架屏）、`ProjectCard`、`Timeline`、`SearchResults`、`ProgressChart` / `StatFigure`。
首期用 `EmptyState` + 静态列表覆盖其场景；若后续需要加载态或图表再补。
数据可视化目前只有 `AbstractFigure`（确定性抽象配图，纯 SVG、`aria-hidden`），**无真实图表依赖**。

---

## 8. 内容模型（Content Collections）

统一以 YAML 前置元数据描述，构建期做 schema 校验（字段缺失即构建失败）。

```yaml
# 学术成果 publications
title: 标题
authors: [姓名, ...]
venue: 期刊/会议名称
year: 2025
type: journal | conference | book | patent | report
volume: '22'                 # 可选，GB/T 7714 引用需要
issue: '6'                   # 可选
pages: 42-58                 # 可选，半角连字符
doi: 10.xxxx/xxxxx
pdf: /files/xxx.pdf          # 可选
tags: [方向关键词]
featured: true               # 是否进首页
links: [{ label, href }]     # 代码/数据等外部链接

# 成员 people
name / title / avatar / researchAreas[] / email / homepage / googleScholar / orcid / bio / publications[]

# 新闻 news
title / date / summary / cover / tags[] / author

# 活动 events
title / startDate / endDate / location / type(seminar|conference|lecture) / speakers[] / summary

# 研究方向 research
title / order / summary / keywords[] / lead(负责人) / projects[] / publications[]

# 项目 projects
title / funder / period / status / members[] / summary

# 数据集 datasets
name / description / license / access / period(可选) / scale(可选) / href(可选) / keywords[] / order
```

**约束**：`slug` 由文件名派生；日期统一 `YYYY-MM-DD`。

> ⚠️ **本节与实际 schema 存在已知漂移**（`src/content.config.ts` 才是唯一真源）：
> 上文的 `links`（成果）、`avatar`（成员，实为 `portrait`）、`googleScholar`（实为 `scholar`）、
> `amount`（项目）、`research.projects[]` / `research.publications[]`（实为运行时反查，非字段），
> 以及 `scripts/validate-content`（**不存在**，校验由 Astro 构建期 schema 完成）。
> 引用字段前请以 `src/content.config.ts` 与 `admin/server.mjs` 的 `COLLECTIONS` 为准。

---

## 9. 响应式与交互策略

### 9.1 断点（继承既有规范）

| 断点 | 布局 |
|---|---|
| `≥ 1440px` | 最大内容宽度 `1200px`，首页可非对称双栏 |
| `1280–1439px` | 内容宽度 `1120px`，完整导航 |
| `1024–1279px` | 导航保留，Mega Menu 收窄为分组列表 |
| `768–1023px` | 导航折叠为汉堡 + 抽屉；列表改双列 |
| `< 768px` | 单列；筛选进入全屏 Dialog；表格横向滚动仅在容器内 |

### 9.2 交互原则

- 悬停反馈用**颜色/透明度/边框**过渡（150–300ms），**不使用位移缩放**导致布局抖动；
- 所有可点击元素 `cursor: pointer`，均有可见焦点环（`:focus-visible`）；
- 列表筛选**即时生效并写入 URL**，提供「清除筛选」；
- 搜索：输入防抖 + 建议下拉；无结果时给出**可点击的替代建议**（禁止空白或「0 结果」）；
- 动效仅用于：首屏一次性进入（滚动揭示，`animation-delay` 错峰）、列表项悬停、弹层进出；全部在 `prefers-reduced-motion` 下降级为淡入或直接呈现。

### 9.3 状态设计（每页必须齐备）

`加载中`（骨架，尺寸稳定）· `空`（说明 + 下一步动作）· `错误`（可重试 + 详情）· `无权限/未找到`（返回主路径）· `筛选无结果`（清除筛选入口）。

---

## 10. 无障碍基线（WCAG 2.2 AA）

- 语义优先：用 `header/nav/main/article/section/footer` 与 `button/a/label`，而非 `div + role`；
- Skip Link 直达 `<main>`；标题层级 h1→h6 不跳级；
- 键盘：Tab 顺序与视觉一致，无键盘陷阱；`Esc` 关闭弹层并归还焦点；
- 对比度：正文 ≥ 4.5:1，大字 ≥ 3:1；**状态不只用颜色**表达（配合图标或文字）；
- 图片有 `alt`，装饰图 `alt=""`；图表提供文本摘要；
- 图标按钮有可访问名称，Tooltip 不作为唯一名称来源；
- 200% 缩放可用；320px 无页面级横向滚动。

---

## 11. 性能与 SEO

- 默认零 JS；岛屿按需加载（`client:visible` 优先）；
- **图片：全站无位图**。配图为 `AbstractFigure` 确定性 SVG，头像为文字首字母，因此无需 `astro:assets`、`srcset` 与 CLS 防护；
- 字体：5 族自托管子集（`src/styles/fonts.css`），无外部 CDN 依赖，`display=swap`；子集由 `npm run fonts` 按站点用字裁剪，`npm run fonts:check` 提示缺字（不阻断）；
- SEO：每页唯一 `title`（≤60 字符，超长自动截断）/ `description` / `canonical` / `og:*`；
  `sitemap-index.xml`、`robots.txt`、RSS；四类结构化数据提升学术检索收录；
- 预算与实测：

**预算一律以 gzip 后体积为准** —— 未压缩的 Tailwind 产物常常几十 KB，但过网线的是压缩后的那部分。
`npm run audit` 会同时打印两项。

| 指标 | 预算（gzip） | 实测 | 未压缩 |
|---|---|---|---|
| 首屏 JS | ≤ 30 KB | **8.6 KB** ✅ | 23 KB |
| 全站 CSS | ≤ 20 KB | **14.3 KB** ✅ | 73 KB |
| 单页 HTML | ≤ 120 KB | 均值 37 KB，最大 **101.9 KB**（首页）✅ | — |
| `dist` 总体积 | ≤ 5 MB | **1.71 MB** ✅ | — |

> **关于「CSS 73 KB」这个数字**：它是未压缩值，看着吓人，gzip 后只有 14.3 KB（压缩率 19%）。
> 全站 47 页共用同一个样式表，因此它只下载一次、可被长期缓存，不是每页成本。
>
> **两条已被实测排除的误判**（勿再重复排查）：
> 1. ~~轮播导致 CSS 膨胀~~ —— A/B 实测：移除轮播 75,083 B vs 74,901 B，**轮播只贡献 182 字节**。
>    它的自写样式（3.1 KB）被 Astro 正确内联进 `index.html`，只在首页加载，做法是对的。
> 2. ~~`@source` 扫到了 `src/content` 的 MDX~~ —— 收窄扫描范围后 75,128 B，**几乎无变化**。
>    （该收窄仍然保留：MDX 正文不应被当作类名来源，属于正确性问题而非体积问题。）
>
> 体积的绝大部分是 Tailwind utilities 层（46 KB 未压缩 / 约 1000 条规则），属于工具类 CSS 的固有形态。
> 若将来确实需要压缩，方向是减少 `index.astro` 等处的**任意值写法**（如 `text-[1.1875rem]`），
> 改为在 `tokens.css` 里定义语义化令牌 —— 顺带也能收敛排版不一致的问题。

---

## 12. 实施路线

| 阶段 | 交付 | 验收信号 | 状态 |
|---|---|---|---|
| **P0 骨架** | 工程初始化、令牌落地、`BaseLayout` + Header/Footer、路由空壳 | `npm run build` 通过（38 页） | ✅ |
| **P1 设计系统** | 令牌、排版基线、UI 基础组件（PageHero/SectionHeading/AsideBox/EmptyState/Pagination/AbstractFigure） | 组件在四档视口无破版 | ✅（视口实测 ⏳） |
| **P2 内容与列表** | 7 个 Content Collections、列表/详情模板、筛选与分页 | 论文/新闻/成员三类内容可从 MDX 渲染并筛选 | ✅ |
| **P3 首页与搜索** | 首页 11 区块、Mega Menu、自建搜索索引、⌘K | 一次搜索命中三类实体；无结果有建议 | ✅ |
| **P4 打磨与验收** | 无障碍、动效降级、性能预算、结构化数据、RSS、BibTeX | `audit` 零告警、`smoke` 20/20 | ✅ |
| **P4 遗留** | axe 扫描、Lighthouse 评分、四档视口视觉回归 | — | ⏳ 需可信浏览器 |

> **搜索选型更正**：实施时未采用 Pagefind，改为构建期生成 `search-index.json` + 前端过滤。
> 理由：内容仅 40 条，索引 5.5 KB，引入 Pagefind（约 300 KB 运行时 + 构建插件）不划算。
> **触发替换的条件**：内容超过 500 条、或需要中文分词与模糊匹配时，再评估 Pagefind / FlexSearch。

---

## 13. 验收标准（Definition of Done）

### 13.1 自动化门禁（每次构建后必跑）

```bash
npm run build && npm run audit && npm run taste && npm run contrast && npm run docs:tokens && npm run smoke
```

| 检查 | 命令 | 当前 |
|---|---|---|
| 构建通过、51 页产出 | `npm run build` | ✅ |
| `<html lang>`、`h1` 唯一、标题 ≤60 字符 | `audit` | ✅ |
| meta description / canonical / og:title 齐备 | `audit` | ✅ |
| Skip Link、`<main>` 存在 | `audit` | ✅ |
| 标题层级不跳级 | `audit` | ✅（修过 5 处 h1→h3） |
| 图片 `alt`、链接/按钮可访问名称、表单控件 label | `audit` | ✅ |
| JSON-LD 可解析 + 类型分布正确 | `audit` | ✅ 83 块 |
| 内部链接路由与锚点（3537 条） | `audit` | ✅ LINK-001 / LINK-002 零告警 |
| 产物洁净度（无内容注释） | `audit` | ✅ HYG-001 |
| 资源体积预算（gzip：JS ≤ 30 KB / CSS ≤ 20 KB） | `audit` | ✅ JS 8.6 / CSS 9.1 KB |
| 设计品位（破折号 / 眉标签 / 圆角 / 编号标签等 8 条） | `taste` | ✅ |
| 文字对比度 22 组 ≥ 4.5:1 | `contrast` | ✅ |
| 文档引用的令牌都有定义 | `docs:tokens` | ✅ |
| 56 条路由 HTTP 200 + 内容片段 + Content-Type | `smoke` | ✅ 56/56 |

### 13.2 人工 / 浏览器实测（⏳ 需在 CI 或有 GUI 环境补跑）

- [ ] 6 个模板在 375 / 768 / 1024 / 1440 四档视口无重叠、无横向滚动
- [ ] 全部交互元素键盘可达、焦点可见、`cursor: pointer`
- [ ] `prefers-reduced-motion` 下动效正确降级
- [ ] axe 无 serious/critical 项；Lighthouse 性能 ≥ 90、无障碍 ≥ 95

### 13.3 已验证通过

- [x] 列表筛选可分享 URL，空结果有替代建议
- [x] 搜索一次输入命中成果 / 人员 / 新闻
- [x] 状态齐备：空 / 无结果 / 未找到（静态站无「加载」「离线」态）
- [x] 内容维护者仅新增 MDX 文件即可发布，无需改代码
- [x] 后台 CRUD 端到端可用，字段校验与 `content.config.ts` 一致
- [x] BibTeX 引用键 10/10 唯一

> **「加载」「离线」两态不适用于本项目的静态输出**：页面在构建期已生成 HTML，
> 无客户端数据获取；离线访问由 Service Worker 提供，首期未引入（静态站 + CDN 已覆盖主要场景）。

---

## 14. 反模式清单（禁止）

- ~~首页大图轮播~~ → **修订**：禁止的是「无暂停控件的自动轮播」与「自动播放视频背景」。
  首页焦点轮播是唯一例外，且必须满足 §4.1.1 的全部降级条件（可暂停 / 减弱动效默认静止 / 悬停与焦点暂停 / 后台不计时 / 键盘可达）。
  **新增强调**：自动播放只允许出现在首页区块 2，**不得扩展到成果、活动、专题等任何列表或详情页**。
- 卡片嵌套卡片、每个条目一张浮动卡片
- emoji 充当图标；混用多套图标库
- 悬停缩放导致布局位移
- 紫色渐变 + 白色背景的通用 AI 审美
- 无搜索、无面包屑、无空状态的「死胡同」页面
- 筛选条件不进入 URL
- 依赖 hover 的唯一操作入口
