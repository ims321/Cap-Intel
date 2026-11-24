import type { LineFunctionDept, LineFunctionTask, StageKey } from '../types/capital';

export const COJ_BRAND = {
  cityName: 'City of Johannesburg',
  shortName: 'Joburg',
  tagline: 'A World-Class African City',
  motto: 'Service with Pride',
  metroCode: 'JHB',
  strategicFramework: 'Joburg 2040 GDS · IDP / MTREF',
  goldHex: '#D4AF37',
  emeraldHex: '#10B981',
} as const;

export interface CojMunicipalEntity {
  id: string;
  name: string;
  acronym: string;
  sectorFocus: string;
  ringFencedRevenue: boolean;
  revenueStream: string;
  estimatedBacklogRbn: number;
  annualCapexDemandRm: number;
  collectionOrLossNote: string;
  greenBondEligible: boolean;
  primaryLineRole: string;
}

export const COJ_ENTITIES: CojMunicipalEntity[] = [
  {
    id: 'jw',
    name: 'Johannesburg Water (SOC) Ltd',
    acronym: 'JW',
    sectorFocus: 'Water & sanitation',
    ringFencedRevenue: true,
    revenueStream: 'Ring-fenced potable water & wastewater tariffs',
    estimatedBacklogRbn: 28.4,
    annualCapexDemandRm: 2950,
    collectionOrLossNote: 'Non-Revenue Water (NRW) turnaround focus (44% -> <28%) unlocks cash DSCR.',
    greenBondEligible: true,
    primaryLineRole: 'Chief Engineer: Bulk Water & NRW',
  },
  {
    id: 'cp',
    name: 'City Power Johannesburg (SOC) Ltd',
    acronym: 'City Power',
    sectorFocus: 'Renewable energy',
    ringFencedRevenue: true,
    revenueStream: 'Prepaid / commercial electricity tariffs & IPP wheeling charges',
    estimatedBacklogRbn: 34.2,
    annualCapexDemandRm: 3800,
    collectionOrLossNote: 'Substation upgrades, smart metering & embedded Solar+BESS curtail losses.',
    greenBondEligible: true,
    primaryLineRole: 'GM: System Operations & IPP Procurement',
  },
  {
    id: 'jra',
    name: 'Johannesburg Roads Agency (SOC) Ltd',
    acronym: 'JRA',
    sectorFocus: 'Transport / logistics',
    ringFencedRevenue: false,
    revenueStream: 'Property rates subsidy, PTNG & developer bulk contributions',
    estimatedBacklogRbn: 18.6,
    annualCapexDemandRm: 1450,
    collectionOrLossNote: 'Bridge rehabilitation, stormwater attenuation & smart traffic corridors.',
    greenBondEligible: false,
    primaryLineRole: 'Head: Infrastructure Planning & Bridges',
  },
  {
    id: 'pikitup',
    name: 'Pikitup Johannesburg (SOC) Ltd',
    acronym: 'Pikitup',
    sectorFocus: 'Climate adaptation',
    ringFencedRevenue: true,
    revenueStream: 'Refuse removal tariffs, landfill gate fees & gas-to-power offtake',
    estimatedBacklogRbn: 6.4,
    annualCapexDemandRm: 780,
    collectionOrLossNote: 'Robinson Deep / Marie Louise landfill gas-to-energy & separation at source.',
    greenBondEligible: true,
    primaryLineRole: 'Executive Manager: Waste-to-Energy & Fleet',
  },
  {
    id: 'jda',
    name: 'Johannesburg Development Agency (SOC) Ltd',
    acronym: 'JDA',
    sectorFocus: 'Transport / logistics',
    ringFencedRevenue: false,
    revenueStream: 'Capital grants, BRT PTNG, & TIF / urban precinct PPP levies',
    estimatedBacklogRbn: 12.1,
    annualCapexDemandRm: 1120,
    collectionOrLossNote: 'Rea Vaya BRT Phase 1C corridors, Corridors of Freedom & inner-city precincts.',
    greenBondEligible: true,
    primaryLineRole: 'Senior Development Manager: Precincts & BRT',
  },
  {
    id: 'metrobus',
    name: 'Metrobus (SOC) Ltd',
    acronym: 'Metrobus',
    sectorFocus: 'Transport / logistics',
    ringFencedRevenue: false,
    revenueStream: 'Farebox receipts + municipal operating grant',
    estimatedBacklogRbn: 3.8,
    annualCapexDemandRm: 460,
    collectionOrLossNote: 'Dual-fuel / electric bus fleet transition aligned to CoJ Green Bond precedent.',
    greenBondEligible: true,
    primaryLineRole: 'GM: Fleet Engineering & Depot Electrification',
  },
  {
    id: 'treasury',
    name: 'City of Johannesburg Group Treasury',
    acronym: 'CoJ Treasury',
    sectorFocus: 'Municipal services',
    ringFencedRevenue: false,
    revenueStream: 'Consolidated metro balance sheet, DMTN programme & BFI allocations',
    estimatedBacklogRbn: 103.5,
    annualCapexDemandRm: 10560,
    collectionOrLossNote: 'Central debt management, MFMA s46 approvals, & JSE Green/SLB Bond issuance.',
    greenBondEligible: true,
    primaryLineRole: 'Director: Treasury & Capital Markets',
  },
];

