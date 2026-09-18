/**
 * 前端粒度管理 · 验证套件
 *
 * 协调四件事：
 *   1. 保证后台 API 在跑（否则先起一个）
 *   2. 起「静态产物 + /api 反代」的验证服务（站点是静态站，后台 API 另端口，需同源）
 *   3. 依次跑三个 Python e2e 脚本
 *   4. 最后清空配置并跑回归守卫，确保仓库停在「未配置」的干净态
 *
 * 用法：npm run verify:config
 *
 * 为什么要反代：前台的配置拉取是浏览器行为，跨源会被 CORS 与
 * credentials 策略干扰，直接在真实同源下验证才有意义。
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ADMIN_API = 'http://127.0.0.1:4322';
const PROXY_PORT = 4395;

/** 找可用的 python（项目既有约定：用 cbpanel venv 跑 playwright） */
const PY =
  process.env.PYTHON ??
  'D:\\deepseek-harness-data\\venvs\\cbpanel\\Scripts\\python.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

async function ensureAdmin() {
  const alive = await fetch(`${ADMIN_API}/api/schema`)
    .then((r) => r.ok)
    .catch(() => false);
  if (alive) {
    console.log('· 后台 API 已在运行');
    return null;
  }
  console.log('· 启动后台 API…');
  const child = spawn('node', ['server.mjs'], {
    cwd: path.join(ROOT, 'admin'),
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 300));
    const ok = await fetch(`${ADMIN_API}/api/schema`)
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) {
      console.log('· 后台 API 就绪');
      return child;
    }
  }
  throw new Error('后台 API 启动超时');
}

function run(script, label) {
  return new Promise((resolve) => {
    console.log(`\n──── ${label} ────`);
    const child = spawn(PY, [path.join(__dirname, script)], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/** 把配置清空（验证结束要让仓库回到未配置态） */
async function clearConfig() {
  await fetch(`${ADMIN_API}/api/frontend-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: {} }),
  }).catch(() => {});
}

const distOk = await fs
  .access(path.join(DIST, 'index.html'))
  .then(() => true)
  .catch(() => false);
if (!distOk) {
  console.error('✗ 未找到 dist/index.html，请先 npm run build');
  process.exit(1);
}

const spawnedAdmin = await ensureAdmin();

// 三个 e2e 脚本各自带「静态产物 + /api 反代」的本地服务（各自占用独立端口），
// 因此这里不再重复起一个代理；只要保证后台 API 可达即可。
let failed = 0;
failed += await run('e2e-frontend-config.py', '前台运行时应用');
failed += await run('e2e-frontend-config-edge.py', '边界：i18n / 损坏配置 / 空配置');
failed += await run('e2e-frontend-config-admin.py', '后台管理界面');

await clearConfig();
console.log('\n──── 回归守卫（空配置 vs 改动前）────');
failed += await run('config-regression-guard.py', '产物回归');

if (spawnedAdmin) spawnedAdmin.kill();

console.log('');
if (failed > 0) {
  console.error('✗ 验证套件存在失败项');
  process.exit(1);
}
console.log('✅ 前端粒度管理验证套件全部通过');
