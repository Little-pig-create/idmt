import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/Toast';

const FIELDS: { key: string; label: string; type?: 'text' | 'textarea'; help?: string }[] = [
  { key: 'name', label: '机构名称' },
  { key: 'nameEn', label: '英文名称' },
  { key: 'shortName', label: '英文缩写' },
  { key: 'tagline', label: '一句话定位' },
  { key: 'description', label: '站点描述', type: 'textarea', help: '用于 SEO description 与页脚' },
  { key: 'email', label: '联系邮箱' },
  { key: 'phone', label: '联系电话' },
  { key: 'address', label: '地址' },
  { key: 'postcode', label: '邮编' },
  { key: 'founded', label: '成立年份' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .settings()
      .then((data) => setSettings(data.settings))
      .catch(() => toast('读取设置失败', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSettings(settings);
      toast('站点设置已保存，重新构建后生效');
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#1f5eff]">SETTINGS</p>
          <h1 className="mt-1.5 text-[1.7rem] font-bold tracking-[-0.02em]">站点设置</h1>
          <p className="mt-1 text-[12.5px] text-[#6b7a90]">写入 src/data/site-settings.json，前台构建时读取。</p>
        </div>
        <Button type="button" onClick={save} disabled={saving || loading} className="h-9 gap-1.5 bg-[#0a1424] px-4 text-[12.5px] hover:bg-[#1f5eff]">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          保存
        </Button>
      </div>

      <div className="mt-6 space-y-5 rounded-xl border border-[#dde5f0] bg-white p-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-[#45556d]">{field.label}</span>
              <span className="font-mono text-[9.5px] text-[#c3d0e2]">{field.key}</span>
            </label>
            {field.type === 'textarea' ? (
              <Textarea
                value={settings[field.key] ?? ''}
                onChange={(event) => setSettings((prev) => ({ ...prev, [field.key]: event.target.value }))}
                rows={3}
                className="bg-white text-[13px] leading-relaxed"
              />
            ) : (
              <Input
                value={settings[field.key] ?? ''}
                onChange={(event) => setSettings((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className="h-9 bg-white text-[13px]"
              />
            )}
            {field.help && <p className="mt-1 text-[10.5px] text-[#6b7a90]">{field.help}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