export const COJ_GDS_PILLARS: string[] = [
  'Pillar 1 · Sustainable Services & Circular Infrastructure',
  'Pillar 2 · Low-Carbon Energy Transition & Grid Resilience',
  'Pillar 3 · Inclusive Economic Growth & Corridors of Freedom',
  'Pillar 4 · Smart City, Water Security & Climate Adaptation',
];

export const COJ_MFMA_OPTIONS: string[] = [
  'MFMA s46 · Long-Term Municipal Borrowing / Green Bond',
  'MFMA s33 · Multi-Year Offtake / Service Contract (>3 yrs)',
  'MFMA s120 · Municipal Public-Private Partnership (PPP)',
  'National Treasury BFI / USDG · Blended Capital Grant',
];

export const COJ_REVENUE_MODELS: string[] = [
  'Ring-Fenced Utility Tariff (Water / Electricity)',
  'Private Wheeling / Embedded IPP Power Purchase Agreement',
  'Availability / Unitary PPP Payment (Backstopped by MTREF)',
  'Blended Grant + Municipal Balance Sheet (BFI / USDG)',
];

export interface CojStatutoryGate {
  id: string;
  gate: string;
  statute: string;
  windowLabel: string;
  owner: string;
  requiredArtifact: string;
  status: 'Active Window' | 'Upcoming Gate' | 'Standing Compliance';
}

export const COJ_MFMA_CALENDAR: CojStatutoryGate[] = [
  {
    id: 'gate-idp',
    gate: 'IDP & MTREF Capital Budget Integration',
    statute: 'MSA s25 & MFMA s16 / s19',
    windowLabel: 'Annual Tabled Draft (March) · Final Adoption (May)',
    owner: 'Group Strategy & Group Treasury',
    requiredArtifact: 'Approved multi-year MTREF capital schedule & ward allocation',
    status: 'Active Window',
  },
  {
    id: 'gate-s46',
    gate: 'Long-Term Debt Public Notice & National Treasury Comment',
    statute: 'MFMA s46(3) & s21A',
    windowLabel: '≥ 21 Days Public Notice Prior to Council Sitting',
    owner: 'City Manager & CFO (Group Treasury)',
    requiredArtifact: 'Information Statement, draft loan/bond term sheet & NT confirmation',
    status: 'Upcoming Gate',
  },
  {
    id: 'gate-s33',
    gate: 'Multi-Year Offtake / IPP / Bulk Supply Consultation (>3 Years)',
    statute: 'MFMA s33(1)',
    windowLabel: '60 Days Prior to Council Resolution',
    owner: 'City Power / JW Legal & Group Legal',
    requiredArtifact: 'Draft PPA / bulk contract + NT, DCoG & Sector Dept comments',
    status: 'Standing Compliance',
  },
  {
    id: 'gate-bfi',
    gate: 'National Treasury Budget Facility for Infrastructure (BFI) Window',
    statute: 'Division of Revenue Act & BFI Guidelines',
    windowLabel: 'BFI Concept & Feasibility Submission Cycle',
    owner: 'CoJ Development Planning & MOE PMOs',
    requiredArtifact: 'Feasibility study, cost-benefit model & Council co-funding commitment',
    status: 'Active Window',
  },
  {
    id: 'gate-green',
    gate: 'JSE Sustainability / Green Bond Second-Party Opinion',
    statute: 'JSE Debt Listings Requirements · ICMA GBP',
    windowLabel: 'Pre-Issuance SPO & Annual Impact Allocation Audit',
    owner: 'CoJ Treasury & Sustainability Office',
    requiredArtifact: 'Use-of-proceeds register, GHG / MLD baseline & SPO verification letter',
    status: 'Standing Compliance',
  },
];

