import test from 'node:test';
import assert from 'node:assert/strict';
import type { SAMunicipalitySummary, SubnationalFiscalRow } from '../types/publicData';
import {
  scoreSaMunicipalityCredit,
  scoreSubnationalUnitCredit,
} from './creditScoring';

function makeSaMuni(overrides: Partial<SAMunicipalitySummary> = {}): SAMunicipalitySummary {
  return {
    code: 'CPT',
    name: 'Cape Town',
    longName: 'City of Cape Town Metropolitan Municipality',
    provinceCode: 'WC',
    provinceName: 'Western Cape',
    category: 'A',
    categoryLabel: 'Metro',
    miifCategory: 'A',
    officialUrl: null,
    phoneNumber: null,
    streetAddress: null,
    serviceChargesFy25: 15_000_000_000,
    totalLiabilitiesFy25: 18_000_000_000,
    capexActualFy25: 9_800_000_000,
    capexBudgetFy25: 10_200_000_000,
    capexActualFy24: 8_900_000_000,
    capexBudgetFy24: 9_100_000_000,
    capexExecutionPct: 96,
    revenueFy25: 62_000_000_000,
    expenditureFy25: 59_000_000_000,
    surplusDeficitFy25: 3_000_000_000,
    cashBalanceFy25: 12_500_000_000,
    nonCurrentBorrowingFy25: 8_200_000_000,
    grantsFy24: 4_100_000_000,
    auditOutcomeFy24: 'Unqualified',
    auditCodeFy24: 'unqualified',
    auditReportUrl: null,
    ...overrides,
  };
}

test('scoreSaMunicipalityCredit separates Tier A Prime through Tier D Grant Prep cleanly', () => {
  const tierA = scoreSaMunicipalityCredit(makeSaMuni());
  assert.equal(tierA.tier, 'Tier A · Prime Municipal');
  assert.ok(tierA.score >= 76);

  const tierB = scoreSaMunicipalityCredit(
    makeSaMuni({
      auditCodeFy24: 'unqualified_emphasis_of_matter',
      capexExecutionPct: 68,
      cashBalanceFy25: 3_100_000_000,
      surplusDeficitFy25: -200_000_000,
      nonCurrentBorrowingFy25: 25_000_000_000,
    })
  );
  assert.equal(tierB.tier, 'Tier B · Bankable Blended');
  assert.ok(tierB.score >= 58 && tierB.score < 76);

  const tierD = scoreSaMunicipalityCredit(
    makeSaMuni({
      auditCodeFy24: 'disclaimer',
      capexExecutionPct: 28,
      cashBalanceFy25: 0,
      surplusDeficitFy25: -4_000_000_000,
      nonCurrentBorrowingFy25: 42_000_000_000,
    })
  );
  assert.equal(tierD.tier, 'Tier D · Grant & Technical Prep');
  assert.ok(tierD.score < 40);
});

test('scoreSubnationalUnitCredit scores Kenya, Nigeria, and non-fiscal peer units deterministically', () => {
  const nairobi: SubnationalFiscalRow = {
    id: 'ken-nbo',
    name: 'Nairobi City County',
    unitType: 'County',
    fiscalYearLabel: 'FY 2024/25',
    currency: 'KES',
    totalAllocation: 21_500_000_000,
    perCapitaAllocation: 11200,
  };
  const kenScore = scoreSubnationalUnitCredit(nairobi, 'KEN');
  assert.equal(kenScore.tier, 'Tier A · Prime Municipal');
  assert.ok(kenScore.score >= 74);

  const lagos: SubnationalFiscalRow = {
    id: 'nga-lag',
    name: 'Lagos State',
    unitType: 'State',
    fiscalYearLabel: 'FAAC 2024',
    currency: 'NGN',
    totalAllocation: 110_000_000_000,
    priorYearTotal: 85_000_000_000,
  };
  const ngaScore = scoreSubnationalUnitCredit(lagos, 'NGA');
  assert.ok(ngaScore.score >= 56);

  const lusaka: SubnationalFiscalRow = {
    id: 'zmb-lsk',
    name: 'Lusaka Province',
    unitType: 'Province',
    fiscalYearLabel: 'GeoBoundaries Registry',
    currency: 'ZMW',
    totalAllocation: null,
  };
  const zmbScore = scoreSubnationalUnitCredit(lusaka, 'ZMB');
  assert.equal(zmbScore.tier, 'Tier C · Credit-Wrap Required');
});
