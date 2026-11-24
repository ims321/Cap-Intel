import type {
  SAMunicipalitiesResponse,
  SAMunicipalitySummary,
  SubnationalFiscalRow,
  WorldBankLiveProject,
} from '../types/publicData';

/**
 * Validate HTTP(S) external URLs before exposing links in the UI.
 */
export function sanitizeHttpUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Strict RFC-4180 CSV parser supporting quoted fields containing commas,
 * escaped quotes (""), and embedded CRLF/LF newlines inside headers or cells.
 */
export function parseCsvRfc4180(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  // Strip UTF-8 BOM if present
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      currentField += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      if (text[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
      continue;
    }

    if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
      continue;
    }

    currentField += ch;
    i += 1;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseNumericCell(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[\s,]+/g, '')
    .trim();
  if (!cleaned || cleaned === '-' || cleaned === '—') return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse Kenya CRA County Allocation CSV (all 47 counties).
 */
export function parseKenyaCaraCsv(csvText: string): {
  rows: SubnationalFiscalRow[];
  fiscalYearLabel: string;
} {
  const matrix = parseCsvRfc4180(csvText);
  if (matrix.length < 2) {
    return { rows: [], fiscalYearLabel: 'CRA FY 2018/2019' };
  }

  const headerIdx = matrix.findIndex((r) =>
    (r[0] || '').trim().toLowerCase().startsWith('county')
  );
  if (headerIdx === -1) {
    return { rows: [], fiscalYearLabel: 'CRA FY 2018/2019' };
  }

  const headers = matrix[headerIdx].map((h) => h.replace(/\s+/g, ' ').trim().toLowerCase());
  const colIdx = (needle: string, fallback: number) => {
    const found = headers.findIndex((h) => h.includes(needle));
    return found >= 0 ? found : fallback;
  };

  const idxCounty = 0;
  const idxPriorEq = colIdx('2017/2018 equitable share', 2);
  const idxEqShare = colIdx('2018/2019 equitable share', 4);
  const idxCondGrants = colIdx('total conditional grants', 11);
  const idxLoansGrants = colIdx('total loans and grants', 12);
  const idxTotalAlloc = colIdx('total allocations', 13);
  const idxPerCapita = colIdx('per capita', 14);

  const counties: SubnationalFiscalRow[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 5) continue;
    const rawName = (row[idxCounty] || '').replace(/\s+/g, ' ').trim();
    if (!rawName || rawName.toLowerCase() === 'total') continue;

    counties.push({
      id: `KE-${rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: rawName,
      unitType: 'County',
      currency: 'KES',
      equitableShare: parseNumericCell(row[idxEqShare]),
      conditionalGrants: parseNumericCell(row[idxCondGrants]),
      loansAndGrants: parseNumericCell(row[idxLoansGrants]),
      totalAllocation: parseNumericCell(row[idxTotalAlloc]),
      perCapitaAllocation: parseNumericCell(row[idxPerCapita]),
      priorYearTotal: parseNumericCell(row[idxPriorEq]),
      fiscalYearLabel: 'CRA FY 2018/2019',
    });
  }

  counties.sort((a, b) => (b.totalAllocation || 0) - (a.totalAllocation || 0));
  return { rows: counties, fiscalYearLabel: 'CRA FY 2018/2019' };
}

/**
 * Parse Nigerian NBS FAAC monthly allocations CSV (36 States + FCT).
 */
export function parseNigeriaFaacCsv(csvText: string): {
  rows: SubnationalFiscalRow[];
  fiscalYearLabel: string;
  latestFullYear: number;
} {
  const matrix = parseCsvRfc4180(csvText);
  const headerIdx = matrix.findIndex(
    (r) =>
      r.length >= 4 &&
      (r[0] || '').trim().toLowerCase() === 'state' &&
      (r[1] || '').trim().toLowerCase() === 'year'
  );

  if (headerIdx === -1) {
    return { rows: [], fiscalYearLabel: 'NBS FAAC', latestFullYear: 2018 };
  }

  const byStateYear = new Map<
    string,
    Map<number, { total: number; months: number }>
  >();

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length < 4) continue;
    const state = (row[0] || '').replace(/\s+/g, ' ').trim();
    const stateLower = state.toLowerCase();
    if (!state || stateLower === 'nigeria' || stateLower === 'total') continue;
    const year = Math.trunc(parseNumericCell(row[1]));
    const total = parseNumericCell(row[3]);
    if (!year || year < 2000) continue;

    if (!byStateYear.has(state)) {
      byStateYear.set(state, new Map());
    }
    const yrMap = byStateYear.get(state)!;
    const prev = yrMap.get(year) || { total: 0, months: 0 };
    prev.total += total;
    prev.months += 1;
    yrMap.set(year, prev);
  }

  // Determine the latest year that has full-year (>=10 months median) coverage
  const yearCoverage = new Map<number, number[]>();
  for (const yrMap of byStateYear.values()) {
    for (const [y, stats] of yrMap.entries()) {
      const list = yearCoverage.get(y) || [];
      list.push(stats.months);
      yearCoverage.set(y, list);
    }
  }

  const yearsDesc = Array.from(yearCoverage.keys()).sort((a, b) => b - a);
  let latestFullYear = yearsDesc[0] || 2018;
  for (const y of yearsDesc) {
    const counts = yearCoverage.get(y) || [];
    const avgMonths =
      counts.reduce((sum, m) => sum + m, 0) / Math.max(1, counts.length);
    if (avgMonths >= 9.5) {
      latestFullYear = y;
      break;
    }
  }

  const prevFullYear = latestFullYear - 1;
  const rows: SubnationalFiscalRow[] = [];

  for (const [state, yrMap] of byStateYear.entries()) {
    const current = yrMap.get(latestFullYear)?.total ?? 0;
    const prior = yrMap.get(prevFullYear)?.total ?? null;
    let multiYear = 0;
    for (const stats of yrMap.values()) {
      multiYear += stats.total;
    }

    const displayName =
      state.toUpperCase() === 'FCT'
        ? 'FCT Abuja'
        : state;

    rows.push({
      id: `NG-${state.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: displayName,
      unitType: state.toUpperCase() === 'FCT' ? 'Federal Capital Territory' : 'State',
      currency: 'NGN',
      totalAllocation: current,
      priorYearTotal: prior,
      multiYearTotal: multiYear,
      fiscalYearLabel: `FY ${latestFullYear} NBS FAAC`,
    });
  }

  rows.sort((a, b) => (b.totalAllocation || 0) - (a.totalAllocation || 0));
  return {
    rows,
    fiscalYearLabel: `FY ${latestFullYear} NBS FAAC (Multi-year 2016–2019)`,
    latestFullYear,
  };
}

export interface SATreasuryMember {
  'municipality.demarcation_code'?: string;
  'municipality.name'?: string;
  'municipality.long_name'?: string;
  'municipality.province_code'?: string;
  'municipality.province_name'?: string;
  'municipality.category'?: string;
  'municipality.miif_category'?: string;
  'municipality.phone_number'?: string;
  'municipality.street_address_1'?: string;
  'municipality.url'?: string;
}

export interface SATreasuryAggregateCell {
  'demarcation.code'?: string;
  'item.code'?: string;
  'amount.sum'?: number | null;
}

export interface SATreasuryAuditFact {
  'demarcation.code'?: string;
  'opinion.code'?: string;
  'opinion.label'?: string;
  'opinion.report_url'?: string | null;
}

function indexCellsByCode(
  cells: SATreasuryAggregateCell[] | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(cells)) return map;
  for (const c of cells) {
    const code = c['demarcation.code'];
    const val = c['amount.sum'];
    if (typeof code === 'string' && typeof val === 'number' && Number.isFinite(val)) {
      map.set(code, (map.get(code) || 0) + val);
    }
  }
  return map;
}

