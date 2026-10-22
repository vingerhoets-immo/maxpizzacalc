import type { ActiveRun } from './doughPlan';

/** Each interval between two actions gets one visible segment, independent of duration. */
export function runProgress(run: ActiveRun, now: number) {
  const nextIndex = run.steps.findIndex(step => run.completed[step.id] === undefined);
  const count = run.steps.length - 1;
  if (nextIndex === -1) return { percent: 100, segments: Array(count).fill(1) as number[], finished: count, count };
  const finished = Math.max(0, nextIndex - 1);
  const previous = run.steps[Math.max(0, nextIndex - 1)];
  const start = run.completed[previous.id] ?? run.startedAt;
  const end = run.steps[nextIndex].at;
  // A due action still needs confirmation. Time alone cannot finish the workflow.
  const fraction = nextIndex === 0 ? 0 : Math.max(0, Math.min(.95, (now - start) / Math.max(1000, end - start)));
  const segments = Array.from({ length: count }, (_, i) => i < finished ? 1 : i === finished ? fraction : 0);
  return { percent: (finished + fraction) / count * 100, segments, finished, count };
}

export function remaining(value: number) {
  const seconds = Math.max(0, Math.ceil(value / 1000));
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  return `${days ? `${days} T · ` : ''}${clock}`;
}
