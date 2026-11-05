/**
 * Interaktion aktivieren — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Eine Interaktion dieser Veranstaltung wählen → 3) Prüfen & als aktiv setzen.
 * Reads: veranstaltungen, interaktionen. Writes: veranstaltungen.aktive_interaktion (update, via useInteraktionAktivierenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, SummaryStep, SuccessStep.
 */
import { useEffect, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldDate, fieldRef } from '@/lib/journey';
import { useInteraktionAktivierenFlow } from '@/lib/journey/flows/InteraktionAktivieren';
import { tx } from '@/i18n';

export default function InteraktionAktivierenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);

  const flow = useInteraktionAktivierenFlow({
    steps: { veranstaltungen: 1, aktive_interaktion: 2 },
    items: {
      veranstaltungen: r => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: [fieldDate(r, 'beginn'), fieldText(r, 'ort')].filter(Boolean).join(' · ') || undefined,
      } as { id: string; title: string }),
      aktive_interaktion: r => {
        const nr = fieldNumber(r, 'reihenfolge');
        return {
          id: r.id,
          title: nr != null ? `${nr}. ${fieldText(r, 'titel')}` : fieldText(r, 'titel'),
          subtitle: fieldText(r, 'frage'),
        } as { id: string; title: string };
      },
    },
    where: {
      aktive_interaktion: r => !eventId || fieldRef(r, 'veranstaltung') === eventId,
    },
  });

  const eventPick = flow.pick('veranstaltungen');
  const pickedEvent = (eventPick.selectedId as string | null | undefined) ?? null;
  useEffect(() => { setEventId(pickedEvent); }, [pickedEvent]);

  return (
    <IntentWizardShell
      title={tx('Interaktion aktivieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Setze mit einem Klick die aktive Interaktion einer Veranstaltung.'),
        needs: [tx('Die Veranstaltung'), tx('Die Interaktion, die jetzt laufen soll')],
      }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung soll eine Interaktion aktiv werden?')}>
        <EntitySelectStep
          {...flow.picks.veranstaltungen.select}
          {...eventPick}
          onSelect={id => { setEventId(id); eventPick.onSelect(id); }}
          searchPlaceholder={tx('Titel oder Ort …')}
        />
      </WizardStep>
      <WizardStep label={tx('Interaktion')} description={tx('Welche Interaktion dieser Veranstaltung soll aktiv sein?')}>
        {pickedEvent ? (
          <EntitySelectStep
            {...flow.picks.aktive_interaktion.select}
            {...flow.pick('aktive_interaktion')}
            searchPlaceholder={tx('Titel oder Frage …')}
            emptyText={tx('Diese Veranstaltung hat noch keine Interaktion.')}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Als aktiv setzen')}
            whatHappensNext={tx('Die gewählte Interaktion ersetzt die bisher aktive Interaktion dieser Veranstaltung.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          title={tx('Interaktion aktiviert')}
          next={[
            { label: tx('Feedbacks zusammenführen'), href: '#/intents/feedbacks-zusammenfuehren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
