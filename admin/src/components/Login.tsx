import { useState } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LockKeyhole, ArrowRight, ShieldCheck } from 'lucide-react';

const LOGO = `${import.meta.env.BASE_URL}brand/logo-idmt-reversed.webp`;

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#050b16] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_20%,rgba(31,94,255,.35),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="relative">
          <div>
            <img
              src={LOGO}
              alt="数字管理技术研究院"
              className="h-12 w-auto"
            />
            <p className="mt-3 font-mono text-[9px] tracking-[0.22em] text-white/40">IDMT · CONTENT CONSOLE</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[#20c9b4]">INSTITUTIONAL CMS</p>
          <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.18] tracking-[-0.03em]">
            内容发布<br />从一句话开始
          </h1>
          <p className="mt-5 text-[14px] leading-relaxed text-white/55">
            后台直接读写 Markdown 内容源，保存即落盘；构建与发布在同一个界面完成。
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-white/35">
          <ShieldCheck className="size-3.5" />
          HttpOnly 会话 · 内容文件为唯一数据源
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#f4f6fa] p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex size-11 items-center justify-center rounded-xl border border-[#dde5f0] bg-white">
            <LockKeyhole className="size-5 text-[#1f5eff]" />
          </div>
          <h2 className="text-[1.6rem] font-bold tracking-[-0.02em] text-[#0a1424]">登录内容后台</h2>
          <p className="mt-2 text-[13px] text-[#6b7a90]">请输入管理员密码。首次部署请通过 ADMIN_PASSWORD 设置。</p>

          <div className="mt-7 space-y-2">
            <Label htmlFor="password" className="text-[12.5px] text-[#45556d]">
              管理员密码
            </Label>
            <Input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 bg-white"
            />
          </div>

          {error && <p className="mt-3 rounded-lg bg-[#fdecee] px-3 py-2 text-[12.5px] text-[#c33241]">{error}</p>}

          <Button type="submit" disabled={loading || !password} className="mt-5 h-11 w-full gap-2 bg-[#0a1424] text-white hover:bg-[#1f5eff]">
            {loading ? '正在验证…' : '进入后台'}
            <ArrowRight className="size-4" />
          </Button>

          <p className="mt-6 text-center text-[11px] text-[#6b7a90]">忘记密码请联系系统管理员重置。</p>
        </form>
      </div>
    </div>
  );
}
