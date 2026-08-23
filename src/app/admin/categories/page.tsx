'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PlusCircle, Loader2, Tag } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

type Category = { id: string; name: string; isDefault: boolean; _count: { equipment: number } };

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch('/api/categories').then((r) => r.json()).then(setCategories).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Catégories de matériel" subtitle="Ajoutez de nouvelles catégories sans modifier le code." />

      <form onSubmit={handleSubmit} className="rack-card mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="field-label">Nouvelle catégorie</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Encodeur vidéo" required />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Ajouter
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id} className="rack-card flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm"><Tag className="h-4 w-4 text-ink-soft/50" /> {c.name}</span>
              <span className="text-xs text-ink-soft dark:text-cream/50">{c._count.equipment} équipement{c._count.equipment > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
