const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { buildSteps } = require('../src/app/doughPlan.ts');
const { ingredients, yeastEstimate } = require('../src/app/doughMath.ts');
const { completeStep, postponeRemaining } = require('../src/app/runState.ts');

const settings = { bakeAt: Date.parse('2026-10-24T15:00:00+02:00'), method: 'poolish', place: 'cold', bulkHours: 24, proofHours: 4, folds: 3, poolishHours: 10 };
const yeastSettings = { mode: 'cold', temperature: 4, roomTemperature: 22, bulkHours: 24, proofHours: 4, folds: 1, method: 'poolish', poolishHours: 12, poolishPercent: 25 };
const recipe = { style: 'napoli', pizzas: 4, weight: 250, hydration: 64, salt: 2.6, yeast: .2, oil: 0, sugar: 0, whole: 20 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('Saturday 15:00 includes all preparation, three rests, cold and warm phases', () => {
  const steps = buildSteps(settings);
  const at = id => steps.find(step => step.id === id).at;
  assert.equal(at('mix'), Date.parse('2026-10-23T08:30:00+02:00'));
  assert.equal(at('fold-1') - at('mix'), 60 * 60000);
  assert.equal(at('fold-3') - at('fold-2'), 30 * 60000);
  assert.equal(at('stock') - at('fold-3'), 30 * 60000);
  assert.equal(at('ball') - at('stock'), 24 * 3600000);
  assert.equal(at('bake') - at('ball'), 4 * 3600000);
  assert.equal(at('mix') - at('poolish'), 10 * 3600000);
  assert.equal(at('bake'), settings.bakeAt);
});

test('cold duration stays 24 elapsed hours over the daylight-saving change', () => {
  const steps = buildSteps({ ...settings, bakeAt: Date.parse('2026-10-25T15:00:00+01:00') });
  assert.equal(steps.find(s => s.id === 'ball').at - steps.find(s => s.id === 'stock').at, 24 * 3600000);
});

test('whole-grain poolish split preserves ingredient masses and total dough weight', () => {
  const a = ingredients(recipe, 'poolish', 40, .12);
  close(a.poolish.white + a.main.white + a.whole, a.flour);
  close(a.poolish.water + a.main.water, a.water);
  close(a.poolish.yeast + a.main.yeast, a.yeast);
  close(a.flour + a.water + a.salt + a.yeast + a.oil + a.sugar, 1000);
  assert.ok(a.main.white >= 0 && a.main.water >= 0 && a.main.yeast >= 0);
  close(a.poolish.white, a.poolish.water);
});

test('manual low yeast never creates negative final-dough yeast', () => {
  const a = ingredients({ ...recipe, yeast: .01 }, 'poolish', 40, 1);
  close(a.main.yeast, 0);
  close(a.poolish.yeast, a.yeast);
});

test('longer or warmer proofing reduces the estimate; poolish dose follows its own time', () => {
  const direct = { ...yeastSettings, method: 'direct' };
  assert.ok(yeastEstimate({ ...direct, bulkHours: 48 }).totalPercent < yeastEstimate(direct).totalPercent);
  assert.ok(yeastEstimate({ ...direct, temperature: 8 }).totalPercent < yeastEstimate(direct).totalPercent);
  assert.ok(yeastEstimate({ ...direct, roomTemperature: 26 }).totalPercent < yeastEstimate(direct).totalPercent);
  assert.ok(yeastEstimate({ ...yeastSettings, poolishHours: 16 }).poolishPercent < yeastEstimate({ ...yeastSettings, poolishHours: 6 }).poolishPercent);
});

function run() {
  return { ...settings, serveAt: '2026-10-24T15:00', cold: true, roomTemperature: 22, temperature: 4, poolishPercent: 25, style: recipe.style, recipe, steps: buildSteps(settings), startedAt: buildSteps(settings)[0].at, originalBakeAt: settings.bakeAt, completed: {}, observations: [] };
}

test('late action shifts remaining work without overwriting requested bake time or history', () => {
  const initial = run();
  const first = completeStep(initial, 'poolish', initial.steps[0].at);
  const mixAt = first.steps.find(s => s.id === 'mix').at;
  const updated = completeStep(first, 'mix', mixAt + 30 * 60000);
  assert.equal(updated.originalBakeAt, settings.bakeAt);
  assert.equal(updated.serveAt, '2026-10-24T15:00');
  assert.equal(updated.bakeAt, settings.bakeAt + 30 * 60000);
  assert.equal(updated.completed.poolish, initial.steps[0].at);
  assert.deepEqual(completeStep(updated, 'mix', mixAt + 60 * 60000), updated);
});

test('additional rest moves only pending actions and preserves the target', () => {
  const initial = run();
  const started = completeStep(initial, 'poolish', initial.steps[0].at);
  const later = postponeRemaining(started, 30);
  assert.equal(later.steps[0].at, started.steps[0].at);
  assert.equal(later.steps[1].at, started.steps[1].at + 30 * 60000);
  assert.equal(later.originalBakeAt, settings.bakeAt);
});

test('early poolish start keeps its own ripening time and absorbs extra time in cold proofing', () => {
  const initial = run();
  const actual = initial.steps[0].at - 2 * 3600000;
  const early = completeStep(initial, 'poolish', actual);
  assert.equal(early.steps.find(s => s.id === 'mix').at - actual, 10 * 3600000);
  assert.equal(early.steps.find(s => s.id === 'ball').at, initial.steps.find(s => s.id === 'ball').at);
  assert.equal(early.bakeAt, initial.bakeAt);
});
