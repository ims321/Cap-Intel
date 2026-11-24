import { CAT_DEF, CATS, KEY_TO_DISPLAY, NAME_TO_KEY, STAGE_LABEL } from '../data/capitalData';
import type {
  CapitalProvider,
  FinancingScenario,
  FlowArc,
  FlowInstrumentType,
  Project,
  ScenarioResult,
  StageKey,
} from '../types/capital';

export function fmtM(n: number): string {
  return (n / 1e6).toFixed(1);
}

export function annuity(p: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r === 0) return p / n;
  return (p * r) / (1 - Math.pow(1 + r, -n));
}

export function computeScenario(
  sc: FinancingScenario,
  shockPct = 0,
  bps = 0
): ScenarioResult {
  let annual = 0;
  let total = 0;
  let fxExposed = 0;
  let debt = 0;
  let grant = 0;
  let interest = 0;

  sc.components.forEach((c) => {
    if (c.grant) {
      grant += c.amount;
      return;
    }
    const isUsd = c.ccy !== 'ZAR';
    const amt = c.amount * (isUsd ? 1 + shockPct / 100 : 1);
    const rate = c.rate + ((c.fl || 0) * bps) / 10000;
    debt += amt;
    if (isUsd) fxExposed += amt;
    const g = c.grace || 0;
    const n = c.years - g;
    const io = amt * rate * g;
    const ann = annuity(amt, rate, n);
    annual += ann;
    total += io + ann * n;
    interest += io + ann * n - amt;
  });

  return { annual, total, fxExposed, debt, grant, interest };
}

export function scoreMatch(project: Project, capital: CapitalProvider): number {
  let score = 40;
  if (capital.stages.includes(project.stage)) score += 25;
  const sec = project.sector.toLowerCase();
  if (
    capital.sectors.some(
      (s) =>
        sec.includes(s.toLowerCase()) ||
        (s.toLowerCase().includes('water') && sec.includes('water')) ||
        (s.toLowerCase().includes('energy') && sec.includes('energy')) ||
        (s.toLowerCase().includes('transport') && sec.includes('transport'))
    )
  ) {
    score += 15;
  }
  if (
    capital.geographies.some((g) =>
      ['Africa', 'Global', 'South Africa', 'SADC'].includes(g)
    )
  ) {
    score += 10;
  }
  if (['verified', 'open'].includes(capital.confidence)) score += 8;
  if (capital.confidence === 'published') score += 5;
  if (
    project.stage === 'feasibility' &&
    (capital.type.includes('Grant') || capital.type.includes('preparation'))
  ) {
    score += 10;
  }
  return Math.min(98, score);
}

export function csvEsc(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function serializeCapitalCSV(providers: CapitalProvider[]): string {
  const cols = [
    'name',
    'category',
    'type',
    'ticket',
    'currency',
    'geographies',
    'sectors',
    'stages',
    'description',
    'eligibility',
    'source',
  ];
  const rows = providers.map((c) =>
    [
      c.name,
      c.category,
      c.type,
      c.ticket,
      c.currency,
      c.geographies.join('; '),
      c.sectors.join('; '),
      c.stages.join('; '),
      c.desc,
      c.legal,
      c.source,
    ]
      .map(csvEsc)
      .join(',')
  );
  return [cols.join(','), ...rows].join('\n');
}

export function parseCSV(t: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') {
        f += '"';
        i++;
      } else if (ch === '"') {
        q = false;
      } else {
        f += ch;
      }
    } else if (ch === '"') {
      q = true;
    } else if (ch === ',') {
      row.push(f);
      f = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(f);
      f = '';
      if (row.some((x) => x.trim())) out.push(row);
      row = [];
    } else {
      f += ch;
    }
  }
  if (f || row.length) {
    row.push(f);
    if (row.some((x) => x.trim())) out.push(row);
  }
  return out;
}

