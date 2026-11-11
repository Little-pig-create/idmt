/**
 * IDMT 内容后台 · API 服务
 *
 * - 零框架依赖：node:http + js-yaml
 * - 直接读写 src/content/**，内容文件是唯一数据源
 * - 会话鉴权：HttpOnly Cookie + HMAC 签名令牌
 * - 构建发布：调用 `npm run build`，日志通过轮询接口读取
 *
 * 启动：node server.mjs    （默认 http://127.0.0.1:4322）
 * 环境变量：ADMIN_PORT / ADMIN_HOST / ADMIN_PASSWORD / ADMIN_SECRET / ADMIN_ROLE
 */

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';

import { COLLECTIONS, COLLECTION_KEYS } from './schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const ASSETS_DIR = path.join(ROOT, 'public', 'images');
const ADMIN_DIST = path.join(__dirname, 'dist');
const SETTINGS_FILE = path.join(ROOT, 'src', 'data', 'site-settings.json');

const PORT = Number(process.env.ADMIN_PORT ?? 4322);
const HOST = process.env.ADMIN_HOST ?? '127.0.0.1';
const PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'idmt-admin';
const SECRET = process.env.ADMIN_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const ROLE = process.env.ADMIN_ROLE ?? 'admin';
const SESSION_TTL = 12 * 60 * 60 * 1000;

const USING_DEFAULT_PASSWORD = !process.env.ADMIN_PASSWORD?.trim();

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function fail(res, status, message, details) {
  json(res, status, { ok: false, error: message, details });
}

async function readBody(req, maxBytes = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error(`请求体超过 ${Math.round(maxBytes / 1024 / 1024)}MB 限制`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
}

/* ------------------------------------------------------------------ */
/* 会话                                                                */
/* ------------------------------------------------------------------ */

const sessions = new Map();

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function issueSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function verifySession(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (sign(payload) !== sig) return false;
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function parseCookies(req) {
  const header = req.headers.cookie ?? '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function requireAuth(req, res) {
  const token = parseCookies(req).idmt_admin;
  if (verifySession(token)) return true;
  json(res, 401, { ok: false, error: '未登录或会话已过期' });
  return false;
}

/* ------------------------------------------------------------------ */
/* 内容读写                                                            */
/* ------------------------------------------------------------------ */

function collectionDir(collection) {
  if (!COLLECTION_KEYS.includes(collection)) return null;
  return path.join(CONTENT_DIR, collection);
}

function safeId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id) ? id : null;
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  return { data: yamlLoad(match[1]) ?? {}, body: match[2] ?? '' };
}

function toDateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return value;
}

function normalizeEntry(collection, data) {
  const schema = COLLECTIONS[collection];
  const out = {};
  for (const field of schema.fields) {
    let value = data[field.name];
    if (value === undefined || value === null || value === '') {
      if (field.default !== undefined) out[field.name] = field.default;
      continue;
    }
    if (field.type === 'date') value = toDateString(value);
    if (field.type === 'number') value = Number(value);
    if (field.type === 'boolean') value = Boolean(value);
    if (field.type === 'array') {
      value = Array.isArray(value)
        ? value.map((v) => String(v).trim()).filter(Boolean)
        : String(value)
            .split(/[,，\n]/)
            .map((v) => v.trim())
            .filter(Boolean);
    }
    if (field.type === 'keyvalue') {
      value = (Array.isArray(value) ? value : [])
        .map((row) => ({ label: String(row.label ?? '').trim(), value: String(row.value ?? '').trim() }))
        .filter((row) => row.label || row.value);
    }
    out[field.name] = value;
  }
  return out;
}

