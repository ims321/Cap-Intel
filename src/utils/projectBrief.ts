import {
  COUNTRY_JURISDICTION_LINK,
  LEGAL_BY_JURISDICTION,
  STAGE_LABEL,
  STAGE_ORDER,
} from '../data/capitalData';
import type {
  CapitalProvider,
  FinancingScenario,
  JurisdictionLegalProfile,
  Project,
  ProjectGap,
} from '../types/capital';
import { getCurrencySymbol } from './currencies';
import { annuity, computeScenario, fmtM, scoreMatch } from './finance';
import { computeProjectImpact, type ProjectImpactProjection } from './impact';

export interface BriefTranche {
  tranche: string;
  instrument: string;
  sharePct: number;
  amountM: number;
  pricingBenchmark: string;
  tenorSummary: string;
  roleNote: string;
  candidateProviders: string[];
}

export interface BriefRoadmapPhase {
  horizon: string;
  title: string;
  deliverables: string[];
}

export interface ProjectBriefModel {
  referenceCode: string;
  generatedDate: string;
  classification: string;
  executiveThesis: string;
  currencyLabel: string;
  capexFormatted: string;
  readinessTier: 'Transaction-Ready' | 'Structuring & Blending' | 'Feasibility Preparation' | 'Early Origination';
  targetDscr: string;
  fxRiskAssessment: string;
  capitalStack: BriefTranche[];
  legalProfileKey: string;
  legalProfile: JurisdictionLegalProfile;
  completedStageCount: number;
  activeStageName: string;
  pendingActivities: string[];
  criticalAndOpenGaps: ProjectGap[];
  matchedProviders: Array<{
    provider: CapitalProvider;
    score: number;
    overlookedHighlight: boolean;
  }>;
  impact: ProjectImpactProjection;
  roadmap: BriefRoadmapPhase[];
  plainTextReport: string;
}

export function resolveLegalKeyForProject(project: Project): string {
  const j = project.jurisdiction
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (j.includes('south africa') && j.includes('metropolitan')) return 'za-metro';
  if (j.includes('south africa') && j.includes('national')) return 'za-nat';
  if (j.includes('south africa')) return 'za-muni';
  if (j.includes('kenya')) return 'ke-county';
  if (j.includes('zambia')) return 'zm-muni';
  if (j.includes('drc') || j.includes('congo')) return 'drc-prov';
  if (j.includes('cote d')) return 'ci-nat';

  for (const [country, key] of Object.entries(COUNTRY_JURISDICTION_LINK)) {
    const normalizedCountry = country
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (j.includes(normalizedCountry)) {
      return key;
    }
  }
  return 'af-continental';
}