export function normalizeCategoryLabel(
  cat?: string
): { category: 'A' | 'B' | 'C'; categoryLabel: 'Metro' | 'Local Municipality' | 'District Municipality' } {
  const c = (cat || 'B').trim().toUpperCase();
  if (c === 'A') return { category: 'A', categoryLabel: 'Metro' };
  if (c === 'C') return { category: 'C', categoryLabel: 'District Municipality' };
  return { category: 'B', categoryLabel: 'Local Municipality' };
}

/**
 * Merge all bulk South African National Treasury mSCOA cubes into one clean
 * per-municipality record per active A/B/C municipality plus national/provincial rollups.
 */
export function mergeSouthAfricaMunicipalCubes(params: {
  members: SATreasuryMember[];
  capAuda25: SATreasuryAggregateCell[];
  capOrgb25: SATreasuryAggregateCell[];
  capAuda24: SATreasuryAggregateCell[];
  capOrgb24: SATreasuryAggregateCell[];
  incRev25: SATreasuryAggregateCell[];
  incExp25: SATreasuryAggregateCell[];
  fpCash25: SATreasuryAggregateCell[];
  fpBorrow25: SATreasuryAggregateCell[];
  fpLiab25: SATreasuryAggregateCell[];
  grantsTrfr24: SATreasuryAggregateCell[];
  auditFacts24: SATreasuryAuditFact[];
  fetchedAt?: string;
}): SAMunicipalitiesResponse {
  const capA25Map = indexCellsByCode(params.capAuda25);
  const capB25Map = indexCellsByCode(params.capOrgb25);
  const capA24Map = indexCellsByCode(params.capAuda24);
  const capB24Map = indexCellsByCode(params.capOrgb24);
  const rev25Map = indexCellsByCode(params.incRev25);
  const exp25Map = indexCellsByCode(params.incExp25);
  const cash25Map = indexCellsByCode(params.fpCash25);
  const borrow25Map = indexCellsByCode(params.fpBorrow25);
  const liab25Map = indexCellsByCode(params.fpLiab25);
  const grants24Map = indexCellsByCode(params.grantsTrfr24);

  const auditMap = new Map<string, SATreasuryAuditFact>();
  for (const a of params.auditFacts24 || []) {
    if (a['demarcation.code']) {
      auditMap.set(a['demarcation.code'], a);
    }
  }

  const seenCodes = new Set<string>();
  const municipalities: SAMunicipalitySummary[] = [];

  for (const m of params.members || []) {
    const code = (m['municipality.demarcation_code'] || '').trim();
    const catRaw = (m['municipality.category'] || '').trim().toUpperCase();
    if (!code || seenCodes.has(code)) continue;
    // Filter strictly to active constitutional Category A, B, or C municipalities
    if (catRaw !== 'A' && catRaw !== 'B' && catRaw !== 'C') continue;

    // Exclude historical demarcations that have zero data across all current cubes & audits
    const hasCurrentData =
      capA25Map.has(code) ||
      capB25Map.has(code) ||
      capA24Map.has(code) ||
      capB24Map.has(code) ||
      grants24Map.has(code) ||
      auditMap.has(code) ||
      rev25Map.has(code);
    if (!hasCurrentData) continue;

    seenCodes.add(code);
    const { category, categoryLabel } = normalizeCategoryLabel(catRaw);

    const capActual25 = capA25Map.has(code) ? capA25Map.get(code)! : null;
    const capBudget25 = capB25Map.has(code) ? capB25Map.get(code)! : null;
    const capActual24 = capA24Map.has(code) ? capA24Map.get(code)! : null;
    const capBudget24 = capB24Map.has(code) ? capB24Map.get(code)! : null;

    let execPct: number | null = null;
    if (capActual25 !== null && capBudget25 !== null && capBudget25 > 0) {
      execPct = Math.round((capActual25 / capBudget25) * 1000) / 10;
    } else if (capActual24 !== null && capBudget24 !== null && capBudget24 > 0) {
      execPct = Math.round((capActual24 / capBudget24) * 1000) / 10;
    }

    const rev25 = rev25Map.has(code) ? rev25Map.get(code)! : null;
    const exp25 = exp25Map.has(code) ? exp25Map.get(code)! : null;
    const surplus = rev25 !== null && exp25 !== null ? rev25 - exp25 : null;

    const audit = auditMap.get(code);

    municipalities.push({
      code,
      name: (m['municipality.name'] || code).trim(),
      longName: (m['municipality.long_name'] || m['municipality.name'] || code).trim(),
      provinceCode: (m['municipality.province_code'] || '').trim(),
      provinceName: (m['municipality.province_name'] || 'Unknown').trim(),
      category,
      categoryLabel,
      miifCategory: (m['municipality.miif_category'] || category).trim(),
      officialUrl: sanitizeHttpUrl(m['municipality.url']),
      phoneNumber: m['municipality.phone_number']?.trim() || null,
      streetAddress: m['municipality.street_address_1']?.trim() || null,
      capexActualFy25: capActual25,
      capexBudgetFy25: capBudget25,
      capexActualFy24: capActual24,
      capexBudgetFy24: capBudget24,
      capexExecutionPct: execPct,
      revenueFy25: rev25,
      expenditureFy25: exp25,
      surplusDeficitFy25: surplus,
      serviceChargesFy25: null,
      cashBalanceFy25: cash25Map.has(code) ? cash25Map.get(code)! : null,
      nonCurrentBorrowingFy25: borrow25Map.has(code) ? borrow25Map.get(code)! : null,
      totalLiabilitiesFy25: liab25Map.has(code) ? liab25Map.get(code)! : null,
      grantsFy24: grants24Map.has(code) ? grants24Map.get(code)! : null,
      auditCodeFy24: audit?.['opinion.code'] || null,
      auditOutcomeFy24: audit?.['opinion.label'] || null,
      auditReportUrl: sanitizeHttpUrl(audit?.['opinion.report_url']),
    });
  }

  // Sort by FY25 CapEx descending so major metros & high-spend councils appear first
  municipalities.sort((a, b) => {
    const diff = (b.capexActualFy25 ?? b.capexBudgetFy25 ?? 0) - (a.capexActualFy25 ?? a.capexBudgetFy25 ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const provinces = Array.from(
    new Set(municipalities.map((m) => m.provinceName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  let totalCapexActualFy25Zar = 0;
  let totalCapexBudgetFy25Zar = 0;
  let reportingCapexFy25 = 0;
  let totalGrantsFy24Zar = 0;
  let totalCashFy25Zar = 0;
  let totalBorrowingFy25Zar = 0;
  let unqualifiedAudits = 0;
  let qualifiedAudits = 0;
  let adverseOrDisclaimerAudits = 0;
  const execPcts: number[] = [];

  const provMap = new Map<
    string,
    {
      provinceName: string;
      count: number;
      capexActualFy25Zar: number;
      capexBudgetFy25Zar: number;
      unqualifiedAudits: number;
    }
  >();

  for (const m of municipalities) {
    if (typeof m.capexActualFy25 === 'number') {
      totalCapexActualFy25Zar += m.capexActualFy25;
      reportingCapexFy25 += 1;
    }
    if (typeof m.capexBudgetFy25 === 'number') {
      totalCapexBudgetFy25Zar += m.capexBudgetFy25;
    }
    if (typeof m.capexExecutionPct === 'number' && m.capexExecutionPct >= 0 && m.capexExecutionPct <= 250) {
      execPcts.push(m.capexExecutionPct);
    }
    if (typeof m.grantsFy24 === 'number') totalGrantsFy24Zar += m.grantsFy24;
    if (typeof m.cashBalanceFy25 === 'number') totalCashFy25Zar += m.cashBalanceFy25;
    if (typeof m.nonCurrentBorrowingFy25 === 'number') {
      totalBorrowingFy25Zar += m.nonCurrentBorrowingFy25;
    }

    const ac = (m.auditCodeFy24 || '').toLowerCase();
    const isUnq = ac === 'unqualified' || ac === 'unqualified_emphasis_of_matter';
    if (isUnq) unqualifiedAudits += 1;
    else if (ac === 'qualified') qualifiedAudits += 1;
    else if (ac === 'adverse' || ac === 'disclaimer') adverseOrDisclaimerAudits += 1;

    const pEntry = provMap.get(m.provinceName) || {
      provinceName: m.provinceName,
      count: 0,
      capexActualFy25Zar: 0,
      capexBudgetFy25Zar: 0,
      unqualifiedAudits: 0,
    };
    pEntry.count += 1;
    pEntry.capexActualFy25Zar += m.capexActualFy25 || 0;
    pEntry.capexBudgetFy25Zar += m.capexBudgetFy25 || 0;
    if (isUnq) pEntry.unqualifiedAudits += 1;
    provMap.set(m.provinceName, pEntry);
  }

  let meanExecutionPct: number | null = null;
  if (execPcts.length > 0) {
    const sorted = [...execPcts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    meanExecutionPct =
      sorted.length % 2 === 1
        ? sorted[mid]
        : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }

  return {
    municipalities,
    provinces,
    nationalTotals: {
      totalMunicipalities: municipalities.length,
      reportingCapexFy25,
      totalCapexActualFy25Zar,
      totalCapexBudgetFy25Zar,
      meanExecutionPct,
      totalGrantsFy24Zar,
      totalCashFy25Zar,
      totalBorrowingFy25Zar,
      unqualifiedAudits,
      qualifiedAudits,
      adverseOrDisclaimerAudits,
    },
    provinceSummary: Array.from(provMap.values()).sort(
      (a, b) => b.capexActualFy25Zar - a.capexActualFy25Zar
    ),
    sourceName: 'South Africa National Treasury Municipal Money API (mSCOA Section 71)',
    sourceUrl: 'https://municipaldata.treasury.gov.za/api',
    fetchedAt: params.fetchedAt || new Date().toISOString(),
  };
}

export function mapWorldBankProjectsResponse(raw: unknown): {
  total: number;
  projects: WorldBankLiveProject[];
} {
  if (!raw || typeof raw !== 'object') {
    return { total: 0, projects: [] };
  }
  const obj = raw as {
    total?: number | string;
    projects?: Record<string, Record<string, unknown>>;
  };
  const total = Number(obj.total) || 0;
  const projectsObj = obj.projects || {};

  const projects: WorldBankLiveProject[] = Object.values(projectsObj)
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object' && p.id))
    .map((p) => {
      const id = String(p.id);
      const sector1 = p.sector1 as { Name?: string } | undefined;
      const amtStr = String(p.totalamt || p.curr_total_commitment || '0');
      const amt = parseNumericCell(amtStr);
      const rawUrl = typeof p.url === 'string' ? p.url : `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`;
      return {
        id,
        name: String(p.project_name || 'Untitled Project'),
        countryCode: String(p.countrycode || ''),
        countryName: String(
          Array.isArray(p.countryshortname)
            ? p.countryshortname[0]
            : p.countryshortname || ''
        ),
        status: String(p.status || 'Unknown'),
        approvalDate: String(p.boardapprovaldate || '').slice(0, 10),
        closingDate: String(p.closingdate || '').slice(0, 10),
        totalCommitmentUsd: amt,
        sectorName: String(sector1?.Name || 'Infrastructure'),
        lendingInstrument: String(p.lendinginstr || 'Investment Project Financing'),
        borrower: String(p.borrower || p.impagency || 'National Authority'),
        projectUrl: sanitizeHttpUrl(rawUrl),
      };
    });

  return { total, projects };
}

export function parseGeoBoundariesFeatures(
  geojson: unknown,
  unitType: string,
  iso3: string
): SubnationalFiscalRow[] {
  if (!geojson || typeof geojson !== 'object') return [];
  const features = (geojson as { features?: Array<{ properties?: Record<string, unknown> }> }).features;
  if (!Array.isArray(features)) return [];

  const rows: SubnationalFiscalRow[] = [];
  const seen = new Set<string>();

  for (const f of features) {
    const props = f?.properties || {};
    const rawName = String(props.shapeName || props.name || '').trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      id: `${iso3}-${String(props.shapeID || key.replace(/[^a-z0-9]+/g, '-'))}`,
      name: rawName,
      unitType,
      isoOrCode: String(props.shapeISO || '').trim() || undefined,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
