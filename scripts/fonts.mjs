#!/usr/bin/env node
/**
 * 依据站点实际字符集生成字体子集。
 *
 *   npm run fonts
 *
 * 源字体（约 41 MB）不入库，放在 .fonts-src/ 下，见文件末尾的下载地址。
 * 产物：public/fonts/*.woff2 + src/styles/fonts-charset.txt（供 fonts:check 比对）。
 *
 * 为什么走子集而不是镜像 Google 的分片：全站去重后只有 874 个字符，
 * 五个字族的子集合计约 790 KB；而只镜像拉丁分片就要 704 KB。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_FONTS = path.join(ROOT, '.fonts-src');
const OUT_DIR = path.join(ROOT, 'public', 'fonts');
const CHARSET_OUT = path.join(ROOT, 'src', 'styles', 'fonts-charset.txt');

/** 需要子集化的字族：拉丁字族只吃非 CJK 字符，中文字族吃全量。 */
const FAMILIES = [
  { file: 'IBMPlexSans', cjk: false },
  { file: 'JetBrainsMono', cjk: false },
  { file: 'SourceSerif4', cjk: false },
  { file: 'NotoSansSC', cjk: true },
  { file: 'NotoSerifSC', cjk: true },
];

const isCJK = (cp) =>
  (cp >= 0x2e80 && cp <= 0x9fff) ||
  (cp >= 0xac00 && cp <= 0xd7af) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe4f) ||
  (cp >= 0xff00 && cp <= 0xffef);

/**
 * 排版标点基线：由渲染链自动生成、源码里搜不到的字符。
 * 内容里写直引号，MDX 渲染后变成 “ ”；破折号、省略号同理。
 * 只扫源码会漏掉这一整类，故无条件并入。
 */
const TYPOGRAPHIC_BASELINE =
  '‘’“”–—―…···《》〈〉「」『』【】（）〔〕、。，；：？！' +
  '©®™°±×÷→←↑↓≈≠≤≥∞∑√μ' +
  '\u00a0\u2007\u202f\u2014\u2013';

/** 从源码收集会被渲染的字符：内容正文 + 组件里的界面文案。 */
function collectSourceChars() {
  const dirs = ['src/content', 'src/components', 'src/pages', 'src/layouts', 'src/lib', 'src/data'];
  const chars = new Set();
  // 不可见字符不参与子集，但 ASCII 可见段全给，避免新内容用到没见过的符号
  for (let cp = 0x20; cp <= 0x7e; cp += 1) chars.add(cp);
  for (const ch of TYPOGRAPHIC_BASELINE) chars.add(ch.codePointAt(0));

  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { recursive: true })) {
      const p = path.join(abs, entry);
      if (!fs.statSync(p).isFile()) continue;
      if (!/\.(md|mdx|astro|tsx|ts|json)$/.test(entry)) continue;
      for (const ch of fs.readFileSync(p, 'utf8')) chars.add(ch.codePointAt(0));
    }
  }
  return chars;
}

/**
 * 并入上一次构建产物里真实渲染出的字符。
 * 光扫源码不够：渲染链会把直引号转成弯引号，这类字符在源码里根本不存在。
 * dist 不存在时（首次生成）静默跳过，靠基线兜住。
 */
function collectDistChars() {
  const dist = path.join(ROOT, 'dist');
  const chars = new Set();
  if (!fs.existsSync(dist)) return { chars, scanned: 0 };

  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.html')) files.push(p);
    }
  })(dist);

  for (const f of files) {
    const text = fs
      .readFileSync(f, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, '');
    for (const ch of text) chars.add(ch.codePointAt(0));
  }
  return { chars, scanned: files.length };
}

function main() {
  const chars = collectSourceChars();
  const { chars: distChars, scanned } = collectDistChars();
  for (const ch of distChars) chars.add(ch);

  const cjkChars = [...chars].filter(isCJK);
  const latinChars = [...chars].filter((cp) => !isCJK(cp));
  console.log(
    `字符集：共 ${chars.size} 个（CJK ${cjkChars.length} · 非 CJK ${latinChars.length}）` +
      (scanned ? ` · 已并入 ${scanned} 页构建产物` : ' · 无 dist，仅扫源码')
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(CHARSET_OUT, [...chars].sort((a, b) => a - b).map((cp) => String.fromCodePoint(cp)).join(''), 'utf8');

  for (const { file, cjk } of FAMILIES) {
    const ttf = path.join(SRC_FONTS, `${file}.ttf`);
    if (!fs.existsSync(ttf)) {
      console.error(`\n缺源字体：${path.relative(ROOT, ttf)}`);
      printDownloadHint();
      process.exit(1);
    }
    const textFile = path.join(SRC_FONTS, `${file}.charset.txt`);
    fs.writeFileSync(textFile, (cjk ? [...chars] : latinChars).map((cp) => String.fromCodePoint(cp)).join(''), 'utf8');

    const out = path.join(OUT_DIR, `${file}.woff2`);
    execFileSync(
      'pyftsubset',
      [
        ttf,
        `--text-file=${textFile}`,
        '--flavor=woff2',
        `--output-file=${out}`,
        '--layout-features=*',
        '--drop-tables+=DSIG',
        '--no-hinting',
      ],
      { stdio: 'inherit' }
    );
    console.log(`  ${file}.woff2  ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
  }

  const total = FAMILIES.reduce((n, f) => n + fs.statSync(path.join(OUT_DIR, `${f.file}.woff2`)).size, 0);
  console.log(`\n✅ 子集完成，合计 ${(total / 1024).toFixed(1)} KB`);
}

function printDownloadHint() {
  const B = 'https://raw.githubusercontent.com/google/fonts/main';
  console.error(
    [
      '',
      '把下面这些存进 .fonts-src/（文件名按左列改）后重跑 npm run fonts：',
      `  NotoSansSC.ttf     ${B}/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf`,
      `  NotoSerifSC.ttf    ${B}/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf`,
      `  IBMPlexSans.ttf    ${B}/ofl/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf`,
      `  JetBrainsMono.ttf  ${B}/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf`,
      `  SourceSerif4.ttf   ${B}/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`,
      '',
      '境内直连慢的话，在 URL 前面加 https://gh-proxy.com/',
      '还需要 python3 的 fontTools 与 brotli：pip install --user --break-system-packages fonttools brotli',
    ].join('\n')
  );
}

main();