function buildCapitalStack(project: Project): BriefTranche[] {
  const capM = project.capex / 1e6;
  const isEarly = project.stage === 'concept' || project.stage === 'feasibility';
  const isWater = project.sector.toLowerCase().includes('water') || project.sector.toLowerCase().includes('climate');
  const isLocalSovereign = project.currency === 'ZAR';

  const grantShare = isEarly ? (isWater ? 0.18 : 0.15) : isWater ? 0.12 : 0.08;
  const dfiShare = isEarly ? 0.44 : 0.42;
  const commercialShare = isEarly ? (1 - grantShare - dfiShare - 0.15) : 0.30;
  const equityShare = Number((1 - grantShare - dfiShare - commercialShare).toFixed(4));

  const overlookedHint = project.recommendedOverlookedCapital?.slice(0, 3) || [];

  return [
    {
      tranche: 'Tier 1 · Catalytic & Preparation Grants / VGF',
      instrument: 'Non-repayable Viability Gap / Preparation Facility',
      sharePct: Math.round(grantShare * 100),
      amountM: Number((capM * grantShare).toFixed(1)),
      pricingBenchmark: '0.0% grant (buys down tariff / debt burden)',
      tenorSummary: 'Milestone disbursement during prep & capex',
      roleNote:
        'Funds feasibility completion, E&S safeguards, and capital cost buy-down to protect end-user affordability.',
      candidateProviders:
        overlookedHint.length > 0
          ? overlookedHint
          : ['AfDB Africa Water Facility', 'DBSA Project Preparation Fund', 'Green Climate Fund PPF'],
    },
    {
      tranche: 'Tier 2 · Senior Concessional DFI / MDB Facility',
      instrument: 'Long-Tenor Senior Project or Sovereign-On-Lent Debt',
      sharePct: Math.round(dfiShare * 100),
      amountM: Number((capM * dfiShare).toFixed(1)),
      pricingBenchmark: isLocalSovereign
        ? '7.2%–8.6% ZAR blended concessional'
        : 'SOFR / EURIBOR + 160–240 bps (CIF/DFI blended)',
      tenorSummary: '15–20 years incl. 3-year grace moratorium',
      roleNote:
        'Anchors long amortization profile matching physical infrastructure useful life and lowers blended WACC.',
      candidateProviders: ['DBSA Lending', 'AfDB / World Bank IPF', 'EIB Global / KfW', 'AFD / Proparco'],
    },
    {
      tranche: 'Tier 3 · Local-Currency Commercial / Institutional Bond',
      instrument: 'Credit-Enhanced Senior Local-Currency Debt or Infra Bond',
      sharePct: Math.round(commercialShare * 100),
      amountM: Number((capM * commercialShare).toFixed(1)),
      pricingBenchmark: isLocalSovereign
        ? '3M JIBAR + 240–320 bps (wrapped)'
        : 'Domestic Treasury benchmark + 180–280 bps (Guaranteed)',
      tenorSummary: '10–15 years incl. 1–2 year grace',
      roleNote:
        'Mobilizes domestic commercial banks and pension balance sheets via partial credit guarantees (GuarantCo, InfraCredit, InfraZamin, Dhamana).',
      candidateProviders: [
        'Standard Bank CIB / Investec / Nedbank',
        'Futuregrowth / Mergence Debt Fund',
        'GuarantCo / ATIDI Wrap',
      ],
    },
    {
      tranche: 'Tier 4 · Sponsor / Public Co-Investment Equity',
      instrument: 'Public Capital Contribution / Infrastructure Fund Equity',
      sharePct: Math.round(equityShare * 100),
      amountM: Number((capM * equityShare).toFixed(1)),
      pricingBenchmark: isEarly ? 'On-budget / Development equity' : '12%–15% target local/USD equity IRR',
      tenorSummary: 'Permanent / 15–25 year concession horizon',
      roleNote:
        'Provides first-loss subordination cushion required by senior lenders and aligns public sponsor accountability.',
      candidateProviders: [
        'Climate Fund Managers / Africa50',
        'A.P. Moller Capital / AIIM',
        'National Treasury BFI / PIC',
      ],
    },
  ];
}