export function importProvidersFromCSV(
  csvText: string,
  existingCount: number
): CapitalProvider[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const g = (r: string[], k: string) => {
    const idx = head.indexOf(k);
    return idx >= 0 ? (r[idx] || '').trim() : '';
  };
  const list = (s: string) =>
    s
      .split(/[;,]/)
      .map((x) => x.trim())
      .filter(Boolean);

  const imported: CapitalProvider[] = [];
  rows.forEach((r, idx) => {
    const name = g(r, 'name');
    if (!name) return;
    const rawCat = g(r, 'category');
    const cat = CATS.includes(rawCat) ? rawCat : CATS[3];
    const D =
      Object.values(CAT_DEF).find((d) => d.c === CATS.indexOf(cat)) ||
      CAT_DEF.PE;
    const stg = list(g(r, 'stages')).filter(
      (s): s is StageKey => s in STAGE_LABEL
    );
    const secs = list(g(r, 'sectors'));
    const geos = list(g(r, 'geographies'));

    imported.push({
      id: `c${existingCount + idx + 1}i`,
      name,
      category: cat,
      type: g(r, 'type') || 'Equity',
      desc: g(r, 'description') || D.d,
      ticket: g(r, 'ticket') || 'Case-by-case',
      currency: g(r, 'currency') || 'Multi',
      stages: stg.length ? stg : D.stg,
      sectors: secs.length ? secs : ['Energy'],
      confidence: 'mandate',
      legal: g(r, 'eligibility') || D.legal,
      source: g(r, 'source') || 'CSV import — pending verification',
      verified: '2026-11-20',
      geographies: geos.length ? geos : ['Africa'],
    });
  });
  return imported;
}

const COUNTRY_ALIAS_GROUPS: string[][] = [
  ['USA', 'United States', 'United States of America', 'US'],
  ['CAN', 'Canada'],
  ['GBR', 'United Kingdom', 'UK'],
  ['DEU', 'Germany'],
  ['FRA', 'France'],
  ['NLD', 'Netherlands'],
  ['SWE', 'Sweden'],
  ['NOR', 'Norway'],
  ['CHE', 'Switzerland'],
  ['ESP', 'Spain'],
  ['ITA', 'Italy'],
  ['GRC', 'Greece'],
  ['POL', 'Poland'],
  ['TUR', 'Turkey', 'Türkiye'],
  ['ARE', 'United Arab Emirates', 'UAE'],
  ['SAU', 'Saudi Arabia'],
  ['QAT', 'Qatar'],
  ['KWT', 'Kuwait'],
  ['CHN', 'China'],
  ['JPN', 'Japan'],
  ['KOR', 'South Korea'],
  ['India', 'IND'],
  ['SGP', 'Singapore'],
  ['AUS', 'Australia'],
  ['IDN', 'Indonesia'],
  ['ZAF', 'South Africa'],
  ['DRC', 'Dem. Rep. Congo', 'Democratic Republic of Congo', 'COD'],
  ['Tanzania', 'United Republic of Tanzania'],
  ["Côte d'Ivoire", "Cote d'Ivoire"],
];

const MACRO_REGION_LABELS = new Set([
  'africa',
  'global',
  'sadc',
  'east africa',
  'west africa',
  'sub-saharan africa',
  'north africa',
  'ecowas',
  'eac',
  'cemac',
  'uemoa',
  'comesa',
  'mena',
  'europe',
  'asia-pacific',
  'americas',
  'latam',
  'multi-country',
]);

const AFRICAN_COUNTRIES_LOWER = new Set([
  'south africa',
  'kenya',
  'nigeria',
  'ghana',
  'zambia',
  'drc',
  'dem. rep. congo',
  'uganda',
  'tanzania',
  'rwanda',
  'ethiopia',
  'senegal',
  "côte d'ivoire",
  'cameroon',
  'morocco',
  'egypt',
  'tunisia',
  'botswana',
  'namibia',
  'mozambique',
  'angola',
  'zimbabwe',
  'malawi',
  'algeria',
  'niger',
  'benin',
  'togo',
  'mali',
  'mauritius',
]);

