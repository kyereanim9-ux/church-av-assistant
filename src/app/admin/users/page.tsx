'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PlusCircle, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/utils';

type User = { id: string; name: string; email: string; role: 'ADMIN' | 'MEMBER'; createdAt: string };

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch('/api/users').then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName(''); setEmail(''); setPassword(''); setRole('MEMBER');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Utilisateurs" subtitle="Administrateurs et membres de l'équipe audiovisuelle." />

      <form onSubmit={handleSubmit} className="rack-card mb-6 grid gap-3 p-4 md:grid-cols-2">
        <div>
          <label className="field-label">Nom</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Mot de passe temporaire</label>
          <input type="text" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Rôle</label>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}>
            <option value="MEMBER">Membre de l&apos;équipe</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Créer l&apos;utilisateur
          </button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rack-card flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {u.role === 'ADMIN' ? <ShieldCheck className="h-4 w-4 text-amber-dim dark:text-amber" /> : <UserIcon className="h-4 w-4 text-ink-soft/50" />}
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-ink-soft dark:text-cream/50">{u.email}</p>
                </div>
              </div>
              <p className="text-xs text-ink-soft dark:text-cream/40">Depuis le {formatDate(u.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