export function buildProjectBrief(
  project: Project,
  capitalProviders: CapitalProvider[]
): ProjectBriefModel {
  const ccyPrefix = getCurrencySymbol(project.currency);
  const capexFormatted = `${ccyPrefix}${fmtM(project.capex)}m`;
  const referenceCode = `CI-BRIEF-${project.id.toUpperCase()}-2026`;
  const legalProfileKey = resolveLegalKeyForProject(project);
  const legalProfile =
    LEGAL_BY_JURISDICTION[legalProfileKey] || LEGAL_BY_JURISDICTION['za-nat'];

  const readinessTier: ProjectBriefModel['readinessTier'] =
    project.readiness >= 70
      ? 'Transaction-Ready'
      : project.readiness >= 50
        ? 'Structuring & Blending'
        : project.readiness >= 30
          ? 'Feasibility Preparation'
          : 'Early Origination';

  const openGaps = project.gaps.filter((g) => g.status !== 'Closed');
  const activeStageObj =
    project.stages.find((s) => s.status === 'active') || project.stages[0];
  const completedStageCount = project.stages.filter(
    (s) => s.status === 'complete'
  ).length;
  const pendingActivities = activeStageObj
    ? activeStageObj.activities.filter(
        (a) => !(activeStageObj.completedActivities || []).includes(a)
      )
    : [];

  const targetDscr =
    project.sector.toLowerCase().includes('energy')
      ? '1.30x–1.35x min DSCR (P90 irradiance / contracted PPA)'
      : project.sector.toLowerCase().includes('transport')
        ? '1.35x–1.45x min DSCR (availability / minimum revenue guarantee)'
        : '1.25x–1.30x min DSCR (ring-fenced utility tariff & 6-mo DSRA)';

  const fxRiskAssessment =
    project.currency === 'ZAR'
      ? 'Domestic ZAR revenue base creates high sensitivity to unhedged USD/EUR debt (>25% FX pass-through in stress models). Priority: maximize ZAR tranches via DBSA, PIC/Futuregrowth, and SA Big-4 banks or hedge hard-currency debt via TCX.'
      : `Multi-currency corridor / USD-denominated capex (${capexFormatted}) operating in domestic revenue jurisdiction (${project.jurisdiction}). Pair any hard-currency DFI/ECA tranches with TCX cross-currency swaps or domestic local-currency bond guarantees (InfraCredit / InfraZamin / Dhamana / GuarantCo).`;

  const capitalStack = buildCapitalStack(project);
  const impact = computeProjectImpact(project);

  // Score and rank real providers
  const recTokens = (project.recommendedOverlookedCapital || []).map((x) =>
    x.toLowerCase()
  );
  const scored = capitalProviders
    .map((p) => {
      const base = scoreMatch(project, p);
      const isHighlighted = recTokens.some((tok) =>
        p.name.toLowerCase().includes(tok.split(' ')[0])
      );
      return {
        provider: p,
        score: isHighlighted ? Math.min(99, base + 6) : base,
        overlookedHighlight: Boolean(p.overlooked) || isHighlighted,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const executiveThesis = [
    `${project.name} (${capexFormatted}, ${STAGE_LABEL[project.stage]} stage) is a ${project.sector.toLowerCase()} mandate domiciled under ${project.jurisdiction}${
      project.authorityName ? ` and registered through ${project.authorityName}` : ''
    }.`,
    project.desc,
    project.financingGap
      ? `The critical structuring bottleneck is closing ${project.financingGap}, supported by ${openGaps.length} tracked bankability deliverables (${project.gaps.filter((g) => g.severity === 'critical' && g.status !== 'Closed').length} critical).`
      : `Current readiness stands at ${project.readiness}/100 (${readinessTier}), with ${openGaps.length} open bankability items requiring structured remediation ahead of debt underwriting.`,
  ].join(' ');

  const roadmap: BriefRoadmapPhase[] = [
    {
      horizon: 'Days 1–30',
      title: 'Statutory Mandate & Preparation Grant Activation',
      deliverables: [
        `Confirm ${legalProfileKey.toUpperCase()} borrowing headroom, council/ministerial resolution, and PPP unit clearance.`,
        `Submit preparation / technical assistance request to ${capitalStack[0].candidateProviders.slice(0, 2).join(' & ')}.`,
      ],
    },
    {
      horizon: 'Days 31–60',
      title: 'Technical Bankability & Blended Guarantee Structuring',
      deliverables: [
        openGaps[0]
          ? `Remediate priority gap ("${openGaps[0].gap}") via ${openGaps[0].remedy}.`
          : 'Complete independent lender technical & E&S safeguard review.',
        'Lock revenue-currency hedging / local partial credit guarantee structure and run +15% FX / +200 bps rate sensitivity.',
      ],
    },
    {
      horizon: 'Days 61–90',
      title: 'NDA Data Room & Indicative Term Sheet Origination',
      deliverables: [
        `Execute Mutual NDA & upload baseline technical/tariff pack for ${scored.slice(0, 2).map((m) => m.provider.name).join(' and ')}.`,
        'Negotiate non-binding Blended Financing Term Sheet & lock Conditions Precedent checklist.',
      ],
    },
  ];

  const plainLines = [
    `EXECUTIVE PROJECT INVESTMENT BRIEF — ${project.name.toUpperCase()}`,
    `Reference: ${referenceCode} | Last Verified: ${project.updated} | Readiness: ${project.readiness}/100 (${readinessTier})`,
    `Jurisdiction: ${project.jurisdiction} | Sector: ${project.sector} | Capex: ${capexFormatted} | Stage: ${STAGE_LABEL[project.stage]}`,
    project.authorityName ? `Registry / Authority: ${project.authorityName}` : '',
    project.agendaAlignment ? `Strategic Alignment: ${project.agendaAlignment}` : '',
    '='.repeat(72),
    '',
    '1. EXECUTIVE INVESTMENT THESIS',
    executiveThesis,
    '',
    '2. INDICATIVE CAPITAL STACK (SOURCES & USES)',
    ...capitalStack.map(
      (t) =>
        `- ${t.tranche} (${t.sharePct}% · ${ccyPrefix}${t.amountM.toFixed(1)}m): ${t.pricingBenchmark} | ${t.tenorSummary}\n  Candidates: ${t.candidateProviders.join(', ')}`
    ),
    `Target DSCR: ${targetDscr}`,
    `FX Risk Protocol: ${fxRiskAssessment}`,
    '',
    '3. STATUTORY & LEGAL AUTHORITY CHECK',
    `Profile Summary: ${legalProfile.summary}`,
    ...legalProfile.rules.map(
      (r) => `- ${r.q} [${r.status.toUpperCase()}] (${r.cite}): ${r.note}`
    ),
    '',
    '4. BANKABILITY GAP REGISTER',
    ...project.gaps.map(
      (g) => `- [${g.severity.toUpperCase()} / ${g.status}] ${g.gap} (${g.stage}) -> Remedy: ${g.remedy}`
    ),
    '',
    '5. TOP MATCHED REAL CAPITAL PROVIDERS',
    ...scored.map(
      (m) =>
        `- ${m.provider.name} (${m.score}/100 match) | ${m.provider.type} | Ticket: ${m.provider.ticket} (${m.provider.currency}) | ${m.provider.legal}`
    ),
    '',
    '6. SOCIOECONOMIC IMPACT PROJECTION (10-YEAR HORIZON)',
    `- Peak Annual Jobs: ${impact.peakAnnualJobs.toLocaleString()} (${impact.totalJobYears.toLocaleString()} cumulative job-years; ${impact.permanentOpsJobs.toLocaleString()} permanent O&M)`,
    `- 10Y Cumulative GDP Contribution: ${ccyPrefix}${impact.cumulativeGdpM.toFixed(1)}m (${impact.effectiveGdpMultiplier.toFixed(2)}x capex multiplier)`,
    `- 10Y Cumulative Fiscal / Tax Uplift: ${ccyPrefix}${impact.cumulativeFiscalReturnM.toFixed(1)}m (${impact.householdsReached.toLocaleString()} households reached)`,
    '',
    '7. 90-DAY TRANSACTION ROADMAP',
    ...roadmap.flatMap((p) => [`${p.horizon} — ${p.title}:`, ...p.deliverables.map((d) => `  * ${d}`)]),
    '',
    'DISCLAIMER: Prepared via Capital Intelligence Platform for institutional decision support. Not a formal feasibility study, legal opinion, or committed offer of finance.',
  ].filter((x) => x !== undefined);

  return {
    referenceCode,
    generatedDate: '2026-11-23',
    classification: project.sourceCategory
      ? `${project.sourceCategory} · ${project.rec || 'Continental'}`
      : 'Municipal / Sub-Sovereign Structured Mandate',
    executiveThesis,
    currencyLabel: ccyPrefix.trim(),
    capexFormatted,
    readinessTier,
    targetDscr,
    fxRiskAssessment,
    capitalStack,
    legalProfileKey,
    legalProfile,
    completedStageCount,
    activeStageName: activeStageObj?.name || STAGE_LABEL[project.stage],
    pendingActivities,
    criticalAndOpenGaps: project.gaps,
    matchedProviders: scored,
    impact,
    roadmap,
    plainTextReport: plainLines.join('\n'),
  };
}

export interface ScenarioTrancheRow {
  label: string;
  seniorityRole: string;
  ccy: string;
  baseAmountM: number;
  stressedAmountM: number;
  capexSharePct: number;
  baseRatePct: number;
  floatingSharePct: number;
  effectiveRatePct: number;
  years: number;
  grace: number;
  amortYears: number;
  moratoriumCostM: number;
  annualPostGraceM: number;
  totalDebtServiceM: number;
  isGrant: boolean;
}

export interface ScenarioStructureDetail {
  overview: string;
  waterfallMechanics: string[];
  securityAndCovenants: string[];
  tradeoffs: { pros: string[]; risks: string[] };
  representativeInstitutions: string[];
  tranches: ScenarioTrancheRow[];
  sensitivityGrid: Array<{
    fxLabel: string;
    fxVal: number;
    cells: Array<{ bpsLabel: string; bpsVal: number; totalM: number }>;
  }>;
}

const SCENARIO_STRUCTURAL_PROFILES: Record<
  string,
  {
    overview: string;
    waterfallMechanics: string[];
    securityAndCovenants: string[];
    pros: string[];
    risks: string[];
    representativeInstitutions: string[];
  }
> = {
  A: {
    overview:
      'Single-source sovereign or development-bank ZAR balance-sheet loan (e.g., DBSA Infrastructure Lending). Consolidates underwriting into one concessional facility priced well below commercial prime with a 3-year construction grace period.',
    waterfallMechanics: [
      'Years 1–3 (Grace / Construction): Principal moratorium applies; borrower services only concessional interest on drawn balance (approx. 8.0% base + 50% floating sensitivity), keeping municipal cash outflows low during commissioning.',
      'Years 4–15 (Amortization): Level ZAR annuity across 12 post-grace years; zero hard-currency FX pass-through shields water tariffs from Rand depreciation.',
      'Refinancing Option: Permissible early prepayment or green-bond takeout after Year 7 once NRW revenue stabilization proves investment-grade DSCR.',
    ],
    securityAndCovenants: [
      'Statutory Gate: Municipal Council borrowing resolution under MFMA s46 + National Treasury public notice & affordability review.',
      'Ring-Fencing: Dedicated Municipal Water Services Revenue Account + 6-month Debt Service Reserve Account (DSRA) funded prior to first principal instalment.',
      'Covenants: Minimum historical & projected DSCR ≥ 1.25x; Municipal collection efficiency floor ≥ 85% by Year 3.',
    ],
    pros: [
      '100% ZAR denominated — zero FX balance-sheet shock under Rand depreciation.',
      '15-year tenor with 3-year grace aligns cashflow with multi-year NRW loss recovery.',
      'Single lender documentation minimizes inter-creditor legal fees and coordination friction.',
    ],
    risks: [
      'Single-institution DFI credit approval cycle (9–15 months) limits speed.',
      'Still requires full R420m debt capacity headroom on the municipal balance sheet (no capital grant buy-down).',
    ],
    representativeInstitutions: [
      'DBSA — Development Bank of Southern Africa Lending',
      'AFD (ZAR on-lent green municipal line)',
      'DBSA Green Fund',
    ],
  },
  B: {
    overview:
      'Optimal three-tier blended finance waterfall combining a R120m non-repayable capital grant (28.6% of capex), a R200m long-tenor concessional DFI tranche (47.6%), and a R100m commercial bank senior tranche (23.8%). Recommended base case.',
    waterfallMechanics: [
      'First-Loss Grant Layer (R120m): Disbursed pari-passu or pro-rata upfront to shrink total debt principal by 28.6%, directly cutting post-grace annual tariff burden.',
      'Middle Concessional Anchor (R200m @ 6.5%, 18Y / 3Y grace): Extended 18-year amortization creates long debt tail so commercial lenders accept shorter 10-year repayment first.',
      'Senior Commercial Slice (R100m @ 11.0%, 10Y / 1Y grace): Funded alongside domestic SA banks/institutional debt funds, benefitting from DFI cross-default comfort and lower project leverage (71% debt-to-capex).',
    ],
    securityAndCovenants: [
      'Inter-Creditor Deed: Grant provider waives repayment barring fraud/misuse; DFI & commercial bank share pari-passu senior security over ring-fenced water tariff escrow.',
      'Statutory Gate: MFMA s46 council approval for R300m net borrowing (within tighter municipal debt ceilings) + National Treasury / DWS conditional grant agreement (BFI / WSIG / RBIG).',
      'DSRA & Tariff Protection: 6-month senior DSRA + covenant step-up if collection falls below 82%.',
    ],
    pros: [
      'Lowest stressed whole-of-life cost across all macro regimes due to R120m capital grant compression.',
      'Reduces net borrowing to R300m — frequently unlocks MFMA affordability approval where 100% debt fails.',
      '100% local ZAR funding eliminates USD depreciation shocks while crowding in commercial bank liquidity.',
    ],
    risks: [
      'Multi-party structuring (grant window + DFI + commercial bank) adds 3–6 months coordination prior to financial close (12–18 months total).',
      'Grant disbursement remains conditional on E&S safeguards and NRW audit milestones.',
    ],
    representativeInstitutions: [
      'SA National Treasury BFI / DWS WSIG-RBIG',
      'AfDB — Africa Water Facility & DBSA Lending',
      'Standard Bank CIB / Nedbank CIB / Futuregrowth',
    ],
  },
  C: {
    overview:
      'Unblended 100% commercial ZAR term loan from domestic corporate & investment banks (e.g., Standard Bank, Absa, Nedbank, RMB, Investec). Fastest time-to-close (6–9 months) but carries highest interest cost and floating-rate exposure.',
    waterfallMechanics: [
      'Single Senior Floating Tranche (R420m @ 11.5% base, 100% floating, 10Y / 1Y grace): Shorter 9-year amortization creates intense debt-service front-loading.',
      'Full Rate Pass-Through: Because 100% of principal is floating-rate indexed (3M JIBAR), a +200–400 bps rate hike immediately raises annual debt service, compressing municipal operating surplus.',
      'Zero Capital Buy-Down: Full R420m must be amortized from municipal tariffs without concessional grace cushioning.',
    ],
    securityAndCovenants: [
      'Statutory Gate: Strict MFMA s46 affordability certification — commercial DSCR hurdles (≥ 1.35x) often trigger Treasury objection on unblended water works.',
      'Tight Security Package: First-ranking cession of bulk water receivables, 9-month DSRA, step-in rights, and strict negative pledge.',
      'Hedging: Banks frequently mandate an interest-rate cap/swap covering ≥ 60% of principal, adding 45–80 bps arrangement/swap cost.',
    ],
    pros: [
      'Fastest execution path (6–9 months) if municipal credit rating is strong (AA-/A+ national scale).',
      '100% ZAR denominated — avoids FX depreciation risk.',
      'Useful as a bridge facility ahead of future DFI/bond refinancing.',
    ],
    risks: [
      'Highest lifetime interest cost and severe sensitivity to +100/+400 bps rate tightening.',
      '9-year repayment window strains municipal water tariffs and risks MFMA affordability non-compliance.',
    ],
    representativeInstitutions: [
      'Standard Bank CIB',
      'Nedbank CIB & Absa CIB',
      'Investec Bank / Mergence Debt Fund',
    ],
  },
  D: {
    overview:
      'Hybrid cross-border structure pairing an R180m-equivalent USD tied Export Credit Agency buyer credit (for imported plant electromechanicals/membranes) with an R240m domestic ZAR commercial loan.',
    waterfallMechanics: [
      'USD ECA Tranche (R180m eq. @ 8.5% fixed/capped, 12Y / 2Y grace): Mostly fixed (only 25% floating), lowering nominal coupon, but 100% exposed to USD/ZAR depreciation on every semi-annual instalment.',
      'ZAR Commercial Tranche (R240m @ 11.0%, 100% floating, 10Y / 1Y grace): Funds local civil works and piping in Rand.',
      'Compounding Shock Hazard: Because municipal water tariffs are billed in ZAR while 43% of debt is USD-indexed, a 25% Rand depreciation immediately inflates USD principal & debt service in Rand terms.',
    ],
    securityAndCovenants: [
      'Mandatory Foreign-Currency Clearance: Express National Treasury approval required under MFMA s48 + formal FX risk management / TCX hedging policy.',
      'ECA Procurement & Export Content Rules: Typically 70%–85% of ECA tranche must procure eligible exporter country goods/engineering (e.g., UKEF, SACE, NEXI/JBIC, EIFO).',
      'FX Reserve / Swap Buffer: Lenders typically require either a TCX cross-currency swap (converting USD obligation to synthetic ZAR) or a rolling 12-month FX buffer account.',
    ],
    pros: [
      'Unlocks specialized membrane/SCADA water technology vendor packages with 12-year ECA tenor.',
      'Lower floating-rate exposure (25% floating) on the imported equipment slice.',
    ],
    risks: [
      'Acute USD/ZAR FX mismatch — stressed debt service spikes sharply under Rand depreciation unless swapped via TCX.',
      'Slower National Treasury s48 foreign-borrowing sign-off and tied-procurement compliance overhead.',
    ],
    representativeInstitutions: [
      'UKEF / SACE SpA / Finnvera / Atradius DSB',
      'TCX (The Currency Exchange Fund) FX Swap Desk',
      'RMB (FirstRand) / Standard Bank Trade & ECA Desk',
    ],
  },
};

export function buildScenarioStructureDetail(
  sc: FinancingScenario,
  fxShock: number,
  rateBps: number
): ScenarioStructureDetail {
  const totalCapex = sc.components.reduce((sum, c) => sum + c.amount, 0) || 1;
  const profile =
    SCENARIO_STRUCTURAL_PROFILES[sc.id] || SCENARIO_STRUCTURAL_PROFILES.A;

  const tranches: ScenarioTrancheRow[] = sc.components.map((c) => {
    const baseAmountM = c.amount / 1e6;
    const isFx = c.ccy !== 'ZAR' && !c.grant;
    const stressedAmt = c.grant ? c.amount : c.amount * (isFx ? 1 + fxShock / 100 : 1);
    const stressedAmountM = stressedAmt / 1e6;
    const effRate = c.grant ? 0 : c.rate + ((c.fl || 0) * rateBps) / 10000;
    const grace = c.grace || 0;
    const amortYears = Math.max(0, c.years - grace);
    const moratoriumCost = c.grant ? 0 : stressedAmt * effRate * grace;
    const annualPostGrace = c.grant ? 0 : annuity(stressedAmt, effRate, amortYears);
    const totalTrancheCost = c.grant ? 0 : moratoriumCost + annualPostGrace * amortYears;

    let seniorityRole = 'Senior Secured Term Debt';
    if (c.grant) seniorityRole = 'Non-Repayable Capital Grant / First-Loss';
    else if (c.ccy !== 'ZAR') seniorityRole = 'Senior Tied Buyer Credit (FX-Indexed)';
    else if (c.rate <= 0.085) seniorityRole = 'Senior Concessional DFI Tranche';

    return {
      label: c.label,
      seniorityRole,
      ccy: c.ccy,
      baseAmountM,
      stressedAmountM,
      capexSharePct: Math.round((c.amount / totalCapex) * 1000) / 10,
      baseRatePct: Number((c.rate * 100).toFixed(2)),
      floatingSharePct: Math.round((c.fl || 0) * 100),
      effectiveRatePct: Number((effRate * 100).toFixed(2)),
      years: c.years,
      grace,
      amortYears,
      moratoriumCostM: moratoriumCost / 1e6,
      annualPostGraceM: annualPostGrace / 1e6,
      totalDebtServiceM: totalTrancheCost / 1e6,
      isGrant: Boolean(c.grant),
    };
  });

  const fxPoints = [0, 15, 30];
  const bpsPoints = [0, 100, 250];
  const sensitivityGrid = fxPoints.map((fx) => ({
    fxLabel: `+${fx}% FX`,
    fxVal: fx,
    cells: bpsPoints.map((bps) => ({
      bpsLabel: `+${bps} bps`,
      bpsVal: bps,
      totalM: computeScenario(sc, fx, bps).total / 1e6,
    })),
  }));

  return {
    overview: profile.overview,
    waterfallMechanics: profile.waterfallMechanics,
    securityAndCovenants: profile.securityAndCovenants,
    tradeoffs: { pros: profile.pros, risks: profile.risks },
    representativeInstitutions: profile.representativeInstitutions,
    tranches,
    sensitivityGrid,
  };
}
