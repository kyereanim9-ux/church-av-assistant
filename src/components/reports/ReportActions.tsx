'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, Send, Save, ExternalLink } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_STATUSES, REPORT_URGENCIES } from '@/lib/report-constants';
import { compressImage } from '@/lib/compressImage';
import { cn } from '@/lib/utils';

type Props = {
  report: {
    id: string;
    reference: string;
    status: string;
    urgency: string;
    category: string;
    assignedToId: string | null;
    publicNote: string;
  };
  users: { id: string; name: string }[];
};

export function ReportActions({ report, users }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(report.publicNote);
  const [comment, setComment] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);

  async function patch(data: Record<string, unknown>, tag: string) {
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(null);
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy('comment');
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComment('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(null);
    }
  }

  async function uploadResolutionPhoto(file: File | undefined) {
    if (!file) return;
    setBusy('photo');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', await compressImage(file));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await patch({ addResolutionPhotoUrl: json.url }, 'photo');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la photo.");
      setBusy(null);
    } finally {
      if (photoInput.current) photoInput.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <section className="rack-card p-4">
        <p className="field-label">Statut</p>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={busy !== null}
              onClick={() => patch({ status: s.value }, 'status')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition',
                report.status === s.value ? 'border-amber bg-amber/15 font-medium' : 'border-ink/15 hover:bg-ink/5 dark:border-white/15 dark:hover:bg-white/5'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', s.dot)} />{s.label}
            </button>
          ))}
        </div>

        <label className="field-label mt-4">Confié à</label>
        <select className="field-input" value={report.assignedToId ?? ''} disabled={busy !== null} onChange={(e) => patch({ assignedToId: e.target.value || null }, 'assign')}>
          <option value="">— Personne —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <label className="field-label mt-4">Urgence</label>
        <select className="field-input" value={report.urgency} disabled={busy !== null} onChange={(e) => patch({ urgency: e.target.value }, 'urgency')}>
          {REPORT_URGENCIES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>

        <label className="field-label mt-4">Catégorie</label>
        <select className="field-input" value={report.category} disabled={busy !== null} onChange={(e) => patch({ category: e.target.value }, 'category')}>
          {REPORT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
      </section>

      <section className="rack-card p-4">
        <label className="field-label">Message visible par le signaleur</label>
        <textarea
          className="field-input min-h-[80px]"
          placeholder="Ex : Merci ! Le plombier passe jeudi."
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <a href={`/suivi/${report.reference}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-signal underline">
            Voir sa page de suivi <ExternalLink className="h-3 w-3" />
          </a>
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={busy !== null || note === report.publicNote} onClick={() => patch({ publicNote: note }, 'note')}>
            {busy === 'note' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Enregistrer
          </button>
        </div>
      </section>

      <section className="rack-card p-4">
        <form onSubmit={addComment}>
          <label className="field-label">Commentaire interne</label>
          <textarea className="field-input min-h-[70px]" placeholder="Visible uniquement par l'équipe" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn-secondary mt-2 w-full" disabled={busy !== null || !comment.trim()}>
            {busy === 'comment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ajouter
          </button>
        </form>
        <button type="button" className="btn-secondary mt-2 w-full" disabled={busy !== null} onClick={() => photoInput.current?.click()}>
          {busy === 'photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Photo après intervention
        </button>
        <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadResolutionPhoto(e.target.files?.[0])} />
      </section>

      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
