import { useEffect, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { api } from '@/api';
import type { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function ImagePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (!open) return;
    api.assets().then((data) => setAssets(data.assets)).catch(() => setAssets([]));
  }, [open]);

  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/images/example.webp" className="h-9 bg-white font-mono text-[12px]" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
            <ImageIcon className="size-3.5" /> 选择
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>从媒体库选择</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
            {assets.map((asset) => (
              <button
                key={asset.name}
                type="button"
                onClick={() => {
                  onChange(asset.url);
                  setOpen(false);
                }}
                className="group overflow-hidden rounded-lg border border-[#dde5f0] text-left hover:border-[#1f5eff]"
              >
                <img src={asset.url} alt={asset.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <span className="block truncate px-2 py-1.5 font-mono text-[9.5px] text-[#6b7a90]">{asset.name}</span>
              </button>
            ))}
          </div>
          {assets.length === 0 && <p className="py-10 text-center text-[12.5px] text-[#6b7a90]">媒体库为空，请先在「媒体库」上传。</p>}
        </DialogContent>
      </Dialog>
      {value && (
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange('')} aria-label="清除图片">
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
