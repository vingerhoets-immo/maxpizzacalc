export type Method = 'direct' | 'poolish';
export type Place = 'room' | 'cold';
export type PlanStep = { id: string; at: number; title: string; phase: string; detail: string };

export type PlanSettings = {
  bakeAt: number;
  method: Method;
  place: Place;
  bulkHours: number;
  proofHours: number;
  folds: number;
  poolishHours: number;
};

export type DoughPlan = {
  bakeAt: number; serveAt: string; bulkHours: number; proofHours: number;
  cold: boolean; method: Method; folds: number; poolishHours: number;
  poolishPercent: number; roomTemperature: number; steps: PlanStep[];
  style: Recipe['style']; temperature: number; recipe: Recipe;
};

export type Observation = { at: number; volume: string; texture: string; temperature: number | null; advice: string };
export type ActiveRun = DoughPlan & {
  startedAt: number; originalBakeAt: number; completed: Record<string, number>;
  observations: Observation[];
};

const HOUR = 3600000;
const MINUTE = 60000;

export function buildSteps(settings: PlanSettings): PlanStep[] {
  const { bakeAt, method, place, bulkHours, proofHours, folds, poolishHours } = settings;
  const ballAt = bakeAt - proofHours * HOUR;
  const stockAt = ballAt - bulkHours * HOUR;
  const preparationMinutes = 30 + (folds > 0 ? (folds + 1) * 30 : 0);
  const mixAt = stockAt - preparationMinutes * MINUTE;
  const steps: PlanStep[] = [];
  if (method === 'poolish') steps.push({ id: 'poolish', at: mixAt - poolishHours * HOUR, title: 'Poolish ansetzen', phase: 'Poolish reift', detail: `${poolishHours} h abgedeckt bei Raumtemperatur; Reife prüfen, bevor du den Hauptteig mischst.` });
  steps.push({ id: 'mix', at: mixAt, title: 'Hauptteig mischen', phase: 'Kneten & Ruhe', detail: `Etwa 30 Minuten für Mischen und Kneten einplanen. Ziel-Teigtemperatur prüfen.${folds > 0 ? ' Danach 30 Minuten abgedeckt ruhen lassen.' : ''}` });
  for (let i = 1; i <= folds; i++) steps.push({ id: `fold-${i}`, at: mixAt + (i + 1) * 30 * MINUTE, title: `Stretch & Fold ${i}/${folds}`, phase: i === folds ? 'Letzte Ruhe' : 'Ruhe bis zum nächsten Falten', detail: 'Teig sanft dehnen und falten, dann 30 Minuten abgedeckt ruhen lassen.' });
  steps.push({ id: 'stock', at: stockAt, title: place === 'cold' ? 'In den Kühlschrank stellen' : 'Stockgare beginnen', phase: place === 'cold' ? 'Kalte Stockgare' : 'Stockgare', detail: `${bulkHours} h bei ${place === 'cold' ? 'Kühlschranktemperatur' : 'Raumtemperatur'}; Volumen und Oberfläche beobachten.` });
  steps.push({ id: 'ball', at: ballAt, title: 'Teiglinge formen', phase: 'Stückgare', detail: `${proofHours} h abgedeckt bei Raumtemperatur reifen lassen.` });
  steps.push({ id: 'oven', at: bakeAt - HOUR, title: 'Ofen vorheizen', phase: 'Ofen heizt vor', detail: 'Backfläche vollständig aufheizen; Temperatur möglichst am Stein oder Stahl prüfen.' });
  steps.push({ id: 'bake', at: bakeAt, title: 'Pizza backen', phase: 'Backbereit', detail: 'Ofen und Backfläche rechtzeitig vollständig vorheizen.' });
  return steps;
}

export function stamp(at: number) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(at);
}
import type { Recipe } from './doughMath';
