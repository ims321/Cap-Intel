import type {
  CountryDetailResponse,
  CountryIso3,
  CountryPublicCoverage,
  CountryWdiMetrics,
  SAMunicipalitiesResponse,
  SAMunicipalityDetail,
  SubnationalFiscalRow,
} from '../src/types/publicData.ts';
import {
  mapWorldBankProjectsResponse,
  mergeSouthAfricaMunicipalCubes,
  parseGeoBoundariesFeatures,
  parseKenyaCaraCsv,
  parseNigeriaFaacCsv,
  type SATreasuryAggregateCell,
  type SATreasuryAuditFact,
  type SATreasuryMember,
} from '../src/utils/publicDataHelpers.ts';

const SA_TREASURY_BASE = 'https://municipaldata.treasury.gov.za/api';
const WB_V2_BASE = 'https://api.worldbank.org/v2';
const WB_PROJECTS_BASE = 'https://search.worldbank.org/api/v2/projects';
const GEOBOUNDARIES_BASE = 'https://www.geoboundaries.org/api/current/gbOpen';

const KENYA_CRA_CSV_URL =
  'https://open.africa/dataset/531daf1b-15af-4a39-a366-b36a0e5df1ea/resource/ddfa771f-5c04-4645-8fdc-a4c9310fa331/download/revenue-allocation-for-each-county-government-2018-2019.csv';

const NIGERIA_FAAC_CSV_URL =
  'https://open.africa/dataset/7770d80e-140f-41eb-9c19-3613305a04a2/resource/6f270831-7e3d-400d-9258-d0d16ebcc12a/download/faac-allocation-2016-2019.csv';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const SA_DEMARCATION_CODE_RE = /^[A-Z0-9]{2,12}$/;

interface CountryStaticSpec {
  iso3: CountryIso3;
  iso2: string;
  name: string;
  tier: CountryPublicCoverage['tier'];
  tierLabel: string;
  subnationalUnitLabel: string;
  defaultUnitCount: number;
  gbLevel: 'ADM1' | 'ADM2';
  unitSingular: string;
  primarySourceName: string;
  primarySourceUrl: string;
  coverageNote: string;
  jurisdictionKey: string;
  localCurrency: string;
}

