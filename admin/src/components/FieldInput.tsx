import type { Field } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import ImagePicker from '@/components/ImagePicker';

interface Props {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}

const toText = (value: unknown) => (value === undefined || value === null ? '' : String(value));

export default function FieldInput({ field, value, onChange }: Props) {
  const control = () => {
    switch (field.type) {
      case 'text':
        return (
          <Textarea
            value={toText(value)}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            className="bg-white text-[13px] leading-relaxed"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={toText(value)}
            onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
            className="h-9 bg-white"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={toText(value).slice(0, 10)}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 bg-white"
          />
        );
      case 'boolean':
        return (
          <div className="flex h-9 items-center">
            <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
            <span className="ml-2.5 text-[12px] text-[#6b7a90]">{value ? '开启' : '关闭'}</span>
          </div>
        );
      case 'enum':
        return (
          <Select value={toText(value)} onValueChange={onChange}>
            <SelectTrigger className="h-9 w-full bg-white text-[13px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'image':
        return <ImagePicker value={toText(value)} onChange={onChange} />;
      case 'array':
        return (
          <div>
            <Textarea
              value={Array.isArray(value) ? value.join('\n') : toText(value)}
              onChange={(event) =>
                onChange(
                  event.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
              rows={Math.min(8, Math.max(3, (Array.isArray(value) ? value.length : 1) + 1))}
              placeholder="每行一项"
              className="bg-white font-mono text-[12px] leading-relaxed"
            />
            <p className="mt-1 text-[10.5px] text-[#6b7a90]">每行一项，保存时转为 YAML 数组。</p>
          </div>
        );
      case 'keyvalue': {
        const rows = Array.isArray(value) ? (value as { label: string; value: string }[]) : [];
        return (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={row.label}
                  placeholder="指标名"
                  onChange={(event) => {
                    const next = rows.map((item, i) => (i === index ? { ...item, label: event.target.value } : item));
                    onChange(next);
                  }}
                  className="h-9 w-[42%] bg-white text-[12.5px]"
                />
                <Input
                  value={row.value}
                  placeholder="数值"
                  onChange={(event) => {
                    const next = rows.map((item, i) => (i === index ? { ...item, value: event.target.value } : item));
                    onChange(next);
                  }}
                  className="h-9 flex-1 bg-white text-[12.5px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  aria-label="删除这一行"
                >
                  <Trash2 className="size-3.5 text-[#c33241]" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => onChange([...rows, { label: '', value: '' }])}
            >
              <Plus className="size-3.5" /> 添加一行
            </Button>
          </div>
        );
      }
      default:
        return (
          <Input
            value={toText(value)}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 bg-white text-[13px]"
          />
        );
    }
  };

  return (
    <div className={field.type === 'text' || field.type === 'array' || field.type === 'keyvalue' ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12px] font-medium text-[#45556d]">{field.label}</span>
        {field.required && <span className="text-[10px] text-[#c33241]">必填</span>}
        <span className="ml-auto font-mono text-[9.5px] text-[#c3d0e2]">{field.name}</span>
      </label>
      {control()}
    </div>
  );
}
