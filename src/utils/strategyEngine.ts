import { JURISDICTION_OPTIONS, LEGAL_BY_JURISDICTION, STAGE_LABEL } from '../data/capitalData';
import type {
  CapitalProvider,
  EpcContractor,
  Project,
  Role,
} from '../types/capital';
import { getCurrencySpec, getJurisdictionCurrencyProfile } from './currencies';
import { annuity, scoreMatch } from './finance';

export interface JurisdictionScopeInfo {
  jurisdictionKey: string;
  countryName: string;
  iso3: string;
  searchTokens: string[];
  isContinental: boolean;
}

const JURISDICTION_META: Record<
  string,
  { countryName: string; iso3: string; tokens: string[] }
> = {
  'za-muni': { countryName: 'South Africa', iso3: 'ZAF', tokens: ['south africa', 'zaf'] },
  'za-metro': { countryName: 'South Africa', iso3: 'ZAF', tokens: ['south africa', 'zaf', 'cape town', 'johannesburg', 'ethekwini', 'tshwane', 'ekurhuleni'] },
  'za-nat': { countryName: 'South Africa', iso3: 'ZAF', tokens: ['south africa', 'zaf'] },
  'ke-county': { countryName: 'Kenya', iso3: 'KEN', tokens: ['kenya', 'ken', 'nairobi', 'mombasa', 'kisumu', 'nakuru'] },
  'ng-state': { countryName: 'Nigeria', iso3: 'NGA', tokens: ['nigeria', 'nga', 'lagos', 'abuja', 'kano', 'rivers'] },
  'zm-muni': { countryName: 'Zambia', iso3: 'ZMB', tokens: ['zambia', 'zmb', 'lusaka'] },
  'gh-nat': { countryName: 'Ghana', iso3: 'GHA', tokens: ['ghana', 'gha', 'accra'] },
  'drc-prov': { countryName: 'DRC', iso3: 'COD', tokens: ['drc', 'congo', 'kinshasa', 'cod', 'inga', 'lobito'] },
  'ug-nat': { countryName: 'Uganda', iso3: 'UGA', tokens: ['uganda', 'uga', 'kampala'] },
  'tz-nat': { countryName: 'Tanzania', iso3: 'TZA', tokens: ['tanzania', 'tza', 'dar es salaam'] },
  'rw-nat': { countryName: 'Rwanda', iso3: 'RWA', tokens: ['rwanda', 'rwa', 'kigali'] },
  'et-nat': { countryName: 'Ethiopia', iso3: 'ETH', tokens: ['ethiopia', 'eth', 'addis'] },
  'sn-nat': { countryName: 'Senegal', iso3: 'SEN', tokens: ['senegal', 'sen', 'dakar'] },
  'ci-nat': { countryName: "Côte d'Ivoire", iso3: 'CIV', tokens: ["côte d'ivoire", 'cote d', 'abidjan', 'civ'] },
  'cm-nat': { countryName: 'Cameroon', iso3: 'CMR', tokens: ['cameroon', 'cmr', 'douala', 'yaounde'] },
  'ma-nat': { countryName: 'Morocco', iso3: 'MAR', tokens: ['morocco', 'mar', 'casablanca', 'rabat'] },
  'eg-nat': { countryName: 'Egypt', iso3: 'EGY', tokens: ['egypt', 'egy', 'cairo'] },
  'tn-nat': { countryName: 'Tunisia', iso3: 'TUN', tokens: ['tunisia', 'tun', 'tunis'] },
  'bw-nat': { countryName: 'Botswana', iso3: 'BWA', tokens: ['botswana', 'bwa', 'gaborone'] },
  'na-nat': { countryName: 'Namibia', iso3: 'NAM', tokens: ['namibia', 'nam', 'windhoek'] },
  'mz-nat': { countryName: 'Mozambique', iso3: 'MOZ', tokens: ['mozambique', 'moz', 'maputo', 'nacala'] },
  'ao-nat': { countryName: 'Angola', iso3: 'AGO', tokens: ['angola', 'ago', 'lobito', 'luanda'] },
  'zw-nat': { countryName: 'Zimbabwe', iso3: 'ZWE', tokens: ['zimbabwe', 'zwe', 'harare'] },
  'af-continental': { countryName: 'Continental Africa', iso3: 'ALL', tokens: ['africa', 'continental', 'sadc', 'eac', 'ecowas', 'comesa'] },
};

