# 数字管理研究院 · 学术门户

学术门户网站与内容发布后台。站点为**零 JS 静态输出**（Astro 7），后台为独立的 **React 19 + MUI** 应用。

## 当前状态

| 项 | 值 |
|---|---|
| 构建页面 | **51**（10 篇成果详情 · 6 篇新闻详情 · 5 场活动详情 · 4 位成员主页 · 4 个方向详情 · 4 个项目详情 · 3 个专题详情 · 1 个专题索引） |
| 内容条目 | **45**（成果 10 · 通知 7 · 新闻 6 · 活动 5 · 人员 4 · 方向 4 · 项目 4 · 专题 3 · 数据集 2） |
| 内部链接 | **3537 条**（`npm run audit` 逐条校验路由与锚点，LINK-001 死链 / LINK-002 坏锚点） |
| `npm run audit` | ✅ 零告警（a11y + SEO + JSON-LD + 体积预算 + 内部链接 + 产物洁净度 HYG-001） |
| `npm run taste` | ✅ 零问题（设计品位：破折号清零 / 眉标签克制 / 圆角尺度单一等 8 条） |
| `npm run contrast` | ✅ 22/22 文字组合 ≥ 4.5:1（WCAG 2.2 AA，从严统一阈值） |
| `npm run smoke` | ✅ 56/56（含学术检索元数据与引用格式断言） |
| 资源体积（gzip） | **JS 8.6 KB · CSS 9.1 KB** —— 均远低于预算（JS ≤ 30 KB、CSS ≤ 20 KB） |
| 资源体积（未压缩） | HTML 均值 39 KB/页（最大 88.7 KB，首页）· JS 23 KB · CSS 45 KB · `dist` 1.93 MB |
| 结构化数据 | `ResearchOrganization`×51 · `ScholarlyArticle`×10 · `NewsArticle`×6 · `Event`×5 · `Person`×4 · `CreativeWork`×4 · `CollectionPage`×3 |
| 学术检索元数据 | 成果详情页输出 Highwire Press `citation_*`（Google Scholar 抓取依据） |

> **体积预算以 gzip 后为准**（`npm run audit` 会同时打印两项）。未压缩的 CSS 45 KB 看着大，
> gzip 后仅 9.1 KB，且全站共用一个样式表、只下载一次。
> 详见 `docs/PORTAL_FRAMEWORK.md` §11，其中也记录了两条**已被实测排除**的误判（轮播、`@source` 范围），避免重复排查。

**未覆盖**（本沙箱无法可靠验证，需在 CI / 有 GUI 环境补跑）：Lighthouse 评分、axe 真实无障碍扫描、四档视口视觉回归。
可静态验证的部分已全部下沉到 `npm run audit` / `npm run taste` / `npm run contrast` / `npm run smoke`
—— **色彩对比度不在「未覆盖」之列**，它可精确计算，已固化为门禁。

**持续集成**：`.github/workflows/ci.yml` 在 push / PR 上跑
`build → audit → taste → contrast → docs:tokens → smoke`，另有一个 job 单独构建 `admin/`（防止后台改动悄悄破坏构建），
以及一个不阻断的 `fonts:check` 提示步骤。
本地提交前跑同一组命令即可，无需等待 CI。

> ℹ️ **版本控制现状**：本站已迁出原父仓库（其 `.gitignore` 第 78 行曾把本站整体排除），
> 现仓库根即本站目录，独立 git 仓库（`master` 分支，157 个文件已跟踪）。
> **尚未配置 remote**：推上 GitHub 前需 `git remote add origin …`，并把 `ci.yml` 里的
> `branches: [main]` 与实际分支对齐（或本地改名 `main`）。
> 另注意：`node_modules/` **不可跨系统复用**（锁文件按平台解析出 `@esbuild/win32-x64` 一类二进制），
> 换到 Linux / CI 首跑需删除后重装；Astro 7 要求 **Node ≥ 22.12**。

## 目录结构

```text
├─ src/                     站点源码（Astro）
│  ├─ components/           布局 / UI / 内容组件
│  ├─ content/              内容集合（MDX + YAML 前置元数据）
│  ├─ content.config.ts     内容 Schema（构建期校验）
│  ├─ data/                 站点与导航配置
│  ├─ layouts/              页面模板
│  ├─ lib/                  工具函数
│  ├─ pages/                路由
│  └─ styles/               设计令牌与全局样式
├─ public/                  静态资源：favicon、自托管字体子集（fonts/）、.nojekyll
├─ admin/                   内容发布后台（独立应用）
│  ├─ server.mjs            零依赖 API 服务，直接读写 src/content
│  └─ src/                  React 19 + MUI 管理端
├─ docs/                    规范文档
└─ dist/                    站点构建产物
```

