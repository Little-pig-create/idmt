# 数字管理研究院 · 学术门户设计系统

> 配套文档：`PORTAL_FRAMEWORK.md`
> 美学方向：**Institutional Academia（学术机构风）**
> 令牌单一数据源：`src/styles/tokens.css`（Tailwind v4 `@theme`）

---

## 1. 设计令牌

### 1.1 色彩

**中性层一律为纯中性灰（H0 / S0%），不带暖调偏移。**

这不是口味问题，是对四家真实研究机构样式表的实测采样结论：

| 机构 | 主色 | 中性色 | 中性饱和度 |
|---|---|---|---|
| 清华国情研究院 | `#6A3177` 深紫 | `#333` `#666` `#999` `#EEE` | 0% |
| 北大国发院 | `#A71016` 深红 | `#333` `#6A6A6A` `#EDEDED` | 0% |
| NBER | `#025CB9` 蓝 | `#4E505A` `#BFC0C1` `#F0F0F0` | 2-7% |

**没有一家使用暖米白。** 暖调画布（历史值 `#F7F7F5`，H60 S11%）会读成「杂志 / 设计工作室」，
而不是机构。主色保留深靛 `#1D4E89`：冷调蓝是 NBER 一路的机构用色，与纯中性灰同族。

> **令牌名以 `src/styles/tokens.css` 为准**，本表是它的说明，不是定义。改颜色只改 tokens.css。
> 下表对比度数值即 `npm run contrast` 的实测输出（口径：所有文字组合一律 ≥ 4.5:1，从严）。

| Token | 值 | 对比度（对 canvas） | 用途 |
|---|---|---|---|
| `--color-canvas` | `#F7F7F7` | 基准 | 页面背景（纯中性，非纯白） |
| `--color-surface` | `#FFFFFF` | — | 卡片、正文纸面 |
| `--color-surface-subtle` | `#F1F1F1` | — | 次级区块、表头 |
| `--color-surface-ink` | `#14202E` | — | 深色面板底 |
| `--color-ink` | `#1A1A1A` | 16.25:1 | 主文字 |
| `--color-ink-secondary` | `#565656` | 6.85:1 | 正文辅助、元信息 |
| `--color-ink-tertiary` | `#686868` | 5.20:1 | 时间戳、脚注、英文名（10-12px 小字） |
| `--color-ink-invert` | `#FFFFFF` | 14.28:1（对 masthead） | 深底上的文字 |
| `--color-line` | `#E2E2E2` | — | 发丝分隔线、卡片描边 |
| `--color-line-strong` | `#C9C9C9` | — | 输入框、聚焦前描边 |
| `--color-accent` | `#1D4E89` | 7.83:1 | 链接、主操作、当前项（深靛） |
| `--color-accent-hover` | `#163C6B` | — | 悬停/按压 |
| `--color-accent-soft` | `#EAF0F7` | — | 选中背景、标签底 |
| `--color-accent-ink` | `#0F2B4C` | 12.45:1（对 accent-soft） | 主色区深底 |
| `--color-masthead` | `#0F2B4C` | — | 报头带与页脚底条 |
| `--color-utility` | `#F1F1F1` | — | 顶部工具条 |

> `--color-ink-tertiary` 是**全站最紧的一条**：它被用了 76 次，绝大多数是 10-12px 的日期 / 英文名 / 月标。
> **最不利背景是 `--color-accent-soft` `#EAF0F7`（不是 surface-subtle —— 前者更暗一点）**，实测 4.86:1。
> 历史值 `#6E6E66` 在该背景上仅 4.48:1，已被 `npm run contrast` 拦下。

**深底上的文字层级**（由 `--color-ink-invert` 派生，全部半透明合成后实测）：

