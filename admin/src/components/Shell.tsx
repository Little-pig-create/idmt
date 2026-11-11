import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Compass,
  Box,
  FlaskConical,
  Newspaper,
  Image as ImageIcon,
  Settings,
  Rocket,
  LogOut,
  Menu,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CollectionName } from '@/types';

const COLLECTION_META: { key: CollectionName; label: string; icon: typeof Compass }[] = [
  { key: 'research', label: '研究方向', icon: Compass },
  { key: 'products', label: '产品与方案', icon: Box },
  { key: 'labs', label: '技术平台', icon: FlaskConical },
  { key: 'news', label: '新闻动态', icon: Newspaper },
];

interface Props {
  route: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

function SidebarContent({ route, onNavigate, onLogout }: Omit<Props, 'children'>) {
  const item = (path: string, label: string, Icon: typeof Compass, badge?: number) => {
    const active = route === path || (path !== '/dashboard' && route.startsWith(path));
    return (
      <button
        key={path}
        type="button"
        onClick={() => onNavigate(path)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
          active ? 'bg-white/[0.09] text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white/90',
        )}
      >
        <Icon className={cn('size-4', active ? 'text-[#20c9b4]' : 'text-white/35 group-hover:text-white/70')} />
        <span className="flex-1">{label}</span>
        {typeof badge === 'number' && <span className="font-mono text-[10px] text-white/25">{badge}</span>}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#050b16]">
      <div className="px-4 py-5">
        <img
          src={LOGO}
          alt="数字管理技术研究院"
          className="h-7 w-auto"
        />
        <p className="mt-2.5 font-mono text-[8px] tracking-[0.24em] text-white/35">CONTENT CONSOLE</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {item('/dashboard', '仪表盘', LayoutDashboard)}
        </div>

        <div>
          <p className="px-3 pb-2 font-mono text-[8.5px] tracking-[0.2em] text-white/25">CONTENT</p>
          <div className="space-y-0.5">
            {COLLECTION_META.map((meta) => item(`/c/${meta.key}`, meta.label, meta.icon))}
          </div>
        </div>

        <div>
          <p className="px-3 pb-2 font-mono text-[8.5px] tracking-[0.2em] text-white/25">SYSTEM</p>
          <div className="space-y-0.5">
            {item('/media', '媒体库', ImageIcon)}
            {item('/build', '构建发布', Rocket)}
            {item('/settings', '站点设置', Settings)}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <a
          href={import.meta.env.VITE_SITE_URL ?? "http://localhost:4321/idmt/"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-white/45 hover:bg-white/5 hover:text-white/80"
        >
          <ExternalLink className="size-3.5" /> 查看前台
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-white/45 hover:bg-white/5 hover:text-white/80"
        >
          <LogOut className="size-3.5" /> 退出登录
        </button>
      </div>
    </div>
  );
}

const LOGO = `${import.meta.env.BASE_URL}brand/logo-idmt-reversed.webp`;

export default function Shell({ route, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const title =
    route === '/dashboard'
      ? '仪表盘'
      : route === '/media'
        ? '媒体库'
        : route === '/build'
          ? '构建发布'
          : route === '/settings'
            ? '站点设置'
            : COLLECTION_META.find((meta) => route.startsWith(`/c/${meta.key}`))?.label ?? '内容后台';

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-[228px] lg:block">
        <SidebarContent route={route} onNavigate={onNavigate} onLogout={onLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[248px]">
            <SidebarContent route={route} onNavigate={(p) => { setMobileOpen(false); onNavigate(p); }} onLogout={onLogout} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-white/50"
              aria-label="关闭菜单"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[228px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-4 border-b border-[#dde5f0] bg-white/85 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="打开菜单">
              <Menu className="size-5 text-[#45556d]" />
            </button>
            <div className="flex items-center gap-2 text-[12.5px] text-[#6b7a90]">
              <span className="font-mono text-[10px] tracking-[0.14em]">IDMT</span>
              <span className="text-[#c3d0e2]">/</span>
              <span className="font-medium text-[#0a1424]">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-[#e6f7f0] px-2.5 py-1 text-[11px] text-[#0f7a55] sm:flex">
              <span className="size-1.5 rounded-full bg-[#0f7a55]" /> 已登录
            </span>
            <div className="grid size-8 place-items-center rounded-full bg-[#0a1424] text-[11px] font-semibold text-white">A</div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
