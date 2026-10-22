export type Recipe = {
  style: 'napoli' | 'romana'; pizzas: number; weight: number; hydration: number;
  salt: number; yeast: number; oil: number; sugar: number; whole: number;
};

export type YeastSettings = {
  mode: 'rt' | 'cold'; temperature: number; roomTemperature: number;
  bulkHours: number; proofHours: number; folds: number;
  method: 'direct' | 'poolish'; poolishHours: number; poolishPercent: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Source anchors, not a biological prediction. Time/temperature corrections are
// deliberately exposed as an app estimate in the UI and checked through observation.
export function yeastEstimate(p: YeastSettings) {
  const warmPreparation = .5 + (p.folds > 0 ? (p.folds + 1) * .5 : 0);
  const direct = p.mode === 'rt'
    ? .1 * 18 / (p.bulkHours + p.proofHours + warmPreparation) * Math.pow(2, (22 - p.temperature) / 10)
    : (1.4 / 607 * 100) * Math.pow(24 / p.bulkHours, .65) * Math.pow(5 / (p.proofHours + warmPreparation), .35) * Math.pow(1.35, (4 - p.temperature) / 2) * Math.pow(2, (22 - p.roomTemperature) / 10);

  // ASB poolish table: fresh yeast on poolish flour, converted to instant yeast
  // at approximately 27.5 C. Interpolate logarithmically between 4, 8 and 13.5 h.
  const hours = clamp(p.poolishHours, 6, 16);
  const anchors = hours <= 8 ? [4, .5, 8, .8 / 3] : [8, .8 / 3, 13.5, .25 / 3];
  const ratio = (hours - anchors[0]) / (anchors[2] - anchors[0]);
  const poolishDose = clamp(Math.exp(Math.log(anchors[1]) + ratio * (Math.log(anchors[3]) - Math.log(anchors[1]))) * Math.pow(2, (27.5 - p.roomTemperature) / 10), .02, 1.5);
  const poolishOnTotal = p.method === 'poolish' ? poolishDose * p.poolishPercent / 100 : 0;
  return {
    totalPercent: Math.round(clamp(Math.max(direct, poolishOnTotal), .01, 1) * 1000) / 1000,
    poolishPercent: poolishDose,
  };
}

export function ingredients(recipe: Recipe, method: 'direct' | 'poolish', poolishPercent: number, poolishYeastPercent: number) {
  const total = recipe.pizzas * recipe.weight;
  const flour = total / (1 + (recipe.hydration + recipe.salt + recipe.yeast + recipe.oil + recipe.sugar) / 100);
  const white = flour * (1 - recipe.whole / 100);
  const whole = flour - white;
  const water = flour * recipe.hydration / 100;
  const yeast = flour * recipe.yeast / 100;
  const prefermentFlour = method === 'poolish' ? Math.min(flour * poolishPercent / 100, white, water) : 0;
  const prefermentYeast = Math.min(yeast, prefermentFlour * poolishYeastPercent / 100);
  return {
    total, flour, white, whole, water, yeast,
    salt: flour * recipe.salt / 100, oil: flour * recipe.oil / 100, sugar: flour * recipe.sugar / 100,
    poolish: { white: prefermentFlour, water: prefermentFlour, yeast: prefermentYeast },
    main: { white: white - prefermentFlour, whole, water: water - prefermentFlour, yeast: yeast - prefermentYeast },
  };
}

export function hydrationTarget(style: Recipe['style'], whole: number) {
  return (style === 'napoli' ? 62 : 58) + Math.round(whole / 10);
}