| Token | 派生比例 | 对比度（对 masthead） | 用途 |
|---|---|---|---|
| `--color-on-masthead` | 100% | 14.28:1 | 报头主文字 |
| `--color-on-masthead-soft` | 82% | 10.04:1 | 报头次级文字 |
| `--color-on-masthead-muted` | 66% | 7.03:1 | 页脚底条文字 |
| `--color-on-masthead-faint` | 50% | — | 极弱标注 |
| `--color-on-masthead-line` | 28% | 2.43:1 | 报头发丝分隔线（纯装饰，不承载信息） |
| `--color-on-masthead-line-strong` | 70% | 7.72:1 | 报头强分隔线 |
| `--color-scrim` | `ink` 32% | — | 抽屉 / 弹层遮罩 |

> **历史问题**：这些层级曾是散落在 `Header.astro` / `Footer.astro` / `global.css` 里**写死的 6 个互不相干的
> `rgba(247,247,245,·)`** —— 那是画布色的副本，改配色时不会跟着变。现已收敛为语义层级，
> 由 `ink-invert` 单点派生。**不要再往组件里写 rgba 白。**

**语义状态色**（当前站点未使用，见下方说明）：

| Token | 值 | 对比度（对 canvas / 对自身 soft 底） | 用途 |
|---|---|---|---|
| `--color-success` / `-soft` | `#127A54` / `#EAF7F1` | 4.98:1 / 4.84:1 | 已录用、已完成 |
| `--color-warning` / `-soft` | `#8F5A08` / `#FFF6E5` | 5.39:1 / 5.38:1 | 进行中、待定 |
| `--color-error` / `-soft` | `#C53E4A` / `#FFF1F2` | 4.71:1 / 4.59:1 | 错误、异常 |

> **规则**：状态不得仅依赖颜色，必须同时提供图标、文字或形状。
>
> **这组色当前一处未用**（全站无表单校验、无彩色徽章，标签一律走 `tag-quiet` 中性）。
> 保留是为了状态反馈有据可依，数值已校准到正文级 AA。
> 注意：`scripts/contrast.mjs` 的配对表**只收真实在用的组合**（该脚本自己的规则：
> 不收「以后可能会用」的组合，否则会变成假检查），所以这三组不在门禁覆盖内，
> 上表数值是校准时的实测记录。**若长期不用，应当删除** ——
> 设计令牌文件是唯一真源，里面躺着没人用的条目会误导后来者以为它们在被使用。
>
> 历史上还定义过 `--color-masthead-soft`（与 `--color-accent-hover` 同值 `#163C6B`）和
> `--color-info`，两者引用数均为 0，**已删除**，不要加回来。


### 1.2 字体

衬线标题建立期刊感，无衬线正文保证屏幕可读性，中文单独配对。**禁止 Inter / Roboto / Arial / 系统默认字体**。

| 用途 | 字体栈 |
|---|---|
| 展示标题（拉丁） | `"Source Serif 4", "EB Garamond", Georgia, serif` |
| 正文与界面（拉丁） | `"IBM Plex Sans", "Noto Sans SC", sans-serif` |
| 中文标题 | `"Noto Serif SC", "Source Han Serif SC", serif` |
| 中文正文 | `"Noto Sans SC", "Microsoft YaHei", sans-serif` |
| 代码 / 数字表格 | `"JetBrains Mono", "Cascadia Code", Consolas, monospace` |

```css
@theme {
  --font-display: "Source Serif 4", "EB Garamond", Georgia, serif;
  --font-sans: "IBM Plex Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  --font-serif-cjk: "Noto Serif SC", "Source Han Serif SC", serif;
  --font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
}
```

**中文标题实现**：`font-family: var(--font-serif-cjk)`，并对拉丁字符前置 `--font-display`，形成中英混排的期刊感。

### 1.3 字号与行高（流式）

| 用途 | 字号 | 行高 | 字重 |
|---|---|---|---|
| Display / Hero | `clamp(2.5rem, 6vw, 4.5rem)` | 1.05 | 600 |
| H1 页面标题 | `clamp(2rem, 4vw, 3rem)` | 1.15 | 600 |
| H2 区块标题 | `clamp(1.5rem, 2.5vw, 2rem)` | 1.25 | 600 |
| H3 小标题 | `1.25rem` | 1.4 | 600 |
| 正文 | `1.0625rem` (17px) | 1.75 | 400 |
| 界面正文 | `0.875rem` (14px) | 1.5 | 400/500 |
| 辅助文字 | `0.75rem` (12px) | 1.5 | 400 |
| 引用格式条目 | `1rem` | 1.6 | 400 |

