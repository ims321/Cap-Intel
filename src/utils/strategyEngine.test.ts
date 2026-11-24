import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CAPITAL, INITIAL_PROJECTS } from '../data/capitalData';
import { EPC_CONTRACTORS } from '../data/epcData';
import {
  computePooledSpvSummary,
  evaluateWizardScenario,
  extractEpcCountries,
  filterEpcContractors,
  matchesJurisdictionScope,
  resolveJurisdictionScope,
  scoreEpcProjectFit,
  scoreRoleProjectFit,
  simulateFlowRedirection,
} from './strategyEngine';

test('jurisdiction scoping filters South Africa projects strictly when za-muni is active', () => {
  const saScope = resolveJurisdictionScope('za-muni');
  assert.equal(saScope.iso3, 'ZAF');
  assert.equal(saScope.isContinental, false);

  const nonSaProject = Object.values(INITIAL_PROJECTS).find(
    (p) => !p.jurisdiction.toLowerCase().includes('south africa') && !p.jurisdiction.toLowerCase().includes('continental')
  );
  assert.ok(nonSaProject);
  assert.equal(matchesJurisdictionScope(INITIAL_PROJECTS.p1, 'za-muni'), true);
  assert.equal(matchesJurisdictionScope(nonSaProject, 'za-muni'), false);
  assert.equal(matchesJurisdictionScope(nonSaProject, 'af-continental'), true);
});

test('3-role project fit scores Borrower, Capital Provider, and Developer/EPC consistently', () => {
  const proj = INITIAL_PROJECTS.p1;
  const borrowerFit = scoreRoleProjectFit(proj, 'borrower', EPC_CONTRACTORS, INITIAL_CAPITAL);
  const providerFit = scoreRoleProjectFit(proj, 'provider', EPC_CONTRACTORS, INITIAL_CAPITAL);
  const epcFit = scoreRoleProjectFit(proj, 'epc', EPC_CONTRACTORS, INITIAL_CAPITAL);

  assert.ok(borrowerFit.score >= 25 && borrowerFit.score <= 98);
  assert.ok(providerFit.score >= 35 && providerFit.score <= 98);
  assert.ok(epcFit.score >= 40 && epcFit.score <= 98);
  assert.equal(epcFit.topCounterparties.length, 3);

  const waterEpc = EPC_CONTRACTORS.find((e) => e.id === 'epc-3'); // Veolia Africa
  assert.ok(waterEpc);
  assert.ok(scoreEpcProjectFit(proj, waterEpc) >= 80);
});

test('wizard scenario evaluation increases debt service on FX/rate shock and rewards grant + hedge mix', () => {
  const safeMix = evaluateWizardScenario({
    capexM: 420,
    currency: 'ZAR',
    jurisdictionKey: 'za-muni',
    sector: 'Water & sanitation',
    grantPct: 28,
    concessionalPct: 48,
    commercialPct: 24,
    epcVendorFinancePct: 0,
    hedgePct: 100,
    fxShockPct: 20,
    rateBps: 150,
  });

  const riskyMix = evaluateWizardScenario({
    capexM: 420,
    currency: 'ZAR',
    jurisdictionKey: 'za-muni',
    sector: 'Water & sanitation',
    grantPct: 0,
    concessionalPct: 40,
    commercialPct: 25,
    epcVendorFinancePct: 35,
    hedgePct: 0,
    fxShockPct: 25,
    rateBps: 200,
  });

  assert.equal(safeMix.unhedgedFxDebtM, 0);
  assert.ok(safeMix.stressedTotalDebtServiceM < riskyMix.stressedTotalDebtServiceM);
  assert.equal(riskyMix.statutoryVerdict, 'Strain Risk — Increase Grant / Hedge');
  assert.ok(safeMix.indicativeDscr > riskyMix.indicativeDscr);
});

test('global flow redirection simulator calculates redirected capital and competing market shifts', () => {
  const baseOnly = simulateFlowRedirection({
    targetCountry: 'South Africa',
    baseCorridorVolumeM: 1000,
    selectedInterventions: [],
  });
  assert.equal(baseOnly.redirectedFlowsM, 0);
  assert.equal(baseOnly.crowdingInMultiple, 1);

  const intervened = simulateFlowRedirection({
    targetCountry: 'South Africa',
    baseCorridorVolumeM: 1000,
    selectedInterventions: ['legal_clearance', 'credit_wrap', 'fx_hedge', 'epc_wrap'],
  });
  assert.ok(intervened.redirectedFlowsM > 1000);
  assert.ok(intervened.crowdingInMultiple > 2);
  assert.equal(intervened.competingShifts.length, 4);
  assert.ok(intervened.waccCompressionBps >= 300);
});

test('EPC registry covers 50+ global contractors and filters accurately by country', () => {
  assert.ok(EPC_CONTRACTORS.length >= 50, `Expected >= 50 EPCs, got ${EPC_CONTRACTORS.length}`);
  const { activeCountries, hqCountries } = extractEpcCountries(EPC_CONTRACTORS);
  assert.ok(activeCountries.includes('Kenya'));
  assert.ok(hqCountries.includes('South Africa'));
  assert.ok(hqCountries.includes('United States') || hqCountries.includes('China'));

  const kenyaActive = filterEpcContractors(EPC_CONTRACTORS, { activeCountry: 'Kenya' });
  assert.ok(kenyaActive.length >= 3);

  const chinaHq = filterEpcContractors(EPC_CONTRACTORS, { hqCountry: 'China', onlyBringsCapital: true });
  assert.ok(chinaHq.length >= 3);
});

test('evaluateWizardScenario reflects live yield curve & swap pricing and Pooled SPV calculates institutional floor', () => {
  const base = evaluateWizardScenario({
    capexM: 420,
    currency: 'ZAR',
    jurisdictionKey: 'za-muni',
    sector: 'Water & sanitation',
    grantPct: 20,
    concessionalPct: 40,
    commercialPct: 25,
    epcVendorFinancePct: 10,
    hedgePct: 80,
    fxShockPct: 15,
    rateBps: 100,
  });

  const livePriced = evaluateWizardScenario({
    capexM: 420,
    currency: 'ZAR',
    jurisdictionKey: 'za-muni',
    sector: 'Water & sanitation',
    grantPct: 20,
    concessionalPct: 40,
    commercialPct: 25,
    epcVendorFinancePct: 10,
    hedgePct: 80,
    fxShockPct: 15,
    rateBps: 100,
    livePricing: {
      dfiBasePct: 8.5,
      commercialBasePct: 14.5,
      epcBasePct: 9.2,
      hedgeSwapBps: 310,
    },
  });

  assert.ok(livePriced.weightedCouponPct > base.weightedCouponPct);
  assert.ok(livePriced.stressedTotalDebtServiceM > base.stressedTotalDebtServiceM);

  const emptyPool = computePooledSpvSummary([]);
  assert.equal(emptyPool.totalPoolUsdM, 0);
  assert.equal(emptyPool.meetsInstitutionalFloor, false);

  const pool = computePooledSpvSummary(
    [INITIAL_PROJECTS.p1, INITIAL_PROJECTS.p2, INITIAL_PROJECTS.p3],
    25
  );
  assert.equal(pool.projectCount, 3);
  assert.ok(pool.totalPoolUsdM > 20);
  assert.ok(pool.couponCompressionBps >= 80);
  assert.ok(pool.projectedAnnualDebtSavingsUsdM > 0);
  const weightSum = pool.constituents.reduce((s, c) => s + c.weightPct, 0);
  assert.ok(Math.abs(weightSum - 100) < 0.5);
});
