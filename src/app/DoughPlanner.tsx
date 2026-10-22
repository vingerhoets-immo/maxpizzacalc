'use client';

import { useEffect, useMemo, useState } from 'react';
import LiveProgress from './LiveProgress';
import BakeDateTime from './BakeDateTime';
import { ActiveRun, DoughPlan, buildSteps, Method, BallingChoice, resolveBalling, stamp } from './doughPlan';
import { ingredients, Recipe, yeastEstimate } from './doughMath';

type Props = {
  balling: BallingChoice; setBalling: (value: BallingChoice) => void;
  recipe: Recipe; setRecipe: (recipe: Recipe) => void;
  mode: 'rt' | 'cold'; setMode: (mode: 'rt' | 'cold') => void;
  temp: number; setTemp: (temp: number) => void;
  roomTemp: number; setRoomTemp: (temp: number) => void;
  bulk: number; setBulk: (hours: number) => void;
  proof: number; setProof: (hours: number) => void;
  method: Method; setMethod: (method: Method) => void;
  folds: number; setFolds: (folds: number) => void;
  poolishHours: number; setPoolishHours: (hours: number) => void;
  poolishPercent: number; setPoolishPercent: (percent: number) => void;
  serveAt: string; setServeAt: (value: string) => void;
  yeast: number; autoYeast: boolean; setAutoYeast: (value: boolean) => void;
  onRunningViewChange: (value: boolean) => void;
};

const grams = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: value < 2 ? 2 : 1 });