- 展示级标题使用**负字间距**（`-0.02em`）提升紧凑感；正文 `letter-spacing: 0`；
- 正文最大测量宽度 `68ch`，保证长文可读。

### 1.4 间距（4px 基准）

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96 · 128`

| 场景 | 值 |
|---|---|
| 区块垂直间距（移动 → 桌面） | `48px → 96px` |
| 卡片内边距 | `24px → 32px` |
| 列表项垂直间距 | `20px`（配发丝分隔线） |
| 页面左右留白 | `16px → 24px → 40px` |

### 1.5 布局与尺寸

| 项 | 值 |
|---|---|
| 内容最大宽度 | `1200px` |
| 长文内容宽度 | `720px` |
| 桌面侧栏（成员页） | `320px` |
| Header 高度 | `64px`（移动 `56px`） |
| 最小点击区域 | `44 × 44px` |
| 列表行高（成果条目） | `≥ 56px` |

### 1.6 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `3px` | 标签、徽章、图标按钮 |
| `--radius-md` | `6px` | 输入框、按钮、卡片 |
| `--radius-lg` | `10px` | 弹层、Dialog |

> 学术机构风偏克制：**不使用胶囊形承载普通文字**，胶囊仅用于状态 Chip 与分段筛选器。

### 1.7 阴影（极轻）

| Token | 值 | 使用情况 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(58,58,58,0.05)` | **当前 0 处引用**（卡片按设计就是无阴影） |
| `--shadow-menu` | `0 8px 28px rgba(58,58,58,0.10)` | 导航下拉浮层 |
| `--shadow-dialog` | `0 20px 48px rgba(58,58,58,0.16)` | 移动端抽屉 / 搜索弹层 |

> 内容卡片默认**无阴影**，靠发丝描边与留白建立层次；仅浮层使用阴影。
>
> 阴影色相**跟随背景**：画布已改为纯中性 `#F7F7F7`，阴影也用中性灰 `rgba(58,58,58,·)`，
> 不用冷调近黑 `rgba(26,26,26,·)`（纯黑影子在任何底色上都显脏）。
> 历史上曾是暖调 `rgba(60,57,48,·)`（配合暖画布），画布中性化后一并校正。
>
> **焦点环不走阴影**。`global.css` 里统一用 `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`。
> 历史上并存过一个 `--shadow-focus` 令牌，与 outline 是两套焦点环机制 ——
> 同义双写是漂移隐患（谁用了它就会得到和别处不一样的焦点环），**已删除**，不要加回来。

### 1.8 动效

| Token | 值 |
|---|---|
| `--duration-fast` | `120ms` |
| `--duration-normal` | `180ms` |
| `--duration-slow` | `260ms` |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

**允许的动效**：首屏一次性滚动揭示（`animation-delay` 错峰）、列表项悬停（颜色/边框/背景）、弹层进出、搜索建议出现。

**减少动画**（`prefers-reduced-motion: reduce`）：所有位移改为淡入或直接呈现；取消持续动画；保留无位移的加载指示。

---

## 2. 排版规范（门户的核心资产）

### 2.1 学术成果条目（记忆点组件）

```
┌─────────────────────────────────────────────────────────────┐
│  张三, 李四, 王五                                             │
│  ─────────────────────────────────────────────────────────  │
│  面向复杂系统的数字治理框架研究                                │  ← 标题（衬线，accent 悬停）
│  《管理科学学报》, 2025, 28(4): 1–18          [期刊] [PDF] [DOI]│  ← 元信息（mono 数字）
└─────────────────────────────────────────────────────────────┘
```

- 作者：`--color-ink-secondary`，当前机构作者加粗；
- 标题：衬线，悬停变 `--color-accent` 并出现下划线（不用位移）；
- 期刊与年份：`--font-mono` 呈现数字，保证对齐；
- 操作条（PDF/DOI/引用）：默认半透明，悬停/聚焦时完全显示；**键盘聚焦时也必须显示**。

