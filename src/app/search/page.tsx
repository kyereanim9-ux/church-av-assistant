'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, Loader2, DoorOpen, Cable } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EquipmentCard } from '@/components/EquipmentCard';
import { EmptyState } from '@/components/EmptyState';

type Results = {
  equipment: Array<{ id: string; name: string; brand?: string | null; model?: string | null; status: string; photoUrl?: string | null; category?: { name: string } | null; room?: { name: string } | null }>;
  rooms: Array<{ id: string; name: string; floor?: string | null }>;
  installations: Array<{ id: string; name: string; room: { name: string } }>;
};

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results>({ equipment: [], rooms: [], installations: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback((query: string) => {
    if (!query.trim()) {
      setResults({ equipment: [], rooms: [], installations: [] });
      setSearched(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data); setSearched(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 300);
    return () => clearTimeout(t);
  }, [q, run]);

  const total = results.equipment.length + results.rooms.length + results.installations.length;

  return (
    <div>
      <PageHeader eyebrow="Recherche" title="Recherche globale" subtitle="Matériel, salles, installations, câbles, mots-clés…" />

      <div className="relative mb-6">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
        <input
          autoFocus
          className="field-input pl-10"
          placeholder="Ex : FX9, SDI, DC Room, Streaming…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>}

      {!loading && searched && total === 0 && (
        <EmptyState icon={SearchIcon} title="Aucun résultat" description="Essayez un autre mot-clé." />
      )}

      {!loading && results.equipment.length > 0 && (
        <div className="mb-6">
          <p className="field-label">Matériel</p>
          <div className="grid gap-3 md:grid-cols-2">
            {results.equipment.map((e) => <EquipmentCard key={e.id} item={e} />)}
          </div>
        </div>
      )}

      {!loading && results.rooms.length > 0 && (
        <div className="mb-6">
          <p className="field-label">Salles</p>
          <div className="grid gap-3 md:grid-cols-2">
            {results.rooms.map((r) => (
              <Link key={r.id} href={`/rooms/${r.id}`} className="rack-card flex items-center gap-3 p-3">
                <DoorOpen className="h-4 w-4 text-signal" />
                <div>
                  <p className="font-display text-sm uppercase tracking-wide">{r.name}</p>
                  {r.floor && <p className="text-xs text-ink-soft dark:text-cream/50">Étage {r.floor}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && results.installations.length > 0 && (
        <div>
          <p className="field-label">Installations</p>
          <div className="grid gap-3 md:grid-cols-2">
            {results.installations.map((i) => (
              <Link key={i.id} href={`/installations/${i.id}`} className="rack-card flex items-center gap-3 p-3">
                <Cable className="h-4 w-4 text-signal" />
                <div>
                  <p className="font-display text-sm uppercase tracking-wide">{i.name}</p>
                  <p className="text-xs text-ink-soft dark:text-cream/50">{i.room.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
