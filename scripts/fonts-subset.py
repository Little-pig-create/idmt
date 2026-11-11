#!/usr/bin/env python3
"""从本地源字体裁剪中文字体子集（Noto Sans SC 可变字重 + 霞鹜新致宋）。

用法：python3 scripts/fonts-subset.py
扫描 src 源码与 dist 渲染文本，输出 public/fonts/*.woff2，并写入字符清单。
"""
from __future__ import annotations

import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '.fonts-src')
OUT = os.path.join(ROOT, 'public', 'fonts')
CHARSET = os.path.join(ROOT, 'src', 'styles', 'fonts-charset.txt')

BASELINE = (
    '‘’“”–—―…···《》〈〉「」『』【】（）〔〕、。，；：？！'
    '©®™°±×÷→←↑↓≈≠≤≥∞∑√μ％‰'
    '　\u00a0\u2007\u202f\u2014\u2013'
)

def collect() -> str:
    chars = set()
    for cp in range(0x20, 0x7F):
        chars.add(chr(cp))
    chars.update(BASELINE)
    patterns = [
        'src/**/*.astro', 'src/**/*.tsx', 'src/**/*.ts', 'src/**/*.css',
        'src/**/*.md', 'src/**/*.json',
    ]
    for pattern in patterns:
        for path in glob.glob(os.path.join(ROOT, pattern), recursive=True):
            try:
                chars.update(open(path, encoding='utf-8').read())
            except UnicodeDecodeError:
                pass
    for path in glob.glob(os.path.join(ROOT, 'dist', '**', '*.html'), recursive=True):
        try:
            chars.update(open(path, encoding='utf-8').read())
        except UnicodeDecodeError:
            pass
    chars = {c for c in chars if ord(c) >= 0x20}
    return ''.join(sorted(chars))

def subset(src: str, dst: str, text: str, keep_axes: bool) -> None:
    tmp = os.path.join('/tmp', 'subset-text.txt')
    open(tmp, 'w', encoding='utf-8').write(text)
    cmd = [
        sys.executable, '-m', 'fontTools.subset', src,
        f'--text-file={tmp}',
        f'--output-file={dst}',
        '--flavor=woff2',
        '--layout-features=*',
        '--no-hinting',
        '--desubroutinize',
        '--name-IDs=*',
        '--drop-tables+=DSIG',
    ]
    subprocess.run(cmd, check=True)
    print(f'{os.path.basename(dst)}: {os.path.getsize(dst) / 1024:.0f} KB')

def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    text = collect()
    open(CHARSET, 'w', encoding='utf-8').write(text)
    print(f'charset: {len(text)} 字符')
    subset(os.path.join(SRC, 'NotoSansSC.ttf'), os.path.join(OUT, 'NotoSansSC.woff2'), text, True)
    subset(os.path.join(SRC, 'LXGWZhiSong.ttf'), os.path.join(OUT, 'LXGWZhiSong.woff2'), text, False)

if __name__ == '__main__':
    main()
