'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, RefreshCw, Loader2, Link2, Check } from 'lucide-react';

export function QrToolbar({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!confirm('Générer une nouvelle clé ? Tous les QR codes déjà imprimés cesseront de fonctionner.')) return;
    setBusy(true);
    const res = await fetch('/api/reports/access-key', { method: 'POST' });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("L'opération a échoué.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="btn-primary">
        <Printer className="h-4 w-4" /> Imprimer les affiches
      </button>
      {isAdmin && (
        <button type="button" onClick={regenerate} disabled={busy} className="btn-secondary text-danger">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Nouvelle clé
        </button>
      )}
    </div>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-signal underline"
      onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} {copied ? 'Lien copié' : 'Copier le lien'}
    </button>
  );
}
