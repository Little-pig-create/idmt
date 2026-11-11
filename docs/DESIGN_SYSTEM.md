# 设计系统 · IDMT

> 单一数据源：`src/styles/tokens.css`。组件不得硬编码颜色、字号与圆角。

## 1. 气质定位

**Deep-Tech Institution**：机构的分量感 + 工程技术的精密感。

- 暗面承担「体量」：首屏、技术体系、CTA 使用深空蓝黑，配细网格与蓝色辉光。
- 明面承担「阅读」：冷白画布 + 白卡片，长文与信息密集区保持高可读性。
- 动效克制：只做进入视口淡入与数字滚动，不做视差、不做弹跳。

## 2. 色彩

| 令牌 | 值 | 用途 |
|---|---|---|
| `--color-night` | `#050b16` | 暗面基底 |
| `--color-night-2` | `#0a1526` | 暗面卡片 / 弹层 |
| `--color-night-3` | `#101f36` | 暗面分隔层 |
| `--color-canvas` | `#f4f6fa` | 明面画布 |
| `--color-surface` | `#ffffff` | 卡片 |
| `--color-ink` | `#0a1424` | 正文 / 标题 |
| `--color-ink-secondary` | `#45556d` | 次级文字 |
| `--color-ink-tertiary` | `#5d6b7e` | 辅助文字（已校准 ≥ 4.5:1） |
| `--color-brand` | `#1f5eff` | 品牌蓝 |
| `--color-brand-2` | `#20c9b4` | 青绿（暗面强调） |
| `--color-gold` | `#c19a4b` | 极小面积机构印记 |

渐变：`--gradient-brand`（蓝 → 青）只用于一句主张或品牌标记，不铺满标题。

对比度由 `npm run contrast` 守护：21 组真实组合一律 ≥ 4.5:1。

## 3. 字体

| 令牌 | 家族 | 用途 |
|---|---|---|
| `--font-display` | IBM Plex Sans + Noto Sans SC | 标题、数字 |
| `--font-sans` | 同上 | 正文与 UI |
| `--font-serif-cjk` | LXGW 新致宋 | 引文、人文段落 |
| `--font-mono` | JetBrains Mono | 眉标签、编号、指标 |

字号为 `clamp()` 流式：`display` 2.6–5.5rem，`h1` 2.1–3.4rem，正文 1.0625rem / 1.8。

字重：标题 700，卡片标题 600，正文 400。中文标题字距 `-0.02em ~ -0.035em`。

## 4. 间距与形状

- 区块：`.section` 垂直 `clamp(3.5rem, 7vw, 6.5rem)`。
- 容器：`container-page` 最大 1240px，`container-wide` 最大 1440px。
- 圆角：4 / 8 / 14 / 20 / 28（`rounded-sm…2xl`），不得出现尺度外数值。
- 阴影：`xs / sm / md / lg / glow` 四档；卡片默认描边无阴影，hover 抬升 4px。

## 5. 组件规范

| 组件 | 规范 |
|---|---|
| 页头 | 深色半透明，滚动 24px 后加毛玻璃底；指向当前栏目的下划线 1px 青绿 |
| 按钮 | 主按钮白底深字（暗面）/ 深底白字（明面），高度 44–48px，圆角 8px |
| 卡片 | 描边 `--color-line`，hover 抬升与描边加深，不做彩色投影 |
| 眉标签 | `.eyebrow`：11px 等宽、字距 0.22em、左侧 28px 短线 |
| 分区标题 | 眉标签 + h2 + 一句说明 + 「查看全部」箭头，右对齐入口 |
| 图片 | 一律 `object-cover`；产品图 16:10，新闻图 16:9；必须写 alt |

## 6. 动效

- `Reveal`（motion）：进入视口上浮 24px + 淡入，0.65s，`cubic-bezier(.22,1,.36,1)`。
- `NumberTicker` / `CountUp`：首屏统计数字 0 → 目标值，900ms。
- `Marquee`（Magic UI）：合作方横向滚动，38s 一轮，hover 暂停。
- 全部在 `prefers-reduced-motion: reduce` 下关闭。

## 7. 交付前自检

1. `npm run build` 通过（内容 schema 是硬门槛）。
2. `npm run audit` 零告警。
3. `npm run taste` 零问题（无内联样式、无硬编码色、圆角在尺度内、图片有 alt）。
4. `npm run contrast` 全部 ≥ 4.5:1。
5. `npm run smoke` 全部通过。
6. 1440 / 390 两个宽度目视检查首屏与长页。
