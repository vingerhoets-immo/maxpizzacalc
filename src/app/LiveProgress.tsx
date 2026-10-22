'use client';

import { useEffect, useState } from 'react';

type Recipe = {
  style: 'napoli' | 'romana';
  pizzas: number;
  weight: number;
  hydration: number;
  salt: number;
  yeast: number;
  oil: number;
  sugar: number;
  whole: number;
};

export type DoughPlan = {
  bakeAt: number;
  serveAt: string;
  bulkHours: number;
  proofHours: number;
  cold: boolean;
  style: 'napoli' | 'romana';
  temperature: number;
  recipe: Recipe;
};

export type ActiveRun = DoughPlan & { startedAt: number };

const STORAGE_KEY = 'pizza-hq-active-dough-v2';
const HOUR = 60 * 60 * 1000;

function readRun(): ActiveRun | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (
      value && Number.isFinite(value.bakeAt) && typeof value.serveAt === 'string' &&
      Number.isFinite(value.temperature) && value.recipe && Number.isFinite(value.recipe.hydration) &&
      Number.isFinite(value.bulkHours) &&
      Number.isFinite(value.proofHours) && Number.isFinite(value.startedAt) &&
      typeof value.cold === 'boolean' && (value.style === 'napoli' || value.style === 'romana')
    ) return value;
  } catch { /* A damaged local entry should not block the calculator. */ }
  return null;
}

function clock(value: number) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(value);
}

function remaining(value: number) {
  const minutes = Math.max(0, Math.ceil(value / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days} T`, hours && `${hours} Std`, (mins || (!days && !hours)) && `${mins} Min`].filter(Boolean).join(' ');
}

export default function LiveProgress({ plan, onResume }: { plan: DoughPlan | null; onResume: (run: ActiveRun) => void }) {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => { const saved = readRun(); setNow(Date.now()); setRun(saved); if (saved) onResume(saved); };
    const tick = () => setNow(Date.now());
    sync();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []); // Restore the saved plan once; later edits stay visible as a comparison.

  if (!run) {
    if (!plan) return null;
    const expired = now !== null && plan.bakeAt <= now;
    return <div className="run-start"><div><strong>{expired ? 'Der Backtermin ist vorbei.' : 'Dein Zeitplan steht.'}</strong><p>{expired ? 'Wähle einen neuen Backtermin, um einen Teig zu starten.' : 'Wenn der Teig angesetzt ist, begleitet dich hier ein Live-Zeitstrahl.'}</p></div><button type="button" className="btn green" disabled={expired} onClick={() => { const startedAt = Date.now(); if (startedAt >= plan.bakeAt) return; const next = { ...plan, startedAt }; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setRun(next); setNow(startedAt); }}>Teig gestartet</button></div>;
  }

  const mixAt = run.bakeAt - (run.bulkHours + run.proofHours + .5) * HOUR;
  const stockAt = run.bakeAt - (run.bulkHours + run.proofHours) * HOUR;
  const ballAt = run.bakeAt - run.proofHours * HOUR;
  const current = now ?? run.startedAt;
  const progress = Math.max(0, Math.min(100, ((current - mixAt) / (run.bakeAt - mixAt)) * 100));
  const next = current < stockAt
    ? { label: 'Stockgare starten', at: stockAt, phase: 'Kneten & Ruhe' }
    : current < ballAt
      ? { label: 'Teiglinge formen', at: ballAt, phase: run.cold ? 'Kalte Stockgare' : 'Stockgare' }
      : current < run.bakeAt
        ? { label: 'Pizza backen', at: run.bakeAt, phase: 'Stückgare' }
        : { label: 'Backzeit erreicht', at: run.bakeAt, phase: 'Bereit zum Backen' };
  const label = current >= run.bakeAt ? 'Jetzt' : `in ${remaining(next.at - current)}`;
  const changed = plan && (plan.bakeAt !== run.bakeAt || plan.bulkHours !== run.bulkHours || plan.proofHours !== run.proofHours || plan.cold !== run.cold || plan.style !== run.style || plan.temperature !== run.temperature || JSON.stringify(plan.recipe) !== JSON.stringify(run.recipe));

  return <section className="live-progress comic" aria-label="Laufender Teig und Zeitfortschritt">
    <div className="live-progress-head"><span className="live-badge"><span className="live-dot"/> DEIN TEIG LÄUFT</span><span className="live-style">{run.style === 'napoli' ? 'Neapolitanisch' : 'Dünn & kross'}</span></div>
    <div className="live-progress-main"><div><p className="live-kicker">Aktuelle Phase</p><h2>{next.phase}</h2><p className="live-next">Nächster Schritt: <strong>{next.label}</strong></p></div><div className="live-countdown" aria-live="off"><span>{label}</span><small>{clock(next.at)}</small></div></div>
    <div className="live-track" role="progressbar" aria-label="Zeitfortschritt bis zum Backen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${Math.round(progress)} Prozent der geplanten Zeit vergangen`}><div className="live-fill" style={{ width: `${progress}%` }} /></div>
    <div className="live-milestones"><span>Kneten<br/><b>{clock(mixAt)}</b></span><span>Teiglinge<br/><b>{clock(ballAt)}</b></span><span>Backen<br/><b>{clock(run.bakeAt)}</b></span></div>
    <p className="live-note">Zeitfortschritt nach Plan · Der Balken misst nicht die tatsächliche Teigreife.</p>
    {changed && <p className="live-warning">Du hast den Plan darunter geändert. Der laufende Teig nutzt weiterhin die beim Start gespeicherten Zeiten.</p>}
    {run.startedAt < mixAt - 30 * 60000 && <p className="live-warning">Du hast den Teig vor dem geplanten Knetbeginn gestartet. Prüfe die nächsten Zeiten anhand der tatsächlichen Reife.</p>}
    {run.startedAt > mixAt + 30 * 60000 && <p className="live-warning">Du hast den Teig nach dem geplanten Knetbeginn gestartet. Prüfe die nächsten Zeiten anhand der tatsächlichen Reife.</p>}
    <button type="button" className="live-end" onClick={() => { if (window.confirm('Laufenden Teig beenden?')) { localStorage.removeItem(STORAGE_KEY); setRun(null); } }}>Laufenden Teig beenden</button>
  </section>;
}
