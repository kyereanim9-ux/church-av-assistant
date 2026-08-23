import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

type EquipmentCardData = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  status: string;
  photoUrl?: string | null;
  category?: { name: string } | null;
  room?: { name: string } | null;
};

export function EquipmentCard({ item }: { item: EquipmentCardData }) {
  return (
    <Link href={`/equipment/${item.id}`} className="rack-card flex gap-3 p-3 transition hover:-translate-y-0.5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 dark:bg-white/5">
        {item.photoUrl ? (
          <Image src={item.photoUrl} alt={item.name} width={64} height={64} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-ink-soft/50 dark:text-cream/30" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm uppercase tracking-wide">{item.name}</p>
        <p className="truncate text-xs text-ink-soft dark:text-cream/50">
          {[item.brand, item.model].filter(Boolean).join(' · ') || item.category?.name || '—'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          {item.room?.name && (
            <span className="label-tag bg-signal/10 text-signal">{item.room.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
