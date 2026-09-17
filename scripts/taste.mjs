#!/usr/bin/env node
/**
 * 静态「设计品位」门禁 —— 把 taste-skill 里可机械判定的规则落成检查。
 *
 * 只做**能用正则可靠判定**的项。视觉类（对齐、节奏、图片质量）静态查不出，
 * 不要在这里假装能查 —— 假检查比没有检查更危险。
 *
 * 用法：npm run taste（需先 npm run build）
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = process.env.TASTE_DIST ?? 'dist';
const SRC = process.env.TASTE_SRC ?? 'src';

const issues = [];
const add = (rule, page, detail) => issues.push({ rule, page, detail });

function walk(dir, ext, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, ext, acc);
    else if (f.endsWith(ext)) acc.push(p);
  }
  return acc;
}

/** 去掉注释、script、style，只留会被用户看到的文本 */
function visible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/**
 * 按块级元素切分，再逐块取可见文本。
 * 不能直接对全文按 \n 切 —— HTML 压缩后往往只有一行，
 * 会把页头、正文、页脚拼成"同一行"，中间点计数全错。
 */
function blocks(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .split(/<\/(?:p|li|div|h[1-6]|dd|dt|td|th|figcaption|time|address|blockquote|a|span)>/i)
    .map((chunk) => chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const pages = walk(DIST, '.html');
if (pages.length === 0) {
  console.error(`未找到构建产物：${DIST}/ 下没有 HTML。先跑 npm run build。`);
  process.exit(1);
}

for (const file of pages) {
  const rel = file.split(path.sep).join('/').replace(`${DIST}/`, '');
  const html = fs.readFileSync(file, 'utf8');
  const text = visible(html);

  // DASH-001 破折号清零（taste-skill §9.G，称「不可协商」）
  const em = [...text.matchAll(/[\u2014\u2013]/g)].length;
  if (em > 0) {
    const samples = [...text.matchAll(/.{0,12}[\u2014\u2013].{0,12}/g)]
      .slice(0, 3)
      .map((m) => m[0].replace(/\s+/g, ' ').trim());
    add('DASH-001', rel, `${em} 处破折号（—/–）：${samples.join(' / ')}`);
  }

  // TASTE-001 区块眉标签克制（§4.7，技能称生产环境第一违规）
  const eyebrow = [...html.matchAll(/class="section-bar-en"[^>]*>([^<]*)/g)].length;
  const h2 = [...html.matchAll(/<h2[^>]*>([^<]*)</g)].filter((m) => m[1].trim()).length;
  const limit = Math.ceil(h2 / 3);
  if (eyebrow > limit) {
    add('TASTE-001', rel, `眉标签 ${eyebrow} 个 / 区块 ${h2} 个，上限 ${limit}`);
  }

  // TASTE-002 禁止编号式眉标签（§9.F：00 / INDEX、001 · Capabilities、方向 01）
  //
  // 判据：**只在眉标签元素内部**找编号。不能对整页可见文本做正则 ——
  // 标签剥离后相邻元素会拼到一起（「周敏」+ 日期「06」读起来像「周敏 06」），
  // 实测会误报活动列表里的主讲人与日期。
  //
  // 眉标签元素的识别：class 含 `section-bar-en`（SectionHeading 的英文标签）
  // 或含独立词 `eyebrow`（PageHero / AsideBox / dt 标签）。
  const eyebrowTexts = [...html.matchAll(/<([a-z]+)\b[^>]*class="([^"]*\b(?:eyebrow|section-bar-en)\b[^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const numbered = [];
  for (const label of eyebrowTexts) {
    // 形态 a)「编号 + 斜杠 + 词」—— 英文式编号标签（00 / INDEX）
    if (/\b0\d\s*\/\s*\S/.test(label)) numbered.push(label);
    // 形态 b)「中文前缀 + 补零编号」—— 中文式编号标签（方向 01）
    // 只认补零编号：这是它与正文数字的可靠分界，放宽会误伤真实内容。
    // 在眉标签内部做检查，不会碰到正文里的「共 12 条」这类数字。
    else if (/^[\u4e00-\u9fa5]{1,6}\s+0\d(?:\s|$)/.test(label)) numbered.push(label);
  }
  if (numbered.length) add('TASTE-002', rel, `编号式眉标签：${numbered.slice(0, 3).join(' / ')}`);

  // TASTE-003 禁止滚动提示（§9.F：Scroll / ↓ scroll / Scroll to explore）
  const cue = [...text.matchAll(/(↓\s*scroll|scroll\s+to\s+(explore|discover)|向下滚动)/gi)].map((m) => m[0]);
  if (cue.length) add('TASTE-003', rel, `滚动提示：${cue.join(' / ')}`);

  // TASTE-004 禁止版本号式英雄标签（§9.F：V0.6 / BETA / ALPHA / EARLY ACCESS）
  const ver = [...text.matchAll(/\b(V\d+\.\d+|BETA|ALPHA|EARLY ACCESS|INVITE-ONLY)\b/g)].map((m) => m[0]);
  if (ver.length) add('TASTE-004', rel, `版本号标签：${ver.slice(0, 3).join(' / ')}`);

  // TASTE-005 中间点节制（§9.F：每行最多 1 个）
  for (const chunk of blocks(html)) {
    const n = (chunk.match(/\s·\s/g) ?? []).length;
    if (n > 1) {
      add('TASTE-005', rel, `${n} 个中间点：${chunk.slice(0, 70)}`);
      break;
    }
  }
}

// TASTE-006 视口稳定性（§3.E：不用 h-screen，用 min-h-[100dvh]）
for (const file of walk(SRC, '.astro').concat(walk(SRC, '.tsx'))) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = file.split(path.sep).join('/');
  // 排除 min-h-screen：它是正确写法，不是违规
  const hits = [...src.matchAll(/(?<![-\w])h-screen\b/g)].length;
  if (hits) add('TASTE-006', rel, `使用了 h-screen（应用 min-h-[100dvh]）`);
}

// TASTE-007 圆角尺度单一（§4.4 Shape Consistency Lock）
const radiusUse = new Map();
for (const file of walk(SRC, '.astro').concat(walk(SRC, '.tsx'))) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\brounded-(full|\[[^\]]+\]|3xl|2xl|xl|lg|md|sm|none)\b/g)) {
    radiusUse.set(m[1], (radiusUse.get(m[1]) ?? 0) + 1);
  }
}
const strayRadius = [...radiusUse.entries()].filter(([k]) => k === 'full' || k === '2xl' || k === '3xl');
if (strayRadius.length) {
  add('TASTE-007', '(src)', `超出既定圆角尺度（3/6/10px）：${strayRadius.map(([k, n]) => `${k}×${n}`).join(', ')}`);
}

// ---- 输出 ----
const byRule = new Map();
for (const i of issues) byRule.set(i.rule, (byRule.get(i.rule) ?? 0) + 1);

console.log(`扫描页面：${pages.length}`);
console.log(`圆角尺度分布：${[...radiusUse.entries()].map(([k, n]) => `${k}×${n}`).join(' · ') || '（无）'}`);
console.log();

if (issues.length === 0) {
  console.log('✅ 未发现品位问题');
  process.exit(0);
}

console.log('⚠️  发现以下问题：\n');
for (const [rule, n] of [...byRule.entries()].sort()) {
  console.log(`【${rule}】${n} 处`);
  for (const i of issues.filter((x) => x.rule === rule).slice(0, 8)) {
    console.log(`   ${i.page}  ${i.detail}`);
  }
  if (n > 8) console.log(`   …另有 ${n - 8} 处`);
  console.log();
}
process.exit(1);
