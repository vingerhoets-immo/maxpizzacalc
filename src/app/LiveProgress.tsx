'use client';

import { useEffect, useRef, useState } from 'react';
import { ingredients, yeastEstimate } from './doughMath';
import { ActiveRun, DoughPlan, stamp } from './doughPlan';
import { completeStep, postponeRemaining, hasOrderedHistory } from './runState';
import ReadinessCheck from './ReadinessCheck';
import { remaining, runProgress } from './runProgress';
export type { ActiveRun, DoughPlan } from './doughPlan';

const STORAGE_KEY = 'pizza-hq-active-dough-v4';

function readRun(): ActiveRun | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const numeric = ['bakeAt', 'bulkHours', 'proofHours', 'startedAt', 'originalBakeAt', 'folds', 'poolishHours', 'poolishPercent', 'roomTemperature', 'temperature'];
    const recipeFields = ['pizzas', 'weight', 'hydration', 'salt', 'yeast', 'oil', 'sugar', 'whole'];
    if (!value || numeric.some(key => !Number.isFinite(value[key])) || !value.recipe || recipeFields.some(key => !Number.isFinite(value.recipe[key]))) return null;
    if (typeof value.serveAt !== 'string' || !value.completed || typeof value.completed !== 'object' || typeof value.cold !== 'boolean') return null;
    if (!['direct', 'poolish'].includes(value.method) || !['napoli', 'romana'].includes(value.recipe.style)) return null;
    if (!Array.isArray(value.steps) || value.steps.length < 4 || value.steps.some((step: { id: string; at: number; title: string }) => !step.id || !Number.isFinite(step.at) || typeof step.title !== 'string')) return null;
    if (Object.values(value.completed).some(at => !Number.isFinite(at)) || !hasOrderedHistory(value)) return null;
    return { ...value, observations: Array.isArray(value.observations) ? value.observations : [] };
  } catch { return null; }
}

