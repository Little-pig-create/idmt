import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AssetPicker from './AssetPicker';
import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  H2Icon,
  H3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  QuoteIcon,
  RuleIcon,
  StrikeIcon,
} from '../icons';
import { monoFont, tokens } from '../theme';
import type { ReactElement, KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (next: string) => void;
  minRows?: number;
  placeholder?: string;
}

/* ------------------------------------------------------------------ *
 * 预览渲染：先整体转义，再套标签，避免 XSS。
 * 刻意不引入 Markdown 解析库 —— 正文只用到下面这些语法。
 * ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 只放行安全的链接协议（入参已转义） */
function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (/^(javascript|vbscript|file):/i.test(url)) return null;
  if (/^data:/i.test(url) && !/^data:image\//i.test(url)) return null;
  return url;
}

/** 内联样式里要避开双引号，否则会截断 style="..." —— 字体名改用单引号 */
const serifFont = tokens.fontSerif.replace(/"/g, "'");
const mono = tokens.fontMono.replace(/"/g, "'");

const inlineCodeStyle = `font-family:${mono};background:${tokens.surfaceSubtle};padding:1px 4px;border-radius:3px;font-size:0.85em`;
const preStyle = `font-family:${mono};background:${tokens.surfaceSubtle};border:1px solid ${tokens.line};border-radius:6px;padding:12px;margin:12px 0;overflow:auto;font-size:0.8125rem;line-height:1.6`;
const quoteStyle = `border-left:3px solid ${tokens.accent};padding-left:12px;margin:12px 0;color:${tokens.inkSecondary}`;

function renderInline(raw: string): string {
  let s = escapeHtml(raw);

  // 行内代码先取出占位，避免其中的 * _ ~ 被当作强调语法
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code style="${inlineCodeStyle}">${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const safe = safeUrl(url);
    return safe
      ? `<img src="${safe}" alt="${alt}" style="max-width:100%;border-radius:4px" />`
      : alt;
  });

  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const safe = safeUrl(url);
    const label = text || url;
    return safe
      ? `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="color:${tokens.accent};text-decoration:underline">${label}</a>`
      : label;
  });

  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? '');
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function alignOf(spec: string): string {
  if (/^:-+:$/.test(spec)) return 'center';
  if (/-+:$/.test(spec)) return 'right';
  if (/^:-+$/.test(spec)) return 'left';
  return 'left';
}

function renderList(lines: string[], start: number): [string, number] {
  const out: string[] = [];
  const stack: { type: 'ul' | 'ol'; indent: number }[] = [];
  let item: string[] | null = null;
  let i = start;

  const flushItem = () => {
    if (item) {
      out.push(`<li style="margin:4px 0">${renderInline(item.join(' '))}</li>`);
      item = null;
    }
  };

  const closeTo = (indent: number) => {
    flushItem();
    while (stack.length && stack[stack.length - 1].indent > indent) {
      const top = stack.pop()!;
      out.push(top.type === 'ul' ? '</ul>' : '</ol>');
    }
  };

  const open = (type: 'ul' | 'ol', indent: number, startNum?: number) => {
    flushItem(); // 子列表要开在当前列表项之后
    const attr = type === 'ol' && startNum && startNum !== 1 ? ` start="${startNum}"` : '';
    out.push(`<${type}${attr} style="margin:8px 0;padding-left:22px">`);
    stack.push({ type, indent });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      // 空行后若下一行缩进更多，视为同一列表的延续
      if (/^\s{2,}(?:[-*+]|\d+[.)])\s+/.test(lines[i + 1] ?? '')) {
        i++;
        continue;
      }
      break;
    }

    const ul = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    const ol = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);

    if (!ul && !ol) {
      // 悬挂缩进的续行并入上一个列表项
      if (/^\s{2,}\S/.test(line) && item) {
        item.push(line.trim());
        i++;
        continue;
      }
      break;
    }

    const indent = (ul ? ul[1] : ol![1]).length;
    const type: 'ul' | 'ol' = ul ? 'ul' : 'ol';
    const num = ol ? Number(ol[2]) : undefined;

    if (!stack.length || indent > stack[stack.length - 1].indent) {
      open(type, indent, num);
    } else {
      closeTo(indent);
      if (!stack.length) open(type, indent, num);
    }

    flushItem();
    item = [ul ? ul[2] : ol![3]];
    i++;
  }

  closeTo(-1);
  return [out.join(''), i];
}

