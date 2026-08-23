'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export function DeleteButton({ url, redirectTo, confirmLabel }: { url: string; redirectTo: string; confirmLabel: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(confirmLabel)) return;
    setLoading(true);
    const res = await fetch(url, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      alert('La suppression a échoué.');
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-secondary text-danger">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Supprimer
    </button>
  );
}
