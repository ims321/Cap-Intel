import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CAPITAL, INITIAL_ENGAGEMENTS, INITIAL_PROJECTS, SCENARIOS } from '../data/capitalData';
import {
  buildProjectFromOfficial,
  OFFICIAL_PIPELINE_PROJECTS,
} from '../data/continentalProjects';
import { buildCapitalGuidePayload } from './aiContext';
import {
  convertCapexAcrossLendingCurrencies,
  getCurrencySymbol,
  getJurisdictionCurrencyProfile,
} from './currencies';
import { computeScenario } from './finance';
import { buildProjectBrief, buildScenarioStructureDetail } from './projectBrief';
import {
  defaultGoverningLawForJurisdiction,
  filterOfficialPipelines,
  generateDealDocument,
  matchesOverlookedSegment,
} from './templates';

test('generateDealDocument populates jurisdiction-specific NDA, Term Sheet, and Close Memo', () => {
  const proj = INITIAL_PROJECTS.p1;
  const prov = INITIAL_CAPITAL.find((c) => c.id === 'c1')!;

  const nda = generateDealDocument('nda', {
    project: proj,
    provider: prov,
    signatory: 'T. Mokoena',
    signatoryTitle: 'Municipal CFO',
  });
  assert.equal(nda.targetNextStatus, 'nda');
  assert.ok(nda.plainText.includes('T. Mokoena'));
  assert.ok(nda.plainText.includes('MFMA'));
  assert.ok(nda.plainText.includes(prov.name));

  const ts = generateDealDocument('termsheet', { project: proj, provider: prov });
  assert.equal(ts.targetNextStatus, 'terms');
  assert.ok(ts.clauses.some((c) => c.body.includes(prov.ticket)));

  const closeMemo = generateDealDocument('closememo', { project: proj, provider: prov });
  assert.equal(closeMemo.targetNextStatus, 'closed');

  const ppa = generateDealDocument('ppa_offtake', {
    project: proj,
    provider: prov,
    builderParams: { offtakerName: 'City Water Board', tariffRate: 'R14.20 / kL indexed' },
  });
  assert.ok(ppa.plainText.includes('City Water Board'));
  assert.ok(ppa.plainText.includes('R14.20 / kL indexed'));

  const epcWrap = generateDealDocument('epc_wrap', {
    project: proj,
    provider: prov,
    builderParams: { epcPartnerName: 'Suez / Veolia JV', perfBondPct: 15, ldCapPct: 20 },
  });
  assert.ok(epcWrap.plainText.includes('Suez / Veolia JV'));
  assert.ok(epcWrap.plainText.includes('15%'));
  assert.ok(epcWrap.plainText.includes('20%'));

  const pppPass = generateDealDocument('ppp_gate', {
    project: proj,
    provider: prov,
    builderParams: { localJvPct: 35 },
  });
  assert.ok(pppPass.plainText.includes('PASSES typical 30%'));

  const pppWarn = generateDealDocument('ppp_gate', {
    project: proj,
    provider: prov,
    builderParams: { localJvPct: 15 },
  });
  assert.ok(pppWarn.plainText.includes('BELOW 30% BENCHMARK'));
});

test('defaultGoverningLawForJurisdiction resolves African statutory regimes', () => {
  assert.ok(defaultGoverningLawForJurisdiction('Kenya — County').includes('PFMA 2012'));
  assert.ok(defaultGoverningLawForJurisdiction('DRC — Provincial').includes('OHADA'));
});

test('matchesOverlookedSegment filters non-traditional capital pockets accurately', () => {
  const allOverlooked = INITIAL_CAPITAL.filter((c) =>
    matchesOverlookedSegment(c, 'overlooked')
  );
  assert.ok(allOverlooked.length >= 70);

  const gulf = INITIAL_CAPITAL.filter((c) =>
    matchesOverlookedSegment(c, 'gulf_south_south')
  );
  assert.ok(gulf.some((c) => c.name.includes('BADEA')));
  assert.ok(gulf.some((c) => c.name.includes('Islamic Development Bank')));

  const localCcy = INITIAL_CAPITAL.filter((c) =>
    matchesOverlookedSegment(c, 'local_ccy')
  );
  assert.ok(localCcy.some((c) => c.name.includes('TCX')));
  assert.ok(localCcy.some((c) => c.name.includes('InfraCredit')));
});

test('OFFICIAL_PIPELINE_PROJECTS are pre-sourced natively into INITIAL_PROJECTS in platform Project format', () => {
  const auOnly = filterOfficialPipelines(OFFICIAL_PIPELINE_PROJECTS, {
    sourceCategory: 'AU Agenda 2063 / PIDA',
  });
  assert.ok(auOnly.length >= 8);

  const dfiOnly = filterOfficialPipelines(OFFICIAL_PIPELINE_PROJECTS, {
    sourceCategory: 'Multilateral / DFI',
  });
  assert.ok(dfiOnly.length >= 7);

  const nationalOnly = filterOfficialPipelines(OFFICIAL_PIPELINE_PROJECTS, {
    sourceCategory: 'National Official Agency',
  });
  assert.ok(nationalOnly.length >= 10);

  assert.ok(Object.keys(INITIAL_PROJECTS).length >= 28);
  const lobito = INITIAL_PROJECTS['au-pida-1'];
  assert.ok(lobito);
  assert.equal(lobito.sourceCategory, 'AU Agenda 2063 / PIDA');
  assert.equal(lobito.stages.length, 6);
  assert.ok(lobito.gaps.length >= 2);
  assert.equal('officialUrl' in auOnly[0], false);

  const imported = buildProjectFromOfficial(auOnly[0], 'p-imported');
  assert.equal(imported.id, 'p-imported');
  assert.equal(imported.name, auOnly[0].name);
});

