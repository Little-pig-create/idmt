import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { NavItem } from '@/data/nav';

export default function MobileNav({ items, joinHref }: { items: NavItem[]; joinHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
          aria-label="打开导航菜单"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-sm border-white/10 bg-night p-0 text-white">
        <SheetTitle className="sr-only">站点导航</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <span className="font-mono text-[11px] tracking-[0.24em] text-white/50">IDMT / NAVIGATION</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="关闭导航菜单"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="移动端导航">
            {items.map((item) => (
              <div key={item.id} className="py-1">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/90 hover:bg-white/[0.06]"
                >
                  {item.label}
                  <span className="font-mono text-[10px] text-white/30">{item.children ? `${item.children.length}` : '→'}</span>
                </a>
                {item.children && (
                  <div className="mt-1 mb-2 space-y-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child) => (
                      <a
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-1.5 text-[13px] text-white/55 hover:bg-white/[0.05] hover:text-white"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-5">
            <a
              href={joinHref}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-lg bg-white text-[14px] font-semibold text-[var(--color-ink)]"
            >
              加入我们
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
