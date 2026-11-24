import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Landmark,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import type { StageKey, TabId } from '../types/capital';
import type {
  CountryDetailResponse,
  CountryIso3,
  CountryPublicCoverage,
  PublicDataAiSummary,
  SAMunicipalitiesResponse,
  SAMunicipalityDetail,
  SAMunicipalitySummary,
  SubnationalFiscalRow,
  WorldBankLiveProject,
} from '../types/publicData';
import { sanitizeHttpUrl } from '../utils/publicDataHelpers';
import {
  scoreSaMunicipalityCredit,
  scoreSubnationalUnitCredit,
  type CreditScoreResult,
} from '../utils/creditScoring';
import { getCurrencySymbol } from '../utils/currencies';
import { SectionHeader } from './SharedUI';

function creditToneClasses(tone: CreditScoreResult['tone']): string {
  if (tone === 'emerald') return 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200';
  if (tone === 'teal') return 'border-teal-400/35 bg-teal-400/12 text-teal-200';
  if (tone === 'amber') return 'border-amber-400/35 bg-amber-400/12 text-amber-200';
  return 'border-rose-400/35 bg-rose-400/12 text-rose-200';
}

export interface OriginatePublicProjectPayload {
  idHint: string;
  name: string;
  sector: string;
  jurisdictionKey: string;
  jurisdictionLabel: string;
  capex: number;
  currency: string;
  stage: StageKey;
  readiness: number;
  desc: string;
  authorityName: string;
  financingGap?: string;
}

interface PublicDataViewProps {
  jurisdiction?: string;
  onChangeJurisdiction?: (j: string) => void;
  onOriginateProject: (payload: OriginatePublicProjectPayload) => void;
  onCheckLegal: (jurisdictionKey: string) => void;
  onNavigate: (tab: TabId) => void;
  onUpdateAiSummary?: (summary: PublicDataAiSummary) => void;
}

const JURISDICTION_TO_ISO3: Record<string, CountryIso3> = {
  'za-muni': 'ZAF',
  'za-metro': 'ZAF',
  'za-nat': 'ZAF',
  'ke-county': 'KEN',
  'ng-state': 'NGA',
  'zm-muni': 'ZMB',
  'gh-nat': 'GHA',
  'drc-prov': 'COD',
  'ug-nat': 'UGA',
  'sn-nat': 'SEN',
  'ma-nat': 'MAR',
  'eg-nat': 'EGY',
};

function fmtZarCompact(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R${(abs / 1e9).toFixed(2)}bn`;
  if (abs >= 1e6) return `${sign}R${(abs / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `${sign}R${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R${Math.round(abs).toLocaleString('en-US')}`;
}

function fmtLocalCompact(val: number | null | undefined, ccy = 'USD'): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  const sym = getCurrencySymbol(ccy);
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}bn`;
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}k`;
  return `${sign}${sym}${Math.round(abs).toLocaleString('en-US')}`;
}

function mapSaFunctionToSector(fnName: string): string {
  const lower = fnName.toLowerCase();
  if (lower.includes('water') || lower.includes('waste water') || lower.includes('sewer')) {
    return 'Water & sanitation';
  }
  if (lower.includes('electric') || lower.includes('energy')) {
    return 'Renewable energy';
  }
  if (lower.includes('road') || lower.includes('transport') || lower.includes('rail')) {
    return 'Transport / logistics';
  }
  return 'Water & sanitation';
}

function inferWbSector(rawSector: string): string {
  const lower = rawSector.toLowerCase();
  if (lower.includes('water') || lower.includes('sanit')) return 'Water & sanitation';
  if (lower.includes('energy') || lower.includes('power') || lower.includes('solar')) {
    return 'Renewable energy';
  }
  if (lower.includes('transport') || lower.includes('road') || lower.includes('port') || lower.includes('rail')) {
    return 'Transport / logistics';
  }
  return 'Climate adaptation';
}

function auditBadgeMeta(code: string | null): {
  label: string;
  tone: string;
} {
  const c = (code || '').toLowerCase();
  if (c === 'unqualified') {
    return {
      label: 'Clean Audit (Unqualified)',
      tone: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-200',
    };
  }
  if (c === 'unqualified_emphasis_of_matter') {
    return {
      label: 'Unqualified (EoM)',
      tone: 'border-teal-400/35 bg-teal-400/12 text-teal-200',
    };
  }
  if (c === 'qualified') {
    return {
      label: 'Qualified Audit',
      tone: 'border-amber-400/35 bg-amber-400/12 text-amber-200',
    };
  }
  if (c === 'adverse') {
    return {
      label: 'Adverse Opinion',
      tone: 'border-rose-400/35 bg-rose-400/12 text-rose-200',
    };
  }
  if (c === 'disclaimer') {
    return {
      label: 'Disclaimer of Opinion',
      tone: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    };
  }
  return {
    label: 'Pending / Outstanding',
    tone: 'border-white/15 bg-white/5 text-slate-400',
  };
}

