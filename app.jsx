/* ============ Mil Raízes — App (Modal + Tweaks) ============ */

const { useState, useEffect, useCallback } = React;

/* ------------ QUOTE MODAL ------------ */
function QuoteModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [data, setData] = useState({
    services: [],
    typology: '',
    area: '',
    timing: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
    website: '', // honeypot — never shown to users
  });

  // Open from any [data-open-quote] button
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('[data-open-quote]')) {
        e.preventDefault();
        setOpen(true);
        setStep(0);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => { setOpen(false); setTimeout(() => setStep(0), 400); };

  const toggleService = (s) => {
    setData(d => ({
      ...d,
      services: d.services.includes(s)
        ? d.services.filter(x => x !== s)
        : [...d.services, s]
    }));
  };
  const setField = (k, v) => setData(d => ({ ...d, [k]: v }));

  const steps = [
    {
      label: 'Serviços',
      title: 'Em que podemos ajudar?',
      sub: 'Selecione todos os serviços relevantes para o seu projeto.',
      valid: data.services.length > 0,
      content: (
        <div className="modal__options">
          {[
            'Construção de espaços verdes',
            'Manutenção de jardins',
            'Sistemas de rega automáticos',
            'Paisagismo / Design de jardins',
            'Manutenção de campos desportivos',
            'Transplante de árvores'
          ].map(s => (
            <button
              key={s}
              className={`modal__option ${data.services.includes(s) ? 'is-selected' : ''}`}
              onClick={() => toggleService(s)}
            >
              <span className="modal__option-check">
                {data.services.includes(s) && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {s}
            </button>
          ))}
        </div>
      )
    },
    {
      label: 'Tipologia',
      title: 'Que tipo de espaço é?',
      sub: 'Ajuda-nos a calibrar a proposta.',
      valid: !!data.typology,
      content: (
        <div className="modal__options">
          {['Vivenda / Particular','Empreendimento turístico','Espaço empresarial','Instituição pública','Campo desportivo','Outro'].map(t => (
            <button
              key={t}
              className={`modal__option ${data.typology === t ? 'is-selected' : ''}`}
              onClick={() => setField('typology', t)}
            >
              <span className="modal__option-check">
                {data.typology === t && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {t}
            </button>
          ))}
        </div>
      )
    },
    {
      label: 'Dimensão',
      title: 'Qual a dimensão aproximada?',
      sub: 'Uma estimativa em m² é suficiente.',
      valid: !!data.area && !!data.timing,
      content: (
        <>
          <div className="modal__options">
            {['Até 200 m²','200 — 500 m²','500 — 1000 m²','Mais de 1000 m²','Não sei'].map(a => (
              <button
                key={a}
                className={`modal__option ${data.area === a ? 'is-selected' : ''}`}
                onClick={() => setField('area', a)}
              >
                <span className="modal__option-check">
                  {data.area === a && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                {a}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 32, marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--mute)' }}>
            Quando pretende começar?
          </div>
          <div className="modal__options">
            {['Esta semana','Este mês','Próximos 3 meses','Apenas a explorar'].map(t => (
              <button
                key={t}
                className={`modal__option ${data.timing === t ? 'is-selected' : ''}`}
                onClick={() => setField('timing', t)}
              >
                <span className="modal__option-check">
                  {data.timing === t && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                {t}
              </button>
            ))}
          </div>
        </>
      )
    },
    {
      label: 'Contactos',
      title: 'Como o contactamos?',
      sub: 'Devolvemos um orçamento base em 24-48h úteis.',
      valid: data.name && data.email,
      content: (
        <>
          <input className="modal__input" placeholder="Nome*" value={data.name} onChange={e => setField('name', e.target.value)} />
          <div className="modal__row">
            <input className="modal__input" type="email" placeholder="E-mail*" value={data.email} onChange={e => setField('email', e.target.value)} />
            <input className="modal__input" placeholder="Telefone" value={data.phone} onChange={e => setField('phone', e.target.value)} />
          </div>
          <textarea className="modal__textarea" placeholder="Notas adicionais (opcional)" value={data.notes} onChange={e => setField('notes', e.target.value)} />
        </>
      )
    }
  ];

  const isLast = step === steps.length - 1;
  const isSuccess = step === steps.length;
  const totalSteps = steps.length;
  const progress = isSuccess ? 100 : ((step + (steps[step]?.valid ? 1 : 0.4)) / totalSteps) * 100;

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || 'Ocorreu um erro. Tente novamente.');
        return;
      }
      setStep(steps.length);
    } catch {
      setSubmitError('Sem ligação ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${open ? 'is-open' : ''}`} onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__step-tag">
            {isSuccess ? 'Concluído' : `Passo ${step + 1} de ${totalSteps} · ${steps[step].label}`}
          </span>
          <button className="modal__close" onClick={close} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal__progress">
          <div className="modal__progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="modal__body">
          {isSuccess ? (
            <div className="modal__success">
              <div className="modal__success-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 16.5L13 23L26 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, marginBottom: 12 }}>
                Pedido recebido.
              </h3>
              <p style={{ color: 'var(--mute)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                Obrigado, <strong style={{ color: 'var(--ink)' }}>{data.name || 'Cliente'}</strong>. Recebemos o seu pedido e voltaremos a contactá-lo nas próximas 24-48h úteis com um orçamento base personalizado.
              </p>
            </div>
          ) : (
            <div className="modal__step">
              <h3>{steps[step].title}</h3>
              <p className="modal__step-sub">{steps[step].sub}</p>
              {steps[step].content}
            </div>
          )}
        </div>

        {!isSuccess && (
          <div className="modal__foot">
            <button
              className="modal__btn modal__btn--ghost"
              onClick={() => step === 0 ? close() : setStep(s => s - 1)}
              disabled={submitting}
            >
              {step === 0 ? 'Cancelar' : '← Voltar'}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {submitError && (
                <span style={{ fontSize: 12, color: '#c0392b', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
                  {submitError}
                </span>
              )}
              <button
                className="modal__btn modal__btn--primary"
                disabled={!steps[step].valid || submitting}
                onClick={() => isLast ? submit() : setStep(s => s + 1)}
              >
                {submitting ? 'A enviar…' : isLast ? 'Enviar pedido' : 'Continuar'}
                {!submitting && <span>→</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('quote-root')).render(<QuoteModal />);

/* ============ TWEAKS PANEL ============ */
const TWEAK_DEFAULTS = window.MR_TWEAKS;

const HEADLINE_LABELS = ['Raízes', 'Durar', 'Amanhã', 'Sonhou', '22 anos'];
const HEADLINES = [
  { line1: "Onde a paisagem", line2: "<em>cria raízes.</em>" },
  { line1: "Espaços verdes", line2: "<em>desenhados</em> para durar." },
  { line1: "Plantamos hoje", line2: "o que será <em>amanhã</em>." },
  { line1: "Da semente", line2: "ao <em>jardim</em> que sonhou." },
  { line1: "Vinte e dois anos", line2: "a <em>cultivar</em> paisagens." }
];

function MRTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--green-primary', t.primaryGreen);
    root.style.setProperty('--green-deep', t.deepGreen);
    if (t.serifFont) root.style.setProperty('--serif', `"${t.serifFont}", Georgia, serif`);

    const idx = HEADLINE_LABELS.indexOf(t.headlineVariant);
    const h = HEADLINES[idx >= 0 ? idx : 0];
    const el = document.getElementById('heroTitle');
    if (el) el.innerHTML = `${h.line1}<br>${h.line2}`;
  }, [t]);

  const onPrimaryChange = (val) => {
    setTweak({ primaryGreen: val, deepGreen: darken(val, 0.35) });
  };

  return (
    <TweaksPanel title="Tweaks · Mil Raízes">
      <TweakSection label="Cor primária" />
      <TweakColor
        label="Verde primário"
        value={t.primaryGreen}
        onChange={onPrimaryChange}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8, marginBottom: 8 }}>
        {[
          { name: 'Folha', val: '#7DB93C' },
          { name: 'Floresta', val: '#2F6B2A' },
          { name: 'Sálvia', val: '#9CAF88' },
          { name: 'Limão', val: '#A8C93A' },
          { name: 'Esmeralda', val: '#1F8A5A' }
        ].map(p => (
          <button
            key={p.val}
            onClick={() => onPrimaryChange(p.val)}
            title={p.name}
            style={{
              aspectRatio: '1',
              background: p.val,
              border: t.primaryGreen.toLowerCase() === p.val.toLowerCase() ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>

      <TweakSection label="Headline" />
      <TweakSelect
        label="Variação"
        value={t.headlineVariant}
        options={HEADLINE_LABELS}
        onChange={(v) => setTweak('headlineVariant', v)}
      />

      <TweakSection label="Tipografia" />
      <TweakSelect
        label="Display"
        value={t.serifFont}
        options={['Cormorant Garamond', 'EB Garamond', 'Playfair Display', 'Georgia']}
        onChange={(v) => setTweak('serifFont', v)}
      />
    </TweaksPanel>
  );
}

/* mini darken util — works on hex */
function darken(hex, amt) {
  const c = hex.replace('#','');
  const num = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, Math.floor(r * (1 - amt)));
  g = Math.max(0, Math.floor(g * (1 - amt)));
  b = Math.max(0, Math.floor(b * (1 - amt)));
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

const tweaksRoot = document.createElement('div');
document.body.appendChild(tweaksRoot);
ReactDOM.createRoot(tweaksRoot).render(<MRTweaks />);