export default function LiveProgress({ plan, onResume, onRunChange }: {
  plan: DoughPlan | null; onResume: (run: ActiveRun) => void; onRunChange: (run: ActiveRun | null) => void;
}) {
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [storageError, setStorageError] = useState(false);
  const callbacks = useRef({ onResume, onRunChange });
  callbacks.current = { onResume, onRunChange };

  useEffect(() => {
    const restore = () => { const saved = readRun(); setNow(Date.now()); setRun(saved); callbacks.current.onRunChange(saved); if (saved) callbacks.current.onResume(saved); };
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) restore(); };
    restore();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', tick); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const save = (value: ActiveRun | null) => {
    try { if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); else localStorage.removeItem(STORAGE_KEY); setStorageError(false); }
    catch { setStorageError(true); }
    setRun(value); setNow(Date.now()); onRunChange(value);
  };

  if (!run) {
    if (!plan) return null;
    const expired = now !== null && plan.bakeAt <= now;
    return <div className="start-dock-spacer"><div className="run-start start-dock"><div><strong>{expired ? 'Der Backtermin ist vorbei.' : `Backen ${stamp(plan.bakeAt)}`}</strong><p>{expired ? 'Wähle einen neuen Backtermin.' : `Starte den Zeitstrahl, wenn du jetzt ${plan.method === 'poolish' ? 'den Poolish ansetzt' : 'den Teig mischst'}.`}</p></div><button type="button" className="btn start-primary" disabled={expired} onClick={() => {
      const startedAt = Date.now(); if (startedAt >= plan.bakeAt) return;
      const base: ActiveRun = { ...plan, startedAt, originalBakeAt: plan.bakeAt, completed: {}, observations: [] };
      const started = completeStep(base, base.steps[0].id, startedAt);
      save(started); onResume(started);
    }}>Starten <span aria-hidden="true">→</span></button></div></div>;
  }

  const current = now ?? run.startedAt;
  const next = run.steps.find(step => run.completed[step.id] === undefined);
  const progress = runProgress(run, current);
  const previous = [...run.steps].reverse().find(step => run.completed[step.id] !== undefined);
  const phase = next ? previous?.phase ?? 'Erster Schritt' : 'Alle Schritte erledigt';
  const overdue = next && current > next.at;
  const label = !next ? 'Fertig' : overdue ? `seit ${remaining(current - next.at)} fällig` : `in ${remaining(next.at - current)}`;
  const ballAt = run.completed.ball ?? run.steps.find(step => step.id === 'ball')?.at ?? run.bakeAt;
  const shifted = Math.abs(run.bakeAt - run.originalBakeAt) > 60000;
  const estimate = yeastEstimate({ mode: run.cold ? 'cold' : 'rt', temperature: run.temperature, roomTemperature: run.roomTemperature, bulkHours: run.bulkHours, proofHours: run.proofHours, folds: run.folds, method: run.method, poolishHours: run.poolishHours, poolishPercent: run.poolishPercent });
  const amounts = ingredients(run.recipe, run.method, run.poolishPercent, estimate.poolishPercent);
  const grams = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: value < 2 ? 2 : 1 });

  return <section className={'live-progress comic ' + (!next ? 'finished' : '')} aria-label="Laufender Teig und Ablauffortschritt">
    <div className="live-progress-head"><span className="live-badge"><span className="live-dot"/>{next ? 'DEIN TEIG LÄUFT' : 'GESCHAFFT'}</span><span className="live-style">{run.style === 'napoli' ? 'Neapolitanisch' : 'Dünn & knusprig'} · {run.method === 'poolish' ? 'Poolish' : 'Direktteig'}</span></div>
    <p className="live-target">Dein Backtermin <strong>{stamp(run.originalBakeAt)}</strong></p>
    <div className="live-progress-main"><div><p className="live-kicker">Aktuelle Phase</p><h2>{phase}</h2><p className="live-next">{next ? <>Nächster Schritt: <strong>{next.title}</strong></> : 'Guten Appetit!'}</p></div><div className={'live-countdown ' + (overdue ? 'overdue' : '')} aria-live="off"><span>{label}</span><small>{stamp(next?.at ?? run.bakeAt)}</small></div></div>
    <div className="progress-caption"><span>{next ? `Phase ${Math.min(progress.finished + 1, progress.count)} von ${progress.count}` : 'Alle Phasen abgeschlossen'}</span><strong>{Math.floor(progress.percent)} %</strong></div>
    <div className="live-track" role="progressbar" aria-label="Ablauffortschritt" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress.percent)} aria-valuetext={`${Math.floor(progress.percent)} Prozent des Ablaufs; ${progress.finished} von ${progress.count} Phasen abgeschlossen`}>
      <div className="live-fill" style={{ clipPath: `inset(0 ${100 - progress.percent}% 0 0 round 999px)` }}/>
    </div>
    <div className="progress-phase-labels">{run.steps.slice(1).map((step, index) => <span key={step.id} className={index < progress.finished ? 'done' : index === progress.finished ? 'current' : ''}><i aria-hidden="true">{index < progress.finished ? '✓' : index + 1}</i>{step.title}</span>)}</div>
    <div className="live-milestones"><span>Gestartet<br/><b>{stamp(run.startedAt)}</b></span><span>Teiglinge<br/><b>{stamp(ballAt)}</b></span><span>{shifted ? 'Neue Backzeit' : 'Backen'}<br/><b>{stamp(run.bakeAt)}</b></span></div>
    {next && <><p className="live-action-detail">{next.detail}</p><button type="button" className="btn live-complete" onClick={() => save(completeStep(run, next.id, Date.now()))}>Schritt jetzt ausgeführt</button></>}
    <p className="live-note">Jede Phase zählt: Bestätigte Schritte und die laufende Wartezeit bewegen den Balken. Prüfe die Teigreife zusätzlich.</p>
    {storageError && <p className="live-warning">Dieser Browser kann den Teig gerade nicht speichern. Lasse die Seite geöffnet, damit der Verlauf erhalten bleibt.</p>}
    {shifted && <p className="live-warning">Dein Zieltermin bleibt {stamp(run.originalBakeAt)}. Mit den tatsächlich ausgeführten Schritten ergibt sich {stamp(run.bakeAt)}. {run.bakeAt < run.originalBakeAt ? 'Für den späteren Zieltermin ist eine kühlere Zwischenlagerung sinnvoll; prüfe die Teigreife.' : 'Die vorgesehenen Ruhezeiten wurden beibehalten.'}</p>}
    {run.startedAt < run.steps[0].at - 30 * 60000 && <p className="live-warning">Du hast früher begonnen als geplant. Kontrolliere die Reife vor dem nächsten Schritt.</p>}
    {next && <ReadinessCheck key={next.id} poolish={previous?.id === 'poolish'} cold={run.cold && (previous?.id === 'stock' || (run.balling === 'early' && previous?.id === 'ball'))} onSave={observation => save({ ...run, observations: [...run.observations, observation] })} onPostpone={() => save(postponeRemaining(run, 30))}/>}
    <details className="run-recipe"><summary>Rezept und Verlauf dieses Teigs</summary><p>{run.recipe.pizzas} × {run.recipe.weight} g · {run.recipe.hydration} % Wasser · {run.recipe.whole} % Vollkorn</p>
      {run.method === 'poolish' && <p><b>Poolish:</b> {grams(amounts.poolish.white)} g helles Mehl · {grams(amounts.poolish.water)} ml Wasser · {grams(amounts.poolish.yeast)} g Instanthefe</p>}
      <p><b>{run.method === 'poolish' ? 'Hauptteig zusätzlich' : 'Zutaten'}:</b> {grams(amounts.main.white)} g helles Mehl · {grams(amounts.whole)} g Vollkorn · {grams(amounts.main.water)} ml Wasser · {grams(amounts.main.yeast)} g Instanthefe · {grams(amounts.salt)} g Salz · {grams(amounts.oil)} g Öl{amounts.sugar > 0 ? ` · ${grams(amounts.sugar)} g Zucker` : ''}</p>
      <ol className="planner-steps">{run.steps.map(step => <li key={step.id}><time>{stamp(run.completed[step.id] ?? step.at)}</time><div><strong>{run.completed[step.id] !== undefined ? '✓ ' : ''}{step.title}</strong></div></li>)}</ol>
      {run.observations.slice(-3).map((observation, index) => <p key={index} className="observation">Reifeprüfung {stamp(observation.at)}{observation.temperature !== null ? ` · ${observation.temperature} °C` : ''}: {observation.advice}</p>)}
    </details>
    <button type="button" className="live-end" onClick={() => { if (window.confirm('Laufenden Teig beenden und den lokalen Verlauf entfernen?')) save(null); }}>Laufenden Teig beenden</button>
  </section>;
}
