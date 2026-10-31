import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { PublicShell } from '@/components/reports/PublicShell';

export const metadata = { title: 'Signaler un problème' };

export default function SignalerSansCle() {
  return (
    <PublicShell>
      <div className="rack-card flex flex-col items-center gap-3 p-8 text-center">
        <QrCode className="h-10 w-10 text-amber-dim dark:text-amber" />
        <p className="font-display text-base uppercase tracking-wide">Scannez le QR code</p>
        <p className="text-sm text-ink-soft dark:text-cream/60">
          Pour signaler un problème dans le bâtiment, scannez le QR code affiché dans l&apos;église avec
          l&apos;appareil photo de votre téléphone.
        </p>
        <Link href="/suivi" className="btn-secondary mt-2">Suivre un signalement</Link>
      </div>
    </PublicShell>
  );
}
