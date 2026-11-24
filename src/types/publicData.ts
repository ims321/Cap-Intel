export type CountryIso3 =
  | 'ZAF'
  | 'KEN'
  | 'NGA'
  | 'GHA'
  | 'ZMB'
  | 'COD'
  | 'SEN'
  | 'MAR'
  | 'UGA'
  | 'EGY';

export type DataCoverageTier =
  | 'tier1_municipal_api'
  | 'tier2_subnational_fiscal_csv'
  | 'tier3_subnational_registry_wb';

export interface CountryWdiMetrics {
  urbanPopPct: number | null;
  urbanPopYear: string | null;
  electricityAccessPct: number | null;
  electricityAccessYear: string | null;
  gdpUsd: number | null;
  gdpYear: string | null;
  population: number | null;
  populationYear: string | null;
}

export interface CountryPublicCoverage {
  iso3: CountryIso3;
  iso2: string;
  name: string;
  tier: DataCoverageTier;
  tierLabel: string;
  subnationalUnitLabel: string;
  subnationalCount: number;
  primarySourceName: string;
  primarySourceUrl: string;
  coverageNote: string;
  jurisdictionKey: string;
  localCurrency: string;
  wdi: CountryWdiMetrics;
}

export interface SAMunicipalitySummary {
  code: string;
  name: string;
  longName: string;
  provinceCode: string;
  provinceName: string;
  category: 'A' | 'B' | 'C';
  categoryLabel: 'Metro' | 'Local Municipality' | 'District Municipality';
  miifCategory: string;
  officialUrl: string | null;
  phoneNumber: string | null;
  streetAddress: string | null;
  capexActualFy25: number | null;
  capexBudgetFy25: number | null;
  capexActualFy24: number | null;
  capexBudgetFy24: number | null;
  capexExecutionPct: number | null;
  revenueFy25: number | null;
  expenditureFy25: number | null;
  surplusDeficitFy25: number | null;
  serviceChargesFy25: number | null;
  cashBalanceFy25: number | null;
  nonCurrentBorrowingFy25: number | null;
  totalLiabilitiesFy25: number | null;
  grantsFy24: number | null;
  auditCodeFy24: string | null;
  auditOutcomeFy24: string | null;
  auditReportUrl: string | null;
}

export interface SAMunicipalitiesResponse {
  municipalities: SAMunicipalitySummary[];
  provinces: string[];
  nationalTotals: {
    totalMunicipalities: number;
    reportingCapexFy25: number;
    totalCapexActualFy25Zar: number;
    totalCapexBudgetFy25Zar: number;
    meanExecutionPct: number | null;
    totalGrantsFy24Zar: number;
    totalCashFy25Zar: number;
    totalBorrowingFy25Zar: number;
    unqualifiedAudits: number;
    qualifiedAudits: number;
    adverseOrDisclaimerAudits: number;
  };
  provinceSummary: Array<{
    provinceName: string;
    count: number;
    capexActualFy25Zar: number;
    capexBudgetFy25Zar: number;
    unqualifiedAudits: number;
  }>;
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
}

export interface SAMunicipalityDetail {
  code: string;
  capexHistory: Array<{
    year: number;
    actual: number | null;
    budget: number | null;
  }>;
  capexByFunction: Array<{
    functionName: string;
    amount: number;
  }>;
  officials: Array<{
    role: string;
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  fetchedAt: string;
}

export interface SubnationalFiscalRow {
  id: string;
  name: string;
  parentRegion?: string;
  unitType: string;
  isoOrCode?: string;
  currency?: string;
  equitableShare?: number | null;
  conditionalGrants?: number | null;
  loansAndGrants?: number | null;
  totalAllocation?: number | null;
  perCapitaAllocation?: number | null;
  priorYearTotal?: number | null;
  multiYearTotal?: number | null;
  fiscalYearLabel?: string;
}

export interface WorldBankLiveProject {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  status: string;
  approvalDate: string;
  closingDate: string;
  totalCommitmentUsd: number;
  sectorName: string;
  lendingInstrument: string;
  borrower: string;
  projectUrl: string | null;
}

export interface CountryDetailResponse {
  country: CountryPublicCoverage;
  subnationalUnits: SubnationalFiscalRow[];
  hasFiscalDataset: boolean;
  fiscalSummaryNote: string;
  worldBankTotalCount: number;
  worldBankProjects: WorldBankLiveProject[];
  fetchedAt: string;
}

export interface PublicDataAiSummary {
  saLoadedCount: number;
  saCleanAuditCount: number;
  saTotalCapexBnZar: number;
  saTopMunicipalities: string[];
  activeCountrySummary?: string;
}
