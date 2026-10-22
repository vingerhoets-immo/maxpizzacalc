'use client';

import { useState } from 'react';
import type { Observation } from './doughPlan';

export default function ReadinessCheck({ poolish, cold, onSave, onPostpone }: {
  poolish: boolean; cold: boolean; onSave: (observation: Observation) => void; onPostpone: () => void;
}) {
  const [volume, setVolume] = useState('little');
  const [texture, setTexture] = useState('elastic');
  const [temperature, setTemperature] = useState('');
  const [result, setResult] = useState('');
  const [offerRest, setOfferRest] = useState(false);
  const [postponed, setPostponed] = useState(false);

  const check = () => {
    const measured = temperature === '' ? null : Number(temperature);
    let advice = '';
    let rest = false;
    if (volume === 'collapsed' || texture === 'slack') {
      advice = 'Der Teig könnte schon weit gereift sein. Stelle ihn vorerst kühler und prüfe vorsichtig, ob er noch Spannung hält. Zusätzliche warme Wartezeit ist jetzt meist ungünstig. Beim nächsten Teig helfen weniger Hefe oder eine kürzere warme Phase.';
    } else if (texture === 'dry') {
      advice = 'Die Oberfläche trocknet aus. Decke den Behälter dicht genug ab. Eine Haut erschwert das Dehnen und hält den Ofentrieb zurück. Beurteile zusätzlich das Volumen im Inneren.';
    } else if (poolish && volume === 'little') {
      advice = 'Der Poolish braucht wahrscheinlich noch Zeit. Er sollte viele Blasen zeigen, deutlich aufgegangen sein und angenehm hefig riechen. Prüfe ihn nach weiteren 30 Minuten; mische den Hauptteig erst mit reifem Poolish.';
      rest = true;
    } else if (volume === 'little' && (cold || (measured !== null && measured < 18))) {
      advice = 'Im kalten Teig ist die Hefe langsam. Wenig sichtbares Volumen im Kühlschrank allein beweist noch keinen Fehler. Gib den geformten Teiglingen ausreichend Zeit bei Raumtemperatur und prüfe dort erneut. Lege den Teig nicht auf eine heiße Heizung.';
    } else if (volume === 'little') {
      advice = 'Es ist noch wenig Aktivität sichtbar. Lasse den Teig abgedeckt weiter ruhen und prüfe nach 30 Minuten erneut. Bleibt er auch warm lange unverändert, kontrolliere Hefesorte, Haltbarkeit und die tatsächlich abgewogene Menge.';
      rest = true;
    } else {
      advice = poolish
        ? 'Blasen und deutliche Volumenzunahme passen zu reifem Poolish. Er sollte noch Struktur haben und nicht stark zusammengefallen sein. Wenn das zutrifft, kannst du den Hauptteig mischen.'
        : 'Volumenzunahme und eine elastische Oberfläche passen zu fortschreitender Gare. Vor dem Öffnen sollte der Teig entspannt sein, sich dehnen lassen und Gas halten. Springt er stark zurück, gib ihm noch etwas abgedeckte Ruhe.';
    }
    setResult(advice); setOfferRest(rest); setPostponed(false);
    onSave({ at: Date.now(), volume, texture, temperature: measured, advice });
  };

  return <details className="readiness-check"><summary>Teigreife prüfen</summary><p className="planner-hint">Beobachtungen helfen dir bei der Entscheidung. Der Zeitbalken allein kann die Gare nicht beurteilen.</p>
    <label>Volumen<select value={volume} onChange={event => setVolume(event.target.value)}><option value="little">Kaum verändert</option><option value="grown">Sichtbar aufgegangen, Blasen</option><option value="collapsed">Erst gestiegen, dann zusammengefallen</option></select></label>
    <label>Oberfläche und Gefühl<select value={texture} onChange={event => setTexture(event.target.value)}><option value="elastic">Weich und elastisch</option><option value="tight">Fest, zieht sich zurück</option><option value="dry">Trocken oder mit Haut</option><option value="slack">Sehr weich, hält kaum Spannung</option></select></label>
    <label>Gemessene Teigtemperatur (optional)<input type="number" min={2} max={40} step={.5} value={temperature} placeholder="°C" onChange={event => setTemperature(event.target.value)}/></label>
    <button type="button" className="btn small alt" onClick={check}>Empfehlung anzeigen</button>
    {result && <div className="readiness-result" role="status"><p>{result}</p>{offerRest && !postponed && <button type="button" className="btn small" onClick={() => { onPostpone(); setPostponed(true); }}>30 Minuten mehr Ruhe einplanen</button>}{postponed && <p>Die verbleibenden Schritte wurden um 30 Minuten verschoben.</p>}</div>}
  </details>;
}