export function canonicalCountryLabel(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  for (const grp of COUNTRY_ALIAS_GROUPS) {
    if (grp.some((g) => g.toLowerCase() === lower)) {
      if (grp[0] === 'ZAF') return 'South Africa';
      if (grp[0] === 'USA') return 'United States';
      if (grp[0] === 'GBR') return 'United Kingdom';
      if (grp[0] === 'DEU') return 'Germany';
      if (grp[0] === 'FRA') return 'France';
      if (grp[0] === 'NLD') return 'Netherlands';
      if (grp[0] === 'SWE') return 'Sweden';
      if (grp[0] === 'NOR') return 'Norway';
      if (grp[0] === 'CHE') return 'Switzerland';
      if (grp[0] === 'ESP') return 'Spain';
      if (grp[0] === 'ITA') return 'Italy';
      if (grp[0] === 'GRC') return 'Greece';
      if (grp[0] === 'POL') return 'Poland';
      if (grp[0] === 'TUR') return 'Turkey';
      if (grp[0] === 'ARE') return 'United Arab Emirates';
      if (grp[0] === 'SAU') return 'Saudi Arabia';
      if (grp[0] === 'QAT') return 'Qatar';
      if (grp[0] === 'KWT') return 'Kuwait';
      if (grp[0] === 'CHN') return 'China';
      if (grp[0] === 'JPN') return 'Japan';
      if (grp[0] === 'KOR') return 'South Korea';
      if (grp[0] === 'CAN') return 'Canada';
      if (grp[0] === 'SGP') return 'Singapore';
      if (grp[0] === 'AUS') return 'Australia';
      if (grp[0] === 'IDN') return 'Indonesia';
      if (grp[0] === 'DRC') return 'DRC';
      return grp[0];
    }
  }
  return trimmed;
}

export function keyOfCountryName(name: string): string {
  return NAME_TO_KEY[name] || name;
}

export function displayOfCountryKey(key: string): string {
  return KEY_TO_DISPLAY[key] || canonicalCountryLabel(key);
}

export function matchesCountryKey(flowCountry: string, key: string): boolean {
  if (flowCountry === key) return true;
  const a = canonicalCountryLabel(flowCountry).toLowerCase();
  const b = canonicalCountryLabel(key).toLowerCase();
  if (a === b) return true;
  return displayOfCountryKey(flowCountry).toLowerCase() === displayOfCountryKey(key).toLowerCase();
}

export interface CorridorStats {
  outbound: FlowArc[];
  inbound: FlowArc[];
  outVol: number;
  inVol: number;
  netFlow: number;
  byInstrument: Record<FlowInstrumentType, number>;
}

export function computeCorridorStats(
  flows: FlowArc[],
  countryKey: string | null,
  direction: 'all' | 'inbound' | 'outbound' = 'all',
  activeTypes: Set<FlowInstrumentType> = new Set([
    'dfi',
    'commercial',
    'eca',
    'grant',
  ])
): CorridorStats {
  const filteredByType = flows.filter((f) => activeTypes.has(f.type));
  if (!countryKey) {
    const byInstrument: Record<FlowInstrumentType, number> = {
      dfi: 0,
      commercial: 0,
      eca: 0,
      grant: 0,
    };
    filteredByType.forEach((f) => {
      byInstrument[f.type] += f.vol;
    });
    const totalVol = filteredByType.reduce((s, f) => s + f.vol, 0);
    return {
      outbound: filteredByType,
      inbound: [],
      outVol: totalVol,
      inVol: totalVol,
      netFlow: 0,
      byInstrument,
    };
  }

  const outbound =
    direction === 'inbound'
      ? []
      : filteredByType
          .filter((f) => matchesCountryKey(f.from, countryKey))
          .sort((a, b) => b.vol - a.vol);
  const inbound =
    direction === 'outbound'
      ? []
      : filteredByType
          .filter((f) => matchesCountryKey(f.to, countryKey))
          .sort((a, b) => b.vol - a.vol);

  const outVol = outbound.reduce((s, f) => s + f.vol, 0);
  const inVol = inbound.reduce((s, f) => s + f.vol, 0);
  const byInstrument: Record<FlowInstrumentType, number> = {
    dfi: 0,
    commercial: 0,
    eca: 0,
    grant: 0,
  };
  [...outbound, ...inbound].forEach((f) => {
    byInstrument[f.type] += f.vol;
  });

  return {
    outbound,
    inbound,
    outVol,
    inVol,
    netFlow: inVol - outVol,
    byInstrument,
  };
}

