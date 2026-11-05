/**
 * KI-Antwort einfügen — 3-Schritt-Wizard.
 * Steps: 1) Interaktion mit zusammengeführtem Text wählen → 2) Antwort der KI einfügen → 3) Prüfen & speichern.
 * Reads: interaktionen (Titel, Frage, zusammengeführter Text, Veranstaltung). Writes: interaktionen.ki_antwort (update).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useKiAntwortEinfuegenFlow } from '@/lib/journey/flows/KiAntwortEinfuegen';
import { tx } from '@/i18n';

export default function KiAntwortEinfuegenPage() {
  const [step, setStep] = useState(1);
  const flow = useKiAntwortEinfuegenFlow({
    steps: { interaktionen: 1, ki_antwort: 2 },
    items: {
      interaktionen: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: ctx.ref('veranstaltung') ?? fieldText(r, 'frage'),
      }),
    },
    where: {
      interaktionen: r => fieldText(r, 'zusammengefuehrter_text').trim() !== '',
    },
  });

  const picked = flow.targets.interaktionen?.record;
  const mergedText = picked ? fieldText(picked, 'zusammengefuehrter_text') : '';
  const frage = picked ? fieldText(picked, 'frage') : '';

  return (
    <IntentWizardShell
      title={tx('KI-Antwort einfügen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Die Antwort des Chatbots zu einer Interaktion festhalten.'),
        needs: [tx('Die Antwort der KI als Text')],
      }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Wähle die Interaktion, deren Text schon zusammengeführt ist.')}>
        <EntitySelectStep
          {...flow.picks.interaktionen.select}
          {...flow.pick('interaktionen')}
          avatar="none"
          searchPlaceholder={tx('Titel der Interaktion …')}
          emptyText={tx('Keine Interaktion hat bisher einen zusammengeführten Text. Führe zuerst die Feedbacks zusammen.')}
        />
      </WizardStep>

      <WizardStep label={tx('KI-Antwort')} description={tx('Füge die Antwort des Chatbots ein.')}>
        {picked ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-secondary/50 p-4 space-y-2 overflow-hidden">
              <p className="text-sm font-medium break-words">{fieldText(picked, 'titel')}</p>
              {frage && <p className="text-sm text-muted-foreground break-words">{frage}</p>}
              <p className="text-xs font-medium text-muted-foreground pt-1">{tx('Zusammengeführter Text')}</p>
              <p className="text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{mergedText}</p>
            </div>
            <Bound form={flow.forms.interaktionen} name="ki_antwort" rows={10} />
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
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
            whatHappensNext={tx('Die Antwort wird bei der Interaktion gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          whatHappensNext={tx('Du kannst die Antwort jederzeit wieder entfernen.')}
          next={[
            { label: tx('Interaktion aktivieren'), href: '#/intents/interaktion-aktivieren' },
            { label: tx('Feedbacks zusammenführen'), href: '#/intents/feedbacks-zusammenfuehren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
