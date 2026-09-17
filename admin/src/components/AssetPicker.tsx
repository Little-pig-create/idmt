import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { api } from '../api';
import { CloseIcon, DeleteIcon, ImageIcon, RefreshIcon, UploadIcon } from '../icons';
import { monoFont, tokens } from '../theme';
import type { Asset } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 选中图片：默认返回要插入的 Markdown 片段；mode='url' 时只返回图片 URL */
  onSelect: (value: string) => void;
  /** 'markdown'（默认，返回 ![alt](url)）| 'url'（只返回 /images/foo.png） */
  mode?: 'markdown' | 'url';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // dataURL 形如 data:image/png;base64,xxxx —— 后端只认逗号之后的部分
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(new Error(`读取文件失败：${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** 去掉扩展名当默认说明文字 */
function altOf(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export default function AssetPicker({ open, onClose, onSelect, mode = 'markdown' }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.assets.list();
      setAssets(res.assets ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploading(true);
      setUploadError(null);
      const failed: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadLabel(`正在上传 ${file.name}（${i + 1}/${files.length}）`);
        try {
          const dataBase64 = await readAsBase64(file);
          await api.assets.upload(file.name, file.type, dataBase64);
        } catch (err) {
          failed.push(`${file.name}：${(err as Error).message}`);
        }
      }

      setUploading(false);
      setUploadLabel('');
      await load();
      if (failed.length) setUploadError(failed.join('\n'));
    },
    [load]
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api.assets.remove(pendingDelete);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }, [load, pendingDelete]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      void uploadFiles(files);
    },
    [uploadFiles]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h4" sx={{ flex: 1 }}>
            图片资源库
          </Typography>
          <Tooltip title="刷新">
            <IconButton size="small" onClick={() => void load()} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="关闭">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            sx={{
              border: `1px dashed ${dragging ? tokens.accent : tokens.lineStrong}`,
              borderRadius: 1,
              bgcolor: dragging ? tokens.accentSoft : tokens.surfaceSubtle,
              px: 2,
              py: 2.5,
              textAlign: 'center',
              transition: 'background-color 120ms',
            }}
          >
            <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
              <Button
                variant="contained"
                size="small"
                startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadIcon fontSize="small" />}
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? '上传中…' : '选择图片'}
              </Button>
              <Typography variant="body2" color="text.secondary">
                或把图片拖到这里
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              支持 PNG / JPEG / GIF / WebP，单个文件不超过 5MB
            </Typography>
            {uploadLabel && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {uploadLabel}
              </Typography>
            )}
          </Box>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void uploadFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />

          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)}>
              <Box component="pre" sx={{ fontFamily: monoFont, whiteSpace: 'pre-wrap', m: 0 }}>
                {uploadError}
              </Box>
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void load()}>
                  重试
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading && assets.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={26} />
            </Box>
          ) : null}

          {!loading && !error && assets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
              <ImageIcon fontSize="large" />
              <Typography variant="body2" sx={{ mt: 1 }}>
                还没有图片，先上传一张吧
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 1.5,
            }}
          >
            {assets.map((asset) => (
              <Box
                key={asset.name}
                onClick={() =>
                  onSelect(mode === 'url' ? asset.url : `![${altOf(asset.name)}](${asset.url})`)
                }
                sx={{
                  border: `1px solid ${tokens.line}`,
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  bgcolor: 'background.paper',
                  '&:hover': { borderColor: tokens.accent, boxShadow: `0 0 0 2px ${tokens.accentSoft}` },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: 104,
                    bgcolor: tokens.surfaceSubtle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    component="img"
                    src={asset.url}
                    alt={asset.name}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(asset.name);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        '&:hover': { bgcolor: '#fff', color: tokens.error },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ p: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', fontFamily: monoFont, wordBreak: 'break-all', lineHeight: 1.4 }}
                  >
                    {asset.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {formatSize(asset.size)} · {formatTime(asset.mtime)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {mode === 'url' ? '点击图片即可选用' : '点击图片即可插入正文'}
        </Typography>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
      </DialogActions>

      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)} maxWidth="xs">
        <DialogTitle>删除图片</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确定要删除 <Box component="span" sx={{ fontFamily: monoFont }}>{pendingDelete}</Box> 吗？
            已引用该图片的正文会显示不出来的图。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} color="inherit" disabled={deleting}>
            取消
          </Button>
          <Button
            onClick={() => void confirmDelete()}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
