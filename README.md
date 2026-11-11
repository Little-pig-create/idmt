# 数字管理技术研究院（IDMT）· 官网与内容后台

一所数字技术研究院的机构站点：**Astro 静态前台** + **React 内容后台**。
前台追求「大气」的机构观感（全屏首屏、深空蓝、大字号排版、克制的滚动动效），
后台追求「能干活」（登录、内容 CRUD、媒体库、站点设置、一键构建发布）。

内容来源：`IDMT数研院BP初稿` 整理出的研究方向、产品线、实验室与组织架构。

---

## 一、技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前台框架 | Astro 7（静态输出 + 岛屿架构） | 内容集合、路由、SEO、RSS、sitemap |
| 样式 | Tailwind CSS v4（CSS-first `@theme`） | 设计令牌单一数据源 `src/styles/tokens.css` |
| 组件库 | **shadcn/ui**（Radix 原语） | Button / Dialog / Sheet / Tabs / Select / Switch … |
| 动效组件 | **Magic UI**（Marquee / Number Ticker / Bento / Blur Fade） | 经 shadcn registry 安装 |
| 动效 | **motion**（framer-motion） | 进入视口淡入、数字滚动 |
| 轮播 | **embla-carousel-react** | 产品横向浏览 |
| 图标 | **lucide-react** | 线性图标 |
| 字体 | Noto Sans SC + LXGW 新致宋 + IBM Plex Sans（自托管子集） | 无外部 CDN |
| 后台框架 | React 19 + Vite 7 + TypeScript | 独立 SPA，由 `admin/server.mjs` 托管 |
| 后台组件 | shadcn/ui + **TanStack Table** + **Recharts** | 表格排序/筛选、图表 |
| 后台服务 | Node 原生 HTTP + js-yaml | 零框架依赖，直接读写 Markdown |
| 鉴权 | HttpOnly Cookie + HMAC 会话 | `ADMIN_PASSWORD` / `ADMIN_SECRET` |

> 为什么前台不用 MUI：MUI 依赖 Emotion 运行时，与静态输出和机构观感都不合。
> 前台只引入按需的 Radix 原语与少量动效组件，首屏 JS 约 14 KB（gzip 4.7 KB）。

---

## 二、目录

```text
├─ src/
│  ├─ components/
│  │  ├─ site/            前台组合组件（Header / Footer / Hero / Tabs / 轮播 …）
│  │  └─ ui/              shadcn/ui 与 Magic UI 组件
│  ├─ content/            内容源（Markdown + YAML frontmatter）
│  │  ├─ research/        9 个研究方向
│  │  ├─ products/        12 条产品与方案
│  │  ├─ labs/            十大实验室 + 分中心 + 平台
│  │  ├─ news/  events/  notices/
│  ├─ data/               站点设置、导航、组织架构
│  ├─ layouts/            BaseLayout
│  ├─ lib/                paths（部署前缀）、utils（cn）
│  ├─ pages/              路由
│  └─ styles/             tokens / global / typography / fonts
├─ public/images/         从 BP 提取并压缩的图片
├─ admin/
│  ├─ server.mjs          API：鉴权、CRUD、上传、构建
│  ├─ schema.mjs          后台内容模型（与 content.config.ts 对齐）
│  └─ src/                React 后台（登录 / 仪表盘 / 内容 / 媒体 / 设置 / 发布）
├─ scripts/               audit / taste / contrast / smoke / fonts-subset
└─ deploy/                Docker Compose + Caddy
```

---

## 三、快速开始

```bash
# 前台
npm install
npm run dev            # http://localhost:4321/idmt/

# 后台（两个进程，或先构建后单进程）
cd admin && npm install && npm run dev     # http://localhost:5173
node server.mjs                            # API :4322

# 生产：构建后台后由 API 进程一并托管
cd admin && npm run build
ADMIN_PASSWORD=your-password node server.mjs   # http://127.0.0.1:4322
```

后台默认密码 `idmt-admin`，启动时会打印告警。**上线前必须设置 `ADMIN_PASSWORD`。**
会话签名密钥 `ADMIN_SECRET` 为空时每次重启失效（会要求重新登录），多实例部署必须显式设置。

---

## 四、内容模型