export const COUNTRY_SPECS: Record<CountryIso3, CountryStaticSpec> = {
  ZAF: {
    iso3: 'ZAF',
    iso2: 'ZA',
    name: 'South Africa',
    tier: 'tier1_municipal_api',
    tierLabel: 'Tier 1 · Live Audited Municipal API',
    subnationalUnitLabel: 'Metros, Local & District Municipalities',
    defaultUnitCount: 257,
    gbLevel: 'ADM1',
    unitSingular: 'Province',
    primarySourceName: 'SA National Treasury Municipal Money API (mSCOA Section 71)',
    primarySourceUrl: 'https://municipaldata.treasury.gov.za/api',
    coverageNote:
      'Full live JSON API covering all active Category A/B/C municipalities: FY2025 audited CapEx vs budget, sector functions, operating revenue/expenditure, cash & liabilities, national grants, AGSA audit opinions, and statutory CFO/Mayor officials.',
    jurisdictionKey: 'za-muni',
    localCurrency: 'ZAR',
  },
  KEN: {
    iso3: 'KEN',
    iso2: 'KE',
    name: 'Kenya',
    tier: 'tier2_subnational_fiscal_csv',
    tierLabel: 'Tier 2 · County Fiscal CSV + WB Pipeline',
    subnationalUnitLabel: 'Devolved Counties',
    defaultUnitCount: 47,
    gbLevel: 'ADM1',
    unitSingular: 'County',
    primarySourceName: 'Commission on Revenue Allocation (CRA via openAFRICA) + World Bank',
    primarySourceUrl: 'https://open.africa/dataset/kenya-county-revenue-allocation',
    coverageNote:
      'All 47 devolved Kenyan Counties with published Equitable Share, Conditional Grants, Road Fuel Levy, Total Loans & Grants, and per-capita KES allocations paired with live World Bank infrastructure loans.',
    jurisdictionKey: 'ke-county',
    localCurrency: 'KES',
  },
  NGA: {
    iso3: 'NGA',
    iso2: 'NG',
    name: 'Nigeria',
    tier: 'tier2_subnational_fiscal_csv',
    tierLabel: 'Tier 2 · State FAAC Allocations + WB Pipeline',
    subnationalUnitLabel: 'States + FCT Abuja',
    defaultUnitCount: 37,
    gbLevel: 'ADM1',
    unitSingular: 'State / FCT',
    primarySourceName: 'Nigerian NBS FAAC Allocations (openAFRICA) + World Bank',
    primarySourceUrl: 'https://open.africa/dataset/faac-allocation-by-state',
    coverageNote:
      'All 36 States plus FCT Abuja aggregated from Nigerian National Bureau of Statistics monthly FAAC statutory revenue disbursements (₦) alongside live World Bank urban & power project pipelines.',
    jurisdictionKey: 'ng-state',
    localCurrency: 'NGN',
  },
  ZMB: {
    iso3: 'ZMB',
    iso2: 'ZM',
    name: 'Zambia',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 116 Districts + Live WB Pipeline',
    subnationalUnitLabel: 'Municipal & District Councils',
    defaultUnitCount: 116,
    gbLevel: 'ADM2',
    unitSingular: 'District Council',
    primarySourceName: 'GeoBoundaries Official Zambia ADM2 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'Official 116 Zambian District & Municipal jurisdictions paired with live World Bank Active Infrastructure Projects & WDI benchmarks. Zambia does not yet publish an unauthenticated live municipal Section 71 accounting JSON API.',
    jurisdictionKey: 'zm-muni',
    localCurrency: 'ZMW',
  },
  GHA: {
    iso3: 'GHA',
    iso2: 'GH',
    name: 'Ghana',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 16 Regions + Live WB Pipeline',
    subnationalUnitLabel: 'Administrative Regions',
    defaultUnitCount: 16,
    gbLevel: 'ADM1',
    unitSingular: 'Region',
    primarySourceName: 'GeoBoundaries Official Ghana ADM1 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'Official 16 Ghanaian Regions mapped with live World Bank infrastructure & urban resilience operations and WDI national utility benchmarks. District MMDA accounting statements require Ghana MOF composite budget PDFs.',
    jurisdictionKey: 'gh-nat',
    localCurrency: 'GHS',
  },
  COD: {
    iso3: 'COD',
    iso2: 'CD',
    name: 'DR Congo',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 26 Provinces + Live WB Pipeline',
    subnationalUnitLabel: 'Provinces',
    defaultUnitCount: 26,
    gbLevel: 'ADM1',
    unitSingular: 'Province',
    primarySourceName: 'GeoBoundaries Official DRC ADM1 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'All 26 DRC Provinces paired with live World Bank transport, corridor, and municipal access operations. Subnational accounts remain decentralized without an open provincial Treasury API.',
    jurisdictionKey: 'drc-prov',
    localCurrency: 'USD',
  },
  UGA: {
    iso3: 'UGA',
    iso2: 'UG',
    name: 'Uganda',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 151 Districts + Live WB Pipeline',
    subnationalUnitLabel: 'Local Districts & Cities',
    defaultUnitCount: 151,
    gbLevel: 'ADM2',
    unitSingular: 'District',
    primarySourceName: 'GeoBoundaries Official Uganda ADM2 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'Official 151 Ugandan Local Districts & Cities paired with live World Bank urban infrastructure and energy projects.',
    jurisdictionKey: 'ug-nat',
    localCurrency: 'UGX',
  },
  SEN: {
    iso3: 'SEN',
    iso2: 'SN',
    name: 'Senegal',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 14 Regions + Live WB Pipeline',
    subnationalUnitLabel: 'Regions',
    defaultUnitCount: 14,
    gbLevel: 'ADM1',
    unitSingular: 'Region',
    primarySourceName: 'GeoBoundaries Official Senegal ADM1 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'All 14 Senegalese Regions paired with live World Bank / IDA urban transport, sanitation, and clean energy operations.',
    jurisdictionKey: 'sn-nat',
    localCurrency: 'XOF',
  },
  MAR: {
    iso3: 'MAR',
    iso2: 'MA',
    name: 'Morocco',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 12 Regions + Live WB Pipeline',
    subnationalUnitLabel: 'Regions',
    defaultUnitCount: 12,
    gbLevel: 'ADM1',
    unitSingular: 'Region',
    primarySourceName: 'GeoBoundaries Official Morocco ADM1 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'Official 12 Moroccan Regions paired with live World Bank water security, municipal performance, and green transition financings.',
    jurisdictionKey: 'ma-nat',
    localCurrency: 'MAD',
  },
  EGY: {
    iso3: 'EGY',
    iso2: 'EG',
    name: 'Egypt',
    tier: 'tier3_subnational_registry_wb',
    tierLabel: 'Tier 3 · 27 Governorates + Live WB Pipeline',
    subnationalUnitLabel: 'Governorates',
    defaultUnitCount: 27,
    gbLevel: 'ADM1',
    unitSingular: 'Governorate',
    primarySourceName: 'GeoBoundaries Official Egypt ADM1 + World Bank API',
    primarySourceUrl: 'https://www.geoboundaries.org',
    coverageNote:
      'All 27 Egyptian Governorates paired with live World Bank transport, green resilience, and sanitation facilities.',
    jurisdictionKey: 'eg-nat',
    localCurrency: 'EGP',
  },
};

