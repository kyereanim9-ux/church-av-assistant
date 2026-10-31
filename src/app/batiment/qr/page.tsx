import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { requireReportManager } from '@/lib/session';
import { db } from '@/lib/db';
import { CHURCH_NAME, getBaseUrl, getReportAccessKey } from '@/lib/reports';
import { PageHeader } from '@/components/PageHeader';
import { QrToolbar, CopyLinkButton } from '@/components/reports/QrToolbar';

export const dynamic = 'force-dynamic';

async function toSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#14171A', light: '#FFFFFF' } });
}

export default async function QrPage() {
  const session = await requireReportManager();
  const [key, rooms, h] = await Promise.all([
    getReportAccessKey(),
    db.room.findMany({ select: { id: true, name: true, floor: true }, orderBy: { name: 'asc' } }),
    headers(),
  ]);
  const base = `${getBaseUrl(h)}/signaler/${key}`;

  const posters = [
    { id: 'general', title: 'Toute l’église', url: base },
    ...rooms.map((r) => ({ id: r.id, title: r.name + (r.floor ? ` (${r.floor})` : ''), url: `${base}?salle=${r.id}` })),
  ];
  const svgs = await Promise.all(posters.map((p) => toSvg(p.url)));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Bâtiment"
          title="QR codes de signalement"
          subtitle="Imprimez-les et affichez-les dans l'église. Le QR code général convient partout ; les QR codes par salle pré-remplissent l'emplacement."
        />
        <QrToolbar isAdmin={session.user.role === 'ADMIN'} />
        <p className="mb-6 mt-3 text-xs text-ink-soft dark:text-cream/50">
          Le lien contient une clé secrète : seules les personnes qui voient le QR code peuvent envoyer un signalement.
          Si un QR code circule hors de l&apos;église (réseaux sociaux…), un administrateur peut générer une nouvelle clé :
          les anciens QR codes cesseront de fonctionner et il faudra réimprimer les affiches.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:block">
        {posters.map((p, i) => (
          <div
            key={p.id}
            className="rack-card flex flex-col items-center p-5 text-center print:flex print:h-[100vh] print:break-after-page print:justify-center print:border-0 print:shadow-none"
          >
            <p className="font-display text-sm uppercase tracking-[0.2em] text-amber-dim print:text-2xl">Prenons soin de {CHURCH_NAME}</p>
            <p className="mt-1 font-display text-xl uppercase print:mt-4 print:text-5xl">Un problème dans le bâtiment&nbsp;?</p>
            <p className="mt-1 text-sm text-ink-soft print:mt-4 print:text-2xl">Fuite, ampoule grillée, chaise cassée… Scannez et envoyez une photo.</p>
            <div
              className="my-4 w-full max-w-[220px] rounded-lg bg-white p-2 print:my-10 print:max-w-[420px]"
              dangerouslySetInnerHTML={{ __html: svgs[i] }}
            />
            <p className="font-display text-base uppercase tracking-wide print:text-3xl">{p.title}</p>
            <div className="mt-3 print:hidden">
              <CopyLinkButton url={p.url} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
