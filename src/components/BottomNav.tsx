'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu as MenuIcon, X, LogOut } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [open, setOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => i.primary);
  const overflow = NAV_ITEMS.filter((i) => !i.primary && (!i.adminOnly || isAdmin));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-stage/60 md:hidden" onClick={() => setOpen(false)}>
          <div
            className="rounded-t-2xl border-t border-ink/10 bg-panel p-4 pb-8 dark:border-white/10 dark:bg-stage-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm uppercase tracking-wide text-ink-soft dark:text-cream/60">Menu</p>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {overflow.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-ink/5 dark:hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-danger hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink/10 bg-panel/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-stage-panel/95 md:hidden">
        {primary.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                active ? 'text-amber-dim dark:text-amber' : 'text-ink-soft dark:text-cream/60'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-soft dark:text-cream/60"
        >
          <MenuIcon className="h-5 w-5" />
          Menu
        </button>
      </nav>
    </>
  );
}