export const SUPPORTED_COUNTRY_ISO3 = new Set<string>(Object.keys(COUNTRY_SPECS));

interface CacheEntry<T> {
  expiresAt: number;
  data?: T;
  inFlight?: Promise<T>;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

async function withCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (existing?.data !== undefined && existing.expiresAt > now) {
    return existing.data;
  }
  if (existing?.inFlight) {
    return existing.inFlight;
  }

  const promise = loader()
    .then((data) => {
      cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((err) => {
      cacheStore.delete(key);
      throw err;
    });

  cacheStore.set(key, { expiresAt: 0, inFlight: promise });
  return promise;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/csv, */*',
        'User-Agent': 'CapitalIntelligencePlatform/1.0',
      },
    });
    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status} for ${url}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const res = await fetchWithTimeout(url, timeoutMs);
  return (await res.json()) as T;
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const res = await fetchWithTimeout(url, timeoutMs);
  return await res.text();
}

interface WdiEntry {
  countryiso3code?: string;
  value?: number | null;
  date?: string;
}

async function fetchWdiIndicatorMap(
  indicator: string,
  iso2List: string
): Promise<Map<string, { value: number; date: string }>> {
  const map = new Map<string, { value: number; date: string }>();
  const raw = await fetchJson<unknown>(
    `${WB_V2_BASE}/country/${iso2List}/indicator/${encodeURIComponent(indicator)}?format=json&mrv=1&per_page=100`,
    10000
  );
  if (!Array.isArray(raw) || !Array.isArray(raw[1])) return map;
  for (const row of raw[1] as WdiEntry[]) {
    if (
      row.countryiso3code &&
      typeof row.value === 'number' &&
      Number.isFinite(row.value)
    ) {
      map.set(row.countryiso3code, {
        value: row.value,
        date: String(row.date || ''),
      });
    }
  }
  return map;
}

export async function getPublicCountriesOverview(): Promise<{
  countries: CountryPublicCoverage[];
  fetchedAt: string;
}> {
  return withCache('countries_overview', async () => {
    const iso2Joined = Object.values(COUNTRY_SPECS)
      .map((c) => c.iso2)
      .join(';');

    const [urbanRes, elecRes, gdpRes, popRes] = await Promise.allSettled([
      fetchWdiIndicatorMap('SP.URB.TOTL.IN.ZS', iso2Joined),
      fetchWdiIndicatorMap('EG.ELC.ACCS.ZS', iso2Joined),
      fetchWdiIndicatorMap('NY.GDP.MKTP.CD', iso2Joined),
      fetchWdiIndicatorMap('SP.POP.TOTL', iso2Joined),
    ]);

    const urbanMap = urbanRes.status === 'fulfilled' ? urbanRes.value : new Map();
    const elecMap = elecRes.status === 'fulfilled' ? elecRes.value : new Map();
    const gdpMap = gdpRes.status === 'fulfilled' ? gdpRes.value : new Map();
    const popMap = popRes.status === 'fulfilled' ? popRes.value : new Map();

    const countries: CountryPublicCoverage[] = Object.values(COUNTRY_SPECS).map(
      (spec) => {
        const urban = urbanMap.get(spec.iso3);
        const elec = elecMap.get(spec.iso3);
        const gdp = gdpMap.get(spec.iso3);
        const pop = popMap.get(spec.iso3);
        const wdi: CountryWdiMetrics = {
          urbanPopPct: urban ? Math.round(urban.value * 10) / 10 : null,
          urbanPopYear: urban?.date || null,
          electricityAccessPct: elec ? Math.round(elec.value * 10) / 10 : null,
          electricityAccessYear: elec?.date || null,
          gdpUsd: gdp ? gdp.value : null,
          gdpYear: gdp?.date || null,
          population: pop ? Math.round(pop.value) : null,
          populationYear: pop?.date || null,
        };

        return {
          iso3: spec.iso3,
          iso2: spec.iso2,
          name: spec.name,
          tier: spec.tier,
          tierLabel: spec.tierLabel,
          subnationalUnitLabel: spec.subnationalUnitLabel,
          subnationalCount: spec.defaultUnitCount,
          primarySourceName: spec.primarySourceName,
          primarySourceUrl: spec.primarySourceUrl,
          coverageNote: spec.coverageNote,
          jurisdictionKey: spec.jurisdictionKey,
          localCurrency: spec.localCurrency,
          wdi,
        };
      }
    );

    return {
      countries,
      fetchedAt: new Date().toISOString(),
    };
  });
}

export async function getSouthAfricaMunicipalities(): Promise<SAMunicipalitiesResponse> {
  return withCache('za_municipalities_all', async () => {
    const memberUrl = `${SA_TREASURY_BASE}/cubes/municipalities/members/municipality?pagesize=350`;
    const capUrl = (yr: number, amtType: string) =>
      `${SA_TREASURY_BASE}/cubes/capital_v2/aggregate?cut=financial_year_end.year:${yr}|amount_type.code:%22${amtType}%22|capital_type.code:NEW;RENEWAL;UPGRADING&drilldown=demarcation.code&aggregates=amount.sum&pagesize=350`;
    const incUrl = (itemCode: string) =>
      `${SA_TREASURY_BASE}/cubes/incexp_v2/aggregate?cut=financial_year_end.year:2025|amount_type.code:%22AUDA%22|item.code:%22${itemCode}%22&drilldown=demarcation.code&aggregates=amount.sum&pagesize=350`;
    const fpUrl = (itemCode: string) =>
      `${SA_TREASURY_BASE}/cubes/financial_position_v2/aggregate?cut=financial_year_end.year:2025|amount_type.code:%22AUDA%22|item.code:%22${itemCode}%22&drilldown=demarcation.code&aggregates=amount.sum&pagesize=350`;
    const grantsUrl = `${SA_TREASURY_BASE}/cubes/grants_v2/aggregate?cut=financial_year_end.year:2024|amount_type.code:%22TRFR%22&drilldown=demarcation.code&aggregates=amount.sum&pagesize=350`;
    const auditUrl = `${SA_TREASURY_BASE}/cubes/audit_opinions/facts?cut=financial_year_end.year:2024&pagesize=350`;

    const [
      membersRes,
      capA25Res,
      capB25Res,
      capA24Res,
      capB24Res,
      incRev25Res,
      incExp25Res,
      fpCash25Res,
      fpBorrow25Res,
      fpLiab25Res,
      grants24Res,
      audit24Res,
    ] = await Promise.allSettled([
      fetchJson<{ data?: SATreasuryMember[] }>(memberUrl, 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(capUrl(2025, 'AUDA'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(capUrl(2025, 'ORGB'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(capUrl(2024, 'AUDA'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(capUrl(2024, 'ORGB'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(incUrl('2900'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(incUrl('4400'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(fpUrl('0120'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(fpUrl('0450'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(fpUrl('0500'), 15000),
      fetchJson<{ cells?: SATreasuryAggregateCell[] }>(grantsUrl, 15000),
      fetchJson<{ data?: SATreasuryAuditFact[] }>(auditUrl, 15000),
    ]);

    if (membersRes.status === 'rejected') {
      throw new Error(
        `South Africa National Treasury API unreachable: ${membersRes.reason}`
      );
    }

    return mergeSouthAfricaMunicipalCubes({
      members: membersRes.value.data || [],
      capAuda25: capA25Res.status === 'fulfilled' ? capA25Res.value.cells || [] : [],
      capOrgb25: capB25Res.status === 'fulfilled' ? capB25Res.value.cells || [] : [],
      capAuda24: capA24Res.status === 'fulfilled' ? capA24Res.value.cells || [] : [],
      capOrgb24: capB24Res.status === 'fulfilled' ? capB24Res.value.cells || [] : [],
      incRev25: incRev25Res.status === 'fulfilled' ? incRev25Res.value.cells || [] : [],
      incExp25: incExp25Res.status === 'fulfilled' ? incExp25Res.value.cells || [] : [],
      fpCash25: fpCash25Res.status === 'fulfilled' ? fpCash25Res.value.cells || [] : [],
      fpBorrow25: fpBorrow25Res.status === 'fulfilled' ? fpBorrow25Res.value.cells || [] : [],
      fpLiab25: fpLiab25Res.status === 'fulfilled' ? fpLiab25Res.value.cells || [] : [],
      grantsTrfr24: grants24Res.status === 'fulfilled' ? grants24Res.value.cells || [] : [],
      auditFacts24: audit24Res.status === 'fulfilled' ? audit24Res.value.data || [] : [],
    });
  });
}

export async function getSouthAfricaMunicipalityDetail(
  rawCode: string
): Promise<SAMunicipalityDetail> {
  const code = rawCode.trim().toUpperCase();
  if (!SA_DEMARCATION_CODE_RE.test(code)) {
    throw new Error('Invalid municipality demarcation code.');
  }

  return withCache(`za_muni_${code}`, async () => {
    const encoded = encodeURIComponent(`"${code}"`);
    const fnUrl = `${SA_TREASURY_BASE}/cubes/capital_v2/aggregate?cut=demarcation.code:${encoded}|financial_year_end.year:2025|amount_type.code:%22AUDA%22|capital_type.code:NEW;RENEWAL;UPGRADING&drilldown=function.label&aggregates=amount.sum&pagesize=80`;
    const histActualUrl = `${SA_TREASURY_BASE}/cubes/capital_v2/aggregate?cut=demarcation.code:${encoded}|amount_type.code:%22AUDA%22|capital_type.code:NEW;RENEWAL;UPGRADING&drilldown=financial_year_end.year&aggregates=amount.sum&pagesize=20`;
    const histBudgetUrl = `${SA_TREASURY_BASE}/cubes/capital_v2/aggregate?cut=demarcation.code:${encoded}|amount_type.code:%22ORGB%22|capital_type.code:NEW;RENEWAL;UPGRADING&drilldown=financial_year_end.year&aggregates=amount.sum&pagesize=20`;
    const officialsUrl = `${SA_TREASURY_BASE}/cubes/officials/facts?cut=municipality.demarcation_code:${encoded}&pagesize=30`;

    const [fnRes, histARes, histBRes, offRes] = await Promise.allSettled([
      fetchJson<{
        cells?: Array<{ 'function.label'?: string; 'amount.sum'?: number | null }>;
      }>(fnUrl, 12000),
      fetchJson<{
        cells?: Array<{
          'financial_year_end.year'?: number;
          'amount.sum'?: number | null;
        }>;
      }>(histActualUrl, 12000),
      fetchJson<{
        cells?: Array<{
          'financial_year_end.year'?: number;
          'amount.sum'?: number | null;
        }>;
      }>(histBudgetUrl, 12000),
      fetchJson<{
        data?: Array<{
          'role.role'?: string;
          'contact_details.name'?: string;
          'contact_details.email_address'?: string | null;
          'contact_details.phone_number'?: string | null;
        }>;
      }>(officialsUrl, 12000),
    ]);

    const capexByFunction =
      fnRes.status === 'fulfilled'
        ? (fnRes.value.cells || [])
            .filter(
              (c) =>
                typeof c['function.label'] === 'string' &&
                typeof c['amount.sum'] === 'number' &&
                (c['amount.sum'] || 0) > 0
            )
            .map((c) => ({
              functionName: String(c['function.label']),
              amount: Number(c['amount.sum']),
            }))
            .sort((a, b) => b.amount - a.amount)
        : [];

    const actualByYear = new Map<number, number>();
    if (histARes.status === 'fulfilled') {
      for (const c of histARes.value.cells || []) {
        const y = Number(c['financial_year_end.year']);
        const v = c['amount.sum'];
        if (y >= 2020 && typeof v === 'number' && Number.isFinite(v)) {
          actualByYear.set(y, v);
        }
      }
    }

    const budgetByYear = new Map<number, number>();
    if (histBRes.status === 'fulfilled') {
      for (const c of histBRes.value.cells || []) {
        const y = Number(c['financial_year_end.year']);
        const v = c['amount.sum'];
        if (y >= 2020 && typeof v === 'number' && Number.isFinite(v)) {
          budgetByYear.set(y, v);
        }
      }
    }

    const years = Array.from(
      new Set([...actualByYear.keys(), ...budgetByYear.keys()])
    )
      .filter((y) => y >= 2021 && y <= 2026)
      .sort((a, b) => a - b);

    const capexHistory = years.map((year) => ({
      year,
      actual: actualByYear.get(year) ?? null,
      budget: budgetByYear.get(year) ?? null,
    }));

    const seenOfficials = new Set<string>();
    const officials =
      offRes.status === 'fulfilled'
        ? (offRes.value.data || [])
            .filter((o) => {
              const name = (o['contact_details.name'] || '').trim();
              const role = (o['role.role'] || '').trim();
              if (!name || !role) return false;
              const k = `${role}:${name}`.toLowerCase();
              if (seenOfficials.has(k)) return false;
              seenOfficials.add(k);
              return true;
            })
            .map((o) => ({
              role: String(o['role.role']).trim(),
              name: String(o['contact_details.name']).trim(),
              email: o['contact_details.email_address']?.trim() || null,
              phone: o['contact_details.phone_number']?.trim() || null,
            }))
        : [];

    return {
      code,
      capexHistory,
      capexByFunction,
      officials,
      fetchedAt: new Date().toISOString(),
    };
  });
}

async function fetchGeoBoundariesRoster(
  iso3: CountryIso3,
  level: 'ADM1' | 'ADM2',
  unitSingular: string
): Promise<SubnationalFiscalRow[]> {
  const meta = await fetchJson<{ simplifiedGeometryGeoJSON?: string }>(
    `${GEOBOUNDARIES_BASE}/${iso3}/${level}/`,
    12000
  );
  if (!meta.simplifiedGeometryGeoJSON) return [];
  const geo = await fetchJson<unknown>(meta.simplifiedGeometryGeoJSON, 15000);
  return parseGeoBoundariesFeatures(geo, unitSingular, iso3);
}

export async function getCountryPublicDetail(
  iso3Raw: string
): Promise<CountryDetailResponse> {
  const iso3 = iso3Raw.trim().toUpperCase() as CountryIso3;
  if (!SUPPORTED_COUNTRY_ISO3.has(iso3)) {
    throw new Error(`Unsupported country ISO3 code: ${iso3}`);
  }

  return withCache(`country_detail_${iso3}`, async () => {
    const overview = await getPublicCountriesOverview();
    const country =
      overview.countries.find((c) => c.iso3 === iso3) || overview.countries[0];
    const spec = COUNTRY_SPECS[iso3];

    const wbPromise = fetchJson<unknown>(
      `${WB_PROJECTS_BASE}?format=json&countrycode_exact=${encodeURIComponent(spec.iso2)}&rows=18&srt=boardapprovaldate&order=desc`,
      12000
    );

    let subnationalUnits: SubnationalFiscalRow[] = [];
    let hasFiscalDataset = false;
    let fiscalSummaryNote = spec.coverageNote;

    if (iso3 === 'KEN') {
      const [csvRes, wbRes] = await Promise.allSettled([
        fetchText(KENYA_CRA_CSV_URL, 14000),
        wbPromise,
      ]);
      if (csvRes.status === 'fulfilled') {
        const parsed = parseKenyaCaraCsv(csvRes.value);
        subnationalUnits = parsed.rows;
        hasFiscalDataset = parsed.rows.length > 0;
        fiscalSummaryNote = `${parsed.rows.length} Kenyan Counties parsed live from Commission on Revenue Allocation (${parsed.fiscalYearLabel}) via openAFRICA.`;
      } else {
        subnationalUnits = await fetchGeoBoundariesRoster('KEN', 'ADM1', 'County');
      }
      const wb =
        wbRes.status === 'fulfilled'
          ? mapWorldBankProjectsResponse(wbRes.value)
          : { total: 0, projects: [] };
      return {
        country: {
          ...country,
          subnationalCount: subnationalUnits.length || country.subnationalCount,
        },
        subnationalUnits,
        hasFiscalDataset,
        fiscalSummaryNote,
        worldBankTotalCount: wb.total,
        worldBankProjects: wb.projects,
        fetchedAt: new Date().toISOString(),
      };
    }

    if (iso3 === 'NGA') {
      const [csvRes, wbRes] = await Promise.allSettled([
        fetchText(NIGERIA_FAAC_CSV_URL, 15000),
        wbPromise,
      ]);
      if (csvRes.status === 'fulfilled') {
        const parsed = parseNigeriaFaacCsv(csvRes.value);
        subnationalUnits = parsed.rows;
        hasFiscalDataset = parsed.rows.length > 0;
        fiscalSummaryNote = `${parsed.rows.length} Nigerian States & FCT aggregated live from Nigerian NBS monthly FAAC statutory allocations (${parsed.fiscalYearLabel}).`;
      } else {
        subnationalUnits = await fetchGeoBoundariesRoster(
          'NGA',
          'ADM1',
          'State / FCT'
        );
      }
      const wb =
        wbRes.status === 'fulfilled'
          ? mapWorldBankProjectsResponse(wbRes.value)
          : { total: 0, projects: [] };
      return {
        country: {
          ...country,
          subnationalCount: subnationalUnits.length || country.subnationalCount,
        },
        subnationalUnits,
        hasFiscalDataset,
        fiscalSummaryNote,
        worldBankTotalCount: wb.total,
        worldBankProjects: wb.projects,
        fetchedAt: new Date().toISOString(),
      };
    }

    // Tier 1 / Tier 3 countries: GeoBoundaries subnational roster + live World Bank projects
    const [gbRes, wbRes] = await Promise.allSettled([
      fetchGeoBoundariesRoster(iso3, spec.gbLevel, spec.unitSingular),
      wbPromise,
    ]);

    subnationalUnits = gbRes.status === 'fulfilled' ? gbRes.value : [];
    const wb =
      wbRes.status === 'fulfilled'
        ? mapWorldBankProjectsResponse(wbRes.value)
        : { total: 0, projects: [] };

    return {
      country: {
        ...country,
        subnationalCount: subnationalUnits.length || country.subnationalCount,
      },
      subnationalUnits,
      hasFiscalDataset: iso3 === 'ZAF',
      fiscalSummaryNote,
      worldBankTotalCount: wb.total,
      worldBankProjects: wb.projects,
      fetchedAt: new Date().toISOString(),
    };
  });
}
