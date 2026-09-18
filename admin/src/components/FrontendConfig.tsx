import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddIcon, DeleteIcon, RefreshIcon } from '../icons';
import { api } from '../api';
import { monoFont, tokens } from '../theme';
import type {
  BlockPageConfig,
  ConfigWarning,
  ElementConfig,
  FrontendConfig,
  RouteConfig,
  Surface,
  ThemeConfig,
} from '../types';

/**
 * 前端粒度管理
 *
 * 职责：编辑六类粒度的配置并保存。**只管配置本身**，不渲染前台。
 * 前台如何消费由接口契约（shared/frontend-config-contract.mjs）约定，
 * 后台不内联前台默认值 —— 未配置的项由前台自行回落。
 *
 * 每项独立生效：所有编辑都作用在 config 的具体叶子键上，
 * 不触碰同页其他键、不触碰其他语言。
 */

const EMPTY_CONFIG: FrontendConfig = {
  version: 1,
  routes: {},
  blocks: {},
  elements: {},
  i18n: {},
  theme: {},
  features: {},
};

interface Props {
  onNotify: (msg: string, severity: 'success' | 'error') => void;
}

export default function FrontendConfigPanel({ onNotify }: Props) {
  const [tab, setTab] = useState(0);
  const [surface, setSurface] = useState<Surface | null>(null);
  const [languages, setLanguages] = useState<string[]>(['zh-CN']);
  const [themeTokens, setThemeTokens] = useState<string[]>([]);
  const [featureKeys, setFeatureKeys] = useState<string[]>([]);
  const [routeStates, setRouteStates] = useState<string[]>(['enabled', 'hidden', 'disabled']);
  const [routeAccess, setRouteAccess] = useState<string[]>(['public', 'restricted']);

  const [config, setConfig] = useState<FrontendConfig>(EMPTY_CONFIG);
  const [persisted, setPersisted] = useState(false);
  const [warnings, setWarnings] = useState<ConfigWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, src] = await Promise.all([api.frontendConfig.surface(), api.frontendConfig.source()]);
      setSurface(s.surface);
      setLanguages(s.languages);
      setThemeTokens(s.themeTokens);
      setFeatureKeys(s.featureKeys);
      setRouteStates(s.routeStates);
      setRouteAccess(s.routeAccess);
      setConfig({ ...EMPTY_CONFIG, ...src.config });
      setPersisted(src.persisted);
      setWarnings(src.warnings);
      setLoadError(null);
      setDirty(false);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 所有编辑都经这里 —— 统一置 dirty，便于「未保存」提示 */
  const mutate = useCallback((fn: (draft: FrontendConfig) => void) => {
    setConfig((prev) => {
      const next: FrontendConfig = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
    setDirty(true);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.frontendConfig.save(config);
      setConfig(res.config);
      setWarnings(res.warnings);
      setPersisted(true);
      setDirty(false);
      onNotify(res.message, 'success');
    } catch (err) {
      // 保存失败**不清空已填内容** —— 需求硬要求
      onNotify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = useMemo(
    () =>
      Object.keys(config.routes).length === 0 &&
      Object.keys(config.blocks).length === 0 &&
      Object.keys(config.elements).length === 0 &&
      Object.keys(config.i18n).length === 0 &&
      Object.keys(config.theme).length === 0 &&
      Object.keys(config.features).length === 0,
    [config]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: 320 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, flex: 1 }}>
      {/* ---------- 头部 ---------- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h2" sx={{ mr: 'auto' }}>
          前端粒度管理
        </Typography>
        {dirty && <Chip size="small" color="warning" label="有未保存的改动" />}
        <Tooltip title="放弃改动并重新读取">
          <span>
            <IconButton onClick={() => void load()} disabled={saving} aria-label="重新读取配置">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? '保存中…' : '保存配置'}
        </Button>
      </Box>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      {warnings.length > 0 && (
        <Alert severity="warning">
          有 {warnings.length} 项配置值非法，已被忽略（保存后即从文件中剔除）：
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, fontFamily: monoFont, fontSize: '0.75rem' }}>
            {warnings.slice(0, 6).map((w, i) => (
              <li key={i}>
                {w.path || '(根)'} — {w.message}
              </li>
            ))}
          </Box>
        </Alert>
      )}

      {/* ---------- 空状态 ---------- */}
      {isEmpty && (
        <Alert severity="info">
          暂无配置，使用前端默认内容。在下方任一维度添加配置后保存即可生效。
          {!persisted && ' 当前尚未创建配置文件。'}
        </Alert>
      )}

      {/* ---------- 分页签 ---------- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="页面与路由" />
          <Tab label="区块与组件" />
          <Tab label="元素" />
          <Tab label="文案 i18n" />
          <Tab label="主题与样式" />
          <Tab label="功能开关" />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        {tab === 0 && (
          <RoutesTab config={config} mutate={mutate} surface={surface} states={routeStates} accesses={routeAccess} />
        )}
        {tab === 1 && <BlocksTab config={config} mutate={mutate} surface={surface} />}
        {tab === 2 && <ElementsTab config={config} mutate={mutate} surface={surface} />}
        {tab === 3 && (
          <I18nTab config={config} mutate={mutate} languages={languages} surface={surface} />
        )}
        {tab === 4 && (
          <ThemeTab config={config} mutate={mutate} themeTokens={themeTokens} surface={surface} />
        )}
        {tab === 5 && (
          <FeaturesTab config={config} mutate={mutate} featureKeys={featureKeys} />
        )}
      </Box>
    </Box>
  );
}

/* ==================================================================
   通用小组件
   ================================================================== */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, mb: 0.5 }}>{title}</Typography>
      {hint && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1.5, lineHeight: 1.7 }}>
          {hint}
        </Typography>
      )}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: `1px solid ${tokens.line}`,
          borderRadius: 1,
          p: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled', py: 1.5 }}>
      {text}
    </Typography>
  );
}

