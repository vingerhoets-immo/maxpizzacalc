export type Method = 'direct' | 'poolish';
export type Place = 'room' | 'cold';
export type Balling = 'early' | 'late';
export type BallingChoice = Balling | 'auto';
export function resolveBalling(choice: BallingChoice, style: Recipe['style'], method: Method, cold: boolean): Balling {
  return choice === 'auto' ? (style === 'napoli' && method === 'direct' && !cold ? 'early' : 'late') : choice;
}
export type PlanStep = { id: string; at: number; title: string; phase: string; detail: string };

export type PlanSettings = {
  bakeAt: number;
  balling?: Balling;
  method: Method;
  place: Place;
  bulkHours: number;
  proofHours: number;
  folds: number;
  poolishHours: number;
};

export type DoughPlan = {
  bakeAt: number; serveAt: string; bulkHours: number; proofHours: number;
  balling?: Balling; cold: boolean; method: Method; folds: number; poolishHours: number;
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
  const early = settings.balling === 'early';
  const cold = place === 'cold';
  const warmProof = early && !cold ? bulkHours + proofHours : proofHours;
  const ballAt = bakeAt - warmProof * HOUR - (early && cold ? bulkHours * HOUR : 0);
  const stockAt = early ? ballAt : ballAt - bulkHours * HOUR;
  const preparationMinutes = 30 + (folds > 0 ? (folds + 1) * 30 : 0);
  const mixAt = stockAt - preparationMinutes * MINUTE;
  const steps: PlanStep[] = [];
  if (method === 'poolish') steps.push({ id: 'poolish', at: mixAt - poolishHours * HOUR, title: 'Poolish ansetzen', phase: 'Poolish reift', detail: `${poolishHours} h abgedeckt bei Raumtemperatur; Reife prüfen, bevor du den Hauptteig mischst.` });
  steps.push({ id: 'mix', at: mixAt, title: 'Hauptteig mischen', phase: 'Kneten & Ruhe', detail: `${early && folds === 0 ? 'Etwa 30 Minuten für Mischen, Kneten und anschließende Entspannung einplanen; nach dem Kneten möglichst 20 Minuten ruhen lassen.' : 'Etwa 30 Minuten für Mischen und Kneten einplanen.'} Ziel-Teigtemperatur prüfen.${folds > 0 ? ' Danach 30 Minuten abgedeckt ruhen lassen.' : ''}` });
  for (let i = 1; i <= folds; i++) steps.push({ id: `fold-${i}`, at: mixAt + (i + 1) * 30 * MINUTE, title: `Stretch & Fold ${i}/${folds}`, phase: i === folds ? 'Letzte Ruhe' : 'Ruhe bis zum nächsten Falten', detail: 'Teig sanft dehnen und falten, dann 30 Minuten abgedeckt ruhen lassen.' });
  if (!early) steps.push({ id: 'stock', at: stockAt, title: cold ? 'In den Kühlschrank stellen' : 'Stockgare beginnen', phase: cold ? 'Kalte Stockgare' : 'Stockgare', detail: `${bulkHours} h bei ${cold ? 'Kühlschranktemperatur' : 'Raumtemperatur'}; Volumen und Oberfläche beobachten.` });
  steps.push({ id: 'ball', at: ballAt, title: 'Teiglinge formen', phase: early && cold ? 'Kalte Stückgare' : 'Stückgare', detail: early && cold ? `Teig portionieren, behutsam rundwirken und sofort abgedeckt in den Kühlschrank stellen. ${bulkHours} h kalt reifen lassen.` : `${warmProof} h abgedeckt bei Raumtemperatur reifen lassen. Vor dem Öffnen sollen die Teiglinge entspannt und sichtbar aufgegangen sein.` });
  if (early && cold) steps.push({ id: 'warm', at: bakeAt - proofHours * HOUR, title: 'Teiglinge aus dem Kühlschrank nehmen', phase: 'Warme Stückgare', detail: `${proofHours} h abgedeckt bei Raumtemperatur akklimatisieren und weiterreifen lassen. Nicht erneut rundwirken.` });
  steps.push({ id: 'oven', at: bakeAt - HOUR, title: 'Ofen vorheizen', phase: 'Ofen heizt vor', detail: 'Backfläche vollständig aufheizen; Temperatur möglichst am Stein oder Stahl prüfen.' });
  steps.push({ id: 'bake', at: bakeAt, title: 'Pizza backen', phase: 'Backbereit', detail: 'Ofen und Backfläche rechtzeitig vollständig vorheizen.' });
  return steps;
}

export function stamp(at: number) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(at);
}
import type { Recipe } from './doughMath';
