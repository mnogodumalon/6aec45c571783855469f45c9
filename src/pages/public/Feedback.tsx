import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, useLiveList, useVisitorKey, visitorKey,
  fieldText, fieldRef, recordIdOf,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'feedback';

function newKennung(): string {
  const c = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '';
  return c || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function FeedbackForm({ cfg, page, veranstaltungId }: { cfg: PublicPagesConfig; page: PublicPageConfig; veranstaltungId: string }) {
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const veranstaltungen = useLiveList(port, 'veranstaltungen', { intervalMs: 15000 });
  const interaktionen = useLiveList(port, 'interaktionen', { intervalMs: 15000 });
  const storedKey = useVisitorKey({ length: 5 });
  const kennung = useRef<string>(newKennung());
  const [sentKey, setSentKey] = useState<string | null>(null);

  const veranstaltung = veranstaltungen.records.find(r => r.id === veranstaltungId) ?? null;
  const aktivId = veranstaltung ? recordIdOf(fieldRef(veranstaltung, 'aktive_interaktion')) : null;
  const aktiv = aktivId ? interaktionen.records.find(r => r.id === aktivId) ?? null : null;

  const f = useStepForm('feedbacks', {
    fields: ['feedback_text'],
    required: { feedback_text: true },
    autoComplete: true,
  });
  const submit = useJourneySubmit(port, [{
    key: 'feedback',
    entity: 'feedbacks',
    form: f,
    primary: true,
    values: () => ({
      kuerzel: visitorKey({ length: 5 }),
      absende_kennung: kennung.current,
      interaktion: aktivId ?? '',
    }),
  }], { draftKey: `feedback-${veranstaltungId}` });

  useEffect(() => { prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id ?? ''}/records`); }, [cfg, page]);

  if (!veranstaltungen.loaded && veranstaltungen.error) return <LoadProblem onRetry={veranstaltungen.reload} />;
  if (!veranstaltungen.loaded || !interaktionen.loaded) {
    if (interaktionen.error && !interaktionen.loaded) return <LoadProblem onRetry={interaktionen.reload} />;
    return <p className="text-sm text-muted-foreground">{tx('Wird geladen …')}</p>;
  }
  if (!veranstaltung) {
    return <p className="text-sm">{tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}</p>;
  }

  if (sentKey) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold">{tx('Danke für dein Feedback!')}</p>
        <p className="text-sm text-muted-foreground">{tx('Dein Kürzel für heute Abend:')}</p>
        <p className="text-3xl font-mono font-bold tracking-widest">{sentKey}</p>
        <Button
          onClick={() => {
            kennung.current = newKennung();
            submit.reset();
            f.reset();
            setSentKey(null);
          }}
        >
          {tx('Weiteres Feedback abgeben')}
        </Button>
      </div>
    );
  }

  if (!aktiv) {
    return (
      <p className="text-sm text-muted-foreground">
        {tx('Gerade ist keine Frage geöffnet. Diese Seite aktualisiert sich von selbst.')}
      </p>
    );
  }

  const send = async () => {
    if (!f.validate()) return;
    const res = await submit.run();
    if (res) setSentKey(storedKey);
  };

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void send(); }}>
      <div className="rounded-lg bg-muted p-4" data-key="interaktion">
        <p className="text-xs text-muted-foreground">{fieldText(aktiv, 'titel')}</p>
        <p className="mt-1 whitespace-pre-line font-medium">{fieldText(aktiv, 'frage')}</p>
      </div>
      <Bound form={f} name="feedback_text" rows={5} />
      <FieldErrorSummary forms={[f]} />
      {submit.error && !submit.offline && (
        <p className="text-sm text-destructive">{tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}</p>
      )}
      {submit.offline && (
        <p className="text-sm text-muted-foreground">{tx('Keine Verbindung — deine Eingaben sind gesichert.')}</p>
      )}
      <Button type="submit" className="w-full" disabled={submit.submitting}>
        {tx('Absenden')}
      </Button>
    </form>
  );
}

export default function Feedback() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }

  return (
    <PublicShell title={page.title || tx('Dein Feedback')}>
      {veranstaltungId
        ? <FeedbackForm cfg={cfg} page={page} veranstaltungId={veranstaltungId} />
        : <p className="text-sm">{tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code der Veranstaltung.')}</p>}
    </PublicShell>
  );
}
