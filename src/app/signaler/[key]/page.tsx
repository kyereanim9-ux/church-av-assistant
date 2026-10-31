import { ShieldAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { isValidReportAccessKey } from '@/lib/reports';
import { PublicShell } from '@/components/reports/PublicShell';
import { ReportForm } from '@/components/reports/ReportForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Signaler un problème', robots: { index: false, follow: false } };

export default async function SignalerPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ salle?: string }>;
}) {
  const { key } = await params;
  const { salle } = await searchParams;

  if (!(await isValidReportAccessKey(key))) {
    return (
      <PublicShell>
        <div className="rack-card flex flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-danger" />
          <p className="font-display text-base uppercase tracking-wide">Lien expiré</p>
          <p className="text-sm text-ink-soft dark:text-cream/60">
            Ce QR code n&apos;est plus valide. Scannez le QR code actuellement affiché dans l&apos;église, ou
            parlez-en directement à un responsable.
          </p>
        </div>
      </PublicShell>
    );
  }

  const rooms = await db.room.findMany({ select: { id: true, name: true, floor: true }, orderBy: { name: 'asc' } });
  const presetRoom = rooms.find((r) => r.id === salle) ?? null;

  return (
    <PublicShell subtitle="Un problème dans le bâtiment ? Dites-le-nous en 1 minute.">
      <ReportForm accessKey={key} rooms={rooms} presetRoomId={presetRoom?.id ?? null} />
    </PublicShell>
  );
}
