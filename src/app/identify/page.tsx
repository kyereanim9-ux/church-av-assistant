'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, Loader2, ScanSearch, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EquipmentCard } from '@/components/EquipmentCard';

type Identification = {
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string;
  visibleFeatures: string;
  confidence: 'faible' | 'moyenne' | 'élevée';
};

type Match = {
  id: string; name: string; brand?: string | null; model?: string | null; status: string;
  photoUrl?: string | null; category?: { name: string } | null; room?: { name: string } | null;
};

export default function IdentifyPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identification, setIdentification] = useState<Identification | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    setIdentification(null);
    setMatches([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/identify', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error && !data.identification) {
        setError(data.error);
        return;
      }
      setIdentification(data.identification);
      setMatches(data.matches ?? []);
    } catch {
      setError("L'identification a échoué. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Identification" title="Identifier un matériel" subtitle="Prenez une photo pour identifier un équipement et le retrouver dans la base." />

      <div className="rack-card flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-ink/5 dark:bg-white/5">
          {preview ? (
            <Image src={preview} alt="" width={160} height={160} className="h-full w-full object-cover" />
          ) : (
            <ScanSearch className="h-10 w-10 text-ink-soft/40" />
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {loading ? 'Analyse en cours…' : 'Prendre / choisir une photo'}
        </button>
      </div>

      {error && (
        <div className="rack-card mt-4 flex items-start gap-2 border-l-4 border-l-amber p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-dim dark:text-amber" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {identification && (
        <div className="mt-6">
          <p className="field-label">Résultat de l&apos;identification IA</p>
          <div className="rack-card p-4">
            <p className="font-display text-lg uppercase tracking-wide">
              {identification.brand || identification.model
                ? `${identification.brand ?? ''} ${identification.model ?? ''}`.trim()
                : 'Équipement non identifié avec certitude'}
            </p>
            <p className="mt-1 label-tag bg-ink/5 text-ink-soft dark:bg-white/5 dark:text-cream/60">
              Confiance {identification.confidence}
            </p>
            {identification.category && <p className="mt-2 text-sm text-ink-soft dark:text-cream/60">Catégorie probable : {identification.category}</p>}
            {identification.description && <p className="mt-2 text-sm">{identification.description}</p>}
            {identification.visibleFeatures && (
              <p className="mt-2 text-xs text-ink-soft dark:text-cream/50">Caractéristiques visibles : {identification.visibleFeatures}</p>
            )}
          </div>
        </div>
      )}

      {identification && (
        <div className="mt-6">
          <p className="field-label">
            {matches.length > 0 ? (
              <span className="flex items-center gap-1.5 text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Correspondance(s) trouvée(s) dans la base de données</span>
            ) : (
              'Aucune correspondance trouvée dans la base de données'
            )}
          </p>
          {matches.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {matches.map((m) => <EquipmentCard key={m.id} item={m} />)}
            </div>
          ) : (
            <p className="text-sm text-ink-soft dark:text-cream/50">
              Cet équipement ne semble pas encore enregistré.{' '}
              <Link href="/equipment/new" className="text-signal underline">Ajoutez-le à la base</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
