import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SchemaForm from './SchemaForm';
import MarkdownEditor from './MarkdownEditor';
import { api } from '../api';
import { monoFont } from '../theme';
import type { CollectionSchema, Entry, ValidationError } from '../types';

interface Props {
  collection: string;
  schema: CollectionSchema;
  /** null 表示新建 */
  entry: Entry | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EntryEditor({ collection, schema, entry, onClose, onSaved }: Props) {
  const isCreate = entry === null;

  const [id, setId] = useState(entry?.id ?? '');
  const [data, setData] = useState<Record<string, unknown>>(() => {
    if (entry) return { ...entry.data };
    const initial: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.default !== undefined) initial[field.name] = field.default;
      else if (field.type === 'array') initial[field.name] = [];
    }
    return initial;
  });
  const [body, setBody] = useState(entry?.body?.trim() ?? '');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    setMessage(null);

    try {
      if (isCreate) {
        await api.create(collection, id, data, body);
      } else {
        await api.update(collection, entry!.id, data, body);
      }
      onSaved();
      onClose();
    } catch (err) {
      const e = err as Error & { details?: ValidationError[] };
      if (e.details?.length) {
        setErrors(e.details);
        setMessage('保存失败：有字段未通过校验');
      } else {
        setMessage(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        {isCreate ? `新建${schema.label}` : `编辑${schema.label}`}
        {!isCreate && (
          <Typography
            component="span"
            sx={{ ml: 1.5, fontFamily: monoFont, fontSize: '0.8125rem', color: 'text.secondary' }}
          >
            {entry!.file}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <Stack spacing={2}>
          {isCreate && (
            <TextField
              label="条目 ID（文件名，英文/数字/连字符）*"
              value={id}
              onChange={(e) => setId(e.target.value.trim())}
              helperText="写入 src/content 时的文件名，例如 2026-new-seminar"
              slotProps={{ htmlInput: { style: { fontFamily: monoFont } } }}
            />
          )}

          <SchemaForm
            schema={schema}
            values={data}
            errors={errors}
            onChange={(name, value) => setData((prev) => ({ ...prev, [name]: value }))}
          />

          {schema.hasBody && (
            <Box sx={{ mt: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h4" sx={{ mb: 1.5 }}>
                正文（Markdown / MDX）
              </Typography>

              <MarkdownEditor
                value={body}
                onChange={setBody}
                minRows={14}
                placeholder="支持标准 Markdown：## 标题、**粗体**、- 列表、> 引用。点工具栏的「图片」按钮插入已上传的图片。"
              />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || (isCreate && id.length === 0)}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? '保存中…' : isCreate ? '创建' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
