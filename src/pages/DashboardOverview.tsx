import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconCopy, IconQrcode, IconPresentation, IconPlus, IconBolt, IconCheck, IconMessage } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { dateFnsLocale, tx, appLabel } from '@/i18n';
import { gruss, namen, useClock, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const crud = useEntityCrud(data);
  const veranstaltungen = crud.enriched.veranstaltungen;
  const interaktionen = crud.enriched.interaktionen;
  const feedbacks = crud.enriched.feedbacks;
  const clock = useClock();
  const [selected, setSelected] = useState<string | null>(null);

  // the event in focus: the picked one, else the one with an active interaction, else the first
  const event = useMemo(() => {
    return veranstaltungen.find(v => v.record_id === selected)
      ?? veranstaltungen.find(v => v.fields.aktive_interaktion)
      ?? veranstaltungen[0];
  }, [veranstaltungen, selected]);

  const eventInteractions = useMemo(() => {
    if (!event) return [];
    return interaktionen
      .filter(i => extractRecordId(i.fields.veranstaltung) === event.record_id)
      .sort((a, b) => (a.fields.reihenfolge ?? 0) - (b.fields.reihenfolge ?? 0));
  }, [interaktionen, event]);

  const activeId = event ? extractRecordId(event.fields.aktive_interaktion) : null;
  const active = eventInteractions.find(i => i.record_id === activeId);
  const activeFeedbacks = useMemo(
    () => (active ? feedbacks.filter(f => extractRecordId(f.fields.interaktion) === active.record_id) : []),
    [feedbacks, active],
  );
  const merged = active?.fields.zusammengefuehrter_text ?? '';
  const mergeGo = active ? flowActionFor('interaktionen', 'zusammengefuehrter_text', active.record_id) : null;
  const kiGo = active ? flowActionFor('interaktionen', 'ki_antwort', active.record_id) : null;

  const awaitingKi = eventInteractions.filter(i => i.fields.zusammengefuehrter_text && !i.fields.ki_antwort);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(merged);
      undoToast(tx('Text kopiert'));
    } catch {
      undoToast(tx('Kopieren nicht möglich — bitte Text im Vollbild markieren'));
    }
  };
  const openView = (slug: string) => window.open(tx`#/ansicht/${slug}?record=${event?.record_id}`, '_blank');

  const kuerzelCount = new Set(activeFeedbacks.map(f => f.fields.kuerzel)).size;
  const context = !event
    ? tx('Lege deine erste Veranstaltung an.')
    : active
      ? tx`${active.fields.titel} läuft — ${countOf('feedbacks', activeFeedbacks.length, appLabel('feedbacks'))} von ${namen(activeFeedbacks.map(f => f.fields.kuerzel ?? ''), 3) || tx('noch niemandem')}.`
      : tx`Bei ${event.fields.titel} ist noch keine Interaktion aktiv.`;

  const activateAction = (iaId: string) => {
    if (!event || iaId === activeId) return undefined;
    const go = flowActionFor('veranstaltungen', 'aktive_interaktion', event.record_id, iaId);
    return go ? { label: tx('Aktivieren'), onClick: go } : undefined;
  };

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{gruss(clock)}</h1>
        <p className="text-sm text-muted-foreground">{context}</p>
      </div>
      {crud.veranstaltungen.canWrite && (
        <Button onClick={() => crud.veranstaltungen.openCreate({})} className="max-sm:w-full">
          <IconPlus size={16} className="shrink-0" /> {tx('Neue Veranstaltung')}
        </Button>
      )}
    </div>
  );

  if (!event) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-2xl border p-10 text-center">
          <IconMessage size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground">{tx('Lege eine Veranstaltung mit ihren Interaktionen an, dann scannen Teilnehmende den QR-Code.')}</p>
          {crud.veranstaltungen.canWrite && (
            <Button onClick={() => crud.veranstaltungen.openCreate({})}>{tx('Erste Veranstaltung anlegen')}</Button>
          )}
        </div>
        {crud.surfaces}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <DashboardGrid
        variant="split"
        primary={
          <div className="space-y-4 overflow-hidden rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {veranstaltungen.map(v => (
                <button
                  key={v.record_id}
                  type="button"
                  onClick={() => setSelected(v.record_id)}
                  className={`min-h-9 max-w-full truncate rounded-full border px-3 text-sm ${v.record_id === event.record_id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {v.fields.titel}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {event.fields.beginn && <span>{format(new Date(event.fields.beginn), 'PPp', { locale: dateFnsLocale() })}</span>}
              {event.fields.ort && <span>· {event.fields.ort}</span>}
              <Button variant="outline" size="sm" onClick={() => openView('qr-code')}>
                <IconQrcode size={16} className="shrink-0" /> {tx('QR-Code vollbild')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => crud.veranstaltungen.openDetail(event)}>{tx('Details')}</Button>
            </div>

            {active ? (
              <>
                <button type="button" onClick={() => crud.interaktionen.openDetail(active)} className="block w-full rounded-xl bg-primary/5 p-4 text-left">
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">{tx('Aktive Interaktion')}</span>
                  <span className="mt-1 block text-lg font-semibold">{active.fields.titel}</span>
                  <span className="mt-1 block whitespace-pre-line text-sm text-muted-foreground">{active.fields.frage}</span>
                </button>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">
                      {tx`Feedbacks (${activeFeedbacks.length}) von ${countOf('feedbacks', kuerzelCount, tx('Kürzeln'))}`}
                    </h2>
                    {mergeGo && (
                      <Button size="sm" onClick={mergeGo} disabled={activeFeedbacks.length === 0}>
                        <IconBolt size={16} className="shrink-0" /> {merged ? tx('Neu zusammenführen') : tx('Zusammenführen')}
                      </Button>
                    )}
                  </div>
                  {activeFeedbacks.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{tx('Noch kein Feedback — zeige den QR-Code, damit Teilnehmende loslegen.')}</p>
                  ) : (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {activeFeedbacks.map(f => (
                        <li key={f.record_id}>
                          <button type="button" onClick={() => crud.feedbacks.openDetail(f)} className="flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted">
                            <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs">{f.fields.kuerzel}</span>
                            <span className="line-clamp-3 min-w-0 whitespace-pre-line text-sm">{f.fields.feedback_text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{tx('Zusammengeführter Text')}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={copyText} disabled={!merged}>
                        <IconCopy size={16} className="shrink-0" /> {tx('Kopieren')}
                      </Button>
                      {crud.interaktionen.canWrite && (
                        <Button variant="outline" size="sm" onClick={() => crud.interaktionen.openEdit(active)}>{tx('Bearbeiten')}</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openView('zusammengefuehrter-text')} disabled={!merged}>
                        <IconPresentation size={16} className="shrink-0" /> {tx('Text vollbild')}
                      </Button>
                    </div>
                  </div>
                  {merged ? (
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm">{merged}</pre>
                  ) : (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{tx('Noch kein Text zusammengeführt')}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {eventInteractions.length > 0
                  ? tx('Wähle rechts eine Interaktion und setze sie mit einem Klick aktiv.')
                  : tx('Diese Veranstaltung hat noch keine Interaktion.')}
                {crud.interaktionen.canWrite && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => crud.interaktionen.openCreate({ veranstaltung: event.record_id })}>
                      <IconPlus size={16} className="shrink-0" /> {tx('Interaktion anlegen')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
        aside={
          <>
            <WorkList
              title={tx('Interaktionen — eine aktiv setzen')}
              items={eventInteractions.map(i => ({
                id: i.record_id,
                title: i.fields.titel ?? '',
                secondLine: i.record_id === activeId
                  ? <span className="inline-flex items-center gap-1 font-medium text-emerald-600"><IconCheck size={14} />{tx('Aktiv')}</span>
                  : <span className="text-muted-foreground">{i.fields.frage}</span>,
                action: activateAction(i.record_id),
              }))}
              onItemClick={id => { const r = interaktionen.find(i => i.record_id === id); if (r) crud.interaktionen.openDetail(r); }}
              empty={{
                text: tx('Noch keine Interaktion angelegt.'),
                action: crud.interaktionen.canWrite ? { label: tx('Interaktion anlegen'), onClick: () => crud.interaktionen.openCreate({ veranstaltung: event.record_id }) } : undefined,
              }}
            />
            <WorkList
              title={tx('KI-Antwort fehlt noch')}
              items={awaitingKi.map(i => {
                const go = flowActionFor('interaktionen', 'ki_antwort', i.record_id);
                return {
                  id: i.record_id,
                  title: i.fields.titel ?? '',
                  secondLine: <span className="text-muted-foreground">{tx('Text liegt vor, Antwort offen')}</span>,
                  action: go ? { label: tx('Einfügen'), onClick: go } : undefined,
                };
              })}
              onItemClick={id => { const r = interaktionen.find(i => i.record_id === id); if (r) crud.interaktionen.openDetail(r); }}
              empty={{ text: kiGo ? tx('Alle Antworten sind eingetragen.') : tx('Keine Antwort offen.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