export function createDefaultLineFunctionTasks(
  cojEntity = 'Johannesburg Water (SOC) Ltd',
  stage: StageKey = 'feasibility'
): LineFunctionTask[] {
  const isPower = cojEntity.toLowerCase().includes('power');
  const isWaste = cojEntity.toLowerCase().includes('pikitup');
  const capLabel = isPower
    ? 'Peak Substation / Generation Capacity'
    : isWaste
      ? 'Feedstock / Gas Capture Capacity'
      : 'Design Hydraulic / Asset Capacity';
  const capDefault = isPower ? '80 MW Solar + 120 MWh BESS' : isWaste ? '14 MW Landfill Gas' : '110 MLD Reservoir & Trunk Main';
  const lossLabel = isPower ? 'Technical & Non-Technical Loss Rate' : 'Non-Revenue Water (NRW) Baseline';
  const lossDefault = isPower ? '26.5%' : '44.2%';

  return [
    {
      dept: 'engineering',
      label: 'Engineering & BOQ Desk',
      assigneeRole: `Chief Engineer (${cojEntity.split('(')[0].trim()})`,
      assigneeName: isPower ? 'Eng. T. Nkosi' : 'Eng. M. Mabena',
      dueDate: '2026-12-08',
      status: stage === 'structuring' || stage === 'transaction' ? 'Dept Verified' : 'Drafted',
      requestedFields: [
        { key: 'capacity', label: capLabel, value: capDefault, placeholder: 'e.g. 80 MW or 100 MLD' },
        { key: 'lossPct', label: lossLabel, value: lossDefault, unit: '%' },
        { key: 'boqVariance', label: 'Class 3 / FEED Capex Contingency', value: '12%', unit: '%' },
      ],
      notes: 'Line engineering team confirms Class 3 cost estimate and site servitudes.',
      updatedAt: '2026-11-22',
    },
    {
      dept: 'finance',
      label: 'MOE Finance & Group Treasury',
      assigneeRole: 'Deputy Director: Capital Finance',
      assigneeName: 'K. Pillay (CA SA)',
      dueDate: '2026-12-10',
      status: stage === 'transaction' ? 'Executive Approved' : 'Drafted',
      requestedFields: [
        { key: 'collectionRate', label: 'Ring-Fenced Collection Rate', value: isPower ? '89.5%' : '81.0%', unit: '%' },
        { key: 'tariffPath', label: 'Approved NERSA / Bulk Tariff Escalation', value: 'CPI + 2.5% p.a.' },
        { key: 'mtrefVote', label: 'MTREF Capital Vote Reference', value: 'JHB-CAP-2026/28-041' },
      ],
      notes: 'Requires updated cash-waterfall stress test before s46 Treasury notice.',
      updatedAt: '2026-11-21',
    },
    {
      dept: 'legal',
      label: 'Group Legal & SCM Compliance',
      assigneeRole: 'Senior Legal Advisor: MFMA & PPPs',
      assigneeName: 'Adv. L. Dlamini',
      dueDate: '2026-12-12',
      status: 'Requested',
      requestedFields: [
        { key: 'mfmaClause', label: 'Statutory Authority Route', value: 'MFMA s46 / s33' },
        { key: 'councilItem', label: 'Mayoral / Council Resolution Ref', value: 'Pending Mayoral Committee item' },
      ],
      notes: 'Verify 60-day National Treasury notice requirement if multi-year contract applies.',
      updatedAt: '2026-11-20',
    },
    {
      dept: 'esg',
      label: 'E&S, Water License & Green Bond Desk',
      assigneeRole: 'Specialist: Environmental & Climate Impact',
      assigneeName: 'Dr. R. Naidoo',
      dueDate: '2026-12-15',
      status: 'Dept Verified',
      requestedFields: [
        { key: 'eiaStatus', label: 'EIA / Water Use License / NERSA', value: 'BAR / WULA Submitted (DWS Ref 2026-JHB)' },
        { key: 'ghgImpact', label: 'Annual Emissions / Water Saved', value: isPower ? '145,000 tCO2e/yr' : '18.2M kL/yr saved' },
      ],
      notes: 'Eligible for CoJ Green Bond Use-of-Proceeds Framework (ICMA GBP).',
      updatedAt: '2026-11-23',
    },
  ];
}

export interface CojLossRecoveryResult {
  recoveredRevenueRm: number;
  currentDscr: number;
  improvedDscr: number;
  dscrLift: number;
  additionalDebtCapacityRm: number;
  additionalDebtCapacityUsdM: number;
}