function validate(collection, data) {
  const schema = COLLECTIONS[collection];
  const errors = [];
  for (const field of schema.fields) {
    const value = data[field.name];
    if (field.required && (value === undefined || value === '' || (Array.isArray(value) && !value.length))) {
      errors.push(`「${field.label}」不能为空`);
      continue;
    }
    if (value === undefined) continue;
    if (field.type === 'enum' && field.options && !field.options.includes(value)) {
      errors.push(`「${field.label}」取值不合法：${value}`);
    }
    if (field.type === 'number' && Number.isNaN(value)) {
      errors.push(`「${field.label}」必须是数字`);
    }
  }
  return errors;
}

function serialize(data, body) {
  const frontmatter = yamlDump(data, { lineWidth: 0, noRefs: true, quotingType: '"' }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${(body ?? '').trim()}\n`;
}

async function listEntries(collection) {
  const dir = collectionDir(collection);
  const files = await fs.readdir(dir).catch(() => []);
  const entries = [];
  for (const file of files) {
    if (!/\.(md|mdx)$/.test(file)) continue;
    const id = file.replace(/\.(md|mdx)$/, '');
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    const { data, body } = splitFrontmatter(raw);
    const normalized = normalizeEntry(collection, data);
    entries.push({
      id,
      ...normalized,
      draft: Boolean(data.draft),
      _bodyLength: body.trim().length,
      _updatedAt: (await fs.stat(path.join(dir, file))).mtime.toISOString(),
    });
  }
  return entries;
}

async function readEntry(collection, id) {
  const file = path.join(collectionDir(collection), `${id}.md`);
  const raw = await fs.readFile(file, 'utf8');
  const { data, body } = splitFrontmatter(raw);
  return { id, data: normalizeEntry(collection, data), body: body.trim(), raw };
}

/* ------------------------------------------------------------------ */
/* 素材                                                                */
/* ------------------------------------------------------------------ */

const ASSET_MAX = 8 * 1024 * 1024;
const ASSET_EXT = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/svg+xml', '.svg'],
  ['image/avif', '.avif'],
]);

async function listAssets() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  const files = await fs.readdir(ASSETS_DIR);
  const items = [];
  for (const file of files) {
    if (file.startsWith('.')) continue;
    const stat = await fs.stat(path.join(ASSETS_DIR, file));
    if (!stat.isFile()) continue;
    items.push({
      name: file,
      url: `/images/${file}`,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
    });
  }
  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function safeAssetName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name) ? name : null;
}

/* ------------------------------------------------------------------ */
/* 构建                                                                */
/* ------------------------------------------------------------------ */

const buildState = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  lines: [],
};

function appendBuildLine(line) {
  buildState.lines.push(line);
  if (buildState.lines.length > 1200) buildState.lines.splice(0, buildState.lines.length - 1200);
}

function startBuild(res) {
  if (buildState.status === 'running') {
    return fail(res, 409, '已有构建正在进行');
  }
  buildState.status = 'running';
  buildState.startedAt = new Date().toISOString();
  buildState.finishedAt = null;
  buildState.exitCode = null;
  buildState.lines = [];

  const child = spawn('npm', ['run', 'build'], { cwd: ROOT, env: { ...process.env, NO_COLOR: '1' } });
  const onData = (chunk) => {
    for (const line of chunk.toString('utf8').split('\n')) {
      if (line.trim()) appendBuildLine(line);
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('close', (code) => {
    buildState.status = code === 0 ? 'success' : 'failed';
    buildState.exitCode = code;
    buildState.finishedAt = new Date().toISOString();
    appendBuildLine(code === 0 ? '✓ 构建完成' : `✗ 构建失败（exit ${code}）`);
  });
  child.on('error', (error) => {
    buildState.status = 'failed';
    buildState.exitCode = -1;
    buildState.finishedAt = new Date().toISOString();
    appendBuildLine(`✗ 无法启动构建：${error.message}`);
  });

  json(res, 202, { ok: true, build: buildState });
}

/* ------------------------------------------------------------------ */
/* 设置                                                                */
/* ------------------------------------------------------------------ */

async function readSettings() {
  try {
    return JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeSettings(patch) {
  const current = await readSettings();
  const next = { ...current, ...patch };
  await fs.writeFile(SETTINGS_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method ?? 'GET';

  if (pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'idmt-admin', version: '2.0.0' });
  }

  if (pathname === '/api/login' && method === 'POST') {
    const body = await readJson(req);
    if (String(body.password ?? '') !== PASSWORD) {
      return fail(res, 401, '密码不正确');
    }
    const token = issueSession();
    return json(
      res,
      200,
      { ok: true, role: ROLE, defaultPassword: USING_DEFAULT_PASSWORD },
      {
        'Set-Cookie': `idmt_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`,
      },
    );
  }

  if (pathname === '/api/logout' && method === 'POST') {
    const token = parseCookies(req).idmt_admin;
    sessions.delete(token);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'idmt_admin=; Path=/; HttpOnly; Max-Age=0' });
  }

  if (pathname === '/api/me') {
    const token = parseCookies(req).idmt_admin;
    if (!verifySession(token)) return fail(res, 401, '未登录');
    return json(res, 200, { ok: true, role: ROLE, defaultPassword: USING_DEFAULT_PASSWORD });
  }

  if (!requireAuth(req, res)) return;

  if (pathname === '/api/schema') {
    return json(res, 200, { ok: true, collections: COLLECTIONS });
  }

  if (pathname === '/api/stats') {
    const counts = {};
    let drafts = 0;
    for (const key of COLLECTION_KEYS) {
      const entries = await listEntries(key);
      counts[key] = entries.length;
      drafts += entries.filter((entry) => entry.draft).length;
    }
    const assets = await listAssets();
    return json(res, 200, {
      ok: true,
      counts,
      drafts,
      assets: assets.length,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
      build: { status: buildState.status, startedAt: buildState.startedAt, finishedAt: buildState.finishedAt },
      defaultPassword: USING_DEFAULT_PASSWORD,
    });
  }

  if (pathname === '/api/entries' && method === 'GET') {
    const collection = searchParams.get('collection');
    if (!collectionDir(collection)) return fail(res, 400, '未知内容集合');
    return json(res, 200, { ok: true, entries: await listEntries(collection) });
  }

  const entryMatch = pathname.match(/^\/api\/entries\/([a-z]+)(?:\/([a-z0-9-]+))?$/);
  if (entryMatch) {
    const [, collection, id] = entryMatch;
    if (!collectionDir(collection)) return fail(res, 400, '未知内容集合');

    if (method === 'GET' && id) {
      try {
        return json(res, 200, { ok: true, entry: await readEntry(collection, id) });
      } catch {
        return fail(res, 404, '条目不存在');
      }
    }

    if (method === 'POST' && !id) {
      const body = await readJson(req);
      const data = normalizeEntry(collection, body.data ?? {});
      const errors = validate(collection, data);
      if (errors.length) return fail(res, 422, '字段校验未通过', errors);

      const slug = safeId(body.id) ?? safeId(
        String(data.title ?? data.name ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
      if (!slug) return fail(res, 400, '请提供合法的英文 ID（小写字母、数字与连字符）');
      const dir = collectionDir(collection);
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${slug}.md`);
      if (await fs.stat(file).catch(() => null)) return fail(res, 409, `ID「${slug}」已存在`);

      await fs.writeFile(file, serialize(data, body.body ?? ''), 'utf8');
      return json(res, 201, { ok: true, id: slug });
    }

    if (method === 'PUT' && id) {
      if (!safeId(id)) return fail(res, 400, '非法 ID');
      const body = await readJson(req);
      const data = normalizeEntry(collection, body.data ?? {});
      const errors = validate(collection, data);
      if (errors.length) return fail(res, 422, '字段校验未通过', errors);
      const file = path.join(collectionDir(collection), `${id}.md`);
      if (!(await fs.stat(file).catch(() => null))) return fail(res, 404, '条目不存在');
      await fs.writeFile(file, serialize(data, body.body ?? ''), 'utf8');
      return json(res, 200, { ok: true, id });
    }

    if (method === 'DELETE' && id) {
      if (!safeId(id)) return fail(res, 400, '非法 ID');
      const file = path.join(collectionDir(collection), `${id}.md`);
      if (!(await fs.stat(file).catch(() => null))) return fail(res, 404, '条目不存在');
      await fs.unlink(file);
      return json(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/assets' && method === 'GET') {
    return json(res, 200, { ok: true, assets: await listAssets() });
  }

  if (pathname === '/api/assets' && method === 'POST') {
    const rawName = searchParams.get('name') ?? '';
    const ext = ASSET_EXT.get((req.headers['content-type'] ?? '').split(';')[0]);
    if (!ext) return fail(res, 415, '仅支持 JPEG / PNG / WebP / SVG / AVIF');
    const base = rawName.replace(/\.[A-Za-z0-9]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'asset';
    const buffer = await readBody(req, ASSET_MAX);
    if (!buffer.length) return fail(res, 400, '空文件');

    let name = `${base}${ext}`;
    let index = 1;
    while (await fs.stat(path.join(ASSETS_DIR, name)).catch(() => null)) {
      name = `${base}-${index++}${ext}`;
    }
    await fs.mkdir(ASSETS_DIR, { recursive: true });
    await fs.writeFile(path.join(ASSETS_DIR, name), buffer);
    return json(res, 201, { ok: true, asset: { name, url: `/images/${name}`, size: buffer.length } });
  }

  if (pathname.startsWith('/api/assets/') && method === 'DELETE') {
    const name = safeAssetName(decodeURIComponent(pathname.slice('/api/assets/'.length)));
    if (!name) return fail(res, 400, '非法文件名');
    const file = path.join(ASSETS_DIR, name);
    if (!(await fs.stat(file).catch(() => null))) return fail(res, 404, '文件不存在');
    await fs.unlink(file);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/settings' && method === 'GET') {
    return json(res, 200, { ok: true, settings: await readSettings() });
  }

  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await readJson(req);
    const settings = await writeSettings(body);
    return json(res, 200, { ok: true, settings });
  }

  if (pathname === '/api/build' && method === 'POST') {
    return startBuild(res);
  }

  if (pathname === '/api/build' && method === 'GET') {
    return json(res, 200, { ok: true, build: buildState });
  }

  return fail(res, 404, '接口不存在');
}