### 2.2 正文长文

- H2 上方 `64px`、下方 `16px`；H3 上方 `40px`；
- 段落间距 `1.25em`，不使用首行缩进（中文长文可选启用 `text-indent: 2em`，需统一）；
- 引用块使用左侧 `3px` 主色发丝线 + 斜体，不使用大面积色块；
- 表格：表头 `--color-surface-subtle`，单元格仅横向分隔线；窄屏容器内横向滚动；
- 图注：`--color-ink-tertiary`，12px，**居左**，格式「图 N　说明」。
- **摘要块**：`.abstract-block`（标识块 + 浅底 + 左侧 3px 主色线），块内字号小一档（`0.9375rem`）；
  标题 `.abstract-heading` 用无衬线半粗。
  > 特异性提示：摘要块在 `.prose-academic` 内，必须写成 `.prose-academic .abstract-*`（0,2,0），
  > 否则会被 `.prose-academic h2`（0,1,1）盖掉，摘要标题会吃掉 `margin-top: 4rem` 与下边框。
- **关键词行**：`.keywords-line`，独立成行、分号 `；` 分隔，**不写成 chips**（GB/T 7714 与中文期刊体例）。
- **引用条目**：`.citation-text`（13px / 1.7），侧栏内提供 GB/T 7714 与 BibTeX 两种格式。
- **三线表**：`table` 只有顶线 + 表头线 + 底线（各 1.5px / 1px `--color-ink`），中间**不加**横线；
  表头无底色。这是学术表格的排版规范，网页表格的「每行一条下线」不适用。

---

## 3. 组件与样式模式规范要点

> **本节混了三类东西，不要一律当成组件文件**：
> **组件** = `src/components/` 下有同名 `.astro` / `.tsx` 文件；
> **样式类** = 定义在 `src/styles/global.css` 的全局 class；
> **内联模式** = 直接写在某个页面 / 组件里的结构（`Header.astro`、`publications/[slug].astro` 等）。
>
> 反查办法：`find src/components -name "<名字>.astro"`，找不到就不是组件。
> 本节曾把 8 个样式类 / 内联模式写成组件名，其中 `Skeleton` 全站根本不存在 —— 已逐一订正。

