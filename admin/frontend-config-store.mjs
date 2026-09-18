/**
 * 前端粒度管理 · 配置存储与动态构建
 *
 * 职责边界（前后端分离）：
 * - 本模块属**后台**。它负责配置的持久化、校验、以及**运行时动态构建**
 *   出可供前台消费的配置结果。
 * - 它不包含任何前台的默认值 —— 默认值属于前台（src/lib/frontend-config.ts）。
 *   后台只做「用户显式配置了什么」的存取与规范化。
 *
 * 「动态构建」在本项目的含义（明确记录，避免歧义）：
 *   配置**不预编译进前台静态产物**。后台在每个 GET 请求时，
 *   从落盘配置实时拼装出一份规范化配置文档 + 版本指纹，通过接口下发。
 *   这属于 **runtime config resolution（运行时配置解析）**，
 *   不是 Astro 构建期注入，也不是 SSR。
 *
 * 存储：单一 JSON 文件（仓库内），无数据库。与既有的 MDX 内容文件同一思路。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

import {
  CONFIG_RELATIVE_PATH,
  CONFIG_VERSION,
  SITE_SURFACE,
  emptyConfig,
  isConfigEmpty,
  normalizeConfig,
} from '../shared/frontend-config-contract.mjs';

/** 已知路由 / 区块清单，供校验使用（来自共享契约） */
const KNOWN_ROUTES = SITE_SURFACE.routes.map((r) => r.path);
const KNOWN_BLOCKS = new Set(
  Object.values(SITE_SURFACE.blocks).flatMap((list) => list.map((b) => b.id))
);

export function configPath(root) {
  return path.join(root, CONFIG_RELATIVE_PATH);
}

/**
 * 读取落盘配置。
 *
 * 永不抛异常：文件不存在 / JSON 损坏 / 形状不对，一律返回空配置 + warnings。
 * 理由：配置坏了不能导致后台打不开 —— 这是需求的硬要求。
 */
export async function readConfig(root) {
  const file = configPath(root);
  const raw = await fs.readFile(file, 'utf8').catch(() => null);

  if (raw === null) {
    return { exists: false, config: emptyConfig(), warnings: [] };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      exists: true,
      config: emptyConfig(),
      warnings: [
        {
          path: '',
          message: `配置文件不是合法 JSON，已按空配置处理：${err.message}`,
        },
      ],
    };
  }

  const { config, warnings } = normalizeConfig(parsed, {
    knownRoutes: KNOWN_ROUTES,
    knownBlocks: [...KNOWN_BLOCKS],
  });

  return { exists: true, config, warnings };
}

/**
 * 写入配置。
 *
 * 先规范化再落盘 —— 保证文件里永远不会出现非法值，
 * 也让「保存成功」等价于「前台一定能解析」。
 */
export async function writeConfig(root, input) {
  const { config, warnings } = normalizeConfig(input, {
    knownRoutes: KNOWN_ROUTES,
    knownBlocks: [...KNOWN_BLOCKS],
  });

  config.version = CONFIG_VERSION;

  const file = configPath(root);

  /**
   * 内容未变则**保留原 updatedAt 且不重写文件**。
   *
   * 为什么：这个文件进 git，而每次保存都刷新时间戳会在「内容完全相同」
   * 时也产生一条 diff —— 验证套件每跑一次就脏一次工作区，纯噪音。
   * 只有语义内容真的变了才更新时间戳。
   */
  const prevRaw = await fs.readFile(file, 'utf8').catch(() => null);
  const cmp = (c) => JSON.stringify({ ...c, updatedAt: null });
  if (prevRaw) {
    try {
      const prev = normalizeConfig(JSON.parse(prevRaw), {
        knownRoutes: KNOWN_ROUTES,
        knownBlocks: [...KNOWN_BLOCKS],
      }).config;
      if (cmp(prev) === cmp(config)) {
        config.updatedAt = prev.updatedAt ?? null;
        return { config, warnings, unchanged: true };
      }
    } catch {
      /* 旧文件坏了：照常覆盖 */
    }
  }

  config.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(file), { recursive: true });
  // 缩进 2 空格 + 结尾换行：这个文件会进 git，要能 diff
  await fs.writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  return { config, warnings, unchanged: false };
}

/**
 * 动态构建下发给前台的配置结果。
 *
 * 这是「动态构建」的核心出口：每次调用都从当前落盘配置**实时拼装**，
 * 并计算内容指纹作为版本号（前台据此判断是否变化）。
 *
 * 返回结构刻意与后台内部结构分离：前台只依赖这个形状，
 * 后台将来重构存储不会影响前台。
 */
export async function buildDeliveryPayload(root) {
  const { exists, config, warnings } = await readConfig(root);

  // 版本指纹：内容稳定 → 指纹稳定。前台可据此做缓存与「配置是否变化」判断。
  const version = createHash('sha256')
    .update(JSON.stringify(config))
    .digest('hex')
    .slice(0, 16);

  return {
    payload: {
      ok: true,
      // 前台消费的契约
      config: {
        version: config.version ?? CONFIG_VERSION,
        updatedAt: config.updatedAt ?? null,
        routes: config.routes,
        blocks: config.blocks,
        elements: config.elements,
        i18n: config.i18n,
        theme: config.theme,
        features: config.features,
      },
      /** 内容指纹，前台可用于 ETag / 变更检测 */
      revision: version,
      /** 是否为空配置（前台可据此走"完全默认"快路径） */
      empty: isConfigEmpty(config),
      /** 文件是否真实存在（后台空状态提示用） */
      persisted: exists,
      /** 规范化过程中丢弃的非法项，后台用来给管理员可读提示 */
      warnings,
    },
    /** 供 HTTP 层设置 ETag */
    etag: `W/"${version}"`,
  };
}
