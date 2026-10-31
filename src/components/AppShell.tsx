'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isLogin = pathname === '/login';

  if (isLogin || status === 'unauthenticated') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        <TopBar />
        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
