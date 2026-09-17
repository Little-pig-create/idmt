import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { AddIcon, PublishIcon, RefreshIcon } from './icons';
import EntryTable from './components/EntryTable';
import EntryEditor from './components/EntryEditor';
import { api } from './api';
import { monoFont, tokens } from './theme';
import type { CollectionMap, Entry, Stats } from './types';

const DRAWER_WIDTH = 248;

export default function App() {
  const [schema, setSchema] = useState<CollectionMap | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [collection, setCollection] = useState<string>('news');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ ok: boolean; output: string } | null>(null);

  const [keyword, setKeyword] = useState('');

  /* ---------- 初始化 ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [s, st] = await Promise.all([api.schema(), api.stats()]);
        setSchema(s.collections);
        setStats(st.stats);
        const first = Object.keys(s.collections)[0];
        if (first) setCollection((prev) => (s.collections[prev] ? prev : first));
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- 加载条目 ---------- */
  const loadEntries = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const res = await api.list(name);
      setEntries(res.entries);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (schema) void loadEntries(collection);
  }, [collection, schema, loadEntries]);

  const refreshStats = useCallback(async () => {
    try {
      const st = await api.stats();
      setStats(st.stats);
    } catch {
      /* 统计失败不阻塞主流程 */
    }
  }, []);

  /* ---------- 删除 ---------- */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.remove(collection, deleteTarget.id);
      setSnack({ msg: `已删除 ${deleteTarget.id}`, severity: 'success' });
      setDeleteTarget(null);
      await loadEntries(collection);
      await refreshStats();
    } catch (err) {
      setSnack({ msg: (err as Error).message, severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- 发布 ---------- */
  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await api.build();
      setBuildResult({ ok: res.code === 0, output: res.output });
      setSnack({
        msg: res.code === 0 ? '站点已重新构建' : '构建失败，请查看日志',
        severity: res.code === 0 ? 'success' : 'error',
      });
    } catch (err) {
      setBuildResult({ ok: false, output: (err as Error).message });
      setSnack({ msg: (err as Error).message, severity: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const visibleEntries = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return entries;
    return entries.filter((e) =>
      `${e.id} ${JSON.stringify(e.data)}`.toLowerCase().includes(k)
    );
  }, [entries, keyword]);

  const currentSchema = schema?.[collection];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ---------- 顶栏 ---------- */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            sx={{
              fontFamily: tokens.fontSerif,
              fontWeight: 600,
              fontSize: '1.0625rem',
              whiteSpace: 'nowrap',
            }}
          >
            内容发布后台
          </Typography>
          <Typography
            sx={{ fontFamily: monoFont, fontSize: '0.6875rem', color: 'text.secondary', letterSpacing: '0.1em' }}
          >
            数字管理研究院
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="重新读取内容目录">
            <IconButton onClick={() => void loadEntries(collection)} aria-label="刷新">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={building ? <CircularProgress size={16} color="inherit" /> : <PublishIcon fontSize="small" />}
            onClick={handleBuild}
            disabled={building}
          >
            {building ? '构建中…' : '发布站点'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* ---------- 侧栏 ---------- */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflowY: 'auto', py: 2 }}>
          <Typography
            sx={{
              px: 2.5,
              pb: 1,
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            内容集合
          </Typography>
          <List dense disablePadding>
            {schema &&
              Object.entries(schema).map(([name, def]) => (
                <ListItemButton
                  key={name}
                  selected={name === collection}
                  onClick={() => {
                    setCollection(name);
                    setKeyword('');
                  }}
                  sx={{ mx: 1, borderRadius: 1, mb: 0.25 }}
                >
                  <ListItemText
                    primary={def.label}
                    secondary={name}
                    slotProps={{
                      primary: { fontSize: '0.875rem', fontWeight: 500 },
                      secondary: { fontSize: '0.6875rem', fontFamily: monoFont },
                    }}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={stats[name]?.total ?? 0}
                    sx={{ height: 20, fontSize: '0.6875rem' }}
                  />
                </ListItemButton>
              ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ px: 2.5 }}>
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', lineHeight: 1.7 }}>
              内容以 MDX 文件形式保存在
              <Box component="code" sx={{ fontFamily: monoFont, display: 'block', mt: 0.5 }}>
                src/content/
              </Box>
              保存后点击「发布站点」重新构建。
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* ---------- 主区域 ---------- */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Toolbar />

        <Box sx={{ px: 3, py: 2.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h2" sx={{ mr: 'auto' }}>
              {currentSchema?.label ?? '内容'}
            </Typography>

            <TextField
              placeholder="搜索条目…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              sx={{ width: 240 }}
            />

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={!currentSchema}
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              新建
            </Button>
          </Box>

          {loadError && <Alert severity="error">{loadError}</Alert>}

          <Box
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              border: `1px solid ${tokens.line}`,
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading || !currentSchema ? (
              <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: 320 }}>
                <CircularProgress size={28} />
              </Box>
            ) : visibleEntries.length === 0 ? (
              <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: 320, px: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    {keyword ? '没有匹配的条目' : `还没有${currentSchema.label}内容`}
                  </Typography>
                  <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                    {keyword ? '试试更短的关键词。' : '点击右上角「新建」创建第一条内容。'}
                  </Typography>
                  {keyword && (
                    <Button sx={{ mt: 2 }} onClick={() => setKeyword('')}>
                      清除搜索
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <EntryTable
                schema={currentSchema}
                collection={collection}
                entries={visibleEntries}
                onEdit={(entry) => {
                  setEditing(entry);
                  setEditorOpen(true);
                }}
                onDelete={(entry) => setDeleteTarget(entry)}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* ---------- 编辑器 ---------- */}
      {editorOpen && currentSchema && (
        <EntryEditor
          collection={collection}
          schema={currentSchema}
          entry={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            void loadEntries(collection);
            void refreshStats();
            setSnack({ msg: '内容已保存到 src/content', severity: 'success' });
          }}
        />
      )}

      {/* ---------- 删除确认 ---------- */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>确认删除？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            将删除文件
            <Box component="code" sx={{ fontFamily: monoFont, mx: 0.5 }}>
              src/content/{collection}/{deleteTarget?.id}.md
            </Box>
            。此操作不可撤销，站点需要重新构建后才会生效。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            取消
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? '删除中…' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------- 构建日志 ---------- */}
      <Dialog
        open={Boolean(buildResult)}
        onClose={() => setBuildResult(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{buildResult?.ok ? '站点构建成功' : '站点构建失败'}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              m: 0,
              fontFamily: monoFont,
              fontSize: '0.75rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: buildResult?.ok ? 'text.primary' : 'error.main',
            }}
          >
            {buildResult?.output}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuildResult(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