export function resolveJurisdictionScope(jurisdictionKey: string): JurisdictionScopeInfo {
  const meta = JURISDICTION_META[jurisdictionKey];
  if (meta) {
    return {
      jurisdictionKey,
      countryName: meta.countryName,
      iso3: meta.iso3,
      searchTokens: meta.tokens,
      isContinental: jurisdictionKey === 'af-continental',
    };
  }
  const opt = JURISDICTION_OPTIONS.find((j) => j.value === jurisdictionKey);
  const labelCountry = (opt?.label || jurisdictionKey).split('—')[0].trim();
  return {
    jurisdictionKey,
    countryName: labelCountry || 'Africa',
    iso3: 'ALL',
    searchTokens: [labelCountry.toLowerCase()],
    isContinental: jurisdictionKey === 'af-continental',
  };
}

export function matchesJurisdictionScope(
  project: Project,
  jurisdictionKey: string
): boolean {
  const scope = resolveJurisdictionScope(jurisdictionKey);
  if (scope.isContinental) return true;
  const hay = `${project.jurisdiction} ${project.name} ${project.authorityName || ''}`.toLowerCase();
  return scope.searchTokens.some((tok) => hay.includes(tok));
}

export function scoreEpcProjectFit(project: Project, epc: EpcContractor): number {
  let score = 46;
  const projSec = project.sector.toLowerCase();
  const secMatch = epc.sectors.some((s) => {
    const sl = s.toLowerCase();
    return (
      sl === projSec ||
      (projSec.includes('water') && sl.includes('water')) ||
      (projSec.includes('energy') && sl.includes('energy')) ||
      (projSec.includes('transport') && sl.includes('transport')) ||
      (projSec.includes('climate') && sl.includes('climate')) ||
      (projSec.includes('municipal') && sl.includes('municipal'))
    );
  });
  if (secMatch) score += 26;

  const projJ = `${project.jurisdiction} ${project.rec || ''} ${project.name}`.toLowerCase();
  const regionMatch = epc.activeRegions.some((r) => {
    const rl = r.toLowerCase();
    return (
      rl === 'africa' ||
      rl === 'sub-saharan africa' ||
      projJ.includes(rl) ||
      (projJ.includes('south africa') && rl.includes('sadc')) ||
      (projJ.includes('kenya') && rl.includes('east africa')) ||
      (projJ.includes('nigeria') && rl.includes('ecowas'))
    );
  });
  if (regionMatch) score += 16;

  if (epc.bringsCapital) score += 7;
  if (project.stage === 'transaction' || project.stage === 'structuring') {
    if (epc.capabilities.includes('PPP / BOOT Developer')) score += 4;
  }
  if (project.stage === 'feasibility' && epc.capabilities.includes('Vendor / ECA Financing')) {
    score += 3;
  }

  return Math.min(98, score);
}

export interface RoleFitSummary {
  score: number;
  fitTier: 'Strong fit' | 'Conditional fit' | 'Preparation needed';
  headline: string;
  topCounterparties: string[];
}

