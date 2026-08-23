'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, Sparkles, Package } from 'lucide-react';
import { STATUS_LABEL } from '@/lib/utils';

type Category = { id: string; name: string };
type Room = { id: string; name: string };

export type EquipmentFormValues = {
  id?: string;
  name: string;
  categoryId: string;
  brand: string;
  model: string;
  serialNumber: string;
  reference: string;
  quantity: number;
  status: string;
  roomId: string;
  location: string;
  photoUrl: string;
  description: string;
  usage: string;
  instructions: string;
  cablesNeeded: string;
  accessories: string;
  notes: string;
};

const EMPTY: EquipmentFormValues = {
  name: '', categoryId: '', brand: '', model: '', serialNumber: '', reference: '',
  quantity: 1, status: 'DISPONIBLE', roomId: '', location: '', photoUrl: '',
  description: '', usage: '', instructions: '', cablesNeeded: '', accessories: '', notes: '',
};

export function EquipmentForm({
  categories, rooms, initial,
}: { categories: Category[]; rooms: Room[]; initial?: Partial<EquipmentFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<EquipmentFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof EquipmentFormValues>(key: K, val: EquipmentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handlePhotoSelected(file: File) {
    setUploading(true);
    setError(null);
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

  async function handleAutoAnalyze(file: File) {
    setAnalyzing(true);
    setAiNote(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/identify', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        setAiNote(data.error);
        return;
      }
      const id = data.identification;
      if (id) {
        if (id.brand) set('brand', id.brand);
        if (id.model) set('model', id.model);
        if (id.description && !values.description) set('description', id.description);
        const matchedCategory = categories.find((c) => c.name.toLowerCase() === (id.category || '').toLowerCase());
        if (matchedCategory) set('categoryId', matchedCategory.id);
        setAiNote(
          `Suggestion IA (confiance ${id.confidence ?? 'inconnue'}) : ${id.brand ?? '—'} ${id.model ?? ''}. Vérifiez et corrigez si besoin avant d'enregistrer.`
        );
      }
    } catch {
      setAiNote("L'analyse automatique a échoué. Vous pouvez remplir la fiche manuellement.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handlePhotoSelected(file);
    await handleAutoAnalyze(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/equipment/${initial!.id}` : '/api/equipment', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'enregistrement.');
      router.push(`/equipment/${data.id}`);
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
              <Package className="h-7 w-7 text-ink-soft/40" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary" disabled={uploading || analyzing}>
              {uploading || analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Envoi…' : analyzing ? 'Analyse IA…' : 'Prendre / choisir une photo'}
            </button>
            <p className="flex items-center gap-1 text-xs text-ink-soft dark:text-cream/50">
              <Sparkles className="h-3 w-3" /> La photo est analysée automatiquement pour pré-remplir la fiche.
            </p>
          </div>
        </div>
        {aiNote && <p className="mt-3 rounded-lg bg-amber/10 p-2 text-xs text-amber-dim dark:text-amber">{aiNote}</p>}
      </div>

      <div className="rack-card grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="field-label">Nom *</label>
          <input required className="field-input" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex : Sony FX9" />
        </div>
        <div>
          <label className="field-label">Catégorie</label>
          <select className="field-input" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">État</label>
          <select className="field-input" value={values.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Marque</label>
          <input className="field-input" value={values.brand} onChange={(e) => set('brand', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Modèle</label>
          <input className="field-input" value={values.model} onChange={(e) => set('model', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Numéro de série</label>
          <input className="field-input" value={values.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Référence</label>
          <input className="field-input" value={values.reference} onChange={(e) => set('reference', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Quantité</label>
          <input type="number" min={1} className="field-input" value={values.quantity} onChange={(e) => set('quantity', Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Salle associée</label>
          <select className="field-input" value={values.roomId} onChange={(e) => set('roomId', e.target.value)}>
            <option value="">Non assignée</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Emplacement précis</label>
          <input className="field-input" value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex : Armoire technique, étagère 2" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Description</label>
          <textarea className="field-input" rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Utilisation</label>
          <textarea className="field-input" rows={2} value={values.usage} onChange={(e) => set('usage', e.target.value)} placeholder="Comment utiliser cet équipement" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Instructions de (re)connexion</label>
          <textarea className="field-input" rows={3} value={values.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="Étapes numérotées" />
        </div>
        <div>
          <label className="field-label">Câbles nécessaires</label>
          <input className="field-input" value={values.cablesNeeded} onChange={(e) => set('cablesNeeded', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Accessoires</label>
          <input className="field-input" value={values.accessories} onChange={(e) => set('accessories', e.target.value)} />
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
          {isEdit ? 'Enregistrer les modifications' : 'Ajouter le matériel'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
