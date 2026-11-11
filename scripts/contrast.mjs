#!/usr/bin/env node
/**
 * 色彩对比度门禁（npm run contrast）
 * 解析 tokens.css 中的 hex 令牌，对真实在用的文字/背景组合计算 WCAG 2.2 对比度。
 * 口径：正文级一律 ≥ 4.5:1。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const tokens = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');

const colors = {};
for (const match of tokens.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  colors[match[1]] = match[2];
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS = [
  ['ink', 'canvas', '正文 / 标题 on 画布'],
  ['ink', 'surface', '正文 on 卡片'],
  ['ink', 'surface-subtle', '正文 on 浅底'],
  ['ink-secondary', 'canvas', '次级文字 on 画布'],
  ['ink-secondary', 'surface', '次级文字 on 卡片'],
  ['ink-secondary', 'surface-subtle', '次级文字 on 浅底'],
  ['ink-tertiary', 'canvas', '辅助文字 on 画布'],
  ['ink-tertiary', 'surface', '辅助文字 on 卡片'],
  ['ink-tertiary', 'surface-subtle', '辅助文字 on 浅底'],
  ['on-night', 'night', '暗面正文 on night'],
  ['on-night', 'night-2', '暗面正文 on night-2'],
  ['on-night-soft', 'night-2', '暗面次级 on night-2'],
  ['on-night-muted', 'night-2', '暗面辅助 on night-2'],
  ['on-night-muted', 'night-3', '暗面辅助 on night-3'],
  ['on-night-faint', 'night-2', '暗面弱文字 on night-2'],
  ['on-night-faint', 'night-3', '暗面弱文字 on night-3'],
  ['brand', 'surface', '品牌色 on 卡片'],
  ['brand', 'canvas', '品牌色 on 画布'],
  ['brand-2', 'night', '青绿 on night'],
  ['brand-ink', 'brand-soft', '品牌深字 on 品牌浅底'],
  ['gold', 'night', '金色 on night'],
];

let failures = 0;
console.log('\n  色彩对比度门禁 · CONTRAST-001');
console.log('  口径：文字组合一律 ≥ 4.5:1（WCAG 2.2 AA）\n');

for (const [fg, bg, label] of PAIRS) {
  if (!colors[fg] || !colors[bg]) {
    console.log(`  ?  令牌缺失：${fg} / ${bg}`);
    failures += 1;
    continue;
  }
  const value = ratio(colors[fg], colors[bg]);
  const ok = value >= 4.5;
  if (!ok) failures += 1;
  console.log(`  ${ok ? '✓' : '✗'}  ${value.toFixed(2).padStart(5)}:1   ${label}`);
}

console.log(`\n  合计 ${PAIRS.length} 组：${failures === 0 ? '全部通过' : `${failures} 组未达标`}\n`);
process.exit(failures === 0 ? 0 : 1);
