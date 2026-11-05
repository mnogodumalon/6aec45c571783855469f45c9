/**
 * src/pages/views/ZusammengefuehrterTextView.tsx — the view „Zusammengeführter Text“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/zusammengefuehrter-text — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   interaktionen (titel, frage, zusammengefuehrter_text, ki_antwort, veranstaltung); veranstaltungen (titel, aktive_interaktion)
 * FILTER  interaktionen: r.v_zusammengefuehrter_text is not None
 * FILTER  veranstaltungen: r.v_aktive_interaktion is not None
 * SHOWS   the interaktionen record that veranstaltungen.aktive_interaktion points at.
 * ERRORS  a failed read shows the data-live-error block; a failed autosave shows „Nicht gespeichert — erneut versuchen“.
 * PURPOSE Den zusammengeführten Text der aktiven Interaktion bildschirmfüllend zeigen, um ihn mit den Teilnehmenden durchzugehen.
 *
 * CONTRACT
 *   - Zeigt das Feld „Zusammengeführter Text“ der Interaktion, die in der Veranstaltung als aktive Interaktion gesetzt ist, in großer Schrift.
 *   - Der Text wird ohne Neuladen-Zwang so angezeigt, wie er zuletzt gespeichert wurde; Änderungen des Moderators bleiben erhalten.
 *   - Ist noch kein Text zusammengeführt oder keine Interaktion aktiv, erscheint der Hinweis „Noch kein Text zusammengeführt“.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { extractRecordId } from '@/services/livingAppsService';
import { tx } from '@/i18n';

export default function ZusammengefuehrterTextView() {
  // opened for ONE record (`#/ansicht/zusammengefuehrter-text?record=<id>`, the overview's „Vollbild“/„QR“ link) → that one;
  // else the control record set LAST (several may each carry a mark — the latest choice wins)
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungenControl = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_aktive_interaktion is not None", orderby: ['r.updatedat desc', 'r.id desc'], limit: 1 } });
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 0, query: { filter: "r.v_zusammengefuehrter_text is not None" } });
  const veranstaltungen = useLiveRecords('veranstaltungen', { intervalMs: 0, query: { filter: "r.v_aktive_interaktion is not None" } });

  const control = veranstaltungenControl.records[0];
  const activeId = control ? extractRecordId(control.fields.aktive_interaktion) : null;
  const active = activeId ? interaktionen.records.find(r => r.record_id === activeId) : undefined;
  const saved = active?.fields.zusammengefuehrter_text ?? '';

  const big = { fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' } as const;
  const loading = veranstaltungenControl.loading || interaktionen.loading;
  const nothingMarked = !loading && !veranstaltungenControl.error && !control?.fields.aktive_interaktion;

  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-background p-6 text-foreground sm:p-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{active?.fields.titel ?? tx('Zusammengeführter Text')}</h1>
          {active?.fields.frage && <p className="mt-2 text-muted-foreground" style={big}>{active.fields.frage}</p>}
        </div>
      </header>

      {nothingMarked && <p data-nothing-marked style={big}>{tx('Nichts ausgewählt.')}</p>}

      {!nothingMarked && !loading && !saved && !interaktionen.error && (
        <p className="text-muted-foreground" style={big}>{tx('Noch kein Text zusammengeführt')}</p>
      )}

      {active && saved && (
        <div
          className="min-h-[70dvh] w-full flex-1 whitespace-pre-wrap break-words rounded-xl border bg-card p-6 leading-relaxed"
          style={{ fontSize: 'clamp(1.25rem, 2.6vh, 2.75rem)' }}
        >{saved}</div>
      )}

      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={big}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
      {veranstaltungen.error && veranstaltungen.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={big}>
          {veranstaltungen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