## 快速开始

### 1. 站点

```bash
npm install
npm run dev        # 开发服务器 http://localhost:4321
npm run build      # 构建静态站点到 dist/
npm run preview    # 预览构建产物
npm run audit      # 静态审计：扫 dist/ 检查 a11y 与 SEO 常见回归
npm run taste      # 设计品位门禁：破折号清零 / 眉标签克制 / 圆角尺度单一
npm run contrast   # 色彩对比度门禁：22 组文字组合 ≥ 4.5:1（解析 tokens.css）
npm run docs:tokens # 文档 / 令牌一致性：反查文档引用的令牌是否都存在
npm run fonts      # 按站点实际用字重新生成字体子集（需本地 .fonts-src/ 源字体）
npm run fonts:check # 字体子集覆盖度：缺字只提示，不阻断发布
npm run smoke      # e2e 冒烟：HTTP 断言 + 内容片段 + Content-Type
```

### 2. 内容发布后台

后台需要**两个进程**：API 服务与管理界面。

```bash
# 进程一：API 服务（读写 src/content，端口 4322）
cd admin
npm install
node server.mjs

# 进程二：管理界面（端口 5173，已配置 /api 代理到 4322）
cd admin
npm run dev
```

打开 <http://localhost:5173> 即可管理内容。

生产用法：先 `cd admin && npm run build`，之后访问 <http://127.0.0.1:4322> —— `node server.mjs` 会同时提供管理界面与 API，不再需要第二个进程。

> **提示**：`admin/` 嵌套在站点项目内，Node 会向上查找 `node_modules`，因此 `vite` 与 `@vitejs/plugin-react` 直接复用站点已安装的版本。如果换环境后提示找不到 `vite`，在 `admin/` 下执行一次 `npm install` 即可。

> **`admin/node_modules` 当前状态**：**已完好**（2026-09-17 复核）。顶层 86 个包，`@mui/material/package.json` 存在，
> `cd admin && npm run build` 通过。历史上曾因沙箱 npm 批量解包卡住而处于半解包状态，**该问题已不复现**，
> 无需再 `rm -rf node_modules && npm install`。

## 内容维护流程

1. 在后台左侧选择内容集合（新闻 / 通知公告 / 成果 / 团队 / 方向 / 活动 / 项目 / 专题）；
2. 点击「新建」，填写表单与正文（Markdown），保存；
3. 内容以 MDX 文件写入 `src/content/<集合>/<id>.md`；
4. 点击顶栏「发布站点」触发重新构建，构建日志会在弹层中显示。

也可以直接编辑 `src/content/` 下的文件 —— 后台只是文件的一层图形界面，**内容文件是唯一数据源**。

### 字段校验

字段规则定义在 `src/content.config.ts`（站点侧）与 `admin/server.mjs` 的 `COLLECTIONS`（后台侧），**两处必须保持一致**。站点侧校验在构建期执行，字段缺失或类型错误会直接导致构建失败。

## 技术栈

| 层 | 选型 |
|---|---|
| 站点框架 | Astro 7（静态输出、岛屿架构） |
| 站点语言 | TypeScript 5（strict） |
| 站点样式 | Tailwind CSS v4（CSS-first `@theme`） |
| 站点交互 | React 19 岛屿（`client:visible`） |
| 页面过渡 | View Transitions（Astro `ClientRouter fallback="swap"`） |
| 链接预取 | Astro `prefetch`（`prefetchAll` + `viewport` 策略，能力检测后降级为 `link rel=prefetch`） |
| 后台构建 | Vite 7 |
| 后台框架 | React 19 + TypeScript |
| 后台组件 | MUI v7（`Table` / `Dialog` / `Snackbar` / `SvgIcon`），不引入 MUI X |
| 后台服务 | Node 原生 HTTP + js-yaml（零框架依赖） |

> **为什么站点不用 MUI**：MUI 依赖 Emotion 运行时，会破坏站点的「零 JS 静态输出」，且 Material 观感与学术机构风冲突。详见 `docs/PORTAL_FRAMEWORK.md` §5。

## 字体（自托管子集）

站点不引用任何外部字体 CDN，5 个家族全部以子集形式自托管在 `public/fonts/`，由 `src/styles/fonts.css` 声明。

| 家族 | 绑定的令牌 | 子集大小 | 可变轴 |
|---|---|---|---|
| Source Serif 4 | `--font-display` | 154 KB | `opsz` `wght` |
| IBM Plex Sans | `--font-sans` | 48 KB | `wdth` `wght` |
| Noto Serif SC | `--font-serif-cjk` | 407 KB | `wght` |
| Noto Sans SC | `--font-sans`（中文） | 312 KB | `wght` |
| JetBrains Mono | `--font-mono` | 35 KB | `wght` |