export interface CountryFlowSummary {
  key: string;
  displayName: string;
  inVol: number;
  outVol: number;
  netFlow: number;
  totalVol: number;
  arcCount: number;
}

export function computeAllCountryFlowSummaries(
  flows: FlowArc[],
  activeTypes: Set<FlowInstrumentType> = new Set([
    'dfi',
    'commercial',
    'eca',
    'grant',
  ])
): CountryFlowSummary[] {
  const keys = new Set<string>();
  flows.forEach((f) => {
    if (activeTypes.has(f.type)) {
      keys.add(f.from);
      keys.add(f.to);
    }
  });
  return Array.from(keys)
    .map((key) => {
      const stats = computeCorridorStats(flows, key, 'all', activeTypes);
      return {
        key,
        displayName: displayOfCountryKey(key),
        inVol: stats.inVol,
        outVol: stats.outVol,
        netFlow: stats.netFlow,
        totalVol: stats.inVol + stats.outVol,
        arcCount: stats.inbound.length + stats.outbound.length,
      };
    })
    .sort((a, b) => b.totalVol - a.totalVol);
}

export function extractProviderCountries(providers: CapitalProvider[]): string[] {
  const set = new Set<string>();
  providers.forEach((p) => {
    const rawTokens = [...p.geographies, ...(p.hqCountry ? p.hqCountry.split('/') : [])];
    rawTokens.forEach((tok) => {
      const norm = canonicalCountryLabel(tok);
      if (norm && !MACRO_REGION_LABELS.has(norm.toLowerCase())) {
        set.add(norm);
      }
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function filterProviders(
  providers: CapitalProvider[],
  filters: {
    search?: string;
    category?: string;
    type?: string;
    stage?: string;
    confidence?: string;
    country?: string;
    includeBroadMandates?: boolean;
  }
): CapitalProvider[] {
  const q = (filters.search || '').trim().toLowerCase();
  const cat = filters.category || 'all';
  const type = filters.type || 'all';
  const stg = filters.stage || 'all';
  const conf = filters.confidence || 'all';
  const country = filters.country || 'all';
  const includeBroad = Boolean(filters.includeBroadMandates);
  const targetCountryCanon = country !== 'all' ? canonicalCountryLabel(country).toLowerCase() : '';
  const targetIsAfrican = targetCountryCanon ? AFRICAN_COUNTRIES_LOWER.has(targetCountryCanon) : false;

  return providers.filter((c) => {
    const hay = (
      c.name +
      ' ' +
      c.desc +
      ' ' +
      c.type +
      ' ' +
      c.category +
      ' ' +
      c.sectors.join(' ') +
      ' ' +
      c.geographies.join(' ') +
      ' ' +
      (c.hqCountry || '')
    ).toLowerCase();

    let countryOk = true;
    if (country !== 'all') {
      const geoTokens = [
        ...c.geographies,
        ...(c.hqCountry ? c.hqCountry.split('/') : []),
      ].map((g) => canonicalCountryLabel(g).toLowerCase());
      const exactMatch = geoTokens.some((g) => g === targetCountryCanon);
      const broadMatch =
        includeBroad &&
        (geoTokens.includes('global') ||
          (targetIsAfrican && (geoTokens.includes('africa') || geoTokens.includes('sub-saharan africa'))));
      countryOk = exactMatch || broadMatch;
    }

    return (
      countryOk &&
      (!q || hay.includes(q)) &&
      (cat === 'all' || c.category === cat) &&
      (type === 'all' || c.type === type) &&
      (stg === 'all' || c.stages.includes(stg as StageKey)) &&
      (conf === 'all' || c.confidence === conf)
    );
  });
}
