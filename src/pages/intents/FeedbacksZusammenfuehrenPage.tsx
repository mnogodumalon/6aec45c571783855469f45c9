/**
 * Feedbacks zusammenführen — 4-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Aktive Interaktion und ihre Feedbacks ansehen → 3) Zusammenführen → 4) Text prüfen & speichern.
 * Reads: veranstaltungen, interaktionen, feedbacks. Writes: interaktionen (zusammengefuehrter_text, via useFeedbacksZusammenfuehrenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldRef, fieldDate, refFilter, useLiveList } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useFeedbacksZusammenfuehrenFlow } from '@/lib/journey/flows/FeedbacksZusammenfuehren';
import { tx } from '@/i18n';

export default function FeedbacksZusammenfuehrenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [mergedText, setMergedText] = useState('');

  // Derived text is assembled in step 3 and handed to the plan through this holder.
  const textHolder = useMemo(() => ({ current: '' }), []);
  textHolder.current = mergedText;

  const flow = useFeedbacksZusammenfuehrenFlow({
    steps: { interaktionen: 1 },
    items: { interaktionen: r => ({ id: r.id, title: fieldText(r, 'titel') }) },
    compute: { zusammengefuehrter_text: () => textHolder.current },
  });

  const events = useLiveList(flow.port, 'veranstaltungen', { intervalMs: 0 });
  const interPick = flow.pick('interaktionen');
  const activeId = interPick.selectedId ?? null;

  const feedbacksLive = useLiveList(flow.port, 'feedbacks', {
    intervalMs: 0,
    list: activeId ? { filter: refFilter('interaktion', activeId) } : undefined,
    enabled: Boolean(activeId),
  });
  const feedbacks = useMemo(
    () => feedbacksLive.records
      .filter(r => fieldRef(r, 'interaktion') === activeId)
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [feedbacksLive.records, activeId],
  );

  const interaktion = (flow.targets.interaktionen?.record ?? null) as JourneyRecord | null;

  const eventItems = events.records.map(r => ({
    id: r.id,
    title: fieldText(r, 'titel'),
    subtitle: [fieldDate(r, 'beginn'), fieldText(r, 'ort')].filter(Boolean).join(' · ') || undefined,
  }));

  const buildText = () => {
    const vor = interaktion ? fieldText(interaktion, 'vorprompt') : '';
    const end = interaktion ? fieldText(interaktion, 'endprompt') : '';
    const lines = feedbacks.map(r => `${fieldText(r, 'kuerzel')}: ${fieldText(r, 'feedback_text')}`);
    return [vor, lines.join('\n'), end].filter(p => p.trim() !== '').join('\n\n');
  };

  const pickEvent = async (id: string) => {
    setEventId(id);
    const ev = events.records.find(r => r.id === id);
    const aktiv = ev ? fieldRef(ev, 'aktive_interaktion') : null;
    if (aktiv) interPick.onSelect(aktiv);
    setStep(2);
  };

  const noActive = !activeId;
  const eventTitle = eventId ? fieldText(events.records.find(r => r.id === eventId) ?? ({ fields: {} } as JourneyRecord), 'titel') : '';

  return (
    <IntentWizardShell
      title={tx('Feedbacks zusammenführen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Alle Feedbacks der aktiven Interaktion in einem Text für die KI bündeln.'), needs: [tx('Eine Veranstaltung mit aktiver Interaktion')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung willst du die Feedbacks zusammenführen?')}>
        <EntitySelectStep
          items={eventItems}
          loading={events.loading && !events.loaded}
          error={events.error ? events.error.message : null}
          create={false}
          selectedId={eventId}
          onSelect={pickEvent}
          searchPlaceholder={tx('Veranstaltung suchen …')}
          emptyText={tx('Es gibt noch keine Veranstaltung.')}
        />
      </WizardStep>

      <WizardStep label={tx('Feedbacks')} description={tx('Das ist die aktive Interaktion mit allen bisher eingegangenen Feedbacks.')}>
        {noActive ? (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            <span className="text-sm text-muted-foreground">
              {tx('Diese Veranstaltung hat keine aktive Interaktion.')}{' '}
              <a className="underline" href="#/intents/interaktion-aktivieren">{tx('Interaktion aktivieren')}</a>
            </span>
          </StepNav>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 overflow-hidden">
              {eventTitle && <p className="text-xs text-muted-foreground truncate">{eventTitle}</p>}
              <p className="font-medium">{interaktion ? fieldText(interaktion, 'titel') : tx('Aktive Interaktion')}</p>
              {interaktion && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fieldText(interaktion, 'frage')}</p>}
            </div>
            <p className="text-sm font-medium">{tx`${feedbacks.length} Feedbacks`}</p>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{feedbacksLive.loading ? tx('Lade Feedbacks …') : tx('Noch keine Feedbacks eingegangen.')}</p>
            ) : (
              <ul className="space-y-2">
                {feedbacks.map(r => (
                  <li key={r.id} className="rounded-xl border bg-card p-3 overflow-hidden">
                    <span className="font-semibold mr-2">{fieldText(r, 'kuerzel')}</span>
                    <span className="text-sm whitespace-pre-wrap break-words">{fieldText(r, 'feedback_text')}</span>
                  </li>
                ))}
              </ul>
            )}
            <StepNav onBack={() => setStep(1)} nextDisabled={feedbacks.length === 0} nextStepLabel={tx('Zusammenführen')} onNext={() => setMergedText(buildText())} />
          </div>
        )}
      </WizardStep>

      <WizardStep label={tx('Zusammenführen')} description={tx('Vorprompt, Feedbacks mit Kürzel und Endprompt als ein Text.')}>
        <div className="space-y-4">
          <Textarea value={mergedText || buildText()} readOnly rows={14} className="w-full" />
          <StepNav onBack={() => setStep(2)} nextStepLabel={tx('Prüfen')} onNext={() => { setMergedText(m => m || buildText()); }} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'zusammengefuehrter_text', label: tx('Zusammengeführter Text'), value: mergedText }]}
            whatHappensNext={tx('Der Text wird in der Interaktion gespeichert und kann der KI übergeben werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[{ label: tx('Zusammengeführter Text'), value: fieldText(flow.submit.result.primary, 'zusammengefuehrter_text') || mergedText }]}
          next={[
            { label: tx('KI-Antwort einfügen'), href: '#/intents/ki-antwort-einfuegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
