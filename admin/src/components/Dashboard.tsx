import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowUpRight, FileText, FileEdit, Images, Rocket, Plus } from 'lucide-react';
import { api } from '@/api';
import type { CollectionSchema, Stats } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const LABELS: Record<string, string> = {
  research: '研究方向',
  products: '产品',
  labs: '技术平台',
  news: '新闻',
};

export default function Dashboard({
  onNavigate,
  schema,
}: {
  onNavigate: (path: string) => void;
  schema: Record<string, CollectionSchema> | null;
}) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  const chartData = stats
    ? Object.entries(stats.counts).map(([key, value]) => ({ name: LABELS[key] ?? key, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#1f5eff]">OVERVIEW</p>
          <h1 className="mt-2 text-[1.7rem] font-bold tracking-[-0.02em]">内容概览</h1>
          <p className="mt-1 text-[13px] text-[#6b7a90]">所有数字来自 src/content 下的 Markdown 文件，实时读取。</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/c/news')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0a1424] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#1f5eff]"
          >
            <Plus className="size-3.5" /> 写一篇新闻
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/build')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dde5f0] bg-white px-3.5 text-[12.5px] font-medium text-[#45556d] hover:border-[#c3d0e2]"
          >
            <Rocket className="size-3.5" /> 发布站点
          </button>
        </div>
      </div>

      {stats?.defaultPassword && (
        <div className="rounded-xl border border-[#f0d9a8] bg-[#fff8e8] px-4 py-3 text-[12.5px] text-[#8a5a06]">
          正在使用默认密码 <code className="font-mono">idmt-admin</code>。请设置环境变量 <code className="font-mono">ADMIN_PASSWORD</code> 后重启服务。
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '内容条目', value: stats?.total, icon: FileText, hint: '全部集合' },
          { label: '草稿', value: stats?.drafts, icon: FileEdit, hint: '未发布' },
          { label: '媒体素材', value: stats?.assets, icon: Images, hint: 'public/images' },
          {
            label: '最近构建',
            value:
              stats?.build.status === 'running'
                ? '进行中'
                : stats?.build.status === 'success'
                  ? '成功'
                  : stats?.build.status === 'failed'
                    ? '失败'
                    : stats?.build.status === 'idle'
                      ? '未构建'
                      : '—',
            icon: Rocket,
            hint: stats?.build.finishedAt ? new Date(stats.build.finishedAt).toLocaleString('zh-CN') : '尚未构建',
            isText: true,
          },
        ].map((card) => (
          <Card key={card.label} className="border-[#dde5f0] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-[#6b7a90]">{card.label}</p>
              <card.icon className="size-4 text-[#c3d0e2]" />
            </div>
            {stats ? (
              card.isText ? (
                <p className="mt-3 text-[1.5rem] font-bold capitalize tracking-[-0.02em]">{card.value}</p>
              ) : (
                <p className="mt-3 text-[2rem] font-bold leading-none tracking-[-0.03em]">{card.value}</p>
              )
            ) : (
              <Skeleton className="mt-3 h-8 w-16" />
            )}
            <p className="mt-2 text-[11px] text-[#6b7a90]">{card.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-[#dde5f0] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">各集合条目数</p>
              <p className="mt-0.5 text-[11.5px] text-[#6b7a90]">含草稿</p>
            </div>
            <Badge variant="secondary" className="font-normal">Markdown</Badge>
          </div>
          <div className="mt-4 h-[240px]">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaeff6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7a90' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7a90' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #dde5f0', fontSize: 12 }}
                    cursor={{ fill: '#f4f6fa' }}
                  />
                  <Bar dataKey="value" name="条目" fill="#1f5eff" radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Card>

        <Card className="border-[#dde5f0] p-5 shadow-none">
          <p className="text-[13px] font-semibold">快捷入口</p>
          <div className="mt-3 divide-y divide-[#eaeff6]">
            {[
              { label: '研究方向', path: '/c/research' },
              { label: '产品与方案', path: '/c/products' },
              { label: '新闻动态', path: '/c/news' },
              { label: '媒体库', path: '/media' },
              { label: '站点设置', path: '/settings' },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className="group flex w-full items-center justify-between py-2.5 text-left text-[12.5px] text-[#45556d] hover:text-[#1f5eff]"
              >
                {item.label}
                <ArrowUpRight className="size-3.5 text-[#c3d0e2] group-hover:text-[#1f5eff]" />
              </button>
            ))}
          </div>

          {schema && (
            <div className="mt-4 rounded-lg bg-[#f4f6fa] p-3 text-[11.5px] leading-relaxed text-[#6b7a90]">
              当前共 {Object.keys(schema).length} 个内容集合。字段规则与站点构建期校验保持一致。
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