合计 **955 KB**，覆盖 **1131 个字符**（清单见 `src/styles/fonts-charset.txt`）。

**子集怎么来的**：`npm run fonts` 扫描 `src/{content,components,pages,layouts,lib,data}` 里出现过的字，
并并入上一次 `dist/` 的渲染文本，再按家族裁剪：拉丁家族只收非中日韩字符，中文家族收全集。
源字体（约 41 MB，来自 `google/fonts`）放在 gitignore 的 `.fonts-src/`，不进仓库；
脚本缺源字体时会打印精确下载地址与依赖命令。

> **两条刻意的设计**：
> 1. `@font-face` **不写 `unicode-range`** —— 分片加载是字体 CDN 为一族几十个分片文件设计的；
>    本站每族只有一个自托管文件，加了只会让未列出的码位被判为「不匹配」而回落系统字体，纯风险无收益。
> 2. `fonts:check` 是**提示级、恒退 0** —— 内容走后台 → 推送 → CI，而重新裁剪子集需要源字体和 python 工具链，
>    内容编辑跑不动；为一个新字卡住发布不值得，缺字的表现也是回落系统字体而非豆腐块。真缺字时人工跑 `npm run fonts` 补。

## 文档

| 文档 | 内容 |
|---|---|
| `docs/PAGE_SPECIFICATION.md` | 页面级唯一规格：路由、区块顺序、状态、响应式、无障碍 |
| `docs/PORTAL_FRAMEWORK.md` | 架构与选型：信息架构、技术栈决策记录、目录结构、实施路线 |
| `docs/DESIGN_SYSTEM.md` | 设计令牌、排版规范、组件规范、交付前自检 |
| `scripts/audit.mjs` | 静态 a11y + SEO + 内部链接 + 体积预算 + 产物洁净度（HYG-001）+ 部署前缀（LINK-003）+ CSS `url()` 可达（CSS-001）审计（`npm run audit`） |
| `scripts/taste.mjs` | 设计品位门禁（`npm run taste`）：只做能正则可靠判定的项，不假装能查视觉 |
| `scripts/contrast.mjs` | 色彩对比度门禁（`npm run contrast`）：解析 tokens.css，22 组真实在用的文字组合一律 ≥ 4.5:1 |
| `scripts/docs-tokens.mjs` | 文档 / 令牌一致性门禁（`npm run docs:tokens`）：反查文档引用的令牌是否都有定义 |
| `scripts/config.mjs` | 从 `astro.config.mjs` 反解 `site` / `base`，供审计、冒烟、字体脚本共用 |
| `scripts/smoke.mjs` | HTTP 冒烟断言（`npm run smoke`，56 条，自动带部署前缀） |
| `scripts/verify-frontend-config.mjs` | 前端粒度管理验证套件（`npm run verify:config`，46 项 + 回归守卫） |
| `scripts/fonts.mjs` | 字体子集生成（`npm run fonts`）：按站点实际用字裁剪 `.fonts-src/` 源字体，输出 `public/fonts/*.woff2` + `fonts-charset.txt` |
| `scripts/fonts-check.mjs` | 字体子集覆盖度检查（`npm run fonts:check`）：提示级，缺字退 0 |
| `docs/FRONTEND_CONFIG.md` | 前端粒度管理：动态构建含义、前后端分离边界、接口、粒度、边界与异常 |
| `.github/workflows/ci.yml` | CI：`build → audit → taste → contrast → docs:tokens → smoke`（附 `fonts:check` 提示），并单独构建 `admin/` |

## 前端粒度管理

后台可逐项配置前端的**行为与呈现**，运行时下发生效。完整说明见 `docs/FRONTEND_CONFIG.md`。

| 粒度 | 能配什么 |
|---|---|
| 页面 / 路由 | 启用 / 隐藏（不展示但可直达）/ 禁用（不可访问并提示）+ 访问级别 |
| 区块 / 组件 | 单独开关、显示顺序、标题与说明覆盖 |
| 元素 | 按钮 / 链接 / 图标的显示隐藏、文案、跳转目标 |
| 文案 i18n | 按语言分别覆盖，未配置回落默认 |
| 主题样式 | 设计令牌（白名单 + `#hex`）、Logo、页脚 |
| 功能开关 | 轮播自动播放、全站搜索、后台入口可见性 |

**前后端分离**：配置由后台持久化并在**每个请求时动态构建**下发（`GET /api/frontend-config`），
前台运行时拉取应用（`src/scripts/frontend-config-runtime.ts`）。
配置**不预编译进前台静态产物**，前台产物里也不含后台代码。