export function scoreRoleProjectFit(
  project: Project,
  role: Role,
  epcContractors: EpcContractor[],
  providers: CapitalProvider[]
): RoleFitSummary {
  if (role === 'epc') {
    const rankedEpcs = epcContractors
      .map((epc) => ({ epc, score: scoreEpcProjectFit(project, epc) }))
      .sort((a, b) => b.score - a.score);
    const topScore = rankedEpcs[0]?.score || 60;
    const adjusted = Math.round(topScore * 0.72 + Math.min(100, project.readiness + 15) * 0.28);
    const tier: RoleFitSummary['fitTier'] =
      adjusted >= 76 ? 'Strong fit' : adjusted >= 56 ? 'Conditional fit' : 'Preparation needed';
    return {
      score: Math.min(98, adjusted),
      fitTier: tier,
      headline:
        project.stage === 'concept' || project.stage === 'feasibility'
          ? 'Early consortium & Vendor/ECA wrap design opportunity'
          : 'Procurement-ready EPC + O&M consortium bidding window',
      topCounterparties: rankedEpcs.slice(0, 3).map((r) => r.epc.name),
    };
  }

  const rankedProviders = providers
    .map((p) => ({ p, score: scoreMatch(project, p) }))
    .sort((a, b) => b.score - a.score);

  if (role === 'provider') {
    const topScore = rankedProviders[0]?.score || 65;
    const openCritical = project.gaps.filter(
      (g) => g.severity === 'critical' && g.status !== 'Closed'
    ).length;
    const blendedScore = Math.max(
      35,
      Math.min(97, Math.round(topScore * 0.65 + project.readiness * 0.35 - openCritical * 4))
    );
    const tier: RoleFitSummary['fitTier'] =
      blendedScore >= 72 ? 'Strong fit' : blendedScore >= 52 ? 'Conditional fit' : 'Preparation needed';
    return {
      score: blendedScore,
      fitTier: tier,
      headline:
        openCritical > 0
          ? `${openCritical} critical gap${openCritical > 1 ? 's' : ''} — PPF / guarantee co-lending fit`
          : `${STAGE_LABEL[project.stage]} mandate · ready for indicative terms`,
      topCounterparties: rankedProviders.slice(0, 3).map((r) => r.p.name),
    };
  }

  // Borrower perspective
  const openGaps = project.gaps.filter((g) => g.status !== 'Closed').length;
  const borrowerScore = Math.max(
    25,
    Math.min(98, Math.round(project.readiness * 0.65 + (rankedProviders[0]?.score || 70) * 0.35 - openGaps * 2))
  );
  const tier: RoleFitSummary['fitTier'] =
    borrowerScore >= 68 ? 'Strong fit' : borrowerScore >= 48 ? 'Conditional fit' : 'Preparation needed';
  return {
    score: borrowerScore,
    fitTier: tier,
    headline:
      openGaps > 0
        ? `Close ${openGaps} bankability gap${openGaps > 1 ? 's' : ''} & match stage funding`
        : 'Ready to advance to Deal Room & Term Sheet',
    topCounterparties: rankedProviders.slice(0, 3).map((r) => r.p.name),
  };
}

export interface WizardScenarioInput {
  capexM: number;
  currency: string;
  jurisdictionKey: string;
  sector: string;
  grantPct: number;
  concessionalPct: number;
  commercialPct: number;
  epcVendorFinancePct: number;
  hedgePct: number;
  fxShockPct: number;
  rateBps: number;
  livePricing?: {
    dfiBasePct?: number;
    commercialBasePct?: number;
    epcBasePct?: number;
    hedgeSwapBps?: number;
    curveSourceLabel?: string;
  };
}

export interface WizardScenarioResult {
  normalizedMix: {
    grantPct: number;
    concessionalPct: number;
    commercialPct: number;
    epcVendorPct: number;
    sponsorEquityPct: number;
  };
  debtPrincipalM: number;
  grantAmountM: number;
  unhedgedFxDebtM: number;
  weightedCouponPct: number;
  baseTotalDebtServiceM: number;
  stressedTotalDebtServiceM: number;
  annualPostGraceM: number;
  indicativeDscr: number;
  statutoryVerdict: 'Compliant / Optimal' | 'Conditional — FX/Treasury Approval' | 'Strain Risk — Increase Grant / Hedge';
  legalHeadline: string;
  conclusions: string[];
  recommendedAction: string;
}

