'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, DoorOpen } from 'lucide-react';

export type RoomFormValues = {
  id?: string;
  name: string;
  floor: string;
  description: string;
  photoUrl: string;
  notes: string;
};

const EMPTY: RoomFormValues = { name: '', floor: '', description: '', photoUrl: '', notes: '' };

export function RoomForm({ initial }: { initial?: Partial<RoomFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<RoomFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof RoomFormValues>(key: K, val: RoomFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set('photoUrl', data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/rooms/${initial!.id}` : '/api/rooms', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement.");
      router.push(`/rooms/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rack-card p-4">
        <p className="field-label">Photo</p>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 dark:bg-white/5">
            {values.photoUrl ? (
              <Image src={values.photoUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <DoorOpen className="h-7 w-7 text-ink-soft/40" />
            )}
          </div>
          <div>
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Envoi…' : 'Prendre / choisir une photo'}
            </button>
          </div>
        </div>
      </div>

      <div className="rack-card grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div>
          <label className="field-label">Nom *</label>
          <input required className="field-input" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex : Salle principale" />
        </div>
        <div>
          <label className="field-label">Étage</label>
          <input className="field-input" value={values.floor} onChange={(e) => set('floor', e.target.value)} placeholder="Ex : RDC, 1F" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Description</label>
          <textarea className="field-input" rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Notes</label>
          <textarea className="field-input" rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Enregistrer les modifications' : 'Ajouter la salle'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
