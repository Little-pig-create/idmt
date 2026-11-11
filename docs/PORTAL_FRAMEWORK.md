# 架构说明 · IDMT

## 1. 为什么是 Astro + 岛屿

站点以内容为主，绝大多数页面是静态的：方向、产品、实验室、新闻、活动、公告。
Astro 在构建期完成数据读取与渲染，输出纯 HTML；只有轮播、Tab、筛选、数字滚动等
少数交互挂载为 React 岛屿（`client:visible` / `client:load`）。

结果：首屏 JS 约 14 KB（gzip 4.7 KB），HTML 均值 33 KB，无客户端路由框架。

## 2. 前后端边界

- 前台产物是**纯静态**，不包含任何后台代码，也不在运行时请求后台接口。
- 后台写 Markdown → 触发构建 → 产物发布。内容与展示之间没有数据库。
- 这带来两个好处：发布可回滚（软链切换产物）、内容可审计（Git diff）。
- 代价：发布不是即时的（构建约 2–3 秒），后台的「构建发布」页负责这件事。

## 3. 内容管线

```
admin 表单 ──► src/content/<collection>/<id>.md ──► content.config.ts 校验
                                                      │
                                              Astro 构建 ──► dist/
                                                      │
                                              Caddy / Pages
```

字段规则两处维护：`src/content.config.ts` 与 `admin/schema.mjs`，必须同步。

## 4. 部署前缀

GitHub Pages 项目站挂在 `/idmt/` 下。Astro 的 `base` 只重写它自己生成的 URL，
源码里手写的根绝对路径必须经 `src/lib/paths.ts` 的 `u()` 加前缀。
`npm run smoke` 会扫描产物里的 `href="/…"`，漏加前缀直接失败。

自建服务器若部署在域名根，删除 `astro.config.mjs` 的 `base` 即可，其余无需改动。

## 5. 依赖选择

| 需求 | 选择 | 理由 |
|---|---|---|
| UI 原语 | shadcn/ui | 源码进入仓库、可改；Radix 保证键盘与焦点行为 |
| 动效组件 | Magic UI | 走 registry 安装，避免自己实现跑马灯/数字滚动 |
| 动画 | motion | 声明式、尊重 reduced-motion |
| 轮播 | embla | 轻量、触控友好 |
| 后台表格 | TanStack Table | 排序/筛选无侵入 |
| 后台图表 | Recharts | 组合式 API，够用 |
| 后台服务 | Node 原生 HTTP | 零框架依赖，容器体积小 |

没有引入 Next.js：站点不需要 SSR / RSC，静态输出更省资源，也更符合机构站的发布节奏。

## 6. 目录约定

- `src/components/site`：业务组合组件（页头、首屏、区块）。
- `src/components/ui`：第三方组件（shadcn / Magic UI），尽量不改，改则记录原因。
- `src/data`：站点设置、导航、组织架构等非内容型数据。
- `src/content`：全部内容，后台可写。
- `scripts`：门禁与工具。

## 7. 质量门禁

| 命令 | 检查 |
|---|---|
| `npm run build` | 内容 schema、页面编译 |
| `npm run audit` | a11y、SEO、JSON-LD、内部链接、体积预算、产物洁净度 |
| `npm run taste` | 内联样式、硬编码颜色、圆角尺度、空链接、图片 alt |
| `npm run contrast` | 21 组文字配色 ≥ 4.5:1 |
| `npm run smoke` | 74 项产物断言 |

## 8. 已知限制

- Lighthouse、axe 真实扫描与四档视口视觉回归不在本地沙箱内，需在 CI / 有 GUI 环境补跑。
- 字体子集需在内容大幅更新后重跑 `python3 scripts/fonts-subset.py`；
  未覆盖的字会回退系统字体（不会出现豆腐块）。
- BP 未提供人员姓名与真实联系方式，站点只呈现角色与占位联系方式。