test('Capital Explorer contains exclusively real institutions with zero archetype or placeholder names', () => {
  const forbidden = /(archetype|placeholder|\(illustrative\)|syndicate \()/i;
  for (const prov of INITIAL_CAPITAL) {
    assert.equal(
      forbidden.test(prov.name),
      false,
      `Provider name "${prov.name}" contains placeholder/archetype wording`
    );
    assert.equal(
      forbidden.test(prov.source),
      false,
      `Provider source "${prov.source}" contains placeholder/archetype wording`
    );
  }
  assert.ok(INITIAL_CAPITAL.some((c) => c.name.includes('A.P. Moller Capital')));
  assert.ok(INITIAL_CAPITAL.some((c) => c.name.includes('Wellcome Trust')));
  assert.ok(INITIAL_CAPITAL.some((c) => c.name.includes('Investec Bank')));
});

test('buildProjectBrief builds comprehensive one-pager investment brief across project types', () => {
  for (const pid of ['p1', 'au-pida-1', 'p3']) {
    const proj = INITIAL_PROJECTS[pid];
    assert.ok(proj, `Expected project ${pid}`);
    const brief = buildProjectBrief(proj, INITIAL_CAPITAL);

    const shareTotal = brief.capitalStack.reduce((s, r) => s + r.sharePct, 0);
    assert.equal(shareTotal, 100);
    assert.ok(brief.executiveThesis.length > 80);
    assert.ok(brief.legalProfile.rules.length >= 1);
    assert.equal(brief.matchedProviders.length, 6);
    assert.equal(brief.roadmap.length, 3);
    assert.ok(brief.impact.peakAnnualJobs > 0);
    assert.ok(brief.plainTextReport.includes('INDICATIVE CAPITAL STACK'));
  }
});

test('buildScenarioStructureDetail tranche totals reconcile with computeScenario across all scenarios', () => {
  for (const sc of SCENARIOS) {
    const agg = computeScenario(sc, 15, 100);
    const detail = buildScenarioStructureDetail(sc, 15, 100);
    const trancheSumM = detail.tranches.reduce((s, t) => s + t.totalDebtServiceM, 0);
    assert.ok(
      Math.abs(trancheSumM - agg.total / 1e6) < 0.05,
      `Scenario ${sc.id} mismatch: ${trancheSumM} vs ${agg.total / 1e6}`
    );
    assert.equal(detail.sensitivityGrid.length, 3);
    assert.equal(detail.sensitivityGrid[0].cells.length, 3);
    assert.ok(detail.waterfallMechanics.length >= 3);
    assert.ok(detail.securityAndCovenants.length >= 3);
    assert.ok(detail.representativeInstitutions.length >= 3);
  }
});

test('currency profiles and lending currency conversions accurately resolve symbols and FX equivalents', () => {
  assert.equal(getCurrencySymbol('ZAR'), 'R');
  assert.equal(getCurrencySymbol('KES'), 'KSh');
  assert.equal(getCurrencySymbol('ZMW'), 'ZK');
  assert.equal(getCurrencySymbol('CDF'), 'FC');
  assert.equal(getCurrencySymbol('CNY'), '¥');
  assert.equal(getCurrencySymbol('EUR'), '€');
  assert.equal(getCurrencySymbol('USD'), '$');

  const kenya = getJurisdictionCurrencyProfile('ke-county');
  assert.equal(kenya.defaultLocalCode, 'KES');
  assert.ok(kenya.availableLendingCodes.includes('CNY'));
  assert.ok(kenya.availableLendingCodes.includes('EUR'));

  const zaRows = convertCapexAcrossLendingCurrencies(420, 'ZAR', 'za-muni');
  const codes = zaRows.map((r) => r.code);
  assert.deepEqual(codes, ['ZAR', 'USD', 'EUR', 'CNY', 'GBP', 'JPY']);
  assert.equal(zaRows[0].isBaseInput, true);
  assert.equal(zaRows[0].symbol, 'R');
  assert.equal(zaRows[1].symbol, '$');
  assert.equal(zaRows[2].symbol, '€');
  assert.equal(zaRows[3].symbol, '¥');
  assert.ok(zaRows[1].amountMillions > 20 && zaRows[1].amountMillions < 26);
  assert.ok(zaRows[3].amountMillions > 150 && zaRows[3].amountMillions < 190);
});

test('buildCapitalGuidePayload supplies full app context including scenarios, legal regimes, projects and matched providers', () => {
  const payload = buildCapitalGuidePayload({
    question: 'Can BADEA or DBSA fund Scenario B under MFMA rules?',
    activeTab: 'scenarios',
    role: 'borrower',
    jurisdiction: 'za-muni',
    focusedCountry: null,
    activeProject: INITIAL_PROJECTS.p1,
    projects: INITIAL_PROJECTS,
    capitalProviders: INITIAL_CAPITAL,
    engagements: INITIAL_ENGAGEMENTS,
  });

  assert.ok(payload.projectsCatalogSummary.length >= 28);
  assert.equal(payload.scenariosSummary.length, 4);
  assert.ok(payload.legalRegimesSummary.some((l) => l.includes('MFMA')));
  assert.ok(payload.relevantProviders.some((p) => p.name.includes('BADEA') || p.name.includes('DBSA')));
  assert.ok(payload.activeProjectDetail.includes(INITIAL_PROJECTS.p1.name));
  assert.ok(payload.platformGuideSummary.includes('Auto-hiding left sidebar'));
});

