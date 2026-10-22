import type { ActiveRun } from './doughPlan';

// An overdue action moves the remaining work, while serveAt and originalBakeAt
// retain the user's requested oven time. Completed actions retain their history.
export function completeStep(run: ActiveRun, id: string, at: number): ActiveRun {
  const index = run.steps.findIndex(step => step.id === id);
  if (index < 0 || run.completed[id] !== undefined) return run;
  const drift = at - run.steps[index].at;
  const stockIndex = run.steps.findIndex(step => step.id === 'stock');
  const absorbInCold = drift < 0 && run.cold && index <= stockIndex;
  const shift = id === 'oven' || id === 'bake' ? Math.max(0, drift) : drift;
  const steps = run.steps.map((step, stepIndex) => {
    if (stepIndex <= index || run.completed[step.id] !== undefined) return step;
    if (absorbInCold && stepIndex > stockIndex) return step;
    return { ...step, at: step.at + shift };
  });
  if (absorbInCold) {
    const stock = steps[stockIndex];
    const ball = steps.find(step => step.id === 'ball');
    const coldHours = ((ball?.at ?? run.bakeAt) - (id === 'stock' ? at : stock.at)) / 3600000;
    steps[stockIndex] = { ...stock, detail: `Durch den früheren Start etwa ${coldHours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h kalt. Reife vor dem Formen prüfen.` };
  }
  return { ...run, steps, bakeAt: steps[steps.length - 1].at, completed: { ...run.completed, [id]: at } };
}

export function postponeRemaining(run: ActiveRun, minutes: number): ActiveRun {
  const shift = Math.max(0, minutes) * 60000;
  const steps = run.steps.map(step => run.completed[step.id] === undefined ? { ...step, at: step.at + shift } : step);
  return { ...run, steps, bakeAt: steps[steps.length - 1].at };
}