export function computeCojLossRecoveryImpact(params: {
  annualRevenueRm: number;
  currentLossPct: number;
  targetLossPct: number;
  existingDebtServiceRm: number;
  debtCostPct?: number;
  tenorYears?: number;
  zarPerUsd?: number;
}): CojLossRecoveryResult {
  const rev = Math.max(0, params.annualRevenueRm);
  const currLoss = Math.min(80, Math.max(0, params.currentLossPct));
  const targetLoss = Math.min(currLoss, Math.max(0, params.targetLossPct));
  const service = Math.max(1, params.existingDebtServiceRm);
  const rate = (params.debtCostPct ?? 10.2) / 100;
  const years = Math.max(1, params.tenorYears ?? 15);
  const fx = params.zarPerUsd ?? 17.86;

  // Net margin capture on recovered technical/NRW losses after marginal treatment/wheeling O&M (~72% net margin)
  const lossDropFraction = Math.max(0, (currLoss - targetLoss) / 100);
  const grossRecovered = rev * lossDropFraction;
  const recoveredRevenueRm = Number((grossRecovered * 0.72).toFixed(1));

  const baselineCashflow = rev * 0.28;
  const currentDscr = Number((baselineCashflow / service).toFixed(2));
  const improvedDscr = Number(((baselineCashflow + recoveredRevenueRm) / service).toFixed(2));
  const dscrLift = Number((improvedDscr - currentDscr).toFixed(2));

  // New senior debt capacity sized at 1.25x coverage on the recovered annual cashflow
  const sustainableNewDebtService = recoveredRevenueRm / 1.25;
  const pvFactor = rate > 0 ? (1 - Math.pow(1 + rate, -years)) / rate : years;
  const additionalDebtCapacityRm = Number((sustainableNewDebtService * pvFactor).toFixed(1));
  const additionalDebtCapacityUsdM = Number((additionalDebtCapacityRm / fx).toFixed(1));

  return {
    recoveredRevenueRm,
    currentDscr,
    improvedDscr,
    dscrLift,
    additionalDebtCapacityRm,
    additionalDebtCapacityUsdM,
  };
}

export function evaluateCojGreenBondEligibility(params: {
  sector: string;
  desc: string;
  greenBondFlag?: boolean;
}): {
  eligible: boolean;
  icmaCategory: string;
  estimatedGreeniumBps: number;
  verificationSteps: string[];
} {
  const hay = `${params.sector} ${params.desc}`.toLowerCase();
  const isCleanEnergy = hay.includes('solar') || hay.includes('renewable') || hay.includes('bess') || hay.includes('microgrid');
  const isWater = hay.includes('water') || hay.includes('nrw') || hay.includes('sanitation') || hay.includes('wastewater');
  const isTransit = hay.includes('brt') || hay.includes('transit') || hay.includes('bus') || hay.includes('rail');
  const isWaste = hay.includes('waste') || hay.includes('landfill') || hay.includes('biogas') || hay.includes('climate');

  const eligible = Boolean(params.greenBondFlag || isCleanEnergy || isWater || isTransit || isWaste);
  const icmaCategory = isCleanEnergy
    ? 'ICMA GBP · Renewable Energy & Grid Storage'
    : isWater
      ? 'ICMA GBP · Sustainable Water & Wastewater Management'
      : isTransit
        ? 'ICMA GBP · Clean Low-Carbon Urban Transport'
        : isWaste
          ? 'ICMA GBP · Pollution Prevention & Circular Waste-to-Energy'
          : 'General Municipal Infrastructure (Check SLB KPI option)';

  const estimatedGreeniumBps = !eligible ? 0 : isCleanEnergy || isTransit ? 32 : 24;

  return {
    eligible,
    icmaCategory,
    estimatedGreeniumBps,
    verificationSteps: eligible
      ? [
          'Map capital proceeds to CoJ 2040 GDS Sustainable Services pillar.',
          'Secure Second-Party Opinion (SPO) on GHG / megalitre intensity baseline.',
          'Publish annual Use-of-Proceeds & Impact Allocation report to JSE Sustainability Segment.',
        ]
      : [
          'Reframe project via Sustainability-Linked Bond (SLB) KPIs (NRW % or energy efficiency).',
        ],
  };
}

export function getLineFunctionCompleteness(tasks?: LineFunctionTask[]): {
  total: number;
  verifiedCount: number;
  pct: number;
  pendingDepts: LineFunctionDept[];
} {
  const list = tasks || [];
  if (list.length === 0) {
    return { total: 4, verifiedCount: 0, pct: 0, pendingDepts: ['engineering', 'finance', 'legal', 'esg'] };
  }
  const verified = list.filter(
    (t) => t.status === 'Dept Verified' || t.status === 'Executive Approved'
  );
  const pendingDepts = list
    .filter((t) => t.status !== 'Dept Verified' && t.status !== 'Executive Approved')
    .map((t) => t.dept);
  return {
    total: list.length,
    verifiedCount: verified.length,
    pct: Math.round((verified.length / list.length) * 100),
    pendingDepts,
  };
}
