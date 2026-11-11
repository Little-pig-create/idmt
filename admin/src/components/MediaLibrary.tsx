import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import { api } from '@/api';
import type { Asset } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/Toast';

const formatSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export default function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => api.assets().then((data) => setAssets(data.assets)).catch(() => setAssets([]));
  useEffect(() => {
    load();
  }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadAsset(file);
      }
      toast(`已上传 ${files.length} 个文件`);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '上传失败', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (name: string) => {
    if (!window.confirm(`删除 ${name}？引用该图片的页面会显示为空。`)) return;
    try {
      await api.deleteAsset(name);
      toast('已删除');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#1f5eff]">MEDIA</p>
          <h1 className="mt-1.5 text-[1.7rem] font-bold tracking-[-0.02em]">媒体库</h1>
          <p className="mt-1 text-[12.5px] text-[#6b7a90]">文件写入 public/images，前台通过 /images/&lt;name&gt; 引用。</p>
        </div>
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-9 gap-1.5 bg-[#0a1424] px-4 text-[12.5px] hover:bg-[#1f5eff]"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
          {uploading ? '上传中' : '上传图片'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
          multiple
          hidden
          onChange={(event) => upload(event.target.files)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.name} className="group overflow-hidden rounded-xl border border-[#dde5f0] bg-white">
            <div className="relative aspect-[4/3] bg-[#f4f6fa]">
              <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(asset.url);
                    toast('已复制图片路径');
                  }}
                  className="grid size-7 place-items-center rounded bg-white/90 text-[#0a1424] hover:bg-white"
                  aria-label="复制路径"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(asset.name)}
                  className="grid size-7 place-items-center rounded bg-white/90 text-[#c33241] hover:bg-white"
                  aria-label="删除"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="px-3 py-2">
              <p className="truncate font-mono text-[10.5px] text-[#0a1424]">{asset.name}</p>
              <p className="mt-0.5 font-mono text-[9.5px] text-[#6b7a90]">{formatSize(asset.size)}</p>
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-[#c3d0e2] bg-white py-20 text-center">
          <UploadCloud className="mx-auto size-8 text-[#c3d0e2]" />
          <p className="mt-3 text-[13px] text-[#6b7a90]">还没有素材。上传后会出现在这里，也可在编辑条目时直接选择。</p>
        </div>
      )}
    </div>
  );
}
