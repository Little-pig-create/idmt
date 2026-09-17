#!/usr/bin/env node
/**
 * contrast.mjs —— 色彩对比度门禁（CONTRAST-001）
 *
 * 为什么有这个脚本：
 *   本次配色校准发现 --color-ink-tertiary 曾是 #6e6e66，对画布仅 3.24:1，
 *   而它在全站被用了 76 次、绝大多数是 10-12px 的日期 / 英文名 / 月标 ——
 *   肉眼看"灰得挺雅致"，静态审计不报错，但它不满足 AA。
 *   对比度是**可以精确计算**的，属于"能可靠判定"的检查，因此固化为门禁。
 *
 * 判定口径（有意从严）：
 *   所有文字色对所有真实背景一律要求 >= 4.5:1。
 *   为什么不用"大字号 3:1 即可"的分级：字号由 Tailwind 类决定，
 *   静态解析 <span class="text-meta"> 的最终计算字号需要跑完整 CSS 层叠，
 *   成本高且易误判。统一取最严阈值 —— 通过则分级必然通过，
 *   不通过则确实值得看一眼。宁可从严，不要假检查。
 *
 * 数据来源：直接解析 src/styles/tokens.css，不硬编码任何色值，
 *   因此改令牌后本脚本自动跟随，不会与真源漂移。
 *
 * 用法：node scripts/contrast.mjs        （失败退出码 1）
 *       node scripts/contrast.mjs <path>  （用指定令牌文件，供反向测试注入坏值）
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// 允许用第一个参数指定令牌文件，便于反向测试：注入坏色值确认门禁真的会报警
const TOKENS = process.argv[2]
  ? resolvePath(process.argv[2])
  : join(ROOT, 'src', 'styles', 'tokens.css');

/* ---------------- 颜色解析 ---------------- */

function parseHex(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6); // 忽略 alpha，见下方说明
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * 从 tokens.css 收集 --color-* 的原始声明文本（保留 var()/color-mix 形式）。
 * 键统一去掉 `color-` 前缀存储，这样配对表里可以直接写 `ink-tertiary`，
 * 读起来和组件里的 Tailwind 类名（text-ink-tertiary）一致。
 */
function readRawTokens(css) {
  const out = new Map();
  const re = /--(color-[a-z0-9-]+)\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1].replace(/^color-/, '');
    const value = m[2].trim();
    out.set(name, value);
  }
  return out;
}

/** 查表：允许带或不带 color- 前缀 */
function token(raw, name) {
  return raw.get(name) ?? raw.get(name.replace(/^color-/, ''));
}

/** 把令牌值解析成 rgb；支持 #hex 与 var(--other) */
function resolve(name, raw, depth = 0) {
  if (depth > 8) return null;
  const value = token(raw, name);
  if (!value) return null;
  const v = value.trim();

  if (v.startsWith('#')) return parseHex(v);

  const varMatch = v.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/);
  if (varMatch) return resolve(varMatch[1], raw, depth + 1);

  return null;
}

/**
 * 解析 color-mix(in srgb, var(--x) N%, transparent)。
 * 语义：把 --x 以 N% 不透明度叠加在给定背景上，返回合成后的实色。
 * 这正是浏览器渲染半透明文字的方式，对比度必须按合成结果算，
 * 直接拿 --x 的原色去算会高估对比度。
 */
function resolveOver(name, raw, bg, depth = 0) {
  if (depth > 8) return null;
  const value = (token(raw, name) || '').trim();
  if (!value) return null;

  if (value.startsWith('#')) {
    const c = parseHex(value);
    return c ? { ...c, alpha: 1 } : null;
  }

  const varOnly = value.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/);
  if (varOnly) return resolveOver(varOnly[1], raw, bg, depth + 1);

  const mix = value.match(
    /^color-mix\(\s*in\s+srgb\s*,\s*var\(\s*--([a-z0-9-]+)\s*\)\s*([\d.]+)%\s*,\s*transparent\s*\)$/
  );
  if (mix) {
    const base = resolveOver(mix[1], raw, bg, depth + 1);
    if (!base) return null;
    const a = parseFloat(mix[2]) / 100;
    return {
      r: base.r * a + bg.r * (1 - a),
      g: base.g * a + bg.g * (1 - a),
      b: base.b * a + bg.b * (1 - a),
      alpha: 1,
    };
  }

  return null;
}

/* ---------------- WCAG 对比度 ---------------- */

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------- 真实配对表 ---------------- */
/**
 * 只列**组件里实际存在**的组合，依据是对 src/ 的 grep 统计：
 *   text-ink-secondary 90 处 / text-ink-tertiary 76 处 / text-ink 41 处 /
 *   text-accent 22 处 / text-accent-ink 6 处；
 *   容器 bg-surface 13 / bg-accent-soft 10 / bg-surface-subtle 9 / bg-accent 5。
 * 不要往这里加"以后可能会用"的组合 —— 那会变成假检查。
 */