export function evaluateWizardScenario(input: WizardScenarioInput): WizardScenarioResult {
  const safeCapex = Math.max(5, Number.isFinite(input.capexM) ? input.capexM : 100);
  const gRaw = Math.max(0, Math.min(60, input.grantPct));
  const dRaw = Math.max(0, Math.min(80, input.concessionalPct));
  const cRaw = Math.max(0, Math.min(80, input.commercialPct));
  const eRaw = Math.max(0, Math.min(50, input.epcVendorFinancePct));

  const sumRequested = gRaw + dRaw + cRaw + eRaw;
  const scale = sumRequested > 100 ? 100 / sumRequested : 1;

  const grantPct = Number((gRaw * scale).toFixed(1));
  const concessionalPct = Number((dRaw * scale).toFixed(1));
  const commercialPct = Number((cRaw * scale).toFixed(1));
  const epcVendorPct = Number((eRaw * scale).toFixed(1));
  const sponsorEquityPct = Number(
    Math.max(0, 100 - (grantPct + concessionalPct + commercialPct + epcVendorPct)).toFixed(1)
  );

  const grantAmountM = safeCapex * (grantPct / 100);
  const concessionalM = safeCapex * (concessionalPct / 100);
  const commercialM = safeCapex * (commercialPct / 100);
  const epcVendorM = safeCapex * (epcVendorPct / 100);
  const debtPrincipalM = concessionalM + commercialM + epcVendorM;

  // Assumptions: Concessional DFI (50% hard ccy, 6.8% base, 18Y/3Y grace),
  // Commercial local (0% hard ccy, 11.2% base, 10Y/1Y grace),
  // EPC Vendor/ECA (85% hard ccy, 7.6% base, 12Y/2Y grace)
  const hardCcyDebtRawM = concessionalM * 0.45 + epcVendorM * 0.85;
  const hedgeRatio = Math.max(0, Math.min(100, input.hedgePct)) / 100;
  const unhedgedFxDebtM = hardCcyDebtRawM * (1 - hedgeRatio);
  const fxFactor = 1 + (Math.max(0, input.fxShockPct) / 100) * (1 - hedgeRatio);

  const hedgeSwapBps = input.livePricing?.hedgeSwapBps ?? 160;
  const hedgeCostRate = hedgeRatio * (hedgeSwapBps / 10000);
  const rateDelta = Math.max(0, input.rateBps) / 10000;

  const dfiBaseRate = (input.livePricing?.dfiBasePct ?? 6.8) / 100 + hedgeCostRate * 0.45;
  const commBaseRate = (input.livePricing?.commercialBasePct ?? 11.2) / 100;
  const epcBaseRate = (input.livePricing?.epcBasePct ?? 7.6) / 100 + hedgeCostRate * 0.85;

  const dfiBaseAnnual = annuity(concessionalM * 1e6, dfiBaseRate, 15) / 1e6;
  const commBaseAnnual = annuity(commercialM * 1e6, commBaseRate, 9) / 1e6;
  const epcBaseAnnual = annuity(epcVendorM * 1e6, epcBaseRate, 10) / 1e6;
  const baseTotalDebtServiceM =
    concessionalM * dfiBaseRate * 3 +
    dfiBaseAnnual * 15 +
    commercialM * commBaseRate * 1 +
    commBaseAnnual * 9 +
    epcVendorM * epcBaseRate * 2 +
    epcBaseAnnual * 10;

  const stressedConcessionalM = concessionalM * (0.55 + 0.45 * fxFactor);
  const stressedEpcM = epcVendorM * (0.15 + 0.85 * fxFactor);

  const dfiStressRate = dfiBaseRate + 0.5 * rateDelta;
  const commStressRate = commBaseRate + 0.85 * rateDelta;
  const epcStressRate = epcBaseRate + 0.25 * rateDelta;

  const dfiStressAnnual = annuity(stressedConcessionalM * 1e6, dfiStressRate, 15) / 1e6;
  const commStressAnnual = annuity(commercialM * 1e6, commStressRate, 9) / 1e6;
  const epcStressAnnual = annuity(stressedEpcM * 1e6, epcStressRate, 10) / 1e6;

  const stressedTotalDebtServiceM =
    stressedConcessionalM * dfiStressRate * 3 +
    dfiStressAnnual * 15 +
    commercialM * commStressRate * 1 +
    commStressAnnual * 9 +
    stressedEpcM * epcStressRate * 2 +
    epcStressAnnual * 10;

  const annualPostGraceM = dfiStressAnnual + commStressAnnual + epcStressAnnual;

  const weightedCouponPct =
    debtPrincipalM > 0
      ? Number(
          (
            ((concessionalM * dfiStressRate +
              commercialM * commStressRate +
              epcVendorM * epcStressRate) /
              debtPrincipalM) *
            100
          ).toFixed(2)
        )
      : 0;

  // Indicative DSCR assuming net operating cashflow covers ~12.5% of total capex (regulated tariff/availability payment)
  const assumedNetRevenueM = safeCapex * 0.115;
  const indicativeDscr =
    annualPostGraceM > 0
      ? Number((assumedNetRevenueM / annualPostGraceM).toFixed(2))
      : 3.0;

  const legalProfile =
    LEGAL_BY_JURISDICTION[input.jurisdictionKey] || LEGAL_BY_JURISDICTION['za-muni'];
  const ccyProfile = getJurisdictionCurrencyProfile(input.jurisdictionKey);
  const fxSharePct = debtPrincipalM > 0 ? (unhedgedFxDebtM / debtPrincipalM) * 100 : 0;

  let statutoryVerdict: WizardScenarioResult['statutoryVerdict'] = 'Compliant / Optimal';
  if (indicativeDscr < 1.15 || fxSharePct > 35) {
    statutoryVerdict = 'Strain Risk — Increase Grant / Hedge';
  } else if (fxSharePct > 10 || commercialPct > 45 || indicativeDscr < 1.3) {
    statutoryVerdict = 'Conditional — FX/Treasury Approval';
  }

  const ccySpec = getCurrencySpec(input.currency);
  const conclusions: string[] = [];

  if (grantPct >= 15) {
    conclusions.push(
      `Grant buy-down (${grantPct}% · ${ccySpec.symbol}${grantAmountM.toFixed(1)}m) removes principal burden and supports ${indicativeDscr.toFixed(2)}x stressed DSCR.`
    );
  } else {
    conclusions.push(
      `Low catalytic grant allocation (${grantPct}%). Securing 15%–25% preparation/VGF grant from DBSA PPF, AfDB Water/Green Facility, or PIDG would materially cut annual tariff pressure.`
    );
  }

  if (epcVendorPct > 0) {
    conclusions.push(
      `EPC / ECA wrap (${epcVendorPct}% · ${ccySpec.symbol}${epcVendorM.toFixed(1)}m) brings turnkey completion risk transfer, contingent on ${input.hedgePct}% TCX/cross-currency hedging.`
    );
  }

  if (fxSharePct > 20) {
    conclusions.push(
      `High unhedged FX exposure (${fxSharePct.toFixed(0)}% of debt). ${ccyProfile.currencyPolicyNote}`
    );
  } else {
    conclusions.push(
      `Currency risk is contained (${fxSharePct.toFixed(0)}% unhedged FX), isolating revenues from a +${input.fxShockPct}% local depreciation shock.`
    );
  }

  const recommendedAction =
    statutoryVerdict === 'Compliant / Optimal'
      ? `Lock this blended waterfall as your baseline Structure Memo, verify ${input.jurisdictionKey.toUpperCase()} council/ministry resolution, and invite top EPC + DFI matches into the Deal Room.`
      : statutoryVerdict === 'Conditional — FX/Treasury Approval'
        ? `Engage TCX or GuarantCo/InfraCredit to wrap local-currency commercial debt and initiate National Treasury / Ministry of Finance foreign-borrowing clearance early.`
        : `Raise concessional grant or sponsor equity share by at least 10% and increase FX hedge coverage above 75% before approaching commercial credit committees.`;

  return {
    normalizedMix: {
      grantPct,
      concessionalPct,
      commercialPct,
      epcVendorPct,
      sponsorEquityPct,
    },
    debtPrincipalM: Number(debtPrincipalM.toFixed(1)),
    grantAmountM: Number(grantAmountM.toFixed(1)),
    unhedgedFxDebtM: Number(unhedgedFxDebtM.toFixed(1)),
    weightedCouponPct,
    baseTotalDebtServiceM: Number(baseTotalDebtServiceM.toFixed(1)),
    stressedTotalDebtServiceM: Number(stressedTotalDebtServiceM.toFixed(1)),
    annualPostGraceM: Number(annualPostGraceM.toFixed(1)),
    indicativeDscr,
    statutoryVerdict,
    legalHeadline: legalProfile.summary,
    conclusions,
    recommendedAction,
  };
}

