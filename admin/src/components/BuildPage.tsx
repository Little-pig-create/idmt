import { useEffect, useRef, useState } from 'react';
import { Rocket, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { api } from '@/api';
import type { BuildState } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/Toast';

export default function BuildPage() {
  const [build, setBuild] = useState<BuildState | null>(null);
  const [starting, setStarting] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const poll = () => api.build().then((data) => setBuild(data.build)).catch(() => undefined);

  useEffect(() => {
    poll();
  }, []);

  useEffect(() => {
    if (build?.status !== 'running') return;
    const timer = window.setInterval(poll, 1500);
    return () => window.clearInterval(timer);
  }, [build?.status]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [build?.lines.length]);

  const start = async () => {
    setStarting(true);
    try {
      await api.startBuild();
      toast('构建已启动');
      poll();
    } catch (err) {
      toast(err instanceof Error ? err.message : '启动失败', 'error');
    } finally {
      setStarting(false);
    }
  };

  const statusMeta = {
    idle: { label: '尚未构建', color: 'text-[#6b7a90]', icon: Rocket },
    running: { label: '构建中', color: 'text-[#1f5eff]', icon: Loader2 },
    success: { label: '构建成功', color: 'text-[#0f7a55]', icon: CheckCircle2 },
    failed: { label: '构建失败', color: 'text-[#c33241]', icon: XCircle },
  }[build?.status ?? 'idle'];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#1f5eff]">DEPLOY</p>
          <h1 className="mt-1.5 text-[1.7rem] font-bold tracking-[-0.02em]">构建发布</h1>
          <p className="mt-1 text-[12.5px] text-[#6b7a90]">运行 npm run build，产物写入 dist/。构建期间可继续编辑内容。</p>
        </div>
        <div className="flex gap-2">
          <a
            href={import.meta.env.VITE_SITE_URL ?? "http://localhost:4321/idmt/"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dde5f0] bg-white px-3.5 text-[12.5px] text-[#45556d] hover:border-[#c3d0e2]"
          >
            <ExternalLink className="size-3.5" /> 预览站点
          </a>
          <Button
            type="button"
            onClick={start}
            disabled={starting || build?.status === 'running'}
            className="h-9 gap-1.5 bg-[#0a1424] px-4 text-[12.5px] hover:bg-[#1f5eff]"
          >
            {build?.status === 'running' ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
            {build?.status === 'running' ? '构建中' : '开始构建'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#dde5f0] bg-white p-5">
          <p className="text-[11.5px] text-[#6b7a90]">状态</p>
          <p className={`mt-2 flex items-center gap-2 text-[15px] font-semibold ${statusMeta.color}`}>
            <statusMeta.icon className={`size-4 ${build?.status === 'running' ? 'animate-spin' : ''}`} />
            {statusMeta.label}
          </p>
        </div>
        <div className="rounded-xl border border-[#dde5f0] bg-white p-5">
          <p className="text-[11.5px] text-[#6b7a90]">开始时间</p>
          <p className="mt-2 font-mono text-[12px]">{build?.startedAt ? new Date(build.startedAt).toLocaleString('zh-CN', { hour12: false }) : '—'}</p>
        </div>
        <div className="rounded-xl border border-[#dde5f0] bg-white p-5">
          <p className="text-[11.5px] text-[#6b7a90]">耗时</p>
          <p className="mt-2 font-mono text-[12px]">
            {build?.startedAt && build?.finishedAt
              ? `${((new Date(build.finishedAt).getTime() - new Date(build.startedAt).getTime()) / 1000).toFixed(1)} s`
              : '—'}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#1e2f4a] bg-[#050b16]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/40">BUILD LOG</p>
          <span className="font-mono text-[10px] text-white/25">{build?.lines.length ?? 0} 行</span>
        </div>
        <pre ref={logRef} className="h-[420px] overflow-auto p-4 font-mono text-[11.5px] leading-[1.75] text-[#b9c6da]">
          {build?.lines.length ? build.lines.join('\n') : '点击「开始构建」后，日志会实时出现在这里。'}
        </pre>
      </div>
    </div>
  );
}