| 名称 | 形态 | 规范 |
|---|---|---|
| `btn-primary` / `btn-secondary` / `btn-ghost` | 样式类 | 三档：主色实底 / 描边 / 无底；最小高度 `44px`；**焦点环走全局 `:focus-visible` outline**（不是阴影）；加载态保留宽度不跳动 |
| `tag-quiet` | 样式类 | `radius-sm`，中性底；**标签一律中性**，不用彩色徽章（数量型徽章用 mono） |
| `portal-card` | 样式类 | 白底 + 发丝描边 + 圆角，内含 `.figure-frame` 配图；悬停仅改描边色；**禁止 Card 嵌套 Card** |
| `stat-band` | 样式类 | 深底数据带（`--color-masthead`），数字用 mono + `tabular-nums`；格子间用 `gap-px` + `bg-[var(--color-on-masthead-line)]` 画发丝线 |
| `stretched-link` / `stretched-link-above` | 样式类 | **整卡可点**：卡片本体用 `<div>`（`position: relative`），主链接加 `.stretched-link` 用 `::after` 铺满整张卡；卡内次要链接加 `.stretched-link-above` 抬到伪元素之上。**不要用 `<a>` 套 `<a>`**（非法 HTML，且后台审计会报） |
| `FilterBar` | 内联模式 | 分段选择器 + 下拉，实现在 `PublicationExplorer.tsx` 内（`aria-pressed` 分段按钮）；选中态写 URL；提供「清除」；结果计数实时更新 |
| `Dialog` | 内联模式 | 移动端抽屉，在 `Header.astro`（`role="dialog"` + `aria-modal="true"`）；`Esc` 关闭并归还焦点；打开时焦点进入弹层 |
| `MegaMenu` | 内联模式 | 在 `Header.astro`；分组标题 + 条目 + 一句话描述；键盘方向键可遍历；同屏只开一个顶级菜单；`openedByClick` 标记用于规避「悬停打开后点击立即关闭」 |
| `BibTeXBlock` | 内联模式 | 在 `publications/[slug].astro`：`<pre data-bibtex>` + 复制按钮；复制结果经 `aria-live="polite"` 播报；`navigator.clipboard` 失败回退 `execCommand('copy')` |
| `Pagination` | 组件 | 上一页/下一页 + 页码；当前页 `aria-current="page"` |
| `EmptyState` | 组件 | 一句说明 + 一个明确动作（如「清除筛选」「查看全部成果」） |
| `SectionHeading`（区块标题栏） | 组件 | 左侧 `3px` 主色竖线 + 中文标题（衬线）+ 英文标签（等宽）+ 右侧「更多 +」；下方 `section-note` 一句话说明；`eyebrow` 可选、默认不写 |
| `citation` / `toGbt7714` / `formatVenue` | 工具（`src/lib/citation.ts`） | 学术检索与引用：Highwire `citation_*` 生成、GB/T 7714-2015 条目生成、中文载体名《》分流。**不是组件**，无 DOM 输出，被 `SeoHead.astro` 与成果页调用 |
| `AbstractFigure` | 组件 | 由 `seed` 确定性生成 SVG 抽象图形（strata / mesh / orbit / grid / signal / prism 六变体），用于焦点图与卡片配图；`aria-hidden`，零外部图片依赖 |
| `Carousel` | 组件 | 首页焦点轮播：箭头 + 圆点 + 方向键 + 自动播放（5.5s）+ 暂停/继续按钮；悬停/聚焦/减弱动效时暂停；slide 叠在同一网格格切换不跳高；无 JS 降级为第一张静态卡片；标题一律 `h2` |
| `CoverImage` | 组件 | 卡片配图统一入口：**有 `cover` 就渲染真实图片**（`h-full w-full object-cover` + `alt` + `loading` + `decoding="async"`），没有才回落 `AbstractFigure` 的抽象 SVG。只负责填满外层给定的框，**不改变尺寸语义** —— 漏掉 `h-full w-full` 会撑破 `.figure-frame` |
| `NoticeList` | 组件 | 通知公告列表：圆点 + 标题 + 等宽日期右对齐；悬停圆点与标题同时变主色；`compact` 模式用于侧栏 |
| `AsideBox` | 组件 | 侧栏区块：顶部发丝线 + 眉标题 + 插槽；吸顶偏移 `calc(var(--nav-h) + 1.5rem)` |
| `PublicationExplorer` | 组件（React 岛） | `client:visible`：类型 / 年份 / 标签三档筛选，状态写 URL query；年份 `<select>` 必须带 `aria-label="按年份筛选"`（无可见 label 时） |
| `JsonLd` | 组件 | 输出 `{"@graph": [...]}`，单页多类型结构化数据合并为一个 `<script>`；类型分布由 `npm run audit` 校验 |

> **未实现**：`Skeleton`（骨架屏）。历史上本节为它写了规范，但全站没有任何实现。
> 本站是静态预渲染，首屏无异步数据等待，骨架屏本就没有用武之地 ——
> 若将来真引入异步内容再补，**不要照着历史规范去实现一个没有场景的东西**。

---

## 4. 响应式细则

| 断点 | Header | 列表 | 首页 |
|---|---|---|---|
| `≥ 1440` | 完整导航 + 搜索框 | 三列 / 成果单列时间轴 | 非对称双栏 |
| `1280–1439` | 完整导航 | 三列 | 双栏 |
| `1024–1279` | 完整导航，Mega 收窄 | 双列 | 双栏 |
| `768–1023` | 汉堡 + 抽屉 | 双列 | 单列 |
| `< 768` | 汉堡 + 搜索按钮 | 单列 | 单列 |