export type FlowInterventionId =
  | 'legal_clearance'
  | 'credit_wrap'
  | 'fx_hedge'
  | 'prep_grant'
  | 'epc_wrap'
  | 'tariff_covenant';

export interface FlowInterventionDef {
  id: FlowInterventionId;
  title: string;
  mechanism: string;
  targetConstraint: string;
  redirectMultiplierLift: number;
  bankabilityLiftPts: number;
  waccReductionBps: number;
  timelineWeeks: number;
  replacesDestination: string;
}

export const FLOW_INTERVENTIONS: FlowInterventionDef[] = [
  {
    id: 'legal_clearance',
    title: 'Statutory Borrowing & PPP Clearance Pack',
    mechanism: 'Pre-file MFMA/PFMA/Ministry of Finance approvals, council resolutions, and local EPC licensing before investor roadshows.',
    targetConstraint: 'Mandate & sovereign compliance hesitation',
    redirectMultiplierLift: 0.24,
    bankabilityLiftPts: 14,
    waccReductionBps: 45,
    timelineWeeks: 6,
    replacesDestination: 'OECD sovereign liquid treasuries & Gulf infra funds',
  },
  {
    id: 'credit_wrap',
    title: 'Partial Credit & Political Risk Guarantee (GuarantCo / ATIDI / MIGA)',
    mechanism: 'Wrap 50–80% of local-currency bond or commercial bank principal to lift credit rating to domestic AA/AAA investment grade.',
    targetConstraint: 'Sub-investment grade municipal / utility credit ceilings',
    redirectMultiplierLift: 0.34,
    bankabilityLiftPts: 18,
    waccReductionBps: 140,
    timelineWeeks: 10,
    replacesDestination: 'Latin America & Emerging Asia investment-grade infra debt',
  },
  {
    id: 'fx_hedge',
    title: 'TCX / Local-Currency Swap & Revenue Indexation',
    mechanism: 'Swap hard-currency DFI/ECA disbursements into synthetic ZAR, KES, NGN, or TZS repayments aligned with user tariffs.',
    targetConstraint: 'FX depreciation mismatch blocking pension & utility funds',
    redirectMultiplierLift: 0.28,
    bankabilityLiftPts: 13,
    waccReductionBps: 95,
    timelineWeeks: 8,
    replacesDestination: 'Hard-currency European & North American renewables',
  },
  {
    id: 'prep_grant',
    title: 'Preparation Grant Buy-Down (AfDB / DBSA PPF / PIDG TAF)',
    mechanism: 'Finance bankable ESIA, technical FEED engineering, and legal transaction advisors via non-repayable grant.',
    targetConstraint: 'Pre-feasibility funding valley of death (~8% vs 92% gap)',
    redirectMultiplierLift: 0.22,
    bankabilityLiftPts: 16,
    waccReductionBps: 60,
    timelineWeeks: 8,
    replacesDestination: 'Late-stage brownfield OECD acquisitions',
  },
  {
    id: 'epc_wrap',
    title: 'Tier-1 EPC Completion Wrap + Vendor / ECA Finance',
    mechanism: 'Appoint investment-grade EPC/BOOT lead with liquidated damages, date-certain completion, and tied ECA buyer credit.',
    targetConstraint: 'Construction overrun & technical execution risk',
    redirectMultiplierLift: 0.31,
    bankabilityLiftPts: 15,
    waccReductionBps: 110,
    timelineWeeks: 12,
    replacesDestination: 'Southeast Asia & MENA turnkey EPC capital allocations',
  },
  {
    id: 'tariff_covenant',
    title: 'Ring-Fenced Tariff Escrow & 6-Month DSRA Covenant',
    mechanism: 'Route utility/offtake cashflows through an independent collection escrow prior to general municipal expenditure.',
    targetConstraint: 'Municipal revenue leakage & budget diversion risk',
    redirectMultiplierLift: 0.26,
    bankabilityLiftPts: 14,
    waccReductionBps: 120,
    timelineWeeks: 5,
    replacesDestination: 'Domestic commercial government treasury bills (crowding-out)',
  },
];

