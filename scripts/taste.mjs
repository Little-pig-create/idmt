#!/usr/bin/env node
/**
 * 设计品位门禁（npm run taste）
 * 只检查能在源码上可靠判定的规则，不做视觉判断：
 *  - 组件不写内联 style、不用 !important
 *  - 颜色只走令牌，不硬编码 hex
 *  - 圆角只用设计尺度
 *  - 图片必须有 alt、链接不能是空锚点
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ROOTS = ['src/components/site', 'src/pages', 'src/layouts'];
const EXT = new Set(['.astro', '.tsx', '.ts']);
const RADIUS_SCALE = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 28]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const issues = [];
const add = (rule, file, detail) => issues.push({ rule, file: path.relative(ROOT, file), detail });

for (const root of ROOTS) {
  for (const file of walk(path.join(ROOT, root))) {
    const source = fs.readFileSync(file, 'utf8');
    const isAstro = file.endsWith('.astro');

    if (isAstro && /style="/.test(source)) add('TASTE-001', file, '使用内联 style 属性');
    if (source.includes('!important')) add('TASTE-002', file, '使用 !important');

    for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const line = source.slice(0, match.index).split('\n').length;
      const context = source.split('\n')[line - 1] ?? '';
      if (context.includes('theme-color')) continue;
      add('TASTE-003', file, `硬编码颜色 ${match[0]}（第 ${line} 行）`);
    }

    for (const match of source.matchAll(/rounded-\[(\d+)px\]/g)) {
      if (!RADIUS_SCALE.has(Number(match[1]))) add('TASTE-004', file, `圆角 ${match[1]}px 不在尺度内`);
    }

    if (/href="#"/.test(source)) add('TASTE-005', file, '空链接 href="#"');

    for (const match of source.matchAll(/<img\b[\s\S]*?>/g)) {
      if (!/\balt=/.test(match[0])) {
        const line = source.slice(0, match.index).split('\n').length;
        add('TASTE-006', file, `<img> 缺少 alt（第 ${line} 行）`);
      }
    }
  }
}

console.log('\n  设计品位门禁 · TASTE');
if (issues.length === 0) {
  console.log('  ✅ 未发现问题\n');
  process.exit(0);
}

const byRule = new Map();
for (const issue of issues) byRule.set(issue.rule, [...(byRule.get(issue.rule) ?? []), issue]);
for (const [rule, list] of [...byRule.entries()].sort()) {
  console.log(`\n  【${rule}】${list.length} 处`);
  for (const issue of list.slice(0, 8)) console.log(`    ${issue.file}  ${issue.detail}`);
}
console.log(`\n  合计 ${issues.length} 处\n`);
process.exit(1);
