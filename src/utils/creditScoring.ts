import type { SAMunicipalitySummary, SubnationalFiscalRow } from '../types/publicData';

export type CreditTierLabel =
  | 'Tier A · Prime Municipal'
  | 'Tier B · Bankable Blended'
  | 'Tier C · Credit-Wrap Required'
  | 'Tier D · Grant & Technical Prep';

export interface CreditScoreResult {
  score: number;
  tier: CreditTierLabel;
  tone: 'emerald' | 'teal' | 'amber' | 'rose';
  recommendedInstrument: string;
  rationale: string;
  pillars: {
    audit: number;
    execution: number;
    liquidity: number;
    leverage: number;
  };
}

export function scoreSaMunicipalityCredit(m: SAMunicipalitySummary): CreditScoreResult {
  // 1. Audit governance pillar (0-35 pts)
  const auditCode = (m.auditCodeFy24 || '').toLowerCase();
  let audit = 10;
  if (auditCode === 'unqualified') audit = 35;
  else if (auditCode === 'unqualified_emphasis_of_matter') audit = 29;
  else if (auditCode === 'qualified') audit = 16;
  else if (auditCode === 'adverse') audit = 6;
  else if (auditCode === 'disclaimer') audit = 3;

  // 2. CapEx execution pillar (0-25 pts)
  const exec = m.capexExecutionPct ?? 55;
  let execution = 12;
  if (exec >= 90) execution = 25;
  else if (exec >= 75) execution = 21;
  else if (exec >= 60) execution = 16;
  else if (exec >= 40) execution = 10;
  else execution = 5;

  // 3. Liquidity & operating balance pillar (0-20 pts)
  const rev = Math.max(1, m.revenueFy25 || m.expenditureFy25 || 100_000_000);
  const cash = m.cashBalanceFy25 ?? 0;
  const cashRatio = cash / rev;
  let liquidity = 8;
  if (cashRatio >= 0.18) liquidity = 20;
  else if (cashRatio >= 0.1) liquidity = 16;
  else if (cashRatio >= 0.04) liquidity = 11;
  else if (cashRatio > 0) liquidity = 7;
  else liquidity = 3;
  if ((m.surplusDeficitFy25 ?? 0) > 0) {
    liquidity = Math.min(20, liquidity + 2);
  }

  // 4. Debt headroom / leverage pillar (0-20 pts)
  const debt = m.nonCurrentBorrowingFy25 ?? 0;
  const debtToRev = debt / rev;
  let leverage = 14;
  if (debtToRev <= 0.15) leverage = 20;
  else if (debtToRev <= 0.35) leverage = 16;
  else if (debtToRev <= 0.55) leverage = 11;
  else leverage = 5;

  const score = Math.max(5, Math.min(99, Math.round(audit + execution + liquidity + leverage)));

  if (score >= 76) {
    return {
      score,
      tier: 'Tier A · Prime Municipal',
      tone: 'emerald',
      recommendedInstrument: 'Direct Municipal Bond / Commercial & DFI Senior Debt',
      rationale:
        'Clean AGSA audit track record, strong CapEx absorption, and healthy cash buffer support standalone MFMA s46 borrowing.',
      pillars: { audit, execution, liquidity, leverage },
    };
  }
  if (score >= 58) {
    return {
      score,
      tier: 'Tier B · Bankable Blended',
      tone: 'teal',
      recommendedInstrument: 'DBSA / Blended Concessional + Ring-Fenced Tariff Escrow',
      rationale:
        'Bankable project-finance candidate; pair DFI concessional debt with ring-fenced utility collection escrow.',
      pillars: { audit, execution, liquidity, leverage },
    };
  }
  if (score >= 40) {
    return {
      score,
      tier: 'Tier C · Credit-Wrap Required',
      tone: 'amber',
      recommendedInstrument: 'GuarantCo Partial Credit Guarantee + Pooled SPV Structure',
      rationale:
        'Requires partial credit enhancement, EPC completion wrap, or pooling into a regional SPV to reach institutional grade.',
      pillars: { audit, execution, liquidity, leverage },
    };
  }
  return {
    score,
    tier: 'Tier D · Grant & Technical Prep',
    tone: 'rose',
    recommendedInstrument: 'BFI / MIG / DBSA PPF Non-Repayable Grant + Technical Turnaround',
    rationale:
      'Balance-sheet or audit constraints preclude unguaranteed commercial borrowing; prioritize grant-funded preparation & on-budget delivery.',
    pillars: { audit, execution, liquidity, leverage },
  };
}

export function scoreSubnationalUnitCredit(
  row: SubnationalFiscalRow,
  iso3: string
): CreditScoreResult {
  const hasFiscal = Boolean(row.totalAllocation && row.totalAllocation > 0);
  const perCapita = row.perCapitaAllocation ?? 0;

  // Compute deterministic fiscal score across countries with or without transfer tables
  let baseAudit = hasFiscal ? 22 : 16;
  let baseExec = hasFiscal ? 17 : 12;
  let baseLiq = 13;
  let baseLev = 14;

  if (iso3 === 'KEN') {
    baseAudit = 24;
    if ((row.totalAllocation ?? 0) >= 12e9) baseExec = 21;
    else if ((row.totalAllocation ?? 0) >= 7e9) baseExec = 18;
    else baseExec = 15;
    if (perCapita >= 10000) baseLiq = 17;
    else if (perCapita >= 7000) baseLiq = 15;
  } else if (iso3 === 'NGA') {
    baseAudit = 20;
    const growth =
      row.totalAllocation && row.priorYearTotal && row.priorYearTotal > 0
        ? (row.totalAllocation - row.priorYearTotal) / row.priorYearTotal
        : 0;
    baseExec = growth > 0.15 ? 20 : 15;
    baseLiq = (row.totalAllocation ?? 0) >= 80e9 ? 18 : 13;
    baseLev = 15;
  }

  const score = Math.max(25, Math.min(92, Math.round(baseAudit + baseExec + baseLiq + baseLev)));

  if (score >= 74) {
    return {
      score,
      tier: 'Tier A · Prime Municipal',
      tone: 'emerald',
      recommendedInstrument: 'InfraCredit / National Guarantee + Domestic Bond / DFI Co-Lending',
      rationale:
        'Strong statutory transfer scale and revenue base support sub-sovereign pooled bond or DFI-backed SPV structuring.',
      pillars: { audit: baseAudit, execution: baseExec, liquidity: baseLiq, leverage: baseLev },
    };
  }
  if (score >= 56) {
    return {
      score,
      tier: 'Tier B · Bankable Blended',
      tone: 'teal',
      recommendedInstrument: 'Blended DFI + Partial Credit Guarantee (GuarantCo / Dhamana)',
      rationale:
        'Suitable for ring-fenced utility SPV or PPP concession backed by Ministry of Finance borrowing clearance.',
      pillars: { audit: baseAudit, execution: baseExec, liquidity: baseLiq, leverage: baseLev },
    };
  }
  return {
    score,
    tier: 'Tier C · Credit-Wrap Required',
    tone: 'amber',
    recommendedInstrument: 'TA / Preparation Grant + Pooled Regional Facility',
    rationale:
      'Small fiscal transfer base; aggregate into multi-authority pooled SPV or pair with 100% DFI preparation grant.',
    pillars: { audit: baseAudit, execution: baseExec, liquidity: baseLiq, leverage: baseLev },
  };
}