export interface FlowRedirectionResult {
  targetCountry: string;
  baseFlowM: number;
  redirectedFlowsM: number;
  projectedTotalM: number;
  crowdingInMultiple: number;
  bankabilityUpliftPct: number;
  waccCompressionBps: number;
  competingShifts: Array<{
    fromCorridor: string;
    shiftedM: number;
    driver: string;
  }>;
  prioritizedActions: string[];
}

export function simulateFlowRedirection(params: {
  targetCountry: string;
  baseCorridorVolumeM: number;
  selectedInterventions: FlowInterventionId[];
}): FlowRedirectionResult {
  const safeBase = Math.max(50, params.baseCorridorVolumeM);
  const chosen = FLOW_INTERVENTIONS.filter((item) =>
    params.selectedInterventions.includes(item.id)
  );

  const totalLift = chosen.reduce((sum, item) => sum + item.redirectMultiplierLift, 0);
  // Synergy bonus when legal + guarantee + FX or EPC are combined
  const synergyBonus =
    chosen.length >= 4 ? 0.18 : chosen.length >= 2 ? 0.07 : 0;

  const effectiveLift = totalLift + synergyBonus;
  const redirectedFlowsM = Math.round(safeBase * effectiveLift);
  const projectedTotalM = safeBase + redirectedFlowsM;
  const crowdingInMultiple = Number((projectedTotalM / safeBase).toFixed(2));
  const bankabilityUpliftPct = Math.min(
    94,
    34 + chosen.reduce((sum, item) => sum + item.bankabilityLiftPts, 0)
  );
  const waccCompressionBps = chosen.reduce(
    (sum, item) => sum + item.waccReductionBps,
    0
  );

  const competingShifts = chosen.map((item) => ({
    fromCorridor: item.replacesDestination,
    shiftedM: Math.round(safeBase * item.redirectMultiplierLift),
    driver: item.title,
  }));

  const prioritizedActions =
    chosen.length > 0
      ? [...chosen]
          .sort((a, b) => a.timelineWeeks - b.timelineWeeks)
          .map(
            (item) =>
              `Weeks 1–${item.timelineWeeks}: ${item.title} (${item.mechanism})`
          )
      : [
          'Select one or more policy, guarantee, FX-hedging, or EPC interventions to model redirected global capital into your target market.',
        ];

  return {
    targetCountry: params.targetCountry,
    baseFlowM: safeBase,
    redirectedFlowsM,
    projectedTotalM,
    crowdingInMultiple,
    bankabilityUpliftPct,
    waccCompressionBps,
    competingShifts,
    prioritizedActions,
  };
}

