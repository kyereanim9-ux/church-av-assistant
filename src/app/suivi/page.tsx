'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Building2 } from 'lucide-react';

export default function SuiviPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [mine, setMine] = useState<{ ref: string; date: string }[]>([]);

  useEffect(() => {
    try {
      setMine(JSON.parse(localStorage.getItem('batiment.myReports') || '[]'));
    } catch {
      /* ignore */
    }
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length === 8) router.push(`/suivi/${clean.slice(0, 4)}-${clean.slice(4)}`);
  }

  return (
    <div className="min-h-screen bg-paper px-4 pb-16 pt-6 dark:bg-stage">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber text-stage">
            <Building2 className="h-6 w-6" />
          </span>
          <p className="font-display text-lg uppercase tracking-wide">Suivre un signalement</p>
        </header>
        <form onSubmit={submit} className="rack-card space-y-3 p-4">
          <label htmlFor="code" className="field-label">Numéro de suivi</label>
          <input
            id="code"
            className="field-input font-mono text-lg uppercase tracking-widest"
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary w-full"><Search className="h-4 w-4" /> Voir l&apos;état</button>
        </form>
        {mine.length > 0 && (
          <div className="mt-6">
            <p className="field-label">Envoyés depuis ce téléphone</p>
            <div className="space-y-2">
              {mine.map((r) => (
                <Link key={r.ref} href={`/suivi/${r.ref}`} className="rack-card flex items-center justify-between p-3">
                  <span className="font-mono text-sm">{r.ref}</span>
                  <span className="text-xs text-ink-soft dark:text-cream/50">{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
