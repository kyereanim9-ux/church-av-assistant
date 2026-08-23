import Link from 'next/link';
import { Tag, Users, DoorOpen, Package } from 'lucide-react';
import { requireAdmin } from '@/lib/session';
import { PageHeader } from '@/components/PageHeader';

export default async function AdminPage() {
  await requireAdmin();

  const sections = [
    { href: '/admin/categories', label: 'Catégories de matériel', desc: 'Ajouter ou consulter les catégories', icon: Tag },
    { href: '/admin/users', label: 'Utilisateurs', desc: "Gérer les comptes de l'équipe", icon: Users },
    { href: '/rooms', label: 'Salles', desc: 'Ajouter, modifier, supprimer des salles', icon: DoorOpen },
    { href: '/equipment', label: 'Matériel', desc: 'Ajouter, modifier, supprimer du matériel', icon: Package },
  ];

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Panneau d'administration" />
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="rack-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
            <s.icon className="h-5 w-5 shrink-0 text-amber-dim dark:text-amber" />
            <div>
              <p className="font-display text-sm uppercase tracking-wide">{s.label}</p>
              <p className="text-xs text-ink-soft dark:text-cream/50">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