> **未配置时前台行为与改动前逐字节一致** —— 由 `scripts/config-regression-guard.py` 守护
> （L1 可见文本 + L2 结构骨架，51/51 页）。
>
> ⚠️ 「动态构建」在本项目指 **runtime config resolution**，非 SSR。
> 代价是**被禁用页面的内容仍在静态 HTML 里**（客户端只负责替换为提示页），
> 且站点不再「零 JS」（新增约 4.5 KB gzip）。与 `docs/PORTAL_FRAMEWORK.md` §5.2/§5.3
> 「零 JS 静态输出」的既有 ADR 冲突已在 `docs/FRONTEND_CONFIG.md` §1 明确记录。

## 学术体例与检索

站点不只是「看起来像学术站」，成果页按学术出版与检索的规则组织：

| 机制 | 实现位置 | 为什么需要 |
|---|---|---|
| Highwire Press `citation_*` 元数据 | `src/lib/citation.ts` → `SeoHead.astro` | Google Scholar 一类学术检索系统靠这套标签抓取元数据；没有它，成果页在学术检索链路里是隐形的。`citation_author` 一人一条，`citation_journal_title` / `citation_conference_title` 按文献类型分流 |
| GB/T 7714-2015 引用条目 | `src/lib/citation.ts` → 成果详情页侧栏 | 中文期刊投稿与学位论文的**强制**引用格式。BibTeX 只服务 LaTeX 用户，覆盖不了这批人 |
| 数据集 `[DS]` 引用 | `toDatasetCitation()` | 数据集是学术产出，国标里有独立标识码 |
| 中文载体名用《》不倾斜 | `formatVenue()` | 中文出版体例用书名号；且 Noto Serif/Sans SC 无真斜体，浏览器会合成机械倾斜 |
| 摘要 / 关键词标注块 | `publications/[slug].astro` + `typography.css` | 摘要是有标识的块，关键词独立成行用分号分隔，不是散落的 chips |
| 三线表 | `typography.css` `.prose-academic table` | 顶线 + 表头线 + 底线，中间不加横线 —— 学术表格的排版规范 |

> **卷 / 期 / 页码**（`volume` / `issue` / `pages`）是可选字段：缺失时引用生成器按类型逐级降级
> （`22(6)` → `22` → `(6)` → 无），不会留下空占位符。**补数据才能得到完整引用条目。**

## 部署

| 项 | 值 |
|---|---|
| 托管 | GitHub Pages，构建来源为 GitHub Actions（`verify` 全绿 → `upload-pages-artifact` → `deploy-pages`） |
| 线上地址 | `https://little-pig-create.github.io/idmt/` |
| 部署前缀 | `astro.config.mjs` 的 `base`，**唯一真相**；脚本经 `scripts/config.mjs` 从它反解，不再各抄一份 |
| 触发 | 只有 `main` 的 push 发布；PR 与其他分支只跑门禁 |

**路径约定**（项目站最容易踩的地方）：Astro 的 `base` 只重写**它自己生成**的链接
（打包资源、`canonical`、sitemap），对源码里手写的根绝对路径一概不动。所以：

- 模板与数据一律存**根绝对路径**（`/news`），输出 HTML 前经 `src/lib/paths.ts` 的 `u()` 加前缀；
- 组件的 `href` prop 由**叶子组件**在发射 `<a>` 时加前缀，调用方不提前加 —— 两边都加会得到 `/idmt/idmt/…`；
- 路由匹配一律 `routeOf()` 归一（`Header.astro` 的 active 判定、`frontend-config-runtime` 的按路由配置），
  否则设了 base 之后 `pathname === '/'` 不成立，首页 `<h1>` 会静默消失；
- 客户端脚本里用 `import.meta.env.BASE_URL`（Vite 构建期替换）。

漏网有三门门禁兜着：`LINK-003`（内部链接缺前缀）、`CSS-001`（CSS `url()` 指向不存在的产物）、
`FONTS-002`（字体 URL 前缀 ≠ 当前 base）。

**换自定义域名时**：删掉 `base`、把 `astro.config.mjs` 的 `site` 与 `src/data/site.ts` 的 `url`
换成新域名、加 `public/CNAME`，然后重跑 `npm run fonts`（fonts.css 里的字体 URL 跟着 base 走）。

> `admin/` 内容后台是有状态的 Node 服务，Pages 承载不了；它只在本地或另找主机运行，
> 产物里也不含后台代码。前台指向它的 `/idmt/admin` 链接在 Pages 上会 404，
> 上线后用前端粒度管理的「后台入口可见性」开关关掉，或把该链接改成后台的真实地址。

## 安全提示

`admin/server.mjs` 只监听 `127.0.0.1`，且**没有鉴权**，定位是本地内容工具。若要部署到服务器，必须置于内网或反向代理的鉴权之后，不要直接暴露到公网。