/* ==================================================================
   1. 页面 / 路由级
   ================================================================== */

function RoutesTab({
  config,
  mutate,
  surface,
  states,
  accesses,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  surface: Surface | null;
  states: string[];
  accesses: string[];
}) {
  const [pick, setPick] = useState('');
  const routes = surface?.routes ?? [];
  const configured = Object.keys(config.routes);
  const available = routes.filter((r) => !configured.includes(r.path));

  const stateLabel: Record<string, string> = {
    enabled: '启用',
    hidden: '隐藏（不显示但可直达）',
    disabled: '禁用（不可访问）',
  };

  return (
    <Box>
      <Section
        title="路由状态"
        hint="每一项独立生效。「隐藏」不出现在导航但可直接输入地址访问；「禁用」访问时给出不可用提示。未列出的路由保持默认（启用）。"
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="route-pick">添加路由配置</InputLabel>
            <Select
              labelId="route-pick"
              label="添加路由配置"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              {available.map((r) => (
                <MenuItem key={r.path} value={r.path}>
                  {r.label}（{r.path}）
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            startIcon={<AddIcon />}
            disabled={!pick}
            onClick={() => {
              mutate((d) => {
                d.routes[pick] = { state: 'enabled' };
              });
              setPick('');
            }}
          >
            添加
          </Button>
        </Box>

        {configured.length === 0 ? (
          <EmptyHint text="暂无路由配置，全部页面按默认（启用）表现。" />
        ) : (
          configured.map((path) => {
            const rc: RouteConfig = config.routes[path] ?? {};
            const label = routes.find((r) => r.path === path)?.label ?? path;
            return (
              <Box
                key={path}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  py: 1.25,
                  borderBottom: `1px solid ${tokens.line}`,
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Box sx={{ minWidth: 200 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</Typography>
                  <Typography sx={{ fontFamily: monoFont, fontSize: '0.6875rem', color: 'text.secondary' }}>
                    {path}
                  </Typography>
                </Box>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={rc.state ?? 'enabled'}
                    onChange={(e) =>
                      mutate((d) => {
                        d.routes[path] = { ...d.routes[path], state: e.target.value as RouteConfig['state'] };
                      })
                    }
                  >
                    {states.map((s) => (
                      <MenuItem key={s} value={s}>
                        {stateLabel[s] ?? s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <Select
                    value={rc.access ?? 'public'}
                    onChange={(e) =>
                      mutate((d) => {
                        d.routes[path] = { ...d.routes[path], access: e.target.value as RouteConfig['access'] };
                      })
                    }
                  >
                    {accesses.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a === 'public' ? '公开' : '需权限'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {(rc.state === 'disabled' || rc.access === 'restricted') && (
                  <TextField
                    size="small"
                    placeholder="不可用提示语（可选）"
                    value={rc.disabledMessage ?? ''}
                    onChange={(e) =>
                      mutate((d) => {
                        d.routes[path] = { ...d.routes[path], disabledMessage: e.target.value };
                      })
                    }
                    sx={{ minWidth: 240, flex: 1 }}
                  />
                )}

                <IconButton
                  size="small"
                  aria-label={`移除 ${path} 的路由配置`}
                  onClick={() =>
                    mutate((d) => {
                      delete d.routes[path];
                    })
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })
        )}
      </Section>
    </Box>
  );
}

/* ==================================================================
   2. 区块 / 组件级
   ================================================================== */

function BlocksTab({
  config,
  mutate,
  surface,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  surface: Surface | null;
}) {
  const blockPages = Object.entries(surface?.blocks ?? {});
  const [route, setRoute] = useState(blockPages[0]?.[0] ?? '/');
  const blocks = surface?.blocks?.[route] ?? [];
  const page: BlockPageConfig = config.blocks[route] ?? {};

  return (
    <Box>
      <Section
        title="区块开关、顺序与文案"
        hint="每个区块独立开关。顺序只影响你在此列出的区块，未列出的保持默认相对位置。文案留空即使用默认。"
      >
        <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel id="block-route">页面</InputLabel>
          <Select labelId="block-route" label="页面" value={route} onChange={(e) => setRoute(e.target.value)}>
            {blockPages.map(([path]) => (
              <MenuItem key={path} value={path}>
                {path}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {blocks.length === 0 ? (
          <EmptyHint text="该页面暂无可配置区块。" />
        ) : (
          blocks.map((b) => {
            const item = page.items?.[b.id] ?? {};
            return (
              <Box
                key={b.id}
                sx={{
                  py: 1.5,
                  borderBottom: `1px solid ${tokens.line}`,
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{b.label}</Typography>
                    <Typography sx={{ fontFamily: monoFont, fontSize: '0.6875rem', color: 'text.secondary' }}>
                      {b.id}
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={item.enabled !== false}
                        onChange={(e) =>
                          mutate((d) => {
                            const p = (d.blocks[route] ??= {});
                            p.items = { ...p.items, [b.id]: { ...p.items?.[b.id], enabled: e.target.checked } };
                          })
                        }
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.8125rem' }}>显示</Typography>}
                  />

                  <TextField
                    size="small"
                    label="标题覆盖"
                    placeholder="留空用默认"
                    value={item.title ?? ''}
                    onChange={(e) =>
                      mutate((d) => {
                        const p = (d.blocks[route] ??= {});
                        p.items = { ...p.items, [b.id]: { ...p.items?.[b.id], title: e.target.value } };
                      })
                    }
                    sx={{ minWidth: 200 }}
                  />

                  <TextField
                    size="small"
                    label="说明覆盖"
                    placeholder="留空用默认"
                    value={item.description ?? ''}
                    onChange={(e) =>
                      mutate((d) => {
                        const p = (d.blocks[route] ??= {});
                        p.items = { ...p.items, [b.id]: { ...p.items?.[b.id], description: e.target.value } };
                      })
                    }
                    sx={{ minWidth: 220, flex: 1 }}
                  />

                  <TextField
                    size="small"
                    label="顺序"
                    type="number"
                    value={page.order?.indexOf(b.id) ?? -1}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      mutate((d) => {
                        const p = (d.blocks[route] ??= {});
                        const list = (p.order ?? blocks.map((x) => x.id)).filter((x) => x !== b.id);
                        if (n < 0) {
                          p.order = list;
                        } else {
                          list.splice(Math.min(n, list.length), 0, b.id);
                          p.order = list;
                        }
                      });
                    }}
                    sx={{ width: 90 }}
                    helperText="-1 = 不指定"
                  />
                </Box>
              </Box>
            );
          })
        )}
      </Section>
    </Box>
  );
}

/* ==================================================================
   3. 元素级
   ================================================================== */

function ElementsTab({
  config,
  mutate,
  surface,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  surface: Surface | null;
}) {
  const globalEls = surface?.elements?.['*'] ?? [];
  const pageEls = Object.entries(surface?.elements ?? {}).filter(([k]) => k !== '*');
  const [route, setRoute] = useState('/');

  const candidates = [...globalEls, ...(surface?.elements?.[route] ?? [])];

  return (
    <Box>
      <Section
        title="全局元素"
        hint="对所有页面生效。每个元素独立开关与改文案，互不牵连。未配置的元素保持默认。"
      >
        {globalEls.length === 0 ? (
          <EmptyHint text="暂无可配置的全局元素。" />
        ) : (
          globalEls.map((el) => (
            <ElementRow
              key={el.id}
              route="*"
              id={el.id}
              label={el.label}
              cfg={config.elements['*']?.[el.id] ?? {}}
              mutate={mutate}
            />
          ))
        )}
      </Section>

      <Section title="页面级元素" hint="只对选中的路由生效。">
        <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel id="el-route">页面</InputLabel>
          <Select labelId="el-route" label="页面" value={route} onChange={(e) => setRoute(e.target.value)}>
            {pageEls.map(([path]) => (
              <MenuItem key={path} value={path}>
                {path}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {candidates.length === 0 ? (
          <EmptyHint text="该页面暂无可配置元素。" />
        ) : (
          (surface?.elements?.[route] ?? []).map((el) => (
            <ElementRow
              key={el.id}
              route={route}
              id={el.id}
              label={el.label}
              cfg={config.elements[route]?.[el.id] ?? {}}
              mutate={mutate}
            />
          ))
        )}
      </Section>
    </Box>
  );
}

function ElementRow({
  route,
  id,
  label,
  cfg,
  mutate,
}: {
  route: string;
  id: string;
  label: string;
  cfg: ElementConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
}) {
  const setKey = (patch: Partial<ElementConfig>) =>
    mutate((d) => {
      const page = (d.elements[route] ??= {});
      page[id] = { ...page[id], ...patch };
    });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        py: 1.25,
        borderBottom: `1px solid ${tokens.line}`,
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Box sx={{ minWidth: 170 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontFamily: monoFont, fontSize: '0.6875rem', color: 'text.secondary' }}>
          {route}·{id}
        </Typography>
      </Box>

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={cfg.enabled !== false}
            onChange={(e) => setKey({ enabled: e.target.checked })}
          />
        }
        label={<Typography sx={{ fontSize: '0.8125rem' }}>显示</Typography>}
      />

      <TextField
        size="small"
        label="文案"
        placeholder="留空用默认"
        value={cfg.label ?? ''}
        onChange={(e) => setKey({ label: e.target.value })}
        sx={{ minWidth: 150 }}
      />

      <TextField
        size="small"
        label="跳转目标"
        placeholder="留空用默认"
        value={cfg.href ?? ''}
        onChange={(e) => setKey({ href: e.target.value })}
        sx={{ minWidth: 190 }}
      />

      <TextField
        size="small"
        label="图标"
        placeholder="留空用默认"
        value={cfg.icon ?? ''}
        onChange={(e) => setKey({ icon: e.target.value })}
        sx={{ width: 120 }}
      />
    </Box>
  );
}

/* ==================================================================
   4. 文案与 i18n
   ================================================================== */

function I18nTab({
  config,
  mutate,
  languages,
  surface,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  languages: string[];
  surface: Surface | null;
}) {
  const [lang, setLang] = useState(languages[0] ?? 'zh-CN');
  const [newKey, setNewKey] = useState('');
  const table = config.i18n[lang] ?? {};

  // 从可配置面推导出「有意义的默认键」，方便管理员知道能覆盖什么
  const hints = useMemo(() => {
    const list: string[] = [];
    for (const r of surface?.routes ?? []) list.push(`nav.${r.path === '/' ? 'home' : r.path.slice(1)}`);
    for (const [path, els] of Object.entries(surface?.elements ?? {})) {
      for (const e of els) list.push(`el.${path === '*' ? 'global' : path.slice(1)}.${e.id}`);
    }
    return list;
  }, [surface]);

  const rows = Object.keys(table);

  return (
    <Box>
      <Section
        title="界面文案覆盖"
        hint="按语言分别覆盖。改一种语言不影响其他语言。未配置的键在前台回落到默认文案。"
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="i18n-lang">语言</InputLabel>
            <Select labelId="i18n-lang" label="语言" value={lang} onChange={(e) => setLang(e.target.value)}>
              {languages.map((l) => (
                <MenuItem key={l} value={l}>
                  {l}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="文案键"
            placeholder="例如 nav.about"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button
            startIcon={<AddIcon />}
            disabled={!newKey.trim()}
            onClick={() => {
              const k = newKey.trim();
              mutate((d) => {
                const t = (d.i18n[lang] ??= {});
                if (t[k] === undefined) t[k] = '';
              });
              setNewKey('');
            }}
          >
            添加
          </Button>
        </Box>

        {hints.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
              可用键（点击填入）：
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {hints.slice(0, 24).map((h) => (
                <Chip
                  key={h}
                  size="small"
                  variant="outlined"
                  label={h}
                  onClick={() => setNewKey(h)}
                  sx={{ fontFamily: monoFont, fontSize: '0.6875rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {rows.length === 0 ? (
          <EmptyHint text={`${lang} 暂无文案覆盖，前台全部使用默认文案。`} />
        ) : (
          rows.map((k) => (
            <Box
              key={k}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                borderBottom: `1px solid ${tokens.line}`,
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Typography
                sx={{ fontFamily: monoFont, fontSize: '0.75rem', minWidth: 200, color: 'text.secondary' }}
              >
                {k}
              </Typography>
              <TextField
                size="small"
                placeholder="留空用默认"
                value={table[k] ?? ''}
                onChange={(e) =>
                  mutate((d) => {
                    const t = (d.i18n[lang] ??= {});
                    t[k] = e.target.value;
                  })
                }
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                aria-label={`移除 ${k}`}
                onClick={() =>
                  mutate((d) => {
                    delete d.i18n[lang]?.[k];
                  })
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </Section>
    </Box>
  );
}

/* ==================================================================
   5. 主题与样式
   ================================================================== */

function ThemeTab({
  config,
  mutate,
  themeTokens,
  surface,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  themeTokens: string[];
  surface: Surface | null;
}) {
  const theme: ThemeConfig = config.theme ?? {};
  const tokensMap = theme.tokens ?? {};

  const setTheme = (patch: Partial<ThemeConfig>) =>
    mutate((d) => {
      d.theme = { ...d.theme, ...patch };
    });

  return (
    <Box>
      <Section
        title="设计令牌覆盖"
        hint="只允许覆盖白名单内的令牌，且值必须是 #hex 颜色。未覆盖的令牌沿用设计系统默认值。"
      >
        {themeTokens.map((t) => (
          <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
            <Typography sx={{ fontFamily: monoFont, fontSize: '0.75rem', minWidth: 180, color: 'text.secondary' }}>
              {t}
            </Typography>
            <TextField
              size="small"
              placeholder="#1d4e89（留空用默认）"
              value={tokensMap[t] ?? ''}
              onChange={(e) =>
                mutate((d) => {
                  const tk = (d.theme.tokens ??= {});
                  if (e.target.value.trim() === '') delete tk[t];
                  else tk[t] = e.target.value.trim();
                })
              }
              sx={{ width: 220 }}
            />
            {tokensMap[t] && (
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: 0.5,
                  border: `1px solid ${tokens.line}`,
                  bgcolor: tokensMap[t],
                }}
              />
            )}
          </Box>
        ))}
      </Section>

      <Section title="Logo 与页脚" hint="留空即沿用前台默认（院名 / 备案信息等）。">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 }}>
          <TextField
            size="small"
            label="Logo 主文案"
            placeholder="留空用默认院名"
            value={theme.logoText ?? ''}
            onChange={(e) => setTheme({ logoText: e.target.value })}
          />
          <TextField
            size="small"
            label="Logo 副文案"
            placeholder="留空用默认英文名"
            value={theme.logoSubtext ?? ''}
            onChange={(e) => setTheme({ logoSubtext: e.target.value })}
          />
          <TextField
            size="small"
            label="Logo 图片路径"
            placeholder="例如 /images/logo.png（留空用默认院徽）"
            value={theme.logoImage ?? ''}
            onChange={(e) => setTheme({ logoImage: e.target.value })}
          />
          <TextField
            size="small"
            label="页脚说明"
            placeholder="留空用默认版权说明"
            value={theme.footerNote ?? ''}
            onChange={(e) => setTheme({ footerNote: e.target.value })}
            multiline
            minRows={2}
          />
        </Box>
      </Section>

      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
        可配置面版本：{surface ? '已加载' : '未加载'}
      </Typography>
    </Box>
  );
}

/* ==================================================================
   6. 功能开关
   ================================================================== */

function FeaturesTab({
  config,
  mutate,
  featureKeys,
}: {
  config: FrontendConfig;
  mutate: (fn: (d: FrontendConfig) => void) => void;
  featureKeys: string[];
}) {
  const labels: Record<string, string> = {
    carouselAutoplay: '首页焦点轮播自动播放',
    searchEnabled: '全站搜索功能',
    adminEntryVisible: '前台显示「内容发布后台」入口',
  };
  const hints: Record<string, string> = {
    carouselAutoplay: '关闭后轮播仍可手动切换，只是不自动播放。',
    searchEnabled: '关闭后搜索入口与搜索页均不可用。',
    adminEntryVisible: '默认关闭时前台不出现该入口（内部工具不应暴露给访客）。',
  };

  return (
    <Box>
      <Section title="功能开关" hint="每个开关独立生效。未配置的开关沿用前台默认值。">
        {featureKeys.map((k) => (
          <Box
            key={k}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              py: 1.5,
              borderBottom: `1px solid ${tokens.line}`,
              '&:last-of-type': { borderBottom: 0 },
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{labels[k] ?? k}</Typography>
              <Typography sx={{ fontFamily: monoFont, fontSize: '0.6875rem', color: 'text.secondary' }}>
                {k}
              </Typography>
              {hints[k] && (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                  {hints[k]}
                </Typography>
              )}
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={config.features[k] ?? true}
                  onChange={(e) =>
                    mutate((d) => {
                      d.features[k] = e.target.checked;
                    })
                  }
                />
              }
              label={<Typography sx={{ fontSize: '0.8125rem' }}>开启</Typography>}
            />
          </Box>
        ))}
      </Section>
    </Box>
  );
}