const BLOCK_START =
  /^\s*(?:#{1,6}\s|>|`{3,}|~{3,}|[-*+]\s|\d+[.)]\s|\||(?:-{3,}|\*{3,}|_{3,})\s*$)/;

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    /* 代码块 */
    const fence = /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1].startsWith('`') ? '`{3,}' : '~{3,}';
      const closing = new RegExp(`^\\s*${marker}\\s*$`);
      const buf: string[] = [];
      i++;
      while (i < lines.length && !closing.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过收尾围栏（缺失时也能正常收尾）
      const lang = fence[2]
        ? `<div style="font-family:${mono};font-size:0.75rem;color:${tokens.inkTertiary};margin-bottom:4px">${escapeHtml(fence[2])}</div>`
        : '';
      out.push(`<pre style="${preStyle}">${lang}<code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    /* 分割线 */
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push(`<hr style="border:0;border-top:1px solid ${tokens.line};margin:20px 0" />`);
      i++;
      continue;
    }

    /* 标题 */
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const size = ['1.75rem', '1.5rem', '1.25rem', '1.0625rem', '0.9375rem', '0.875rem'][level - 1];
      out.push(
        `<h${level} style="font-family:${serifFont};font-size:${size};font-weight:600;margin:20px 0 8px;line-height:1.35">${renderInline(heading[2])}</h${level}>`
      );
      i++;
      continue;
    }

    /* 引用（连续行合并，内部递归渲染） */
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote style="${quoteStyle}">${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    /* 表格 */
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('-') &&
      /^[\s|:-]+$/.test(lines[i + 1])
    ) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map(alignOf);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const cell = (text: string, a: string, tag: 'td' | 'th') =>
        `<${tag} style="border:1px solid ${tokens.line};padding:6px 10px;text-align:${a}${tag === 'th' ? `;background:${tokens.surfaceSubtle}` : ''}">${renderInline(text)}</${tag}>`;
      const thead = `<thead><tr>${head.map((c, n) => cell(c, align[n] ?? 'left', 'th')).join('')}</tr></thead>`;
      const tbody = rows.length
        ? `<tbody>${rows.map((row) => `<tr>${row.map((c, n) => cell(c, align[n] ?? 'left', 'td')).join('')}</tr>`).join('')}</tbody>`
        : '';
      out.push(
        `<table style="border-collapse:collapse;margin:12px 0;font-size:0.9em">${thead}${tbody}</table>`
      );
      continue;
    }

    /* 列表 */
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const [html, next] = renderList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    /* 段落 */
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) {
      out.push(
        `<p style="margin:10px 0">${renderInline(buf.join('\n')).replace(/\n/g, '<br/>')}</p>`
      );
    } else {
      i++; // 兜底，避免死循环
    }
  }

  return out.join('');
}

/* ------------------------------------------------------------------ *
 * 编辑器
 * ------------------------------------------------------------------ */

export default function MarkdownEditor({
  value,
  onChange,
  minRows = 16,
  placeholder,
}: Props) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelection = useRef<[number, number] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // execCommand 不可用时的退化路径：setState 之后恢复选区
  useEffect(() => {
    const sel = pendingSelection.current;
    if (!sel) return;
    pendingSelection.current = null;
    const el = areaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(sel[0], sel[1]);
    });
  });

  /**
   * 替换 [start, end) 为 text，并把光标停在 [selStart, selEnd)。
   * 优先走 execCommand('insertText')，这样浏览器的原生撤销栈不会断。
   */
  const replaceRange = useCallback(
    (start: number, end: number, text: string, selStart?: number, selEnd?: number) => {
      const caretStart = selStart ?? start + text.length;
      const caretEnd = selEnd ?? caretStart;
      const el = areaRef.current;

      if (!el) {
        onChange(value.slice(0, start) + text + value.slice(end));
        pendingSelection.current = [caretStart, caretEnd];
        return;
      }

      el.focus();
      el.setSelectionRange(start, end);

      let done = false;
      try {
        done = document.execCommand('insertText', false, text);
      } catch {
        done = false;
      }

      if (!done) {
        onChange(value.slice(0, start) + text + value.slice(end));
        pendingSelection.current = [caretStart, caretEnd];
        return;
      }

      el.setSelectionRange(caretStart, caretEnd);
    },
    [onChange, value]
  );

  /** 返回当前选区覆盖的整行区间 */
  const lineRange = useCallback(() => {
    const el = areaRef.current;
    if (!el) return null;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    return { start, end, lineStart, lineEnd };
  }, [value]);

  /** 行内包裹：已有则脱掉，无选区则插入占位并选中 */
  const wrapInline = useCallback(
    (before: string, after: string, placeholderText: string) => {
      const el = areaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);

      const outerStart = start - before.length;
      if (
        selected &&
        outerStart >= 0 &&
        value.slice(outerStart, start) === before &&
        value.slice(end, end + after.length) === after
      ) {
        replaceRange(outerStart, end + after.length, selected, outerStart, outerStart + selected.length);
        return;
      }
      if (
        selected &&
        selected.length >= before.length + after.length &&
        selected.startsWith(before) &&
        selected.endsWith(after)
      ) {
        const inner = selected.slice(before.length, selected.length - after.length);
        replaceRange(start, end, inner, start, start + inner.length);
        return;
      }

      const body = selected || placeholderText;
      replaceRange(start, end, before + body + after, start + before.length, start + before.length + body.length);
    },
    [replaceRange, value]
  );

  /** 逐行变换：多行选区时每一行都处理 */
  const transformLines = useCallback(
    (fn: (line: string, index: number) => string, fallback: string) => {
      const range = lineRange();
      if (!range) return;
      const block = value.slice(range.lineStart, range.lineEnd);
      const text = block ? block.split('\n').map(fn).join('\n') : fallback;
      replaceRange(range.lineStart, range.lineEnd, text, range.lineStart, range.lineStart + text.length);
    },
    [lineRange, replaceRange, value]
  );

  const applyHeading = useCallback(
    (level: number) => {
      const marker = '#'.repeat(level);
      transformLines(
        (line) => `${marker} ${line.replace(/^\s*#{1,6}\s+/, '')}`,
        `${marker} 标题`
      );
    },
    [transformLines]
  );

  const applyList = useCallback(
    (ordered: boolean) => {
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      const other = ordered ? /^\s*[-*+]\s+/ : /^\s*\d+[.)]\s+/;
      transformLines((line, index) => {
        if (pattern.test(line)) return line.replace(pattern, '');
        return `${ordered ? `${index + 1}. ` : '- '}${line.replace(other, '')}`;
      }, ordered ? '1. 列表项' : '- 列表项');
    },
    [transformLines]
  );

  const applyQuote = useCallback(() => {
    transformLines((line) => {
      if (/^\s*>\s?/.test(line)) return line.replace(/^\s*>\s?/, '');
      return `> ${line}`;
    }, '> 引用');
  }, [transformLines]);

  const insertCodeBlock = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const code = value.slice(start, end) || '代码';
    const lead = start > 0 && !value.slice(0, start).endsWith('\n') ? '\n' : '';
    const snippet = `${lead}\`\`\`\n${code}\n\`\`\`\n`;
    const offset = start + lead.length + 4;
    replaceRange(start, end, snippet, offset, offset + code.length);
  }, [replaceRange, value]);

  const insertRule = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const pre = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const post = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    const snippet = `${pre}---${post}`;
    replaceRange(start, end, snippet, start + snippet.length, start + snippet.length);
  }, [replaceRange, value]);

  const insertLink = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = value.slice(start, end) || '链接文字';
    const url = 'https://';
    const snippet = `[${text}](${url})`;
    const urlStart = start + text.length + 3;
    replaceRange(start, end, snippet, urlStart, urlStart + url.length);
  }, [replaceRange, value]);

  const handleAsset = useCallback(
    (markdown: string) => {
      const el = areaRef.current;
      const start = el ? el.selectionStart : value.length;
      const end = el ? el.selectionEnd : start;
      const before = value.slice(0, start);
      const lead = before === '' || before.endsWith('\n') ? '' : '\n';
      const snippet = `${lead}${markdown}\n`;
      const caret = start + snippet.length;
      replaceRange(start, end, snippet, caret, caret);
    },
    [replaceRange, value]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const el = areaRef.current;
      if (!el) return;

      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.altKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'b') {
          event.preventDefault();
          wrapInline('**', '**', '粗体');
          return;
        }
        if (key === 'i') {
          event.preventDefault();
          wrapInline('*', '*', '斜体');
          return;
        }
        if (key === 'k') {
          event.preventDefault();
          insertLink();
          return;
        }
      }

      if (event.key !== 'Tab') return;

      const range = lineRange();
      if (!range) return;
      const block = value.slice(range.lineStart, range.lineEnd);
      const multiline = block.includes('\n');
      const inList = /^\s*(?:[-*+]|\d+[.)])\s+/.test(block);
      if (!multiline && !inList) return; // 普通场景下保留 Tab 的焦点切换

      event.preventDefault();
      const text = block
        .split('\n')
        .map((line) => (event.shiftKey ? line.replace(/^ {1,2}/, '') : `  ${line}`))
        .join('\n');
      replaceRange(range.lineStart, range.lineEnd, text, range.lineStart, range.lineStart + text.length);
    },
    [insertLink, lineRange, replaceRange, value, wrapInline]
  );

  const tools: { key: string; label: string; icon: ReactElement; run: () => void }[] = [
    { key: 'h2', label: '二级标题', icon: <H2Icon fontSize="small" />, run: () => applyHeading(2) },
    { key: 'h3', label: '三级标题', icon: <H3Icon fontSize="small" />, run: () => applyHeading(3) },
    { key: 'bold', label: '粗体（Ctrl/⌘+B）', icon: <BoldIcon fontSize="small" />, run: () => wrapInline('**', '**', '粗体') },
    { key: 'italic', label: '斜体（Ctrl/⌘+I）', icon: <ItalicIcon fontSize="small" />, run: () => wrapInline('*', '*', '斜体') },
    { key: 'strike', label: '删除线', icon: <StrikeIcon fontSize="small" />, run: () => wrapInline('~~', '~~', '删除线') },
    { key: 'ul', label: '无序列表', icon: <BulletListIcon fontSize="small" />, run: () => applyList(false) },
    { key: 'ol', label: '有序列表', icon: <OrderedListIcon fontSize="small" />, run: () => applyList(true) },
    { key: 'quote', label: '引用', icon: <QuoteIcon fontSize="small" />, run: applyQuote },
    { key: 'code', label: '代码块', icon: <CodeIcon fontSize="small" />, run: insertCodeBlock },
    { key: 'rule', label: '分割线', icon: <RuleIcon fontSize="small" />, run: insertRule },
    { key: 'link', label: '链接（Ctrl/⌘+K）', icon: <LinkIcon fontSize="small" />, run: insertLink },
    { key: 'image', label: '插入图片', icon: <ImageIcon fontSize="small" />, run: () => setPickerOpen(true) },
  ];

  const previewHtml = useMemo(() => renderMarkdown(value), [value]);
  const stats = useMemo(
    () => ({
      chars: value.replace(/\s/g, '').length,
      lines: value === '' ? 0 : value.split('\n').length,
    }),
    [value]
  );

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.line}`,
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          flexWrap: 'wrap',
          px: 1,
          py: 0.5,
          borderBottom: `1px solid ${tokens.line}`,
          bgcolor: tokens.surfaceSubtle,
        }}
      >
        {tools.map((tool, index) => (
          <Box key={tool.key} sx={{ display: 'flex', alignItems: 'center' }}>
            {index === 2 || index === 9 ? (
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />
            ) : null}
            <Tooltip title={tool.label} arrow>
              {/* 纯图标按钮必须带 aria-label：Tooltip 只提供 aria-describedby，不会给出可访问名称 */}
              <IconButton
                size="small"
                onClick={tool.run}
                aria-label={tool.label}
                sx={{ color: tokens.inkSecondary }}
              >
                {tool.icon}
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'stretch' }}>
        <Box sx={{ flex: '1 1 50%', minWidth: 0, p: 1 }}>
          <TextField
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputRef={areaRef}
            multiline
            minRows={minRows}
            maxRows={40}
            placeholder={placeholder ?? '支持 Markdown：## 小标题、**粗体**、- 列表、> 引用、![图片](/images/x.png)'}
            variant="outlined"
            slotProps={{
              htmlInput: {
                onKeyDown: handleKeyDown,
                style: { fontFamily: monoFont, fontSize: '0.8125rem', lineHeight: 1.7 },
              },
            }}
          />
        </Box>

        <Box
          sx={{
            flex: '1 1 50%',
            minWidth: 0,
            p: 2,
            overflow: 'auto',
            maxHeight: { md: 620 },
            borderLeft: { md: `1px solid ${tokens.line}` },
            borderTop: { xs: `1px solid ${tokens.line}`, md: 'none' },
            fontSize: '0.9375rem',
            lineHeight: 1.75,
            wordBreak: 'break-word',
          }}
        >
          {value.trim() ? (
            <Box dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <Typography variant="body2" color="text.disabled">
              左侧开始输入，这里会实时显示预览效果。
            </Typography>
          )}
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          px: 1.5,
          py: 0.75,
          borderTop: `1px solid ${tokens.line}`,
          bgcolor: tokens.surfaceSubtle,
          alignItems: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {stats.chars} 字 · {stats.lines} 行
        </Typography>
        <Typography variant="caption" color="text.disabled">
          正文以 Markdown 源码保存，预览仅供参考
        </Typography>
      </Stack>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(markdown) => {
          handleAsset(markdown);
          setPickerOpen(false);
        }}
      />
    </Box>
  );
}
