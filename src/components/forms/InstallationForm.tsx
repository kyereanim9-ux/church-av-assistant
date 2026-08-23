'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';

type Room = { id: string; name: string };
type Equipment = { id: string; name: string };

type Step = {
  label: string;
  type: 'EQUIPEMENT' | 'CABLE' | 'LOGICIEL' | 'SORTIE';
  equipmentId: string;
  cableType: string;
  notes: string;
};

const EMPTY_STEP: Step = { label: '', type: 'EQUIPEMENT', equipmentId: '', cableType: '', notes: '' };

export function InstallationForm({ rooms, equipmentList }: { rooms: Room[]; equipmentList: Equipment[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [settings, setSettings] = useState('');
  const [instructions, setInstructions] = useState('');
  const [knownIssues, setKnownIssues] = useState('');
  const [knownFixes, setKnownFixes] = useState('');
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([{ ...EMPTY_STEP }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEquipment(id: string) {
    setEquipmentIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/installations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, roomId, purpose, configuration, settings, instructions, knownIssues, knownFixes,
          equipmentIds,
          steps: steps
            .filter((s) => s.label.trim())
            .map((s) => ({
              label: s.label,
              type: s.type,
              equipmentId: s.equipmentId || undefined,
              cableType: s.cableType || undefined,
              notes: s.notes || undefined,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement.");
      router.push(`/installations/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rack-card grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div>
          <label className="field-label">Nom de l&apos;installation *</label>
          <input required className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Streaming — Salle principale" />
        </div>
        <div>
          <label className="field-label">Salle *</label>
          <select required className="field-input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">—</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Objectif</label>
          <input className="field-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex : Diffuser le culte en direct" />
        </div>
        <div>
          <label className="field-label">Configuration</label>
          <textarea className="field-input" rows={2} value={configuration} onChange={(e) => setConfiguration(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Réglages</label>
          <textarea className="field-input" rows={2} value={settings} onChange={(e) => setSettings(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Instructions étape par étape</label>
          <textarea className="field-input" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Problèmes connus</label>
          <textarea className="field-input" rows={2} value={knownIssues} onChange={(e) => setKnownIssues(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Solutions connues</label>
          <textarea className="field-input" rows={2} value={knownFixes} onChange={(e) => setKnownFixes(e.target.value)} />
        </div>
      </div>

      <div className="rack-card p-4">
        <p className="field-label">Équipements utilisés</p>
        <div className="flex flex-wrap gap-2">
          {equipmentList.map((eq) => (
            <button
              type="button"
              key={eq.id}
              onClick={() => toggleEquipment(eq.id)}
              className={`label-tag border ${equipmentIds.includes(eq.id) ? 'border-amber bg-amber/15 text-amber-dim dark:text-amber' : 'border-ink/15 text-ink-soft dark:border-white/10 dark:text-cream/60'}`}
            >
              {eq.name}
            </button>
          ))}
          {equipmentList.length === 0 && <p className="text-sm text-ink-soft dark:text-cream/50">Aucun matériel enregistré pour le moment.</p>}
        </div>
      </div>

      <div className="rack-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="field-label mb-0">Schéma de branchement (chaîne de connexion)</p>
          <button type="button" onClick={addStep} className="btn-secondary px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Étape</button>
        </div>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col gap-2 rounded-lg border border-ink/10 p-3 dark:border-white/10 md:flex-row md:items-center">
              <GripVertical className="hidden h-4 w-4 shrink-0 text-ink-soft/40 md:block" />
              <span className="font-mono text-xs text-ink-soft dark:text-cream/40">{idx + 1}</span>
              <input
                className="field-input md:flex-1"
                placeholder="Ex : Convertisseur SDI"
                value={step.label}
                onChange={(e) => updateStep(idx, { label: e.target.value })}
              />
              <select className="field-input md:w-40" value={step.type} onChange={(e) => updateStep(idx, { type: e.target.value as Step['type'] })}>
                <option value="EQUIPEMENT">Équipement</option>
                <option value="CABLE">Câble</option>
                <option value="LOGICIEL">Logiciel</option>
                <option value="SORTIE">Sortie</option>
              </select>
              <select className="field-input md:w-48" value={step.equipmentId} onChange={(e) => updateStep(idx, { equipmentId: e.target.value })}>
                <option value="">Lier à une fiche (facultatif)</option>
                {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
              <button type="button" onClick={() => removeStep(idx)} className="shrink-0 rounded-lg p-2 text-danger hover:bg-danger/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer l&apos;installation
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
      </div>
    </form>
  );
}