export function PublicDataView({
  jurisdiction,
  onChangeJurisdiction,
  onOriginateProject,
  onCheckLegal,
  onNavigate,
  onUpdateAiSummary,
}: PublicDataViewProps) {
  const initialIso3: CountryIso3 =
    (jurisdiction && JURISDICTION_TO_ISO3[jurisdiction]) || 'ZAF';
  const [countries, setCountries] = useState<CountryPublicCoverage[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [selectedIso3, setSelectedIso3] = useState<CountryIso3>(initialIso3);
  const [showCountryDirectory, setShowCountryDirectory] = useState(false);

  // South Africa bulk state
  const [saData, setSaData] = useState<SAMunicipalitiesResponse | null>(null);
  const [saLoading, setSaLoading] = useState(false);
  const [saError, setSaError] = useState<string | null>(null);

  // SA filters & pagination
  const [saSearch, setSaSearch] = useState('');
  const [saProvince, setSaProvince] = useState('all');
  const [saCategory, setSaCategory] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [saAuditFilter, setSaAuditFilter] = useState('all');
  const [saTierFilter, setSaTierFilter] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('all');
  const [saSort, setSaSort] = useState<
    'capex' | 'exec' | 'cash' | 'borrowing' | 'grants' | 'name'
  >('capex');
  const [saShowAll, setSaShowAll] = useState(false);

  // Strict single-municipality focus mode
  const [selectedSaMuni, setSelectedSaMuni] =
    useState<SAMunicipalitySummary | null>(null);
  const [muniDetail, setMuniDetail] = useState<SAMunicipalityDetail | null>(null);
  const [muniDetailLoading, setMuniDetailLoading] = useState(false);

  // Peer African country detail & strict single sub-unit focus
  const [countryDetails, setCountryDetails] = useState<
    Record<string, CountryDetailResponse>
  >({});
  const [countryLoading, setCountryLoading] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [subSearch, setSubSearch] = useState('');
  const [focusedSubUnit, setFocusedSubUnit] =
    useState<SubnationalFiscalRow | null>(null);

  const loadCountries = async () => {
    setCountriesLoading(true);
    setCountriesError(null);
    try {
      const res = await fetch('/api/public-data/countries');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed loading countries.');
      setCountries(data.countries || []);
    } catch (err) {
      setCountriesError(
        err instanceof Error ? err.message : 'Unable to fetch country index.'
      );
    } finally {
      setCountriesLoading(false);
    }
  };

  const loadSouthAfrica = async () => {
    setSaLoading(true);
    setSaError(null);
    try {
      const res = await fetch('/api/public-data/south-africa/municipalities');
      const data: SAMunicipalitiesResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed loading SA Treasury API.');
      setSaData(data);
      if (onUpdateAiSummary) {
        onUpdateAiSummary({
          saLoadedCount: data.nationalTotals.totalMunicipalities,
          saCleanAuditCount: data.nationalTotals.unqualifiedAudits,
          saTotalCapexBnZar: Number(
            (data.nationalTotals.totalCapexActualFy25Zar / 1e9).toFixed(2)
          ),
          saTopMunicipalities: data.municipalities
            .slice(0, 6)
            .map(
              (m) =>
                `${m.name} (${m.code}, ${m.provinceName}): FY25 CapEx ${fmtZarCompact(m.capexActualFy25)} (${m.capexExecutionPct ?? 'n/a'}% exec), Audit=${m.auditOutcomeFy24 || 'n/a'}`
            ),
        });
      }
    } catch (err) {
      setSaError(
        err instanceof Error ? err.message : 'Unable to reach SA National Treasury API.'
      );
    } finally {
      setSaLoading(false);
    }
  };

  const loadCountryDetail = async (iso3: CountryIso3) => {
    setCountryLoading(true);
    setCountryError(null);
    try {
      const res = await fetch(`/api/public-data/country/${iso3}`);
      const data: CountryDetailResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed loading ${iso3}.`);
      setCountryDetails((prev) => ({ ...prev, [iso3]: data }));
    } catch (err) {
      setCountryError(
        err instanceof Error ? err.message : 'Unable to fetch country public dataset.'
      );
    } finally {
      setCountryLoading(false);
    }
  };

  useEffect(() => {
    void loadCountries();
    void loadSouthAfrica();
  }, []);

  useEffect(() => {
    if (jurisdiction && JURISDICTION_TO_ISO3[jurisdiction]) {
      const mapped = JURISDICTION_TO_ISO3[jurisdiction];
      setSelectedIso3(mapped);
      setSelectedSaMuni(null);
      setFocusedSubUnit(null);
    }
  }, [jurisdiction]);

  useEffect(() => {
    setSubSearch('');
    setFocusedSubUnit(null);
    if (!countryDetails[selectedIso3]) {
      void loadCountryDetail(selectedIso3);
    }
  }, [selectedIso3]);

  const handleSelectCountry = (iso3: CountryIso3) => {
    setSelectedIso3(iso3);
    setSelectedSaMuni(null);
    setFocusedSubUnit(null);
    setShowCountryDirectory(false);
    const meta = countries.find((c) => c.iso3 === iso3);
    if (meta && onChangeJurisdiction) {
      onChangeJurisdiction(meta.jurisdictionKey);
    }
  };

  const handleInspectSaMunicipality = async (m: SAMunicipalitySummary) => {
    setSelectedSaMuni(m);
    setMuniDetail(null);
    setMuniDetailLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(
        `/api/public-data/south-africa/municipality/${encodeURIComponent(m.code)}`
      );
      const data = await res.json();
      if (res.ok) {
        setMuniDetail(data);
      }
    } finally {
      setMuniDetailLoading(false);
    }
  };

  const filteredSa = useMemo(() => {
    if (!saData) return [];
    const q = saSearch.trim().toLowerCase();
    const list = saData.municipalities.filter((m) => {
      if (saProvince !== 'all' && m.provinceName !== saProvince) return false;
      if (saCategory !== 'all' && m.category !== saCategory) return false;
      if (saAuditFilter !== 'all') {
        const ac = (m.auditCodeFy24 || '').toLowerCase();
        if (saAuditFilter === 'clean' && ac !== 'unqualified' && ac !== 'unqualified_emphasis_of_matter') {
          return false;
        }
        if (saAuditFilter === 'qualified' && ac !== 'qualified') return false;
        if (saAuditFilter === 'adverse' && ac !== 'adverse' && ac !== 'disclaimer') {
          return false;
        }
      }
      if (saTierFilter !== 'all') {
        const tierRes = scoreSaMunicipalityCredit(m);
        if (!tierRes.tier.startsWith(`Tier ${saTierFilter}`)) return false;
      }
      if (q) {
        const hay = `${m.name} ${m.longName} ${m.code} ${m.provinceName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (saSort === 'name') return a.name.localeCompare(b.name);
      if (saSort === 'exec') {
        return (b.capexExecutionPct ?? -1) - (a.capexExecutionPct ?? -1);
      }
      if (saSort === 'cash') {
        return (b.cashBalanceFy25 ?? -1) - (a.cashBalanceFy25 ?? -1);
      }
      if (saSort === 'borrowing') {
        return (b.nonCurrentBorrowingFy25 ?? -1) - (a.nonCurrentBorrowingFy25 ?? -1);
      }
      if (saSort === 'grants') {
        return (b.grantsFy24 ?? -1) - (a.grantsFy24 ?? -1);
      }
      return (
        (b.capexActualFy25 ?? b.capexBudgetFy25 ?? 0) -
        (a.capexActualFy25 ?? a.capexBudgetFy25 ?? 0)
      );
    });
    return list;
  }, [saData, saSearch, saProvince, saCategory, saAuditFilter, saTierFilter, saSort]);

  const visibleSa = useMemo(
    () => (saShowAll ? filteredSa : filteredSa.slice(0, 60)),
    [filteredSa, saShowAll]
  );

  const provinceChartData = useMemo(() => {
    if (!saData) return [];
    return saData.provinceSummary.map((p) => ({
      name: p.provinceName
        .replace('Western Cape', 'W. Cape')
        .replace('Eastern Cape', 'E. Cape')
        .replace('Northern Cape', 'N. Cape')
        .replace('KwaZulu-Natal', 'KZN'),
      actualBn: Number((p.capexActualFy25Zar / 1e9).toFixed(2)),
      budgetBn: Number((p.capexBudgetFy25Zar / 1e9).toFixed(2)),
    }));
  }, [saData]);

  const exportSaCsv = () => {
    if (!filteredSa.length) return;
    const headers = [
      'code',
      'name',
      'province',
      'category',
      'capex_actual_fy25_zar',
      'capex_budget_fy25_zar',
      'capex_exec_pct',
      'revenue_fy25_zar',
      'expenditure_fy25_zar',
      'cash_fy25_zar',
      'non_current_borrowing_fy25_zar',
      'grants_fy24_zar',
      'audit_outcome_fy24',
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') ? `"${s.replaceAll('"', '""')}"` : s;
    };
    const rows = [
      headers.join(','),
      ...filteredSa.map((m) =>
        [
          m.code,
          m.longName,
          m.provinceName,
          m.categoryLabel,
          m.capexActualFy25 ?? '',
          m.capexBudgetFy25 ?? '',
          m.capexExecutionPct ?? '',
          m.revenueFy25 ?? '',
          m.expenditureFy25 ?? '',
          m.cashBalanceFy25 ?? '',
          m.nonCurrentBorrowingFy25 ?? '',
          m.grantsFy24 ?? '',
          m.auditOutcomeFy24 ?? '',
        ]
          .map(esc)
          .join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `south-africa-municipalities-treasury-${filteredSa.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOriginateSaMuni = (
    m: SAMunicipalitySummary,
    preferredFunction?: string,
    preferredAmountZar?: number
  ) => {
    const jKey = m.category === 'A' ? 'za-metro' : 'za-muni';
    const jLabel =
      m.category === 'A'
        ? `South Africa — Metropolitan (${m.longName})`
        : `South Africa — Local Municipality (${m.longName})`;
    const capexRaw =
      preferredAmountZar ||
      m.capexActualFy25 ||
      m.capexBudgetFy25 ||
      180_000_000;
    // Scale mega-metro multi-billion budget into an actionable flagship tranche if preferredFunction is not selected
    const projectCapex = preferredFunction
      ? Math.max(25_000_000, Math.round(capexRaw))
      : Math.min(2_500_000_000, Math.max(40_000_000, Math.round(capexRaw * 0.28)));

    const sector = preferredFunction
      ? mapSaFunctionToSector(preferredFunction)
      : 'Water & sanitation';
    const cleanAudit =
      m.auditCodeFy24 === 'unqualified' ||
      m.auditCodeFy24 === 'unqualified_emphasis_of_matter';

    onOriginateProject({
      idHint: `za-${m.code.toLowerCase()}`,
      name: preferredFunction
        ? `${m.name} — ${preferredFunction} Capital Programme`
        : `${m.name} Priority Infrastructure Programme`,
      sector,
      jurisdictionKey: jKey,
      jurisdictionLabel: jLabel,
      capex: projectCapex,
      currency: 'ZAR',
      stage: cleanAudit ? 'structuring' : 'feasibility',
      readiness: cleanAudit ? 62 : 38,
      authorityName: `${m.longName} (${m.code}) · SA Treasury mSCOA`,
      financingGap:
        m.capexExecutionPct !== null
          ? `Close ${Math.max(5, Math.round(100 - m.capexExecutionPct))}% CapEx execution shortfall & align ${fmtZarCompact(m.nonCurrentBorrowingFy25)} non-current debt capacity under MFMA s46`
          : 'Confirm MFMA s46 borrowing headroom & capital grant co-funding',
      desc: `Originated from live SA National Treasury Section 71 audited figures for ${m.longName} (${m.provinceName}). FY2025 Audited CapEx: ${fmtZarCompact(m.capexActualFy25)} vs Original Budget ${fmtZarCompact(m.capexBudgetFy25)} (${m.capexExecutionPct ?? 'n/a'}% execution); Cash & Equivalents: ${fmtZarCompact(m.cashBalanceFy25)}; Non-Current Borrowing: ${fmtZarCompact(m.nonCurrentBorrowingFy25)}; FY2024 AGSA Audit: ${m.auditOutcomeFy24 || 'Pending'}.`,
    });
  };

  const handleOriginateSubnationalRow = (
    country: CountryPublicCoverage,
    row: SubnationalFiscalRow
  ) => {
    const capexM =
      row.totalAllocation && row.totalAllocation > 0
        ? Math.max(15, Math.min(500, Math.round((row.totalAllocation * 0.15) / 1e6)))
        : 45;
    onOriginateProject({
      idHint: `${country.iso3.toLowerCase()}-${row.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`,
      name: `${row.name} (${country.name}) Priority Infrastructure Investment`,
      sector: 'Water & sanitation',
      jurisdictionKey: country.jurisdictionKey,
      jurisdictionLabel: `${country.name} — ${row.unitType} (${row.name})`,
      capex: capexM * 1e6,
      currency: row.currency || country.localCurrency || 'USD',
      stage: 'feasibility',
      readiness: row.totalAllocation ? 44 : 28,
      authorityName: `${row.name} ${row.unitType} · ${country.primarySourceName}`,
      financingGap: row.totalAllocation
        ? `Leveraging ${row.fiscalYearLabel || 'statutory transfers'} (${fmtLocalCompact(row.totalAllocation, row.currency)}) alongside DFI / local-currency blended finance`
        : 'Confirm statutory subnational borrowing authority and prepare bankable feasibility study',
      desc: `Sub-national project profile for ${row.name} (${row.unitType}, ${country.name}).${row.totalAllocation ? ` Published Allocation: ${fmtLocalCompact(row.totalAllocation, row.currency)} (${row.fiscalYearLabel}).` : ''}${row.perCapitaAllocation ? ` Per-capita allocation: ${fmtLocalCompact(row.perCapitaAllocation, row.currency)}.` : ''}`,
    });
  };

  const handleImportWbProject = (
    country: CountryPublicCoverage,
    wb: WorldBankLiveProject
  ) => {
    const capexUsd = wb.totalCommitmentUsd > 0 ? wb.totalCommitmentUsd : 50_000_000;
    onOriginateProject({
      idHint: `wb-${wb.id.toLowerCase()}`,
      name: `${wb.name} (${wb.id})`,
      sector: inferWbSector(wb.sectorName),
      jurisdictionKey: country.jurisdictionKey,
      jurisdictionLabel: `${country.name} — Sovereign / Sub-Sovereign`,
      capex: capexUsd,
      currency: 'USD',
      stage: wb.status === 'Active' ? 'construction' : 'structuring',
      readiness: wb.status === 'Active' ? 76 : 54,
      authorityName: `World Bank API (${wb.id}) · ${wb.borrower}`,
      financingGap: `Co-financing & local-currency private capital mobilization alongside World Bank ${wb.lendingInstrument}`,
      desc: `Imported live from World Bank Operations API (${wb.id}). Status: ${wb.status}. Total Commitment: $${(capexUsd / 1e6).toFixed(1)}m. Sector: ${wb.sectorName}. Board Approval: ${wb.approvalDate || 'n/a'} | Closing: ${wb.closingDate || 'n/a'}.`,
    });
  };

  const activeCountryMeta =
    countries.find((c) => c.iso3 === selectedIso3) || null;
  const activeCountryDetail = countryDetails[selectedIso3] || null;

  const filteredSubnational = useMemo(() => {
    const list = activeCountryDetail?.subnationalUnits || [];
    const q = subSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      `${u.name} ${u.unitType} ${u.isoOrCode || ''}`.toLowerCase().includes(q)
    );
  }, [activeCountryDetail, subSearch]);

  return (
    <section aria-labelledby="publicdata-heading" className="space-y-6">
      <SectionHeader
        title="Public Data & Municipal Observatory"
        hint="Live public Treasury accounts for all 257 South African municipalities plus verified sub-national registries, fiscal allocations & World Bank pipelines across 10 African nations"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {activeCountryMeta && (
              <button
                type="button"
                onClick={() => onCheckLegal(activeCountryMeta.jurisdictionKey)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-teal-400/45 hover:text-teal-200 whitespace-nowrap shrink-0"
              >
                Check Legal Authority
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void loadCountries();
                if (selectedIso3 === 'ZAF') void loadSouthAfrica();
                else void loadCountryDetail(selectedIso3);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh Live Feeds
            </button>
          </div>
        }
      />

      {/* Scoped Active Country Registry Switcher */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1424] px-4 py-3">
          <div className="flex min-w-0 w-full lg:w-auto flex-wrap items-center gap-3">
            <label
              htmlFor="public-country-select"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Active Country Scope
            </label>
            <select
              id="public-country-select"
              value={selectedIso3}
              onChange={(e) => handleSelectCountry(e.target.value as CountryIso3)}
              disabled={countriesLoading && !countries.length}
              className="w-full sm:w-auto max-w-full min-w-0 rounded-lg border border-teal-400/40 bg-[#08111e] px-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-teal-400 focus:outline-none"
            >
              {countries.length > 0 ? (
                countries.map((c) => (
                  <option key={c.iso3} value={c.iso3}>
                    {c.name} ({c.iso3}) —{' '}
                    {c.iso3 === 'ZAF' && saData
                      ? `${saData.nationalTotals.totalMunicipalities} municipalities`
                      : `${c.subnationalCount} sub-national units`}
                  </option>
                ))
              ) : (
                <option value={selectedIso3}>{selectedIso3}</option>
              )}
            </select>
            {selectedIso3 === 'ZAF' && saData && (
              <select
                aria-label="Focus single South African municipality"
                value={selectedSaMuni?.code || ''}
                onChange={(e) => {
                  const code = e.target.value;
                  if (!code) {
                    setSelectedSaMuni(null);
                    setMuniDetail(null);
                    return;
                  }
                  const match = saData.municipalities.find((m) => m.code === code);
                  if (match) void handleInspectSaMunicipality(match);
                }}
                className="w-full sm:w-auto max-w-full min-w-0 rounded-lg border border-white/15 bg-[#08111e] px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-teal-400 focus:outline-none"
              >
                <option value="">All 257 SA municipalities (select 1 to isolate)</option>
                {saData.municipalities.slice(0, 80).map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} ({m.code}) · {m.provinceName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono-num text-[11px] text-teal-300">
              Scoped view · only {activeCountryMeta?.name || selectedIso3} shown
            </span>
            <button
              type="button"
              onClick={() => setShowCountryDirectory((v) => !v)}
              className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-teal-400/45 hover:text-teal-200 whitespace-nowrap shrink-0"
            >
              {showCountryDirectory ? 'Hide 10-country selector' : 'Switch country (10 live)'}
            </button>
          </div>
        </div>

        {countriesError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-4 text-xs text-rose-200"
          >
            {countriesError}
          </div>
        )}

        {showCountryDirectory && countries.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {countries.map((c) => {
              const isSelected = c.iso3 === selectedIso3;
              const tierTone =
                c.tier === 'tier1_municipal_api'
                  ? 'text-emerald-300'
                  : c.tier === 'tier2_subnational_fiscal_csv'
                    ? 'text-teal-300'
                    : 'text-amber-300';
              return (
                <button
                  key={c.iso3}
                  type="button"
                  onClick={() => handleSelectCountry(c.iso3)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-teal-400 bg-[#0f2036]'
                      : 'border-white/10 bg-[#0b1424] hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-slate-100">
                        {c.name}
                      </span>
                      <span className="font-mono-num text-[11px] text-slate-400">
                        {c.iso3}
                      </span>
                    </div>
                    <div className={`mt-1 text-[11px] font-semibold ${tierTone}`}>
                      {c.tierLabel}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-white/8 pt-2 text-[11px] text-slate-400">
                    <span>
                      <strong className="font-mono-num text-slate-100">
                        {c.iso3 === 'ZAF' && saData
                          ? saData.nationalTotals.totalMunicipalities
                          : c.subnationalCount}
                      </strong>{' '}
                      units
                    </span>
                    <span className="font-mono-num">
                      {c.wdi.urbanPopPct !== null
                        ? `${c.wdi.urbanPopPct}% urban`
                        : c.localCurrency}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Country Transparency & WDI Macro Infrastructure Strip */}
      {activeCountryMeta && (
        <div className="grid gap-4 rounded-xl border border-white/10 bg-[#0b1424] p-5 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Database className="h-4 w-4 text-teal-300" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                {activeCountryMeta.primarySourceName}
              </span>
              {sanitizeHttpUrl(activeCountryMeta.primarySourceUrl) && (
                <a
                  href={sanitizeHttpUrl(activeCountryMeta.primarySourceUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 underline hover:text-teal-200"
                >
                  Official API / Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {activeCountryMeta.coverageNote}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t border-white/8 pt-3 sm:grid-cols-4 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                GDP ({activeCountryMeta.wdi.gdpYear || 'WDI'})
              </dt>
              <dd className="font-mono-num mt-1 text-sm font-semibold text-slate-100">
                {activeCountryMeta.wdi.gdpUsd
                  ? `$${(activeCountryMeta.wdi.gdpUsd / 1e9).toFixed(1)}bn`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Population
              </dt>
              <dd className="font-mono-num mt-1 text-sm font-semibold text-slate-100">
                {activeCountryMeta.wdi.population
                  ? `${(activeCountryMeta.wdi.population / 1e6).toFixed(1)}m`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Urban Share
              </dt>
              <dd className="font-mono-num mt-1 text-sm font-semibold text-teal-300">
                {activeCountryMeta.wdi.urbanPopPct !== null
                  ? `${activeCountryMeta.wdi.urbanPopPct}%`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Power Access
              </dt>
              <dd className="font-mono-num mt-1 text-sm font-semibold text-amber-300">
                {activeCountryMeta.wdi.electricityAccessPct !== null
                  ? `${activeCountryMeta.wdi.electricityAccessPct}%`
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* ================================================================= */}
      {/* SOUTH AFRICA 257-MUNICIPALITY TREASURY EXPLORER                   */}
      {/* ================================================================= */}
      {selectedIso3 === 'ZAF' && (
        <div className="space-y-6">
          {saLoading && !saData ? (
            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-12 text-center text-sm text-slate-300">
              Pulling live mSCOA Section 71 audited financials for all 257 South African
              municipalities from National Treasury...
            </div>
          ) : saError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-6 text-sm text-rose-200"
            >
              {saError}
            </div>
          ) : saData && selectedSaMuni ? (
            <div className="space-y-5 rounded-2xl border border-teal-400/35 bg-[#0b1424] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono-num font-semibold text-teal-300">
                      {selectedSaMuni.code}
                    </span>
                    <span>·</span>
                    <span>{selectedSaMuni.provinceName}</span>
                    <span>·</span>
                    <span>{selectedSaMuni.categoryLabel}</span>
                    <span>·</span>
                    <span className="text-emerald-300 font-semibold">Isolated Municipal Scope</span>
                  </div>
                  <h3 className="font-display mt-1 text-2xl font-medium text-slate-100">
                    {selectedSaMuni.longName}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSaMuni(null);
                      setMuniDetail(null);
                    }}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
                  >
                    ← Show all {saData.nationalTotals.totalMunicipalities} SA municipalities
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOriginateSaMuni(selectedSaMuni)}
                    className="rounded-lg bg-teal-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                  >
                    + Originate into Workspace
                  </button>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">FY25 CapEx Actual</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-teal-300">{fmtZarCompact(selectedSaMuni.capexActualFy25)}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">CapEx Execution</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-amber-300">
                    {selectedSaMuni.capexExecutionPct !== null ? `${selectedSaMuni.capexExecutionPct}%` : '—'}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">Operating Surplus</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-slate-100">{fmtZarCompact(selectedSaMuni.surplusDeficitFy25)}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">Cash Balance</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-emerald-300">{fmtZarCompact(selectedSaMuni.cashBalanceFy25)}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">Non-Current Debt</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-slate-100">{fmtZarCompact(selectedSaMuni.nonCurrentBorrowingFy25)}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#08111e] p-3">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">FY24 Grants</dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-sky-300">{fmtZarCompact(selectedSaMuni.grantsFy24)}</dd>
                </div>
              </dl>

              {(() => {
                const credit = scoreSaMunicipalityCredit(selectedSaMuni);
                return (
                  <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Automated Sub-National Credit-Tier Observatory
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                          <span className={`rounded border px-2.5 py-0.5 text-xs font-semibold ${creditToneClasses(credit.tone)}`}>
                            {credit.tier}
                          </span>
                          <span className="font-mono-num text-sm font-bold text-slate-100">
                            {credit.score} / 100
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Recommended Instrument</div>
                        <div className="font-semibold text-teal-300">{credit.recommendedInstrument}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2">
                        <span className="text-[10px] uppercase text-slate-400">Audit (35)</span>
                        <div className="font-mono-num font-bold text-slate-100">{credit.pillars.audit} / 35</div>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2">
                        <span className="text-[10px] uppercase text-slate-400">CapEx Exec (25)</span>
                        <div className="font-mono-num font-bold text-slate-100">{credit.pillars.execution} / 25</div>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2">
                        <span className="text-[10px] uppercase text-slate-400">Liquidity (20)</span>
                        <div className="font-mono-num font-bold text-slate-100">{credit.pillars.liquidity} / 20</div>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2">
                        <span className="text-[10px] uppercase text-slate-400">Leverage (20)</span>
                        <div className="font-mono-num font-bold text-slate-100">{credit.pillars.leverage} / 20</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">{credit.rationale}</p>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#08111e] px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  {selectedSaMuni.auditCodeFy24?.includes('unqualified') ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  )}
                  <span className="text-slate-300">
                    FY2024 Auditor-General Outcome:{' '}
                    <strong className="text-slate-100">{selectedSaMuni.auditOutcomeFy24 || 'Not published'}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedSaMuni.auditReportUrl && (
                    <a href={selectedSaMuni.auditReportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-300 underline hover:text-teal-200">
                      AGSA Audit PDF <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onCheckLegal(selectedSaMuni.category === 'A' ? 'za-metro' : 'za-muni')}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Verify MFMA s46 Statutory Authority →
                  </button>
                </div>
              </div>

              {muniDetailLoading ? (
                <div className="rounded-xl border border-white/10 bg-[#08111e] p-8 text-center text-xs text-slate-300">
                  Fetching multi-year CapEx trend, infrastructure function split &amp; statutory officials for {selectedSaMuni.name}...
                </div>
              ) : muniDetail ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Multi-Year Capital Expenditure Trend (Actual vs Original Budget)
                    </h4>
                    {muniDetail.capexHistory.length > 0 ? (
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={muniDetail.capexHistory.map((h) => ({
                              year: `FY${h.year}`,
                              actualM: h.actual ? Math.round(h.actual / 1e6) : 0,
                              budgetM: h.budget ? Math.round(h.budget / 1e6) : 0,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="m" />
                            <Tooltip contentStyle={{ backgroundColor: '#07101d', borderColor: 'rgba(45,212,191,0.35)', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="actualM" name="Audited Actual (Rm)" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="budgetM" name="Original Budget (Rm)" fill="#475569" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Multi-year CapEx series not reported for this unit.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                      <Building2 className="h-3.5 w-3.5 text-teal-300" />
                      FY2025 CapEx by Infrastructure Function
                    </h4>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {muniDetail.capexByFunction.slice(0, 10).map((fn) => (
                        <div key={fn.functionName} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-200">{fn.functionName}</div>
                            <div className="font-mono-num text-[11px] text-teal-300">{fmtZarCompact(fn.amount)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOriginateSaMuni(selectedSaMuni, fn.functionName, fn.amount)}
                            className="shrink-0 rounded bg-teal-400/15 px-2.5 py-1 text-[10px] font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950"
                          >
                            Originate
                          </button>
                        </div>
                      ))}
                      {muniDetail.capexByFunction.length === 0 && (
                        <p className="text-xs text-slate-400">Function-level breakdown unavailable for FY2025.</p>
                      )}
                    </div>
                  </div>

                  {muniDetail.officials.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 lg:col-span-2">
                      <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <Users className="h-3.5 w-3.5 text-amber-300" />
                        Statutory Municipal Officials (SA National Treasury Directory)
                      </h4>
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {muniDetail.officials.slice(0, 6).map((off) => (
                          <div key={`${off.role}-${off.name}`} className="rounded-lg border border-white/8 bg-[#0b1424] p-3 text-xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-300">{off.role}</div>
                            <div className="mt-1 font-semibold text-slate-100">{off.name}</div>
                            {off.email && <div className="mt-0.5 truncate text-[11px] text-slate-400">{off.email}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : saData ? (
            <>
              {/* National Quantitative Strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-white/10 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Municipalities
                  </div>
                  <div className="font-mono-num mt-1 text-2xl font-bold text-slate-100">
                    {saData.nationalTotals.totalMunicipalities}
                  </div>
                  <div className="mt-1 text-[11px] text-teal-300">
                    Metros · Locals · Districts
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    FY2025 Audited CapEx
                  </div>
                  <div className="font-mono-num mt-1 text-2xl font-bold text-teal-300">
                    {fmtZarCompact(saData.nationalTotals.totalCapexActualFy25Zar)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    vs Budget{' '}
                    {fmtZarCompact(saData.nationalTotals.totalCapexBudgetFy25Zar)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Mean CapEx Execution
                  </div>
                  <div className="font-mono-num mt-1 text-2xl font-bold text-amber-300">
                    {saData.nationalTotals.meanExecutionPct !== null
                      ? `${saData.nationalTotals.meanExecutionPct}%`
                      : '—'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {saData.nationalTotals.reportingCapexFy25} councils reporting FY25
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Non-Current Debt &amp; Cash
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                    {fmtZarCompact(saData.nationalTotals.totalBorrowingFy25Zar)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Cash reserve{' '}
                    {fmtZarCompact(saData.nationalTotals.totalCashFy25Zar)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    AGSA Audit Outcomes (FY24)
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono-num text-2xl font-bold text-emerald-300">
                      {saData.nationalTotals.unqualifiedAudits}
                    </span>
                    <span className="text-xs text-slate-400">Clean / Unqualified</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {saData.nationalTotals.qualifiedAudits} Qualified ·{' '}
                    {saData.nationalTotals.adverseOrDisclaimerAudits} Adverse/Disc.
                  </div>
                </div>
              </div>

              {/* Provincial Rollup Chart */}
              <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Provincial Municipal Capital Spend vs Original Budget (FY2025, R bn)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Aggregated live across all {saData.nationalTotals.totalMunicipalities}{' '}
                      South African municipalities from National Treasury mSCOA cubes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSaCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Export Filtered CSV ({filteredSa.length})
                  </button>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={provinceChartData}
                      margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        unit="bn"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#07101d',
                          borderColor: 'rgba(45,212,191,0.35)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f1f5f9',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        dataKey="actualBn"
                        name="Audited CapEx (R bn)"
                        fill="#2dd4bf"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="budgetBn"
                        name="Original Budget (R bn)"
                        fill="#334155"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid gap-3 rounded-xl border border-white/10 bg-[#0b1424] p-4 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                  <label
                    htmlFor="sa-muni-search"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Search Municipality or Code
                  </label>
                  <input
                    id="sa-muni-search"
                    type="search"
                    value={saSearch}
                    onChange={(e) => setSaSearch(e.target.value)}
                    placeholder="Cape Town, CPT, eThekwini, KZN225..."
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sa-prov-filter"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Province
                  </label>
                  <select
                    id="sa-prov-filter"
                    value={saProvince}
                    onChange={(e) => setSaProvince(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="all">
                      All Provinces ({saData.provinces.length})
                    </option>
                    {saData.provinces.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sa-cat-filter"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    MIIF Category
                  </label>
                  <select
                    id="sa-cat-filter"
                    value={saCategory}
                    onChange={(e) =>
                      setSaCategory(e.target.value as 'all' | 'A' | 'B' | 'C')
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="all">All Categories (A/B/C)</option>
                    <option value="A">Category A — Metros (8)</option>
                    <option value="B">Category B — Local Municipalities</option>
                    <option value="C">Category C — District Municipalities</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sa-audit-filter"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    AGSA Audit Outcome
                  </label>
                  <select
                    id="sa-audit-filter"
                    value={saAuditFilter}
                    onChange={(e) => setSaAuditFilter(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="all">All Audit Outcomes</option>
                    <option value="clean">Clean / Unqualified</option>
                    <option value="qualified">Qualified</option>
                    <option value="adverse">Adverse / Disclaimer</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sa-tier-filter"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Credit Tier (A–D)
                  </label>
                  <select
                    id="sa-tier-filter"
                    value={saTierFilter}
                    onChange={(e) =>
                      setSaTierFilter(e.target.value as 'all' | 'A' | 'B' | 'C' | 'D')
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="all">All Credit Tiers</option>
                    <option value="A">Tier A — Prime Municipal</option>
                    <option value="B">Tier B — Bankable Blended</option>
                    <option value="C">Tier C — Credit-Wrap Req.</option>
                    <option value="D">Tier D — Grant &amp; Prep Only</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sa-sort-filter"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Sort By
                  </label>
                  <select
                    id="sa-sort-filter"
                    value={saSort}
                    onChange={(e) =>
                      setSaSort(
                        e.target.value as
                          | 'capex'
                          | 'exec'
                          | 'cash'
                          | 'borrowing'
                          | 'grants'
                          | 'name'
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="capex">Highest FY25 Audited CapEx</option>
                    <option value="exec">Highest CapEx Execution %</option>
                    <option value="cash">Highest Cash Balance</option>
                    <option value="borrowing">Highest Non-Current Debt</option>
                    <option value="grants">Highest National Grants</option>
                    <option value="name">Alphabetical (A–Z)</option>
                  </select>
                </div>
              </div>

              {/* Municipalities Table */}
              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1424]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-slate-100">{visibleSa.length}</strong> of{' '}
                    <strong className="text-slate-100">{filteredSa.length}</strong> matched
                    South African municipalities ({saData.municipalities.length} total live)
                  </span>
                  {filteredSa.length > 60 && (
                    <button
                      type="button"
                      onClick={() => setSaShowAll((s) => !s)}
                      className="font-semibold text-teal-300 hover:text-teal-200"
                    >
                      {saShowAll
                        ? 'Collapse to top 60'
                        : `Show all ${filteredSa.length} municipalities`}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-[#08111e] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Municipality</th>
                        <th className="px-3 py-3 text-right">FY25 CapEx</th>
                        <th className="px-3 py-3 text-right">Budget / Exec</th>
                        <th className="px-3 py-3 text-right">Cash &amp; Debt</th>
                        <th className="px-3 py-3 text-right">FY24 Grants</th>
                        <th className="px-3 py-3">Audit (FY24)</th>
                        <th className="px-3 py-3">Credit Tier</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/6">
                      {visibleSa.map((m) => {
                        const audit = auditBadgeMeta(m.auditCodeFy24);
                        const credit = scoreSaMunicipalityCredit(m);
                        return (
                          <tr
                            key={m.code}
                            className="transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => void handleInspectSaMunicipality(m)}
                                className="text-left font-semibold text-slate-100 hover:text-teal-300"
                              >
                                {m.name}
                              </button>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="font-mono-num text-teal-300">
                                  {m.code}
                                </span>
                                <span>·</span>
                                <span>{m.provinceName}</span>
                                <span>·</span>
                                <span className="text-slate-300">{m.categoryLabel}</span>
                              </div>
                            </td>
                            <td className="font-mono-num px-3 py-3 text-right font-semibold text-slate-100">
                              <div>{fmtZarCompact(m.capexActualFy25)}</div>
                              {m.capexActualFy24 !== null && (
                                <div className="text-[10px] font-normal text-slate-500">
                                  FY24 {fmtZarCompact(m.capexActualFy24)}
                                </div>
                              )}
                            </td>
                            <td className="font-mono-num px-3 py-3 text-right">
                              <div className="text-slate-300">
                                {fmtZarCompact(m.capexBudgetFy25)}
                              </div>
                              <div
                                className={`text-[11px] font-semibold ${
                                  (m.capexExecutionPct || 0) >= 80
                                    ? 'text-emerald-300'
                                    : (m.capexExecutionPct || 0) >= 50
                                      ? 'text-amber-300'
                                      : 'text-rose-300'
                                }`}
                              >
                                {m.capexExecutionPct !== null
                                  ? `${m.capexExecutionPct}% exec`
                                  : '—'}
                              </div>
                            </td>
                            <td className="font-mono-num px-3 py-3 text-right">
                              <div className="text-slate-200">
                                Cash {fmtZarCompact(m.cashBalanceFy25)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Debt {fmtZarCompact(m.nonCurrentBorrowingFy25)}
                              </div>
                            </td>
                            <td className="font-mono-num px-3 py-3 text-right text-slate-300">
                              {fmtZarCompact(m.grantsFy24)}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${audit.tone}`}
                              >
                                {audit.label}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${creditToneClasses(credit.tone)}`}
                              >
                                {credit.tier.split('·')[0].trim()} · {credit.score}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleInspectSaMunicipality(m)}
                                  className="rounded border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-teal-400/50 hover:text-teal-200"
                                >
                                  Inspect
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOriginateSaMuni(m)}
                                  className="rounded bg-teal-400/15 px-2.5 py-1 text-[11px] font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950"
                                >
                                  + Originate
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ================================================================= */}
      {/* PEER AFRICAN COUNTRIES (KENYA 47 COUNTIES / NIGERIA 37 STATES /   */}
      {/* ZAMBIA / GHANA / DRC / SENEGAL / MOROCCO / UGANDA / EGYPT)        */}
      {/* ================================================================= */}
      {selectedIso3 !== 'ZAF' && (
        <div className="space-y-6">
          {countryLoading && !activeCountryDetail ? (
            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-12 text-center text-sm text-slate-300">
              Loading live public sub-national records and World Bank infrastructure pipeline
              for {activeCountryMeta?.name || selectedIso3}...
            </div>
          ) : countryError && !activeCountryDetail ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-6 text-sm text-rose-200"
            >
              {countryError}
            </div>
          ) : activeCountryDetail ? (
            <>
              {/* Live World Bank Country Pipeline Projects */}
              <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                      <Landmark className="h-4 w-4 text-amber-300" aria-hidden="true" />
                      Live World Bank Infrastructure &amp; Sovereign Pipeline (
                      {activeCountryDetail.worldBankTotalCount} total records for{' '}
                      {activeCountryDetail.country.name})
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Retrieved live from World Bank Operations API (`search.worldbank.org`).
                      Import any project straight into your workspace to model blended co-finance
                      and commercial bank matches.
                    </p>
                  </div>
                </div>

                {activeCountryDetail.worldBankProjects.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No active World Bank project feed rows returned right now.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeCountryDetail.worldBankProjects.slice(0, 8).map((wb) => (
                      <article
                        key={wb.id}
                        className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#08111e] p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono-num font-semibold text-teal-300">
                              {wb.id} · {wb.status}
                            </span>
                            <span className="font-mono-num font-semibold text-amber-300">
                              ${(wb.totalCommitmentUsd / 1e6).toFixed(1)}m USD
                            </span>
                          </div>
                          <h4 className="mt-1.5 text-sm font-semibold text-slate-100">
                            {wb.name}
                          </h4>
                          <p className="mt-1 text-xs text-slate-400">
                            Sector: {wb.sectorName} · Borrower: {wb.borrower}
                          </p>
                          <p className="mt-0.5 font-mono-num text-[11px] text-slate-500">
                            Approved: {wb.approvalDate || '—'} · Closing:{' '}
                            {wb.closingDate || '—'} · {wb.lendingInstrument}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
                          {wb.projectUrl ? (
                            <a
                              href={wb.projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 underline hover:text-teal-200"
                            >
                              World Bank Record <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleImportWbProject(activeCountryDetail.country, wb)
                            }
                            className="inline-flex items-center gap-1 rounded bg-teal-400/15 px-3 py-1.5 text-[11px] font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950"
                          >
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            Import to Workspace
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Subnational Entities Table / Grid (with single-unit isolation) */}
              <div className="rounded-xl border border-white/10 bg-[#0b1424] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {focusedSubUnit
                        ? `${focusedSubUnit.name} (${activeCountryDetail.country.name}) — Focused Jurisdiction`
                        : `${activeCountryDetail.country.name} Sub-National Jurisdictions (${activeCountryDetail.subnationalUnits.length} ${activeCountryDetail.country.subnationalUnitLabel})`}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {activeCountryDetail.fiscalSummaryNote}
                    </p>
                  </div>
                  {focusedSubUnit ? (
                    <button
                      type="button"
                      onClick={() => setFocusedSubUnit(null)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      ← Show all {activeCountryDetail.country.name} units
                    </button>
                  ) : (
                    <input
                      type="search"
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      placeholder={`Search ${activeCountryDetail.country.name} units...`}
                      aria-label={`Search ${activeCountryDetail.country.name} subnational entities`}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none sm:w-64"
                    />
                  )}
                </div>

                {focusedSubUnit ? (
                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-400/30 bg-[#08111e] p-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                          {focusedSubUnit.unitType} · {focusedSubUnit.fiscalYearLabel || activeCountryDetail.country.name}
                        </div>
                        <h4 className="mt-1 text-lg font-semibold text-slate-100">
                          {focusedSubUnit.name}
                        </h4>
                        {focusedSubUnit.totalAllocation && (
                          <p className="font-mono-num mt-1 text-sm text-slate-300">
                            Published Allocation: {fmtLocalCompact(focusedSubUnit.totalAllocation, focusedSubUnit.currency)}
                            {focusedSubUnit.perCapitaAllocation ? ` · Per capita ${fmtLocalCompact(focusedSubUnit.perCapitaAllocation, focusedSubUnit.currency)}` : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOriginateSubnationalRow(activeCountryDetail.country, focusedSubUnit)}
                        className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                      >
                        + Originate {focusedSubUnit.name} Project
                      </button>
                    </div>

                    {(() => {
                      const subCredit = scoreSubnationalUnitCredit(
                        focusedSubUnit,
                        activeCountryDetail.country.iso3
                      );
                      return (
                        <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className={`rounded border px-2.5 py-0.5 text-xs font-semibold ${creditToneClasses(subCredit.tone)}`}>
                                {subCredit.tier}
                              </span>
                              <span className="font-mono-num text-sm font-bold text-slate-100">
                                {subCredit.score} / 100
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-teal-300">
                              {subCredit.recommendedInstrument}
                            </div>
                          </div>
                          <p className="text-xs text-slate-300">{subCredit.rationale}</p>
                        </div>
                      );
                    })()}
                  </div>
                ) : activeCountryDetail.hasFiscalDataset ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 bg-[#08111e] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Sub-National Authority</th>
                          {selectedIso3 === 'KEN' && (
                            <>
                              <th className="px-3 py-3 text-right">Equitable Share</th>
                              <th className="px-3 py-3 text-right">Conditional Grants</th>
                              <th className="px-3 py-3 text-right">Loans &amp; Grants</th>
                              <th className="px-3 py-3 text-right">Total Allocation</th>
                              <th className="px-3 py-3 text-right">Per Capita</th>
                            </>
                          )}
                          {selectedIso3 === 'NGA' && (
                            <>
                              <th className="px-3 py-3 text-right">
                                Latest Full-Yr FAAC
                              </th>
                              <th className="px-3 py-3 text-right">Prior Yr FAAC</th>
                              <th className="px-3 py-3 text-right">
                                Multi-Yr (2016–2019)
                              </th>
                            </>
                          )}
                          <th className="px-4 py-3 text-right">Originate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/6">
                        {filteredSubnational.map((row) => (
                          <tr
                            key={row.id}
                            className="transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-100">
                                {row.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {row.unitType} · {row.fiscalYearLabel}
                              </div>
                            </td>
                            {selectedIso3 === 'KEN' && (
                              <>
                                <td className="font-mono-num px-3 py-3 text-right text-slate-200">
                                  {fmtLocalCompact(row.equitableShare, 'KES')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right text-slate-300">
                                  {fmtLocalCompact(row.conditionalGrants, 'KES')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right text-slate-300">
                                  {fmtLocalCompact(row.loansAndGrants, 'KES')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right font-semibold text-teal-300">
                                  {fmtLocalCompact(row.totalAllocation, 'KES')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right text-amber-300">
                                  KSh{' '}
                                  {(row.perCapitaAllocation || 0).toLocaleString('en-US')}
                                </td>
                              </>
                            )}
                            {selectedIso3 === 'NGA' && (
                              <>
                                <td className="font-mono-num px-3 py-3 text-right font-semibold text-teal-300">
                                  {fmtLocalCompact(row.totalAllocation, 'NGN')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right text-slate-300">
                                  {fmtLocalCompact(row.priorYearTotal, 'NGN')}
                                </td>
                                <td className="font-mono-num px-3 py-3 text-right text-amber-300">
                                  {fmtLocalCompact(row.multiYearTotal, 'NGN')}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFocusedSubUnit(row)}
                                  className="rounded border border-white/15 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-teal-400/50 hover:text-teal-200"
                                >
                                  Focus
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOriginateSubnationalRow(
                                      activeCountryDetail.country,
                                      row
                                    )
                                  }
                                  className="rounded bg-teal-400/15 px-2.5 py-1 text-[11px] font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950"
                                >
                                  + Originate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {filteredSubnational.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#08111e] px-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => setFocusedSubUnit(row)}
                          className="min-w-0 text-left hover:text-teal-200"
                        >
                          <div className="truncate text-xs font-semibold text-slate-100">
                            {row.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {row.unitType}
                            {row.isoOrCode ? ` · ${row.isoOrCode}` : ''}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleOriginateSubnationalRow(
                              activeCountryDetail.country,
                              row
                            )
                          }
                          className="shrink-0 rounded bg-teal-400/15 px-2 py-1 text-[10px] font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950"
                        >
                          + Originate
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

    </section>
  );
}
