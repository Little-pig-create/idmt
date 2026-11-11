import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { ArrowLeft, Save, Loader2, Eye, PencilLine } from 'lucide-react';
import { api } from '@/api';
import type { CollectionSchema } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FieldInput from '@/components/FieldInput';
import { toast } from '@/components/Toast';

interface Props {
  collection: string;
  schema: CollectionSchema;
  id: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_BODY = `## 概述\n\n在此撰写正文，支持 Markdown。\n\n## 详情\n\n- 要点一\n- 要点二\n`;

export default function EntryEditor({ collection, schema, id, onClose, onSaved }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [body, setBody] = useState(DEFAULT_BODY);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('edit');

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.default !== undefined) defaults[field.name] = field.default;
      else if (field.type === 'array') defaults[field.name] = [];
      else if (field.type === 'keyvalue') defaults[field.name] = [];
      else if (field.type === 'boolean') defaults[field.name] = false;
      else defaults[field.name] = '';
    }
    if (!id) {
      setData(defaults);
      return;
    }
    setLoading(true);
    api
      .entry(collection, id)
      .then((response) => {
        setData({ ...defaults, ...response.entry.data });
        setBody(response.entry.body || DEFAULT_BODY);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [collection, id, schema]);

  const title = String(data[schema.fields[0]?.name] ?? '未命名');
  const html = useMemo(() => marked.parse(body, { async: false }) as string, [body]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (id) {
        await api.updateEntry(collection, id, { data, body });
        toast('已保存');
      } else {
        const created = await api.createEntry(collection, { id: slug || undefined, data, body });
        toast(`已创建 ${created.id}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      const details = (err as Error & { details?: string[] }).details;
      setError(details?.join('；') ?? (err instanceof Error ? err.message : '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-[12.5px] text-[#6b7a90] hover:text-[#0a1424]">
          <ArrowLeft className="size-3.5" /> 返回列表
        </button>
        <div className="flex items-center gap-2">
          {!id && (
            <Input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="自定义 ID（留空自动生成）"
              className="h-9 w-[220px] bg-white font-mono text-[11.5px]"
            />
          )}
          <Button type="button" onClick={save} disabled={saving} className="h-9 gap-1.5 bg-[#0a1424] px-4 text-[12.5px] hover:bg-[#1f5eff]">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? '保存中' : '保存'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-[#1f5eff]">{id ? 'EDIT' : 'NEW'} · {collection.toUpperCase()}</p>
          <h1 className="mt-1.5 text-[1.5rem] font-bold tracking-[-0.02em]">{title}</h1>
        </div>
        {id && (
          <p className="font-mono text-[10.5px] text-[#6b7a90]">
            {id}.md · {body.length} 字符
          </p>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-[#fdecee] px-3 py-2 text-[12.5px] text-[#c33241]">{error}</p>}

      {loading ? (
        <p className="mt-10 text-center text-[13px] text-[#6b7a90]">正在加载条目…</p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-xl border border-[#dde5f0] bg-white p-5">
            <p className="mb-4 text-[13px] font-semibold">字段</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {schema.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={data[field.name]}
                  onChange={(value) => setData((prev) => ({ ...prev, [field.name]: value }))}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#dde5f0] bg-white">
            {schema.hasBody ? (
              <Tabs value={tab} onValueChange={setTab} className="gap-0">
                <div className="flex items-center justify-between border-b border-[#eaeff6] px-4 py-3">
                  <p className="text-[13px] font-semibold">正文（Markdown）</p>
                  <TabsList className="h-7 bg-[#f4f6fa] p-0.5">
                    <TabsTrigger value="edit" className="h-6 gap-1 px-2.5 text-[11px]">
                      <PencilLine className="size-3" /> 编辑
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="h-6 gap-1 px-2.5 text-[11px]">
                      <Eye className="size-3" /> 预览
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="edit" className="mt-0">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    spellCheck={false}
                    className="h-[520px] w-full resize-none bg-white p-4 font-mono text-[12.5px] leading-[1.9] text-[#0a1424] outline-none"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-0">
                  <div className="md-preview h-[520px] overflow-y-auto p-5" dangerouslySetInnerHTML={{ __html: html }} />
                </TabsContent>
              </Tabs>
            ) : (
              <p className="p-6 text-[12.5px] text-[#6b7a90]">该集合没有正文。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
