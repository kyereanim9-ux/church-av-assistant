'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Radio } from 'lucide-react';

export function TopBar() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <header className="flex items-center justify-between border-b border-ink/10 bg-panel/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-stage-panel/80 md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber text-stage">
          <Radio className="h-4 w-4" />
        </span>
        <p className="font-display text-sm uppercase tracking-wide">Church AV Assistant</p>
      </div>
      <button
        onClick={toggle}
        aria-label="Basculer le mode sombre"
        className="rounded-full p-2 text-ink-soft hover:bg-ink/5 dark:text-cream/70 dark:hover:bg-white/5"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </header>
  );
}