const EPC_MACRO_REGIONS = new Set([
  'africa',
  'sub-saharan africa',
  'north africa',
  'east africa',
  'west africa',
  'sadc',
  'ecowas',
  'eac',
  'uemoa',
  'cemac',
  'global',
]);

export function extractEpcCountries(epcs: EpcContractor[]): {
  activeCountries: string[];
  hqCountries: string[];
} {
  const active = new Set<string>();
  const hq = new Set<string>();
  epcs.forEach((e) => {
    e.activeRegions.forEach((r) => {
      const clean = r.trim();
      if (clean && !EPC_MACRO_REGIONS.has(clean.toLowerCase())) {
        active.add(clean);
      }
    });
    e.hqCountry.split('/').forEach((part) => {
      const clean = part.trim();
      if (clean) hq.add(clean);
    });
  });
  return {
    activeCountries: Array.from(active).sort((a, b) => a.localeCompare(b)),
    hqCountries: Array.from(hq).sort((a, b) => a.localeCompare(b)),
  };
}

export function filterEpcContractors(
  epcs: EpcContractor[],
  filters: {
    search?: string;
    category?: string;
    capability?: string;
    originRegion?: string;
    activeCountry?: string;
    hqCountry?: string;
    onlyBringsCapital?: boolean;
  }
): EpcContractor[] {
  const q = (filters.search || '').trim().toLowerCase();
  const cat = filters.category || 'all';
  const cap = filters.capability || 'all';
  const reg = filters.originRegion || 'all';
  const act = filters.activeCountry || 'all';
  const hq = filters.hqCountry || 'all';
  const capOnly = Boolean(filters.onlyBringsCapital);

  return epcs.filter((e) => {
    const hay = `${e.name} ${e.hqCountry} ${e.sectors.join(' ')} ${e.activeRegions.join(' ')} ${e.flagshipTrackRecord} ${e.capitalNote}`.toLowerCase();
    const matchAct =
      act === 'all' ||
      e.activeRegions.some((r) => r.toLowerCase() === act.toLowerCase()) ||
      e.hqCountry.toLowerCase().includes(act.toLowerCase());
    const matchHq =
      hq === 'all' ||
      e.hqCountry
        .split('/')
        .map((x) => x.trim().toLowerCase())
        .includes(hq.toLowerCase());

    return (
      (!q || hay.includes(q)) &&
      (cat === 'all' || e.category === cat) &&
      (cap === 'all' || e.capabilities.includes(cap as EpcContractor['capabilities'][number])) &&
      (reg === 'all' || e.originRegion === reg) &&
      matchAct &&
      matchHq &&
      (!capOnly || e.bringsCapital)
    );
  });
}

export interface PooledSpvResult {
  projectCount: number;
  totalPoolUsdM: number;
  institutionalThresholdUsdM: number;
  meetsInstitutionalFloor: boolean;
  firstLossGuaranteePct: number;
  couponCompressionBps: number;
  projectedAnnualDebtSavingsUsdM: number;
  averageReadiness: number;
  recommendedVehicle: string;
  constituents: Array<{
    id: string;
    name: string;
    jurisdiction: string;
    capexUsdM: number;
    weightPct: number;
  }>;
  structuringSteps: string[];
}

