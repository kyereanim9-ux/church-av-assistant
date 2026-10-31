'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, ImagePlus, Loader2, X, CheckCircle2, Send, MapPin, ChevronDown, Copy, Check } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_URGENCIES, MAX_REPORT_PHOTOS, EMERGENCY_NUMBER } from '@/lib/report-constants';
import { compressImage } from '@/lib/compressImage';
import { cn } from '@/lib/utils';

type Room = { id: string; name: string; floor: string | null };
type Photo = { file: File; preview: string };

// Petites commodités mémorisées sur le téléphone de la personne (rien n'est envoyé sans elle).
const LS_IDENTITY = 'batiment.identity';
const LS_REFS = 'batiment.myReports';
const MAX_TOTAL_BYTES = 4.2 * 1024 * 1024;

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navigation privée : on ignore */
  }
}

export function ReportForm({
  accessKey,
  rooms,
  presetRoomId,
}: {
  accessKey: string;
  rooms: Room[];
  presetRoomId: string | null;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState(presetRoomId ?? '');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('NORMALE');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [showIdentity, setShowIdentity] = useState(false);
  const [website, setWebsite] = useState(''); // champ piège anti-robot
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [myRefs, setMyRefs] = useState<{ ref: string; date: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = readLS<{ name?: string; contact?: string }>(LS_IDENTITY, {});
    if (id.name) setReporterName(id.name);
    if (id.contact) setReporterContact(id.contact);
    if (id.name || id.contact) setShowIdentity(true);
    setMyRefs(readLS(LS_REFS, []));
  }, []);

  // Libère la mémoire des aperçus
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setProcessing(true);
    const room = MAX_REPORT_PHOTOS - photos.length;
    const selected = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, room);
    const compressed = await Promise.all(selected.map((f) => compressImage(f)));
    setPhotos((prev) => [...prev, ...compressed.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    if (list.length > room) setError(`Maximum ${MAX_REPORT_PHOTOS} photos.`);
    setProcessing(false);
    if (cameraInput.current) cameraInput.current.value = '';
    if (galleryInput.current) galleryInput.current.value = '';
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (description.trim().length < 5) {
      setError('Décrivez le problème en quelques mots.');
      return;
    }
    const total = photos.reduce((s, p) => s + p.file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError('Les photos sont trop lourdes. Retirez-en une et réessayez.');
      return;
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('key', accessKey);
      fd.append('description', description);
      fd.append('roomId', roomId);
      fd.append('location', location);
      fd.append('category', category || 'AUTRE');
      fd.append('urgency', urgency);
      fd.append('reporterName', reporterName);
      fd.append('reporterContact', reporterContact);
      fd.append('website', website);
      photos.forEach((p) => fd.append('photos', p.file));

      const res = await fetch('/api/reports', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "L'envoi a échoué. Vérifiez votre connexion et réessayez.");

      writeLS(LS_IDENTITY, { name: reporterName, contact: reporterContact });
      const refs = [{ ref: data.reference as string, date: new Date().toISOString() }, ...myRefs].slice(0, 10);
      writeLS(LS_REFS, refs);
      setMyRefs(refs);
      setReference(data.reference);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setDescription('');
    setLocation('');
    setCategory('');
    setUrgency('NORMALE');
    setRoomId(presetRoomId ?? '');
    setReference(null);
    setError(null);
  }

  // ── Écran de confirmation ──────────────────────────────────────────────────
  if (reference) {
    return (
      <div className="rack-card flex flex-col items-center gap-3 p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-ok" />
        <p className="font-display text-xl uppercase tracking-wide">Merci !</p>
        <p className="text-sm text-ink-soft dark:text-cream/70">
          Votre signalement a bien été transmis aux responsables du bâtiment.
        </p>
        <div className="mt-2 w-full rounded-lg bg-ink/5 p-4 dark:bg-white/5">
          <p className="field-label">Votre numéro de suivi</p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-mono text-2xl font-semibold tracking-widest">{reference}</p>
            <button
              type="button"
              aria-label="Copier le numéro"
              className="rounded-md p-1.5 hover:bg-ink/10 dark:hover:bg-white/10"
              onClick={() => {
                navigator.clipboard?.writeText(reference).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-soft dark:text-cream/50">Il est aussi gardé sur ce téléphone.</p>
        </div>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link href={`/suivi/${reference}`} className="btn-primary w-full">Suivre mon signalement</Link>
          <button type="button" onClick={reset} className="btn-secondary w-full">Signaler autre chose</button>
        </div>
      </div>
    );
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* 1. Photos */}
      <section className="rack-card p-4">
        <p className="field-label">1. Une photo du problème (conseillé)</p>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative aspect-square overflow-hidden rounded-lg bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Retirer la photo"
                  className="absolute right-1 top-1 rounded-full bg-stage/70 p-1 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < MAX_REPORT_PHOTOS && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => cameraInput.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-amber/50 bg-amber/5 px-3 py-5 text-sm font-medium transition hover:bg-amber/10"
            >
              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6 text-amber-dim dark:text-amber" />}
              Prendre une photo
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => galleryInput.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-ink/15 px-3 py-5 text-sm font-medium transition hover:bg-ink/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              <ImagePlus className="h-6 w-6 text-ink-soft dark:text-cream/60" />
              Depuis la galerie
            </button>
          </div>
        )}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </section>

      {/* 2. Description */}
      <section className="rack-card p-4">
        <label htmlFor="description" className="field-label">2. Qu&apos;est-ce qui ne va pas ? *</label>
        <textarea
          id="description"
          className="field-input min-h-[110px] text-base"
          placeholder="Ex : Le robinet des toilettes hommes fuit, il y a de l'eau par terre."
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </section>

      {/* 3. Où */}
      <section className="rack-card space-y-3 p-4">
        <p className="field-label flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> 3. Où ?</p>
        {rooms.length > 0 && (
          <select className="field-input text-base" value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Salle">
            <option value="">— Choisir une salle (facultatif) —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.floor ? ` (${r.floor})` : ''}</option>
            ))}
          </select>
        )}
        <input
          className="field-input text-base"
          placeholder="Précision : ex. « 3e rangée à gauche », « entrée parking »"
          value={location}
          maxLength={200}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Emplacement précis"
        />
      </section>

      {/* 4. Catégorie */}
      <section className="rack-card p-4">
        <p className="field-label">4. De quel type ?</p>
        <div className="flex flex-wrap gap-2">
          {REPORT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? '' : c.value)}
              aria-pressed={category === c.value}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition',
                category === c.value
                  ? 'border-amber bg-amber/15 font-medium text-ink dark:text-cream'
                  : 'border-ink/15 text-ink-soft hover:bg-ink/5 dark:border-white/15 dark:text-cream/70'
              )}
            >
              <span className="mr-1">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </section>

      {/* 5. Urgence */}
      <section className="rack-card p-4">
        <p className="field-label">5. Est-ce urgent ?</p>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_URGENCIES.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => setUrgency(u.value)}
              aria-pressed={urgency === u.value}
              className={cn(
                'rounded-lg border p-3 text-left transition',
                urgency === u.value
                  ? u.value === 'DANGER' ? 'border-danger bg-danger/10' : 'border-amber bg-amber/10'
                  : 'border-ink/15 hover:bg-ink/5 dark:border-white/15'
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span className={cn('h-2 w-2 rounded-full', u.dot)} />{u.label}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft dark:text-cream/50">{u.hint}</span>
            </button>
          ))}
        </div>
        {urgency === 'DANGER' && (
          <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            En cas de danger immédiat (incendie, fuite de gaz, blessé), appelez d&apos;abord les secours
            (<strong>{EMERGENCY_NUMBER}</strong>) et prévenez un responsable sur place.
          </p>
        )}
      </section>

      {/* 6. Identité facultative */}
      <section className="rack-card p-4">
        <button type="button" onClick={() => setShowIdentity((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="field-label mb-0">6. Vos coordonnées (facultatif)</span>
          <ChevronDown className={cn('h-4 w-4 transition', showIdentity && 'rotate-180')} />
        </button>
        {showIdentity && (
          <div className="mt-3 space-y-3">
            <input className="field-input text-base" placeholder="Votre prénom" value={reporterName} maxLength={100} onChange={(e) => setReporterName(e.target.value)} autoComplete="given-name" aria-label="Prénom" />
            <input className="field-input text-base" placeholder="Téléphone ou email, si on doit vous recontacter" value={reporterContact} maxLength={150} onChange={(e) => setReporterContact(e.target.value)} autoComplete="tel" aria-label="Contact" />
            <p className="text-xs text-ink-soft dark:text-cream/50">Visible uniquement par les responsables du bâtiment. Vous pouvez rester anonyme.</p>
          </div>
        )}
      </section>

      {/* Champ piège : caché aux humains */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Site web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>

      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}

      <button type="submit" disabled={sending || processing} className="btn-primary w-full py-3.5 text-base">
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {sending ? 'Envoi en cours…' : 'Envoyer le signalement'}
      </button>

      {myRefs.length > 0 && (
        <section className="pt-2">
          <p className="field-label">Mes signalements précédents</p>
          <div className="flex flex-wrap gap-2">
            {myRefs.map((r) => (
              <Link key={r.ref} href={`/suivi/${r.ref}`} className="rounded-full border border-ink/15 px-3 py-1 font-mono text-xs hover:bg-ink/5 dark:border-white/15">
                {r.ref}
              </Link>
            ))}
          </div>
        </section>
      )}
    </form>
  );
}