export default function DoughPlanner(p: Props) {
  const [now, setNow] = useState<number | null>(null);
  const [active, setActive] = useState<ActiveRun | null>(null);
  const [view, setView] = useState<'plan' | 'run'>('plan');
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { p.onRunningViewChange(view === 'run' && active !== null); }, [view, active !== null, p.onRunningViewChange]);
  const date = p.serveAt.slice(0, 10), time = p.serveAt.slice(11, 16) || '19:00';
  const bakeAt = date ? new Date(`${date}T${time}`).getTime() : NaN;
  const planned = Number.isFinite(bakeAt);
  const balling = resolveBalling(p.balling, p.recipe.style, p.method, p.mode === 'cold');
  const earlyWarm = balling === 'early' && p.mode === 'rt';
  const bulkHours = earlyWarm ? 0 : p.bulk;
  const proofHours = earlyWarm ? p.bulk + p.proof : p.proof;
  const steps = useMemo(() => planned ? buildSteps({ bakeAt, balling, method: p.method, place: p.mode === 'cold' ? 'cold' : 'room', bulkHours, proofHours, folds: p.folds, poolishHours: p.poolishHours }) : [], [bakeAt, planned, balling, p.method, p.mode, bulkHours, proofHours, p.folds, p.poolishHours]);
  const plan: DoughPlan | null = planned ? { bakeAt, balling, serveAt: p.serveAt, bulkHours, proofHours, cold: p.mode === 'cold', method: p.method, folds: p.folds, poolishHours: p.poolishHours, poolishPercent: p.poolishPercent, roomTemperature: p.roomTemp, steps, style: p.recipe.style, temperature: p.temp, recipe: p.recipe } : null;
  const restore = (run: ActiveRun) => {
    p.setBalling(run.balling ?? 'late'); p.setAutoYeast(false); p.setServeAt(run.serveAt); p.setMode(run.cold ? 'cold' : 'rt'); p.setTemp(run.temperature); p.setRoomTemp(run.roomTemperature); p.setBulk(run.bulkHours); p.setProof(run.proofHours); p.setMethod(run.method); p.setFolds(run.folds); p.setPoolishHours(run.poolishHours); p.setPoolishPercent(run.poolishPercent); p.setRecipe(run.recipe); setView('run');
  };
  const estimate = yeastEstimate({ mode: p.mode, temperature: p.temp, roomTemperature: p.roomTemp, bulkHours: p.bulk, proofHours: p.proof, folds: p.folds, method: p.method, poolishHours: p.poolishHours, poolishPercent: p.poolishPercent });
  const amounts = ingredients(p.recipe, p.method, p.poolishPercent, estimate.poolishPercent);
  const lead = planned && now !== null ? (bakeAt - now) / 3600000 : null;
  const extra = .5 + (p.folds > 0 ? (p.folds + 1) * .5 : 0) + (p.method === 'poolish' ? p.poolishHours : 0);
  const suggestedCold = lead !== null && lead >= 24 + 4 + extra;
  const suggestedBulk = suggestedCold ? (lead! >= 48 + 4 + extra ? 48 : 24) : Math.max(4, Math.min(20, Math.floor((lead ?? 12) - 3 - extra)));
  const startPassed = planned && now !== null && steps[0]?.at < now;
  const nightStep = steps.find(step => step.id !== 'bake' && new Date(step.at).getHours() < 6);

  const selectBalling = (choice: BallingChoice) => {
    const next = resolveBalling(choice, p.recipe.style, p.method, p.mode === 'cold');
    if (p.mode === 'rt' && next === 'late' && earlyWarm) { const total = p.bulk + p.proof; p.setBulk(Math.max(0, total - 4)); p.setProof(Math.min(4, total)); }
    p.setBalling(choice);
  };
  return <section className="planner-shell">
    {active && <div className="process-switch" role="group" aria-label="Ansicht"><button type="button" className={view === 'plan' ? 'selected' : ''} onClick={() => setView('plan')}>Pizza planen</button><button type="button" className={view === 'run' ? 'selected' : ''} onClick={() => setView('run')}>Mein Teig läuft</button></div>}
    <div hidden={active !== null && view !== 'run'}><LiveProgress plan={plan} onResume={restore} onRunChange={value => { setActive(value); if (!value) setView('plan'); }}/></div>
    <div hidden={view === 'run'} className="comic p-4 mb-4">
      <h2 className="section-title">Wann backen wir?</h2><p className="planner-hint">Der erste Teigling kommt zu dieser Uhrzeit in den Ofen. Alle Schritte werden davon zurückgerechnet.</p>
      <BakeDateTime value={p.serveAt} onChange={p.setServeAt}/>
      {lead !== null && <div className="planner-advice"><strong>{lead < 6 + extra ? 'Für diesen Ablauf ist die Zeit knapp' : suggestedCold ? `Empfehlung: ${suggestedBulk} Stunden kalt` : 'Empfehlung: Führung bei Raumtemperatur'}</strong><p>{suggestedCold ? 'Kalte Gare passt in den verfügbaren Vorlauf. Danach sind vier Stunden für geformte Teiglinge bei Raumtemperatur eingeplant.' : 'Ein zusätzlicher Kühlschrankaufenthalt würde wenig Zeit für die anschließende warme Stückgare lassen. Für die schnelle Variante ist Direktteig einfacher.'}</p><button type="button" className="btn small alt" onClick={() => { p.setAutoYeast(true); p.setMode(suggestedCold ? 'cold' : 'rt'); p.setTemp(suggestedCold ? 4 : p.roomTemp); p.setBulk(suggestedBulk); p.setProof(suggestedCold ? 4 : 3); if (!suggestedCold) p.setMethod('direct'); }}>Empfehlung übernehmen</button></div>}
      <h3 className="planner-label">Dein Weg zum Teig</h3><div className="planner-choice"><button type="button" aria-pressed={p.method === 'direct'} className={'btn small ' + (p.method === 'direct' ? '' : 'alt')} onClick={() => p.setMethod('direct')}>Direktteig</button><button type="button" aria-pressed={p.method === 'poolish'} className={'btn small ' + (p.method === 'poolish' ? '' : 'alt')} onClick={() => p.setMethod('poolish')}>Mit Poolish</button></div><p className="planner-hint">{p.method === 'direct' ? 'Ein Ansatz, weniger Handgriffe. Eine gute Ausgangsbasis, um deine Gare kennenzulernen.' : 'Ein zusätzlicher Vorteig für Aroma und Dehnbarkeit. Erst mit vielen Blasen und deutlicher Volumenzunahme weiterverarbeiten.'}</p>
      <div className="planner-choice"><button type="button" aria-pressed={p.mode === 'rt'} className={'chip ' + (p.mode === 'rt' ? 'selected' : '')} onClick={() => { p.setMode('rt'); p.setTemp(p.roomTemp); p.setBulk(Math.min(20, p.bulk)); p.setProof(Math.max(2, p.proof)); }}>Raumtemperatur</button><button type="button" aria-pressed={p.mode === 'cold'} className={'chip ' + (p.mode === 'cold' ? 'selected' : '')} onClick={() => { p.setMode('cold'); p.setTemp(4); p.setBulk(Math.max(8, p.bulk)); p.setProof(Math.min(6, p.proof)); }}>Kühlschrank</button></div>
      <h3 className="planner-label">Wann formen wir die Teiglinge?</h3>
      <div className="planner-choice">{([{ value: 'auto', label: 'Empfohlen' }, { value: 'early', label: 'Früh formen' }, { value: 'late', label: 'Nach der Stockgare' }] as const).map(option => <button type="button" key={option.value} aria-pressed={p.balling === option.value} className={'chip ' + (p.balling === option.value ? 'selected' : '')} onClick={() => selectBalling(option.value)}>{option.label}</button>)}</div>
      <p className="planner-hint">{balling === 'early' ? p.mode === 'rt' ? 'Frühes Formen: Nach Kneten und gegebenenfalls Falten kurz entspannen lassen, dann portionieren. Die bisherige Stockgare wird zur Stückgare; die Gesamtzeit bleibt gleich.' : 'Frühes Formen: Nach der letzten Ruhe portionieren und als Teiglinge kalt reifen lassen. Anschließend warm akklimatisieren. Kleinere Portionen kühlen schneller; die Hefeschätzung bleibt ein Richtwert.' : 'Erst als gesamter Teig reifen lassen, anschließend portionieren und als Teiglinge weiterreifen lassen.'} {p.balling === 'auto' && 'Für neapolitanischen Direktteig bei Raumtemperatur empfehlen wir frühes Formen.'}</p>
      {p.mode === 'cold' && <div className="planner-choice mt-2">{[24, 48].map(hours => <button type="button" key={hours} className="chip" onClick={() => { p.setBulk(hours); p.setProof(4); }}>{hours} h kalte {balling === 'early' ? 'Stückgare' : 'Stockgare'}</button>)}</div>}
      <details className="planner-settings"><summary>Temperaturen und Zeiten anpassen</summary>
        <label className="planner-range">{p.mode === 'cold' ? 'Kühlschranktemperatur' : 'Raumtemperatur'}: <b>{p.temp} °C</b><input type="range" min={p.mode === 'cold' ? 2 : 16} max={p.mode === 'cold' ? 8 : 30} value={p.temp} onChange={event => { const value = +event.target.value; p.setTemp(value); if (p.mode === 'rt') p.setRoomTemp(value); }}/></label>
        {p.mode === 'cold' && <label className="planner-range">Raumtemperatur für Poolish und Stückgare: <b>{p.roomTemp} °C</b><input type="range" min={16} max={30} value={p.roomTemp} onChange={event => p.setRoomTemp(+event.target.value)}/></label>}
        {!earlyWarm && <label className="planner-range">{p.mode === 'cold' ? balling === 'early' ? 'Kalte Stückgare' : 'Kalte Stockgare' : 'Stockgare'}: <b>{p.bulk} h</b><input type="range" min={p.mode === 'cold' ? 8 : 0} max={p.mode === 'cold' ? 72 : 28} value={p.bulk} onChange={event => p.setBulk(+event.target.value)}/></label>}
        <label className="planner-range">{earlyWarm ? 'Gesamte Stückgare bei Raumtemperatur' : 'Warme Stückgare'}: <b>{proofHours} h</b><input type="range" min={p.mode === 'cold' ? 1 : 2} max={p.mode === 'cold' ? 6 : 32} value={proofHours} onChange={event => { if (earlyWarm) p.setBulk(0); p.setProof(+event.target.value); }}/></label>

      </details>
      {p.method === 'poolish' && <div className="planner-poolish"><label className="planner-range">Poolish-Reifezeit: <b>{p.poolishHours} h</b><input type="range" min={6} max={16} value={p.poolishHours} onChange={event => p.setPoolishHours(+event.target.value)}/></label><label className="planner-range">Mehl im Poolish: <b>{p.poolishPercent} %</b><input type="range" min={15} max={40} step={5} value={p.poolishPercent} onChange={event => p.setPoolishPercent(+event.target.value)}/></label>
        <p><b>Poolish:</b> {grams(amounts.poolish.white)} g helles Mehl · {grams(amounts.poolish.water)} ml Wasser · {grams(amounts.poolish.yeast)} g Instanthefe</p><p><b>Hauptteig zusätzlich:</b> {grams(amounts.main.white)} g helles Mehl · {grams(amounts.whole)} g Vollkorn · {grams(amounts.main.water)} ml Wasser · {grams(amounts.main.yeast)} g Instanthefe. Salz und Öl kommen in den Hauptteig.</p><p>Kleine Hefemengen mit einer Feinwaage abwiegen. Wasser und Mehl des Poolish sind bereits in der Gesamtmenge enthalten.</p>
      </div>}
      <h3 className="planner-label">Wie oft möchtest du falten?</h3><div className="planner-choice">{[0, 1, 2, 3].map(count => <button type="button" aria-pressed={p.folds === count} key={count} className={'chip ' + (p.folds === count ? 'selected' : '')} onClick={() => p.setFolds(count)}>{count === 0 ? 'Ohne Falten' : `${count} × Falten`}</button>)}</div><p className="planner-hint">30 Minuten Abstand. KitchenAid gründlich geknetet: meist 0–1 ×. Sanft von Hand gemischt: eher 2–3 ×. Slap and Fold ist alternativ eine Knetmethode zu Beginn.</p>
      <details className="planner-settings"><summary>Hefe und Berechnungsgrundlage</summary><label className="auto-yeast"><input type="checkbox" checked={p.autoYeast} onChange={event => p.setAutoYeast(event.target.checked)}/> Hefe automatisch an den Plan anpassen</label><p className="planner-hint">Orientierung: {p.yeast.toLocaleString('de-DE', { maximumFractionDigits: 3 })} % Instanthefe. Dein Rezept verwendet {p.recipe.yeast.toLocaleString('de-DE', { maximumFractionDigits: 3 })} %. Nach dem Start bleibt diese Menge für den laufenden Teig fest.</p><label className="planner-range">Manuell: <b>{p.recipe.yeast.toLocaleString('de-DE', { maximumFractionDigits: 3 })} %</b><input type="range" min=".01" max="1" step=".005" value={p.recipe.yeast} onChange={event => { p.setAutoYeast(false); p.setRecipe({ ...p.recipe, yeast: +event.target.value }); }}/></label>
        <p className="planner-hint">Die Zeit- und Temperaturkorrekturen sind Richtwerte der App. Die kalte Ausgangsrezeptur orientiert sich an <a href="https://ooni.com/blogs/recipes/cold-prove-pizza-dough" target="_blank" rel="noreferrer">Oonis kaltem Pizzateig</a>, die Poolish-Zuteilung an der <a href="https://asbe.org/article/poolish/" target="_blank" rel="noreferrer">ASB-Tabelle</a> und einer ungefähren Umrechnung Frischhefe zu Instanthefe von 3:1. Mehlstärke, Abkühlen und Teigreife müssen beobachtet werden.</p>
      </details>
      {planned && <div className="schedule-review"><h3 className="planner-label">Dein Zeitplan</h3><p className="planner-hint">Gesamter Vorlauf: {((bakeAt - steps[0].at) / 3600000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden einschließlich Vorbereitung{p.method === 'poolish' ? ' und Poolish' : ''}.</p>{startPassed && !active && <p className="live-warning">Der erste Schritt liegt bereits zurück. Wähle eine kürzere Führung oder einen späteren Backtermin, wenn du noch nicht begonnen hast.</p>}{nightStep && <p className="live-warning">{nightStep.title} liegt nachts ({stamp(nightStep.at)}). Eine andere Garzeit kann den Handgriff günstiger legen.</p>}<ol className="planner-steps">{steps.map(step => <li key={step.id}><time>{stamp(step.at)}</time><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol></div>}
      {active && <div className="planner-advice"><strong>Ein Teig läuft bereits.</strong><p>Änderungen hier sind ein neuer Entwurf. Der laufende Teig behält seine Zutaten und Uhrzeiten.</p><button type="button" className="btn small" onClick={() => setView('run')}>Zum laufenden Teig</button></div>}
    </div>
  </section>;
}
