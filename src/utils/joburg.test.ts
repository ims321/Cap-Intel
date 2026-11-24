import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COJ_ENTITIES,
  computeCojLossRecoveryImpact,
  createDefaultLineFunctionTasks,
  evaluateCojGreenBondEligibility,
  getLineFunctionCompleteness,
} from '../data/joburgData';

test('COJ_ENTITIES covers City of Johannesburg core MOEs including JW and City Power', () => {
  const acronyms = COJ_ENTITIES.map((e) => e.acronym);
  assert.ok(acronyms.includes('JW'));
  assert.ok(acronyms.includes('City Power'));
  assert.ok(acronyms.includes('JDA'));
  assert.ok(acronyms.includes('JRA'));
  assert.ok(acronyms.includes('Pikitup'));
});

test('computeCojLossRecoveryImpact lifts DSCR and debt capacity when NRW/technical losses decline', () => {
  const res = computeCojLossRecoveryImpact({
    annualRevenueRm: 14500,
    currentLossPct: 44,
    targetLossPct: 28,
    existingDebtServiceRm: 2100,
    debtCostPct: 10,
    tenorYears: 15,
  });
  assert.ok(res.recoveredRevenueRm > 1500);
  assert.ok(res.improvedDscr > res.currentDscr);
  assert.ok(res.dscrLift > 0.5);
  assert.ok(res.additionalDebtCapacityRm > 10000);
  assert.ok(res.additionalDebtCapacityUsdM > 500);
});

test('evaluateCojGreenBondEligibility maps solar, water, and BRT assets to JSE Green Bond greenium', () => {
  const solar = evaluateCojGreenBondEligibility({
    sector: 'Renewable energy',
    desc: 'City Power Solar PV + BESS substation microgrid',
  });
  assert.equal(solar.eligible, true);
  assert.ok(solar.estimatedGreeniumBps >= 25);
  assert.match(solar.icmaCategory, /Renewable Energy/i);

  const water = evaluateCojGreenBondEligibility({
    sector: 'Water & sanitation',
    desc: 'Johannesburg Water NRW turnaround and reservoir upgrade',
  });
  assert.equal(water.eligible, true);
  assert.match(water.icmaCategory, /Sustainable Water/i);
});

test('line-function tasks track executive vs departmental sign-off completeness accurately', () => {
  const tasks = createDefaultLineFunctionTasks('Johannesburg Water (SOC) Ltd', 'feasibility');
  assert.equal(tasks.length, 4);
  const comp = getLineFunctionCompleteness(tasks);
  assert.equal(comp.total, 4);
  assert.equal(comp.verifiedCount, 1); // ESG pre-verified at feasibility
  assert.equal(comp.pct, 25);
});