- 组件内部响应式优先使用**容器查询**（`@container`），而非全局媒体查询；
- 栅格间距统一用 `gap`，不给单项加 `margin`；
- 左右内边距按断点递增：`px-4 sm:px-6 lg:px-10`。

---

## 5. 交付前自检清单

### 视觉质量
- [x] 无 emoji 充当图标
- [ ] 悬停不引起布局位移
- [x] 卡片无阴影、无嵌套；分隔线为发丝级
- [x] 数字与日期使用 mono 字体对齐

> **图标策略（实际落地）**：站点侧不引入任何图标库 —— 装饰配图用 `AbstractFigure` 的确定性 SVG，UI 图标（搜索、菜单、箭头、复制）为**手写内联 SVG**，统一 `24×24`、`currentColor`、`aria-hidden`。
> 后台侧用 MUI `SvgIcon` 包 5 个内联路径（见 `admin/src/icons.tsx`），**不装 `@mui/icons-material`**（2000+ 文件换 5 个图标，见 ADR-02）。

### 交互
- [ ] 所有可点击元素 `cursor: pointer`，有悬停反馈
- [x] 过渡时长 150–300ms，缓动统一
- [x] 键盘焦点可见（`:focus-visible`）
- [x] 筛选写入 URL 且可清除

### 无障碍
- [ ] 正文对比度 ≥ 4.5:1，大字 ≥ 3:1 —— ⏳ 需真实浏览器取计算样式
- [x] 图片有 `alt`，图表有文本摘要（装饰 SVG 一律 `aria-hidden`）
- [ ] 状态不只靠颜色
- [x] 尊重 `prefers-reduced-motion`
- [x] 标题层级不跳级，Skip Link 可用 —— `npm run audit` 强制

### 布局
- [ ] 375 / 768 / 1024 / 1440 四档无破版 —— ⏳ 需可信浏览器
- [ ] 移动端无页面级横向滚动
- [x] 固定导航不遮挡首屏内容（报头已改为静态，仅主导航 sticky）
- [ ] 200% 缩放核心任务可用

> ⏳ 项不可在本沙箱自动验证：`agent-browser` 的 `eval` / `snapshot` / 截图对真实页面返回空值（已用静态站做对照实验确认），
> 因此四档视口、Lighthouse、axe 需在 CI 或有 GUI 的环境补跑。
> 可静态验证的部分已全部下沉到 `npm run audit` / `npm run taste` / `npm run contrast`
> —— **注意对比度已不再是 ⏳ 项**，它可精确计算，已固化为门禁（见下）。

### 设计品位门禁（`npm run taste`）

按「反 AI 味」规范做的机械检查。**只收能正则可靠判定的项** —— 对齐、节奏、图片质量静态查不出，宁可不查也不放假检查。

| 规则 | 判定 | 为什么 |
|---|---|---|
| `DASH-001` | 可见文本里 `—` / `–` 必须为 0 | 破折号是 LLM 最典型的文体拐杖；区间一律用半角连字符（`2024.09-2027.08`） |
| `TASTE-001` | 每页区块眉标签数 ≤ `ceil(区块数 / 3)` | 每个区块都挂一个小标签是最容易被认出的模板节奏 |
| `TASTE-002` | 无 `00 / INDEX` 式编号标签 | 能数出来的东西不需要编号 |
| `TASTE-003` | 无 `Scroll to explore` / `↓ scroll` | 用户知道怎么滚动 |
| `TASTE-004` | 无 `V0.6` / `BETA` / `EARLY ACCESS` | 版本号是产品页语汇，不是机构页 |
| `TASTE-005` | 单个文本块内中间点 ` · ` ≤ 1 | 中间点被当默认分隔符会变成噪音 |
| `TASTE-006` | 源码无 `h-screen`（用 `min-h-[100dvh]`） | iOS Safari 地址栏会导致整屏跳变 |
| `TASTE-007` | 圆角只用 3 / 6 / 10px 三档 | 形状系统混用会显得没有主见 |