export function computePooledSpvSummary(
  selectedProjects: Project[],
  firstLossGuaranteePct = 20
): PooledSpvResult {
  const thresholdUsdM = 150;
  const safeGuaranteePct = Math.max(0, Math.min(40, firstLossGuaranteePct));

  if (selectedProjects.length === 0) {
    return {
      projectCount: 0,
      totalPoolUsdM: 0,
      institutionalThresholdUsdM: thresholdUsdM,
      meetsInstitutionalFloor: false,
      firstLossGuaranteePct: safeGuaranteePct,
      couponCompressionBps: 0,
      projectedAnnualDebtSavingsUsdM: 0,
      averageReadiness: 0,
      recommendedVehicle: 'Select 2+ sub-sovereign or utility projects to model a Pooled SPV Bond',
      constituents: [],
      structuringSteps: [
        'Check at least 2 projects in your workspace to combine their Capex toward a $150m institutional bond floor.',
      ],
    };
  }

  const usdValues = selectedProjects.map((p) => {
    const spec = getCurrencySpec(p.currency);
    const capexM = p.capex / 1e6;
    const capexUsdM = Number((capexM / (spec.perUsd || 1)).toFixed(1));
    return { p, capexUsdM };
  });

  const totalPoolUsdM = Number(
    usdValues.reduce((sum, item) => sum + item.capexUsdM, 0).toFixed(1)
  );
  const meetsInstitutionalFloor = totalPoolUsdM >= thresholdUsdM && selectedProjects.length >= 2;
  const averageReadiness = Math.round(
    selectedProjects.reduce((s, p) => s + p.readiness, 0) / selectedProjects.length
  );

  // Coupon compression scales from 45 bps (single/sub-scale) up to 165 bps (diverse pool + Guarantee wrap)
  const scaleBps = totalPoolUsdM >= 300 ? 75 : totalPoolUsdM >= 150 ? 55 : 25;
  const diversityBps = Math.min(45, Math.max(0, (selectedProjects.length - 1) * 15));
  const guaranteeBps = Math.round(safeGuaranteePct * 1.85);
  const couponCompressionBps =
    selectedProjects.length >= 2 ? scaleBps + diversityBps + guaranteeBps : Math.round(guaranteeBps * 0.5);

  // Assume 70% debt share across the pool
  const projectedAnnualDebtSavingsUsdM = Number(
    ((totalPoolUsdM * 0.7 * couponCompressionBps) / 10000).toFixed(2)
  );

  const recommendedVehicle = meetsInstitutionalFloor
    ? `Pooled Multi-Authority Infrastructure Bond SPV ($${totalPoolUsdM.toFixed(0)}m · ${safeGuaranteePct}% First-Loss Guarantee)`
    : selectedProjects.length < 2
      ? 'Single-Asset Mandate — Add >= 1 peer project to diversify municipal credit risk'
      : `Sub-Threshold Club Deal ($${totalPoolUsdM.toFixed(0)}m < $150m bond floor) — Pair with DBSA/TDB Warehouse`;

  const constituents = usdValues.map(({ p, capexUsdM }) => ({
    id: p.id,
    name: p.name,
    jurisdiction: p.jurisdiction,
    capexUsdM,
    weightPct: totalPoolUsdM > 0 ? Number(((capexUsdM / totalPoolUsdM) * 100).toFixed(1)) : 0,
  }));

  const structuringSteps = [
    `Execute Inter-Municipal / Multi-Sponsor SPV Agreement consolidating ${selectedProjects.length} assets totaling $${totalPoolUsdM.toFixed(1)}m USD equivalent.`,
    `Engage GuarantCo / ATIDI / InfraCredit for a ${safeGuaranteePct}% First-Loss Partial Credit Guarantee lifting domestic bond credit quality by 2–3 notches.`,
    `Standardize ring-fenced tariff collection accounts & 6-month DSRA covenants across all participating authorities.`,
  ];

  return {
    projectCount: selectedProjects.length,
    totalPoolUsdM,
    institutionalThresholdUsdM: thresholdUsdM,
    meetsInstitutionalFloor,
    firstLossGuaranteePct: safeGuaranteePct,
    couponCompressionBps,
    projectedAnnualDebtSavingsUsdM,
    averageReadiness,
    recommendedVehicle,
    constituents,
    structuringSteps,
  };
}
