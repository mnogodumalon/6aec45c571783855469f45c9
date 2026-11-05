/**
 * src/pages/views/QrCodeView.tsx — the view „QR-Code“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/qr-code — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   veranstaltungen (titel, beginn, ort, aktive_interaktion)
 * ERRORS  a failed read shows the data-live-error block (`unauthorized`: ask to sign in).
 * JOIN    <PublicPageQr entity="veranstaltungen" recordId={…} /> from '@/components/widgets/PublicPageQr'.
 * PURPOSE Den QR-Code der Veranstaltung bildschirmfüllend zeigen, damit Teilnehmende ihn scannen und zum Feedback-Formular der aktiven Interaktion kommen.
 *
 * CONTRACT
 *   - Zeigt den QR-Code der Veranstaltung, die die Übersicht für die Ansicht ausgewählt hat, bildschirmfüllend ohne Menü und Kopfzeile.
 *   - Der QR-Code führt auf die öffentliche Feedback-Seite, die selbst nur die aktive Interaktion der Veranstaltung anbietet.
 *   - Ist keine Veranstaltung gewählt, erscheint der Hinweis „Keine Veranstaltung gewählt“.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';
import { tx } from '@/i18n';

export default function QrCodeView() {
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungen = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned ? { filter: `r.id == "${pinned}"`, limit: 1 } : { limit: 1, orderby: ['r.updatedat desc'] } });
  const v = pinned ? veranstaltungen.records[0] : undefined;
  const big = { fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' } as const;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6 text-center text-foreground sm:p-10">
      {v ? (
        <>
          <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 5vh, 5rem)' }}>{v.fields.titel}</h1>
          <PublicPageQr entity="veranstaltungen" recordId={v.record_id} size="56vh" linkClassName="text-muted-foreground" />
          <p className="text-muted-foreground" style={big}>{tx('Scanne den Code und gib dein Feedback ab.')}</p>
        </>
      ) : !veranstaltungen.loading && !veranstaltungen.error ? (
        <p style={big}>{tx('Keine Veranstaltung gewählt')}</p>
      ) : null}
      {veranstaltungen.error && veranstaltungen.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={big}>
          {veranstaltungen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