/* ------------------------------------------------------------------ */
/* 静态资源                                                            */
/* ------------------------------------------------------------------ */

async function serveStatic(res, pathname) {
  const distExists = await fs.stat(ADMIN_DIST).then((s) => s.isDirectory()).catch(() => false);
  if (!distExists) {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(
      '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:48px;line-height:1.7">' +
        '<h1>后台界面尚未构建</h1><p>请先在 <code>admin/</code> 下执行 <code>npm install &amp;&amp; npm run build</code>，' +
        '或用 <code>npm run dev</code> 启动开发服务器。</p></body>',
    );
  }

  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.join(ADMIN_DIST, relative);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(ADMIN_DIST))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const stat = await fs.stat(resolved).catch(() => null);
  const file = stat?.isFile() ? resolved : path.join(ADMIN_DIST, 'index.html');
  const data = await fs.readFile(file).catch(() => null);
  if (!data) {
    res.writeHead(404);
    return res.end('Not Found');
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
  });
  res.end(data);
}

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return fail(res, 405, 'Method Not Allowed');
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error('[admin]', error);
    if (!res.headersSent) fail(res, 500, error instanceof Error ? error.message : '服务异常');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  IDMT 内容后台  http://${HOST}:${PORT}\n`);
  if (USING_DEFAULT_PASSWORD) {
    console.log('  ⚠ 正在使用默认密码 idmt-admin，请设置 ADMIN_PASSWORD 后重启。\n');
  }
});
