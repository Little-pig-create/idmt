import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import { DeleteIcon, EditIcon } from '../icons';
import { monoFont } from '../theme';
import type { CollectionSchema, Entry } from '../types';

interface Props {
  schema: CollectionSchema;
  collection: string;
  entries: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

type SortKey = 'id' | 'title' | 'meta' | 'status' | 'updatedAt';

function primaryFieldOf(schema: CollectionSchema) {
  return schema.fields.find((f) => f.name === 'title' || f.name === 'name')?.name ?? 'title';
}

function secondaryOf(collection: string, data: Record<string, unknown>): string {
  switch (collection) {
    case 'publications':
      return [data.venue, data.year].filter(Boolean).join(' · ');
    case 'people':
      return String(data.title ?? '');
    case 'events':
      return String(data.location ?? '');
    case 'projects':
      return [data.funder, data.period].filter(Boolean).join(' · ');
    case 'research':
      return data.lead ? `负责人：${data.lead}` : '';
    case 'notices':
      return String(data.category ?? '');
    case 'news':
      return String(data.author ?? '');
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Row {
  entry: Entry;
  title: string;
  meta: string;
  status: 'draft' | 'published';
}

const COLUMNS: { key: SortKey; label: string; width?: number; align?: 'right' }[] = [
  { key: 'title', label: '标题' },
  { key: 'meta', label: '补充信息', width: 220 },
  { key: 'status', label: '状态', width: 100 },
  { key: 'updatedAt', label: '更新时间', width: 150 },
];

export default function EntryTable({ schema, collection, entries, onEdit, onDelete }: Props) {
  const primary = primaryFieldOf(schema);
  const [orderBy, setOrderBy] = useState<SortKey>('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo<Row[]>(
    () =>
      entries.map((entry) => ({
        entry,
        title: String(entry.data[primary] ?? '(无标题)'),
        meta: secondaryOf(collection, entry.data),
        status: entry.data.draft === true ? 'draft' : 'published',
      })),
    [entries, primary, collection]
  );

  const sorted = useMemo(() => {
    const pick = (row: Row): string | number => {
      switch (orderBy) {
        case 'title':
          return row.title;
        case 'meta':
          return row.meta;
        case 'status':
          return row.status;
        case 'updatedAt':
          return row.entry.updatedAt;
        default:
          return row.entry.id;
      }
    };
    const dir = order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = pick(a);
      const vb = pick(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'zh-CN') * dir;
    });
  }, [rows, orderBy, order]);

  const toggleSort = (key: SortKey) => {
    if (key === orderBy) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(key);
      setOrder(key === 'title' ? 'asc' : 'desc');
    }
  };

  return (
    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{ width: 200 }}
              sortDirection={orderBy === 'id' ? order : false}
            >
              <TableSortLabel
                active={orderBy === 'id'}
                direction={orderBy === 'id' ? order : 'asc'}
                onClick={() => toggleSort('id')}
              >
                ID
              </TableSortLabel>
            </TableCell>
            {COLUMNS.map((col) => (
              <TableCell
                key={col.key}
                sx={col.width ? { width: col.width } : undefined}
                sortDirection={orderBy === col.key ? order : false}
              >
                <TableSortLabel
                  active={orderBy === col.key}
                  direction={orderBy === col.key ? order : 'asc'}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.key === 'title'
                    ? schema.fields.find((f) => f.name === primary)?.label ?? '标题'
                    : col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ width: 96 }}>
              操作
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.entry.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ fontFamily: monoFont, fontSize: '0.75rem', color: 'text.secondary' }}>
                {row.entry.id}
              </TableCell>

              <TableCell sx={{ maxWidth: 420 }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.title}
                </Typography>
                {row.entry.broken && (
                  <Typography sx={{ fontSize: '0.6875rem', color: 'error.main' }}>
                    前置元数据解析失败：{row.entry.error ?? '未知原因'}
                  </Typography>
                )}
              </TableCell>

              <TableCell
                sx={{
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.meta || '—'}
              </TableCell>

              <TableCell>
                {row.status === 'draft' ? (
                  <Chip label="草稿" size="small" color="warning" variant="outlined" />
                ) : (
                  <Chip label="已发布" size="small" color="success" variant="outlined" />
                )}
              </TableCell>

              <TableCell sx={{ fontFamily: monoFont, fontSize: '0.75rem', color: 'text.secondary' }}>
                {formatDate(row.entry.updatedAt)}
              </TableCell>

              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => onEdit(row.entry)} aria-label="编辑">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(row.entry)}
                      aria-label="删除"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
