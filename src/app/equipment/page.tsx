'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Package, PlusCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EquipmentCard } from '@/components/EquipmentCard';
import { EmptyState } from '@/components/EmptyState';
import { STATUS_LABEL } from '@/lib/utils';

type Category = { id: string; name: string };
type Room = { id: string; name: string };
type EquipmentItem = {
  id: string; name: string; brand?: string | null; model?: string | null; status: string;
  photoUrl?: string | null; category?: { name: string } | null; room?: { name: string } | null;
};

export default function EquipmentListPage() {
  return (
    <Suspense fallback={null}>
      <EquipmentList />
    </Suspense>
  );
}

function EquipmentList() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
    fetch('/api/rooms').then((r) => r.json()).then(setRooms);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (roomId) params.set('roomId', roomId);
    if (status) params.set('status', status);
    fetch(`/api/equipment?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [q, categoryId, roomId, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Matériel"
        title="Matériel audiovisuel"
        subtitle={`${items.length} équipement${items.length > 1 ? 's' : ''}`}
        action={
          session?.user?.role === 'ADMIN' && (
            <Link href="/equipment/new" className="btn-primary">
              <PlusCircle className="h-4 w-4" /> Ajouter
            </Link>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <input
          className="field-input col-span-2 md:col-span-1"
          placeholder="Rechercher (nom, marque, modèle…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="field-input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">Toutes salles</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous états</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun équipement trouvé"
          description="Essayez d'autres filtres, ou ajoutez le matériel manquant."
          action={
            session?.user?.role === 'ADMIN' && (
              <Link href="/equipment/new" className="btn-secondary mt-2">
                <PlusCircle className="h-4 w-4" /> Ajouter un matériel
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => <EquipmentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
