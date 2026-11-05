import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconMailCheck } from '@tabler/icons-react';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/blocks/Field';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, useLiveList, useVisitorKey, fieldText, labelOf,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'kontakt-hinterlegen';

export default function KontaktHinterlegen() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <KontaktForm cfg={cfg} page={page} />;
}

function KontaktForm({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');
  const kuerzel = useVisitorKey({ length: 5 });
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 0 });
  const record = veranstaltungId ? live.records.find(r => r.id === veranstaltungId) : undefined;
  const [declined, setDeclined] = useState(false);

  const f = useStepForm('teilnehmerkontakte', {
    fields: ['email', 'einwilligung', 'veranstaltung'],
    required: { email: true, einwilligung: true, veranstaltung: true },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{
      key: 'kontakt',
      entity: 'teilnehmerkontakte',
      form: f,
      primary: true,
      values: () => ({ kuerzel: kuerzel }),
    }],
    { draftKey: `kontakt-${veranstaltungId ?? 'ohne'}` },
  );

  useEffect(() => {
    if (record) f.prefill('veranstaltung', record.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  if (!veranstaltungId) {
    return (
      <PublicShell title={tx('E-Mail hinterlegen')}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code des Abends noch einmal.')}
        </p>
      </PublicShell>
    );
  }
  if (!live.loaded && live.error) {
    return (
      <PublicShell title={tx('E-Mail hinterlegen')}>
        <LoadProblem onRetry={live.reload} />
      </PublicShell>
    );
  }
  if (live.loaded && !record) {
    return (
      <PublicShell title={tx('E-Mail hinterlegen')}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  if (submit.result || declined) {
    return (
      <PublicShell title={tx('E-Mail hinterlegen')}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <IconMailCheck size={48} className="text-muted-foreground" />
          <p className="text-base font-medium">
            {submit.result ? tx('Danke, deine E-Mail-Adresse ist hinterlegt.') : tx('Alles klar — wir speichern nichts.')}
          </p>
          <p className="text-sm text-muted-foreground">
            {submit.result
              ? tx`Sie gehört zu deinem Kürzel ${kuerzel}.`
              : tx('Danke fürs Mitmachen und einen schönen Abend!')}
          </p>
        </div>
      </PublicShell>
    );
  }

  const send = async () => {
    if (!f.validate()) return;
    await submit.run();
  };

  return (
    <PublicShell
      title={tx('E-Mail hinterlegen')}
      description={record ? fieldText(record, 'titel') : undefined}
    >
      <form
        className="space-y-5"
        onSubmit={e => { e.preventDefault(); void send(); }}
        onFocus={() => prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(ep => ep.op === 'create')?.app_id ?? ''}/records`)}
      >
        <p className="text-sm text-muted-foreground">
          {tx('Freiwillig: Hinterlege deine E-Mail-Adresse zu deinem Kürzel, wenn du nach dem Abend von uns hören möchtest.')}
        </p>
        <p className="text-sm">
          {tx('Dein Kürzel')}: <span className="font-mono font-semibold tracking-widest">{kuerzel}</span>
        </p>
        <Field form={f} name="email" label={labelOf('teilnehmerkontakte', 'email')}>
          <Input {...f.field('email')} />
        </Field>
        <Field form={f} name="einwilligung" hideLabel>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox {...f.checkbox('einwilligung')} />
            <span>{tx('Ich willige ein, dass meine E-Mail-Adresse zu meinem Kürzel gespeichert wird.')}</span>
          </label>
        </Field>
        <FieldErrorSummary forms={[f]} />
        {submit.error && (
          <p className="text-sm text-destructive">
            {submit.offline
              ? tx('Keine Verbindung — deine Eingaben sind gesichert.')
              : tx('Das hat leider nicht geklappt. Bitte versuche es noch einmal.')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submit.submitting}>{tx('E-Mail hinterlegen')}</Button>
          <Button type="button" variant="ghost" onClick={() => setDeclined(true)}>{tx('Nein, danke')}</Button>
        </div>
      </form>
    </PublicShell>
  );
}