**眉标签政策（本项目已定）**：`SectionHeading` 的 `eyebrow` 是**可选**的，默认不写。
首页 9 个区块只保留 3 个（`Notices` / `Research` / `Topics`），间隔 ≥ 3 个区块。
新增区块时**默认不加**，除非能说清它提供了中文标题之外的额外信息。
`PageHero` 的 `eyebrow` 是页面级标签，每页 1 个，不受此限。

### 色彩对比度门禁（`npm run contrast`）

对比度**可以精确计算**，属于「能可靠判定」的检查，因此固化为门禁（`scripts/contrast.mjs`）。

| 规则 | 判定 |
|---|---|
| `CONTRAST-001` | 22 组**真实在用**的文字组合，一律 ≥ 4.5:1；失败退出码 1 |

**为什么统一取 4.5:1 而不是分级**：WCAG 允许大字号（18px+ 或 14px 粗体）只到 3:1，
但「这个 `text-meta` 最终计算字号是多少」需要跑完整 CSS 层叠才能确定，成本高且易误判。
统一取最严阈值 —— 通过则分级必然通过，不通过则确实值得看一眼。**宁可从严，不要假检查。**

**数据来源**：脚本直接解析 `src/styles/tokens.css`，不硬编码任何色值，因此改令牌后自动跟随。
半透明层级（`--color-on-masthead-*`、`--color-scrim`）按**合成后的实色**计算 ——
直接拿原色去算会高估对比度。

**配对表只收真实在用的组合**（依据是对 `src/` 的 grep 统计）。不要往里加「以后可能会用」的组合，
那会让门禁变成永不触发的假检查。语义状态色因此不在覆盖内（全站未使用）。

> 本门禁的由来：`--color-ink-tertiary` 曾是 `#6E6E66`，对最不利背景仅 4.48:1，
> 而它被用了 76 次、绝大多数是 10-12px 的小字。肉眼看「灰得挺雅致」，静态审计不报错 —— 这类缺陷只有算才能发现。

### 产物洁净度（`HYG-001`，在 `npm run audit` 内）

**`.astro` 模板里的 `<!-- -->` 会被原样输出到 HTML**（不像 JSX 会自动剥注释）。
开发注释一律用 `{/* */}` 写，Astro 会剥掉。

| 规则 | 判定 |
|---|---|
| `HYG-001` | 产物 HTML 里不得出现**有内容**的注释（Astro 自身的空注释 `<!-- -->` 与 `<!--astro:end-->` 不算） |

> 由来：4 个文件里的 21 处注释渲染到 51 个页面、共 472 处 / 16.5 KB，
> 把设计决策与「不要这样做」的内部备注一起发给了所有访客。
> 修掉后 index.html 从 101.5 KB 降到 88.6 KB（其中约 12 KB 来自同时精简掉的 6 个内联抽象图形）。

---

## 6. 反模式（禁止）

- 紫色渐变 + 纯白底的通用 AI 审美
- Inter / Roboto / Arial / 系统字体作为主字体
- 卡片阴影堆叠、卡片嵌套卡片
- 悬停缩放、位移导致抖动
- emoji 图标、混用图标库
- 装饰性持续动画、粒子背景、鼠标跟随
- **无暂停控件的自动轮播**、自动播放视频背景
  （首页焦点轮播是**唯一例外**，且必须可暂停 / 减弱动效默认静止 / 悬停与焦点暂停 / 后台不计时 / 键盘可达；不得扩展到其他页面）
- 内容区大面积饱和色块压过正文
- **每个区块都挂眉标签**（见 §5 眉标签政策）
- **用破折号 `——` 代替句号或顿号**；区间用 `-` 不用 `–`
- **暖调米白 / 米黄画布**（`#F7F7F5` 这类 H60 微暖灰）—— 会读成「杂志 / 设计工作室」而不是机构；
  中性层一律 H0 / S0%（依据见 §1.1）
- 阴影色相与背景脱节（阴影色相应向背景偏；画布是中性灰，阴影也用中性灰 `rgba(58,58,58,·)`）
- **同一机制写两套令牌**（如焦点环同时有 `outline` 和 `--shadow-focus`）——
  谁用了其中一个就会得到与别处不一致的效果，是漂移隐患