const TEXT_PAIRS = [
  // [前景, 背景, 说明]
  ['ink', 'canvas', '正文 / 标题'],
  ['ink', 'surface', '卡片正文'],
  ['ink', 'surface-subtle', '浅底区块正文'],
  ['ink', 'accent-soft', '强调底正文'],

  ['ink-secondary', 'canvas', '摘要 / 副标题'],
  ['ink-secondary', 'surface', '卡片摘要'],
  ['ink-secondary', 'surface-subtle', '浅底摘要'],
  ['ink-secondary', 'accent-soft', '强调底摘要'],

  ['ink-tertiary', 'canvas', '日期 / 英文名 / 月标（10-12px，最不利）'],
  ['ink-tertiary', 'surface', '卡片元信息'],
  ['ink-tertiary', 'surface-subtle', '浅底元信息（全站最不利背景）'],
  ['ink-tertiary', 'accent-soft', '强调底元信息'],

  ['accent', 'canvas', '链接 / 强调文字'],
  ['accent', 'surface', '卡片内链接'],
  ['accent', 'surface-subtle', '浅底链接'],
  ['accent', 'accent-soft', '强调底上的强调字'],
  ['accent-ink', 'accent-soft', '强调底深字'],

  ['ink-invert', 'masthead', '报头白字'],
  ['ink-invert', 'accent', '主色块白字'],
  ['ink-invert', 'surface-ink', '深色面板白字'],

  // 报头半透明层级：按合成后的实色计算
  ['on-masthead-soft', 'masthead', '报头次级文字（82%）'],
  ['on-masthead-muted', 'masthead', '页脚底条文字（66%）'],
];

/** 仅测量、不判定：装饰性描边 / 分隔线，静态无法判断是否承载信息 */
const NON_TEXT_MEASURED = [
  ['on-masthead-line', 'masthead', '报头分隔发丝线（28%）'],
  ['on-masthead-line-strong', 'masthead', '报头强分隔线（70%）'],
  ['line', 'canvas', '画布描边'],
  ['line-strong', 'canvas', '强描边'],
  ['line', 'surface', '卡片描边'],
];

const MIN_TEXT = 4.5;
const MIN_NON_TEXT = 3.0;

/* ---------------- 主流程 ---------------- */

const css = readFileSync(TOKENS, 'utf8');
const raw = readRawTokens(css);

// 背景必须是不透明实色
function bgOf(name) {
  const c = resolve(name, raw);
  if (!c) {
    console.error(`  ✗ 无法解析背景令牌 --${name}`);
    process.exit(1);
  }
  return c;
}

const failures = [];
const warnings = [];

console.log('\n  色彩对比度门禁 · CONTRAST-001');
console.log('  口径：所有文字组合一律 >= 4.5:1（WCAG 2.2 AA 正文级，从严）\n');

console.log('  ── 文字组合 ────────────────────────────────────────────');
for (const [fgName, bgName, note] of TEXT_PAIRS) {
  const bg = bgOf(bgName);
  const fg = resolveOver(fgName, raw, bg);
  if (!fg) {
    failures.push(`无法解析 --${fgName}（用于 ${note}）`);
    console.log(`  ?  --${fgName}  ← 解析失败`);
    continue;
  }
  const r = ratio(fg, bg);
  const ok = r >= MIN_TEXT;
  const mark = ok ? '✓ ' : '✗ ';
  console.log(
    `  ${mark} ${r.toFixed(2)}:1   --${fgName}  on  --${bgName}   ${note}`
  );
  if (!ok) failures.push(`--${fgName} on --${bgName} 仅 ${r.toFixed(2)}:1（要求 ${MIN_TEXT}）— ${note}`);
}

console.log('\n  ── 描边 / 分隔线（仅测量，不判定）─────────────────────');
for (const [fgName, bgName, note] of NON_TEXT_MEASURED) {
  const bg = bgOf(bgName);
  const fg = resolveOver(fgName, raw, bg);
  if (!fg) continue;
  const r = ratio(fg, bg);
  const ok = r >= MIN_NON_TEXT;
  console.log(
    `  ${ok ? '·' : '·'}  ${r.toFixed(2)}:1   --${fgName}  on  --${bgName}   ${note}${ok ? '' : '  [低于 3:1，若承载信息需修正]'}`
  );
  if (!ok) warnings.push(`--${fgName} on --${bgName} = ${r.toFixed(2)}:1（< ${MIN_NON_TEXT}）— ${note}`);
}

if (warnings.length) {
  console.log('\n  提示（不阻塞）：');
  for (const w of warnings) console.log(`    ! ${w}`);
}

if (failures.length) {
  console.log(`\n  ✗ 对比度门禁未通过：${failures.length} 项\n`);
  for (const f of failures) console.log(`    · ${f}`);
  console.log('');
  process.exit(1);
}

console.log(`\n  ✓ 对比度门禁通过：${TEXT_PAIRS.length} 组文字组合全部 >= ${MIN_TEXT}:1\n`);
