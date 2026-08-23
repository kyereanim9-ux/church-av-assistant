'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Radio } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink/10 bg-panel px-4 py-6 dark:border-white/10 dark:bg-stage-panel md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber text-stage">
          <Radio className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-sm uppercase tracking-wide">Church AV</p>
          <p className="-mt-1 font-display text-sm uppercase tracking-wide text-amber">Assistant</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-amber/15 text-amber-dim dark:text-amber'
                  : 'text-ink-soft hover:bg-ink/5 dark:text-cream/70 dark:hover:bg-white/5'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <ThemeToggle className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-ink/5 dark:text-cream/70 dark:hover:bg-white/5" />

      {session?.user && (
        <div className="mt-2 border-t border-ink/10 pt-4 dark:border-white/10">
          <p className="truncate px-3 text-sm font-medium">{session.user.name}</p>
          <p className="truncate px-3 text-xs text-ink-soft dark:text-cream/50">
            {isAdmin ? 'Administrateur' : "Membre de l'équipe"}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-ink/5 dark:text-cream/70 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      )}
    </aside>
  );
}