| 集合 | 用途 | 正文 |
|---|---|---|
| `research` | 研究方向（9） | Markdown |
| `products` | 产品与方案（12），含关键指标表 | Markdown |
| `labs` | 专业实验室 / 分中心 / 公共平台 | Markdown |
| `news` | 新闻（首页头条、列表、详情） | Markdown |
| `events` | 学术活动 | Markdown |
| `notices` | 通知公告 | Markdown |

字段规则在两处维护，必须同步：

- `src/content.config.ts`（构建期校验，写错直接构建失败）
- `admin/schema.mjs`（后台表单与写入校验）

**内容文件是唯一数据源。** 后台只是文件的一层图形界面，直接改 `src/content/**` 同样有效。

---

## 五、后台功能

| 模块 | 能力 |
|---|---|
| 登录 | 密码 + HttpOnly 会话；默认密码告警 |
| 仪表盘 | 条目总数、草稿、素材、构建状态；各集合分布图；快捷入口 |
| 内容管理 | 六个集合的列表、搜索、排序、新建、编辑、删除；草稿开关 |
| 编辑器 | 动态字段（文本 / 日期 / 枚举 / 数组 / 图片 / 键值对）+ Markdown 编辑/预览 |
| 媒体库 | 拖入上传（JPEG/PNG/WebP/SVG/AVIF）、复制路径、删除 |
| 站点设置 | 机构名称、定位、联系方式（写入 `src/data/site-settings.json`） |
| 构建发布 | 一键 `npm run build`，实时日志与结果 |

安全边界：所有写接口需登录；后台默认只监听 `127.0.0.1`，生产置于内网或 Caddy `basic_auth` 之后。

---

## 六、设计系统

- **色彩**：深空蓝黑 `#050b16` 作暗面，冷白 `#f4f6fa` 作明面；品牌蓝 `#1f5eff` 与青绿 `#20c9b4` 构成渐变；金色只作极小面积点缀。
- **字体**：中文 Noto Sans SC 承担标题与正文；LXGW 新致宋用于引文与人文段落；拉丁 IBM Plex Sans。
- **尺度**：圆角 4 / 8 / 14 / 20 / 28；阴影 4 档；所有颜色与字号来自 `tokens.css`。
- **动效**：仅进入视口淡入与数字滚动；`prefers-reduced-motion` 下全部关闭。

详见 `docs/DESIGN_SYSTEM.md`。

---

## 七、质量门禁

```bash
npm run build      # 内容 schema + 页面编译
npm run audit      # a11y / SEO / JSON-LD / 内部链接 / 体积预算
npm run taste      # 内联样式 / 硬编码颜色 / 圆角尺度 / 图片 alt
npm run contrast   # 21 组文字配色 ≥ 4.5:1（WCAG 2.2 AA）
npm run smoke      # 74 项产物断言（路由、详情页、索引、字体、图片）
```

CI 另有一个 job 单独构建 `admin/`，防止后台改动悄悄破坏构建。

字体子集：`python3 scripts/fonts-subset.py`（扫描源码与 dist 实际用字，
从 `.fonts-src/` 的源字体裁剪出 `public/fonts/*.woff2`）。

---

## 八、部署

### GitHub Pages（仅前台）

`astro.config.mjs` 的 `base: '/idmt'` 对应项目站路径。
**源码里手写的根绝对路径必须经 `src/lib/paths.ts` 的 `u()` 加前缀**，否则线上断链；
`npm run smoke` 会检查这一点。

### 自建服务器（前台 + 后台）

```bash
cp deploy/.env.example deploy/.env   # 填 ADMIN_PASSWORD
docker compose -f deploy/compose.yaml up -d
```

- `proxy`：Caddy，前台静态文件 + 404 兜底 + 安全头；后台独立域名 + `basic_auth`
- `admin`：Node 服务，托管 SPA 与 `/api/**`，只挂内网
- `publisher`：一次性发布器（`--profile tools`），构建 → 门禁 → 切换软链

---

## 九、内容与素材说明

- 文案依据 BP 整理：六大研究中心、九大研究方向、产品线参数、固态储氢 4282 公里实测、
  金属增材鞋模工序压缩等均来自 BP 原文；三年目标标注为「规划目标」。
- 图片来自 BP 中的产品渲染与场景图，已压缩为 WebP/JPEG 并放入 `public/images/`。
- **联系方式为占位值**（`src/data/site-settings.json`）：上线前请替换为真实邮箱、电话与地址。
- BP 未提供个人姓名，因此站点只呈现治理架构与角色，不虚构人员名单。
