import { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Plus, Search, Trash2, Pencil, ArrowUpDown } from 'lucide-react';
import { api } from '@/api';
import type { CollectionSchema, Entry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EntryEditor from '@/components/EntryEditor';
import { toast } from '@/components/Toast';

interface Props {
  collection: string;
  schema: CollectionSchema;
}

export default function EntriesPage({ collection, schema }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const load = () => {
    setLoading(true);
    api
      .entries(collection)
      .then((data) => setEntries(data.entries))
      .catch((err) => toast(err instanceof Error ? err.message : '加载失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [collection]);

  const titleField = schema.fields.find((field) => ['title', 'name'].includes(field.name)) ?? schema.fields[0];
  const columnHelper = createColumnHelper<Entry>();

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => String(row[titleField?.name] ?? ''), {
        id: 'title',
        header: '标题',
        cell: (info) => (
          <div>
            <p className="text-[13px] font-medium text-[#0a1424]">{info.getValue()}</p>
            <p className="mt-0.5 font-mono text-[10px] text-[#6b7a90]">{info.row.original.id}</p>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.draft, {
        id: 'draft',
        header: '状态',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="outline" className="border-[#f0d9a8] bg-[#fff8e8] text-[10.5px] font-normal text-[#8a5a06]">
              草稿
            </Badge>
          ) : (
            <Badge variant="outline" className="border-[#c9e9dc] bg-[#e6f7f0] text-[10.5px] font-normal text-[#0f7a55]">
              已发布
            </Badge>
          ),
      }),
      columnHelper.accessor((row) => row._updatedAt ?? '', {
        id: 'updated',
        header: '更新时间',
        cell: (info) => (
          <span className="font-mono text-[10.5px] text-[#6b7a90]">
            {info.getValue() ? new Date(info.getValue()).toLocaleString('zh-CN', { hour12: false }) : '—'}
          </span>
        ),
      }),
    ],
    [columnHelper, titleField],
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.deleteEntry(collection, deleting.id);
      toast(`已删除 ${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  if (editing) {
    return (
      <EntryEditor
        collection={collection}
        schema={schema}
        id={editing.id}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#1f5eff]">CONTENT / {collection.toUpperCase()}</p>
          <h1 className="mt-1.5 text-[1.7rem] font-bold tracking-[-0.02em]">{schema.label}</h1>
          <p className="mt-1 text-[12.5px] text-[#6b7a90]">
            {schema.description} · 共 {entries.length} 条
          </p>
        </div>
        <Button type="button" onClick={() => setEditing({ id: null })} className="h-9 gap-1.5 bg-[#0a1424] px-4 text-[12.5px] hover:bg-[#1f5eff]">
          <Plus className="size-3.5" /> 新建
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-[#dde5f0] bg-white">
        <div className="flex items-center gap-2 border-b border-[#eaeff6] p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#c3d0e2]" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="搜索标题或 ID"
              className="h-9 border-0 bg-[#f4f6fa] pl-8 text-[12.5px] shadow-none focus-visible:ring-0"
            />
          </div>
          <span className="font-mono text-[10.5px] text-[#6b7a90]">{table.getFilteredRowModel().rows.length} 条</span>
        </div>

        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-[#eaeff6]">
                {group.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6b7a90] hover:text-[#0a1424]"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown className="size-3 opacity-40" />
                    </button>
                  </th>
                ))}
                <th className="w-[100px] px-4 py-2.5" />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-[#f1f5fa] last:border-0 hover:bg-[#fafcff]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: row.original.id })}
                      className="grid size-7 place-items-center rounded text-[#6b7a90] hover:bg-[#e8eefc] hover:text-[#1f5eff]"
                      aria-label="编辑"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(row.original)}
                      className="grid size-7 place-items-center rounded text-[#6b7a90] hover:bg-[#fdecee] hover:text-[#c33241]"
                      aria-label="删除"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && table.getRowModel().rows.length === 0 && (
          <p className="py-14 text-center text-[12.5px] text-[#6b7a90]">没有匹配的条目。</p>
        )}
        {loading && <p className="py-14 text-center text-[12.5px] text-[#6b7a90]">正在读取内容…</p>}
      </div>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除条目</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] leading-relaxed text-[#45556d]">
            将删除 <code className="font-mono text-[12px]">{deleting?.id}.md</code>，此操作不可撤销。建议先构建一次备份产物。
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>取消</Button>
            <Button type="button" onClick={confirmDelete} className="bg-[#c33241] text-white hover:bg-[#a82836]">确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
