import Link from 'next/link';
import { Package, DoorOpen, Cable, ScanSearch, Sparkles, Search, PlusCircle, AlertTriangle } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await requireSession();

  const [equipmentCount, roomCount, installationCount, toCheck, recentEquipment, recentInstallations] =
    await Promise.all([
      db.equipment.count(),
      db.room.count(),
      db.installation.count(),
      db.equipment.findMany({ where: { status: 'A_VERIFIER' }, include: { room: true }, take: 5 }),
      db.equipment.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { room: true } }),
      db.installation.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, include: { room: true } }),
    ]);

  const stats = [
    { label: 'Équipements', value: equipmentCount, icon: Package, href: '/equipment' },
    { label: 'Salles', value: roomCount, icon: DoorOpen, href: '/rooms' },
    { label: 'Installations', value: installationCount, icon: Cable, href: '/installations' },
    { label: 'À vérifier', value: toCheck.length, icon: AlertTriangle, href: '/equipment?status=A_VERIFIER' },
  ];

  const shortcuts = [
    { label: 'Identifier un matériel', icon: ScanSearch, href: '/identify' },
    { label: "Demander à l'IA", icon: Sparkles, href: '/assistant' },
    { label: 'Rechercher', icon: Search, href: '/search' },
    ...(session.user.role === 'ADMIN'
      ? [
          { label: 'Ajouter un matériel', icon: PlusCircle, href: '/equipment/new' },
          { label: 'Ajouter une salle', icon: PlusCircle, href: '/rooms/new' },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Bonjour, ${session.user.name?.split(' ')[0]}`}
        subtitle="Voici l'état du matériel audiovisuel de l'église."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rack-card p-4 transition hover:-translate-y-0.5">
            <s.icon className="mb-2 h-5 w-5 text-amber-dim dark:text-amber" />
            <p className="font-display text-2xl">{s.value}</p>
            <p className="text-xs text-ink-soft dark:text-cream/50">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <p className="field-label">Raccourcis</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rack-card flex flex-col items-center gap-2 px-3 py-4 text-center transition hover:-translate-y-0.5"
            >
              <s.icon className="h-5 w-5 text-signal" />
              <p className="font-display text-xs uppercase tracking-wide">{s.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="field-label">Derniers équipements ajoutés</p>
          <div className="space-y-2">
            {recentEquipment.length === 0 && <p className="text-sm text-ink-soft dark:text-cream/50">Aucun équipement pour le moment.</p>}
            {recentEquipment.map((e) => (
              <Link key={e.id} href={`/equipment/${e.id}`} className="rack-card flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm uppercase tracking-wide">{e.name}</p>
                  <p className="truncate text-xs text-ink-soft dark:text-cream/50">{e.room?.name ?? 'Non assigné'}</p>
                </div>
                <StatusBadge status={e.status} />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">Dernières installations modifiées</p>
          <div className="space-y-2">
            {recentInstallations.length === 0 && <p className="text-sm text-ink-soft dark:text-cream/50">Aucune installation pour le moment.</p>}
            {recentInstallations.map((i) => (
              <Link key={i.id} href={`/installations/${i.id}`} className="rack-card flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm uppercase tracking-wide">{i.name}</p>
                  <p className="truncate text-xs text-ink-soft dark:text-cream/50">{i.room.name}</p>
                </div>
                <p className="shrink-0 text-xs text-ink-soft dark:text-cream/40">{formatDateTime(i.updatedAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {toCheck.length > 0 && (
        <div className="mt-8">
          <p className="field-label flex items-center gap-1.5 text-amber-dim dark:text-amber">
            <AlertTriangle className="h-3.5 w-3.5" /> Équipements nécessitant une vérification
          </p>
          <div className="space-y-2">
            {toCheck.map((e) => (
              <Link key={e.id} href={`/equipment/${e.id}`} className="rack-card flex items-center justify-between p-3">
                <p className="font-display text-sm uppercase tracking-wide">{e.name}</p>
                <p className="text-xs text-ink-soft dark:text-cream/50">{e.room?.name ?? 'Non assigné'}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
