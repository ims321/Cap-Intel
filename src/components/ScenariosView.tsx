import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { JURISDICTION_OPTIONS, SCENARIOS } from '../data/capitalData';
import type { CorridorSignalsResponse } from '../data/mapExtras';
import type { Project, TabId } from '../types/capital';
import { getCurrencySpec, getJurisdictionCurrencyProfile } from '../utils/currencies';
import { computeScenario, fmtM } from '../utils/finance';
import { buildScenarioStructureDetail } from '../utils/projectBrief';
import { evaluateWizardScenario } from '../utils/strategyEngine';
import { EvidenceText, SectionHeader } from './SharedUI';

const TRANCHE_BAR_COLORS = [
  'bg-emerald-400',
  'bg-teal-400',
  'bg-sky-400',
  'bg-amber-400',
];

const WIZARD_STEPS = [
  { step: 1, title: '01. Project Mandate & Capex' },
  { step: 2, title: '02. Blended + EPC Mix' },
  { step: 3, title: '03. FX & Rate Stress' },
  { step: 4, title: '04. Verdict & Conclusions' },
];

function resolveMarketBenchmarkKeys(jurisdictionKey: string, currency: string): {
  curveIso3: string;
  swapCcy: string;
} {
  const j = jurisdictionKey.toLowerCase();
  let curveIso3 = 'ZAF';
  let swapCcy = currency || 'ZAR';
  if (j.startsWith('ke-')) {
    curveIso3 = 'KEN';
    if (!currency) swapCcy = 'KES';
  } else if (j.startsWith('ng-')) {
    curveIso3 = 'NGA';
    if (!currency) swapCcy = 'NGN';
  } else if (j.startsWith('ma-')) {
    curveIso3 = 'MAR';
    if (!currency) swapCcy = 'EGP';
  } else if (j.startsWith('zm-')) {
    curveIso3 = 'ZAF';
    if (!currency) swapCcy = 'ZMW';
  } else if (j.startsWith('eg-')) {
    curveIso3 = 'MAR';
    if (!currency) swapCcy = 'EGP';
  }
  return { curveIso3, swapCcy };
}

interface ScenariosViewProps {
  activeProject?: Project;
  jurisdiction?: string;
  onNavigate?: (tab: TabId) => void;
}

export function ScenariosView({
  activeProject,
  jurisdiction = 'za-muni',
  onNavigate,
}: ScenariosViewProps) {
  const [mode, setMode] = useState<'wizard' | 'benchmark'>('wizard');
  const [wizardStep, setWizardStep] = useState(1);

  // Wizard State (seeded cleanly from active project or benchmark defaults)
  const [wizJurisdiction, setWizJurisdiction] = useState(jurisdiction);
  const [wizSector, setWizSector] = useState(activeProject?.sector || 'Water & sanitation');
  const [wizCapexM, setWizCapexM] = useState(
    activeProject ? Math.max(10, Math.round(activeProject.capex / 1e6)) : 420
  );
  const [wizCurrency, setWizCurrency] = useState(
    activeProject?.currency || getJurisdictionCurrencyProfile(jurisdiction).defaultLocalCode
  );
  const [grantPct, setGrantPct] = useState(20);
  const [concessionalPct, setConcessionalPct] = useState(40);
  const [commercialPct, setCommercialPct] = useState(20);
  const [epcVendorFinancePct, setEpcVendorFinancePct] = useState(15);
  const [hedgePct, setHedgePct] = useState(65);
  const [fxShockPct, setFxShockPct] = useState(15);
  const [rateBps, setRateBps] = useState(100);

  // Live sovereign curve & TCX swap sync
  const [liveFeed, setLiveFeed] = useState<CorridorSignalsResponse | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [useLiveCurves, setUseLiveCurves] = useState(false);

  const handleSyncLiveCurves = async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const res = await fetch('/api/corridor-signals');
      const data: CorridorSignalsResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync market curve feed.');
      setLiveFeed(data);
      setUseLiveCurves(true);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Unable to reach /api/corridor-signals');
    } finally {
      setFeedLoading(false);
    }
  };

  // Benchmark A-D state
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const ccyProfile = useMemo(
    () => getJurisdictionCurrencyProfile(wizJurisdiction),
    [wizJurisdiction]
  );
  const ccySpec = useMemo(() => getCurrencySpec(wizCurrency), [wizCurrency]);

  const syncedBenchmark = useMemo(() => {
    if (!liveFeed) return null;
    const { curveIso3, swapCcy } = resolveMarketBenchmarkKeys(wizJurisdiction, wizCurrency);
    const curve =
      liveFeed.yieldCurves?.find((y) => y.iso3 === curveIso3) ||
      liveFeed.yieldCurves?.[0];
    const swap =
      liveFeed.fxSwapSpreads?.find((s) => s.currency === swapCcy) ||
      liveFeed.fxSwapSpreads?.[0];
    if (!curve && !swap) return null;
    const commBase = curve ? curve.commercialLocalPct : 11.2;
    const dfiBase = curve ? curve.dfiConcessionalPct : 6.8;
    const epcBase = curve ? Number(Math.max(5.0, curve.yield10yPct * 0.72).toFixed(2)) : 7.6;
    const swapBps = swap ? swap.tcxSwapBps : 160;
    return {
      curve,
      swap,
      livePricing: {
        commercialBasePct: commBase,
        dfiBasePct: dfiBase,
        epcBasePct: epcBase,
        hedgeSwapBps: swapBps,
        curveSourceLabel: `${curve?.country || 'Benchmark'} (${curve?.benchmarkLabel || '10Y'} ${curve?.yield10yPct ?? commBase}%) · ${swap?.currency || wizCurrency} Swap ${swapBps}bps`,
      },
    };
  }, [liveFeed, wizJurisdiction, wizCurrency]);

  const wizardResult = useMemo(
    () =>
      evaluateWizardScenario({
        capexM: wizCapexM,
        currency: wizCurrency,
        jurisdictionKey: wizJurisdiction,
        sector: wizSector,
        grantPct,
        concessionalPct,
        commercialPct,
        epcVendorFinancePct,
        hedgePct,
        fxShockPct,
        rateBps,
        livePricing: useLiveCurves && syncedBenchmark ? syncedBenchmark.livePricing : undefined,
      }),
    [
      wizCapexM,
      wizCurrency,
      wizJurisdiction,
      wizSector,
      grantPct,
      concessionalPct,
      commercialPct,
      epcVendorFinancePct,
      hedgePct,
      fxShockPct,
      rateBps,
      useLiveCurves,
      syncedBenchmark,
    ]
  );

  const rows = SCENARIOS.map((sc) => ({
    sc,
    base: computeScenario(sc, 0, 0),
    stressed: computeScenario(sc, fxShockPct, rateBps),
    detail: buildScenarioStructureDetail(sc, fxShockPct, rateBps),
  }));

  const cheapestId = rows.reduce(
    (min, r) => (r.stressed.total < min.stressed.total ? r : min),
    rows[0]
  ).sc.id;
  const maxTotal = Math.max(...rows.map((r) => r.stressed.total), 1);
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

  const verdictTone =
    wizardResult.statutoryVerdict === 'Compliant / Optimal'
      ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
      : wizardResult.statutoryVerdict === 'Conditional — FX/Treasury Approval'
        ? 'border-amber-400/35 bg-amber-400/10 text-amber-200'
        : 'border-rose-400/35 bg-rose-400/10 text-rose-200';

  return (
    <section aria-labelledby="scenarios-heading" className="space-y-6">
      <SectionHeader
        title="Financing strategy wizard & stress scenarios"
        hint="Step through capital mix, EPC vendor/ECA wraps, and FX/rate shocks to reach bankable conclusions — or compare benchmark Scenarios A–D"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSyncLiveCurves()}
              disabled={feedLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/15 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-400/25 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${feedLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              {feedLoading
                ? 'Syncing market curves...'
                : liveFeed
                  ? 'Refresh Live Curve & TCX Feed'
                  : 'Sync Live Curve & TCX Swap Feed'}
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b1424] p-1">
              <button
                type="button"
                onClick={() => setMode('wizard')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'wizard'
                    ? 'bg-teal-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Guided Wizard (4 steps)
              </button>
              <button
                type="button"
                onClick={() => setMode('benchmark')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'benchmark'
                    ? 'bg-teal-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Benchmark A–D
              </button>
            </div>
          </div>
        }
      />

      {feedError && (
        <div role="alert" className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {feedError}
        </div>
      )}

      {liveFeed && syncedBenchmark && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-400/30 bg-[#081526] px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div>
              <span className="font-semibold text-teal-300">Live Market Anchor:</span>{' '}
              <span>{syncedBenchmark.curve?.country} ({syncedBenchmark.curve?.iso3})</span>
            </div>
            <div className="font-mono-num">
              {syncedBenchmark.curve?.benchmarkLabel}:{' '}
              <strong className="text-slate-100">{syncedBenchmark.curve?.yield10yPct}%</strong> · DFI{' '}
              <strong className="text-teal-300">{syncedBenchmark.curve?.dfiConcessionalPct}%</strong> · Local Bank{' '}
              <strong className="text-amber-300">{syncedBenchmark.curve?.commercialLocalPct}%</strong>
            </div>
            <div className="font-mono-num">
              TCX Swap ({syncedBenchmark.swap?.currency}):{' '}
              <strong className="text-amber-300">{syncedBenchmark.swap?.tcxSwapBps} bps</strong> · {syncedBenchmark.swap?.tenor}
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-teal-200">
            <input
              type="checkbox"
              checked={useLiveCurves}
              onChange={(e) => setUseLiveCurves(e.target.checked)}
              className="h-3.5 w-3.5 accent-teal-400"
            />
            Apply live sovereign curve &amp; swap pricing
          </label>
        </div>
      )}

      {mode === 'wizard' ? (
        <div className="space-y-6">
          {/* Stepper Bar */}
          <div
            role="tablist"
            aria-label="Financing wizard steps"
            className="grid gap-2 sm:grid-cols-4"
          >
            {WIZARD_STEPS.map((s) => {
              const active = wizardStep === s.step;
              const completed = wizardStep > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setWizardStep(s.step)}
                  className={`rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-colors ${
                    active
                      ? 'border-teal-400 bg-teal-400/15 text-teal-200'
                      : completed
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-[#0b1424] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.title}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Active Wizard Step Panel */}
            <div className="rounded-2xl border border-white/12 bg-[#0b1424] p-6 lg:col-span-7">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-xl font-medium text-slate-100">
                      Step 1 · Set Project Mandate, Jurisdiction &amp; Capex
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Anchor your scenario to the borrowing entity&apos;s jurisdiction, local currency, and sector tariff model.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="wiz-jurisdiction" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Jurisdiction
                      </label>
                      <select
                        id="wiz-jurisdiction"
                        value={wizJurisdiction}
                        onChange={(e) => {
                          const nextJ = e.target.value;
                          setWizJurisdiction(nextJ);
                          setWizCurrency(getJurisdictionCurrencyProfile(nextJ).defaultLocalCode);
                        }}
                        className="w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                      >
                        {JURISDICTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="wiz-sector" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Infrastructure Sector
                      </label>
                      <select
                        id="wiz-sector"
                        value={wizSector}
                        onChange={(e) => setWizSector(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                      >
                        <option>Water &amp; sanitation</option>
                        <option>Renewable energy</option>
                        <option>Transport / logistics</option>
                        <option>Municipal services</option>
                        <option>Climate adaptation</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="wiz-capex" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Total Capex ({ccySpec.symbol} millions)
                      </label>
                      <input
                        id="wiz-capex"
                        type="number"
                        min={10}
                        max={50000}
                        value={wizCapexM}
                        onChange={(e) => setWizCapexM(Math.max(5, Number(e.target.value) || 0))}
                        className="font-mono-num w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-sm font-semibold text-slate-100 focus:border-teal-400/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="wiz-ccy" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Revenue / Reporting Currency
                      </label>
                      <select
                        id="wiz-ccy"
                        value={wizCurrency}
                        onChange={(e) => setWizCurrency(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                      >
                        {ccyProfile.selectableInputCodes.map((code) => (
                          <option key={code} value={code}>
                            {code} ({getCurrencySpec(code).symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="rounded-lg border border-white/10 bg-[#08111e] px-3.5 py-2.5 text-xs text-slate-300">
                    <strong className="text-teal-300">Jurisdiction FX Rule: </strong>
                    {ccyProfile.currencyPolicyNote}
                  </p>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-xl font-medium text-slate-100">
                      Step 2 · Size Blended + Developer / EPC Capital Stack
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Balance catalytic grants, concessional DFI debt, domestic commercial loans, and Developer/EPC vendor or ECA finance. Remaining allocation defaults to sponsor/equity.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        id: 'wiz-grant',
                        label: 'Preparation / Capital Grant (0% non-repayable)',
                        val: grantPct,
                        max: 55,
                        set: setGrantPct,
                        tone: 'text-emerald-300',
                      },
                      {
                        id: 'wiz-dfi',
                        label: 'Concessional DFI Tranche (18Y / 3Y grace)',
                        val: concessionalPct,
                        max: 75,
                        set: setConcessionalPct,
                        tone: 'text-teal-300',
                      },
                      {
                        id: 'wiz-comm',
                        label: 'Local Commercial Bank / Bond Debt (10Y local ccy)',
                        val: commercialPct,
                        max: 75,
                        set: setCommercialPct,
                        tone: 'text-sky-300',
                      },
                      {
                        id: 'wiz-epc',
                        label: 'Developer / EPC Vendor & ECA Financing (12Y / 2Y grace)',
                        val: epcVendorFinancePct,
                        max: 45,
                        set: setEpcVendorFinancePct,
                        tone: 'text-amber-300',
                      },
                    ].map((slider) => (
                      <div key={slider.id}>
                        <div className="flex items-center justify-between text-xs">
                          <label htmlFor={slider.id} className="font-semibold text-slate-200">
                            {slider.label}
                          </label>
                          <span className={`font-mono-num font-bold ${slider.tone}`}>
                            {slider.val}%
                          </span>
                        </div>
                        <input
                          id={slider.id}
                          type="range"
                          min={0}
                          max={slider.max}
                          step={5}
                          value={slider.val}
                          onChange={(e) => slider.set(Number(e.target.value))}
                          className="mt-1.5 w-full"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#08111e] p-3 text-xs text-slate-300">
                    Normalized Stack: Grant{' '}
                    <strong className="font-mono-num text-emerald-300">
                      {wizardResult.normalizedMix.grantPct}%
                    </strong>{' '}
                    · DFI{' '}
                    <strong className="font-mono-num text-teal-300">
                      {wizardResult.normalizedMix.concessionalPct}%
                    </strong>{' '}
                    · Commercial{' '}
                    <strong className="font-mono-num text-sky-300">
                      {wizardResult.normalizedMix.commercialPct}%
                    </strong>{' '}
                    · EPC/ECA{' '}
                    <strong className="font-mono-num text-amber-300">
                      {wizardResult.normalizedMix.epcVendorPct}%
                    </strong>{' '}
                    · Sponsor Equity{' '}
                    <strong className="font-mono-num text-slate-100">
                      {wizardResult.normalizedMix.sponsorEquityPct}%
                    </strong>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-xl font-medium text-slate-100">
                      Step 3 · Apply Macro FX Hedging &amp; Rate Stress
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Test hard-currency resilience using TCX / cross-currency swaps alongside sovereign benchmark rate shocks.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="wiz-hedge" className="font-semibold text-slate-200">
                          TCX / Cross-Currency FX Hedge Coverage
                        </label>
                        <span className="font-mono-num font-bold text-emerald-300">
                          {hedgePct}% hedged
                        </span>
                      </div>
                      <input
                        id="wiz-hedge"
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={hedgePct}
                        onChange={(e) => setHedgePct(Number(e.target.value))}
                        className="mt-1.5 w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="wiz-fx" className="font-semibold text-slate-200">
                          Local Currency Depreciation Shock
                        </label>
                        <span className="font-mono-num font-bold text-teal-300">
                          +{fxShockPct}%
                        </span>
                      </div>
                      <input
                        id="wiz-fx"
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={fxShockPct}
                        onChange={(e) => setFxShockPct(Number(e.target.value))}
                        className="mt-1.5 w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="wiz-rate" className="font-semibold text-slate-200">
                          Reference Interest-Rate Shock
                        </label>
                        <span className="font-mono-num font-bold text-amber-300">
                          +{rateBps} bps
                        </span>
                      </div>
                      <input
                        id="wiz-rate"
                        type="range"
                        min={0}
                        max={400}
                        step={25}
                        value={rateBps}
                        onChange={(e) => setRateBps(Number(e.target.value))}
                        className="mt-1.5 w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-medium text-slate-100">
                      Step 4 · Bankability Verdict &amp; Wizard Conclusions
                    </h3>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${verdictTone}`}>
                      {wizardResult.statutoryVerdict}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-sm leading-relaxed text-slate-200">
                    {wizardResult.conclusions.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 rounded-lg border border-white/8 bg-[#08111e] p-3 text-xs"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-teal-400/25 bg-teal-400/[0.06] p-4 text-xs leading-relaxed text-slate-200">
                    <div className="font-semibold uppercase tracking-wider text-teal-300">
                      Recommended Execution Path
                    </div>
                    <p className="mt-1">{wizardResult.recommendedAction}</p>
                  </div>

                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-200">Statutory Rule Context: </strong>
                    {wizardResult.legalHeadline}
                  </p>

                  {onNavigate && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate('legal')}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                      >
                        Verify Statutory Compliance
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('epcs')}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                      >
                        Match EPC Consortiums
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('dealroom')}
                        className="rounded-lg bg-teal-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                      >
                        Open Deal Rooms →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-40"
                >
                  ← Previous step
                </button>
                <span className="font-mono-num text-xs text-slate-400">
                  Step {wizardStep} of 4
                </span>
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => Math.min(4, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                  >
                    Next step <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="rounded-lg border border-teal-400/40 bg-teal-400/15 px-4 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-400/25"
                  >
                    Restart wizard
                  </button>
                )}
              </div>
            </div>

            {/* Live Financial Summary Rail */}
            <aside className="space-y-4 rounded-2xl border border-white/12 bg-[#0b1424] p-6 lg:col-span-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Live Strategy Readout
                </span>
                <span className="font-mono-num text-xs font-semibold text-teal-300">
                  {ccySpec.symbol}{wizCapexM}m ({wizCurrency})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#08111e] p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Stressed Lifetime Service
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                    {ccySpec.symbol}{wizardResult.stressedTotalDebtServiceM.toFixed(1)}m
                  </div>
                  <div className="font-mono-num text-[11px] text-slate-400">
                    Base {ccySpec.symbol}{wizardResult.baseTotalDebtServiceM.toFixed(1)}m
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#08111e] p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Indicative Stressed DSCR
                  </div>
                  <div
                    className={`font-mono-num mt-1 text-xl font-bold ${
                      wizardResult.indicativeDscr >= 1.3
                        ? 'text-emerald-300'
                        : wizardResult.indicativeDscr >= 1.15
                          ? 'text-amber-300'
                          : 'text-rose-300'
                    }`}
                  >
                    {wizardResult.indicativeDscr.toFixed(2)}x
                  </div>
                  <div className="text-[11px] text-slate-400">Target ≥ 1.30x</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#08111e] p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Weighted Debt Coupon
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-teal-300">
                    {wizardResult.weightedCouponPct.toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-slate-400">Includes swap cost</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#08111e] p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Unhedged FX Debt
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-amber-300">
                    {ccySpec.symbol}{wizardResult.unhedgedFxDebtM.toFixed(1)}m
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Out of {ccySpec.symbol}{wizardResult.debtPrincipalM.toFixed(1)}m debt
                  </div>
                </div>
              </div>

              {/* Stack Bar */}
              <div>
                <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                  <span>Capital Stack Split</span>
                  <span className="font-mono-num">
                    Annual post-grace {ccySpec.symbol}{wizardResult.annualPostGraceM.toFixed(1)}m
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    style={{ width: `${wizardResult.normalizedMix.grantPct}%` }}
                    className="bg-emerald-400"
                    title="Grant"
                  />
                  <div
                    style={{ width: `${wizardResult.normalizedMix.concessionalPct}%` }}
                    className="bg-teal-400"
                    title="Concessional DFI"
                  />
                  <div
                    style={{ width: `${wizardResult.normalizedMix.commercialPct}%` }}
                    className="bg-sky-400"
                    title="Commercial"
                  />
                  <div
                    style={{ width: `${wizardResult.normalizedMix.epcVendorPct}%` }}
                    className="bg-amber-400"
                    title="EPC / ECA"
                  />
                </div>
              </div>

              <div className={`rounded-xl border p-3 text-xs ${verdictTone}`}>
                <div className="font-semibold">Verdict: {wizardResult.statutoryVerdict}</div>
                <div className="mt-1 opacity-90">{wizardResult.conclusions[0]}</div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Benchmark Parameters Strip */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#0b1424] p-5 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Benchmark capex
              </div>
              <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                R420.0m
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Revenue currency
              </div>
              <div className="font-mono-num mt-1 text-xl font-bold text-slate-100">
                ZAR
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Stress Applied
              </div>
              <div className="font-mono-num mt-1 text-xl font-bold text-teal-300">
                +{fxShockPct}% FX · +{rateBps}bps
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() =>
                  setExpandedIds((prev) =>
                    prev.length > 0 ? [] : SCENARIOS.map((s) => s.id)
                  )
                }
                className="rounded-lg border border-teal-400/35 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-400/20"
              >
                {expandedIds.length > 0 ? 'Collapse all structures' : 'Expand all structures'}
              </button>
            </div>
          </div>

          {/* Visual Comparison Bar Chart */}
          <div className="rounded-xl border border-white/10 bg-[#0b1424] p-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stressed whole-of-life debt service comparison
            </div>
            <div className="space-y-2.5">
              {rows.map(({ sc, base, stressed }) => {
                const basePct = (base.total / maxTotal) * 100;
                const stressExtraPct = Math.max(
                  0,
                  ((stressed.total - base.total) / maxTotal) * 100
                );
                return (
                  <div key={sc.id} className="grid items-center gap-3 sm:grid-cols-12">
                    <div className="text-xs font-medium text-slate-300 sm:col-span-4">
                      Scenario {sc.id} · {sc.name}
                    </div>
                    <div className="sm:col-span-6">
                      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          style={{ width: `${basePct}%` }}
                          className={sc.id === cheapestId ? 'bg-teal-400' : 'bg-sky-400/80'}
                        />
                        <div
                          style={{ width: `${stressExtraPct}%` }}
                          className="bg-rose-400/80"
                        />
                      </div>
                    </div>
                    <div className="font-mono-num text-right text-xs font-semibold text-slate-100 sm:col-span-2">
                      R{fmtM(stressed.total)}m
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4 Expandable Scenario Cards */}
          <div className="grid gap-5 lg:grid-cols-2">
            {rows.map(({ sc, base, stressed, detail }) => {
              const dA = stressed.annual - base.annual;
              const dT = stressed.total - base.total;
              const fxShare = stressed.debt ? (stressed.fxExposed / stressed.debt) * 100 : 0;
              const isCheapest = sc.id === cheapestId;
              const isExpanded = expandedIds.includes(sc.id);

              return (
                <article
                  key={sc.id}
                  onClick={() => toggleExpand(sc.id)}
                  className={`cursor-pointer rounded-xl border p-6 transition-all ${
                    isExpanded ? 'lg:col-span-2' : ''
                  } ${
                    sc.recommended
                      ? 'border-teal-400/45 bg-[#0c192b] hover:border-teal-400/70'
                      : 'border-white/10 bg-[#0b1424] hover:border-white/25'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Scenario {sc.id}
                      {sc.recommended && (
                        <span className="ml-2 text-teal-300">· Analytical recommendation</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {isCheapest && (
                        <span className="text-xs font-semibold text-emerald-300">
                          Lowest total cost
                        </span>
                      )}
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(sc.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-400/35 bg-teal-400/10 px-2.5 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-400/20"
                      >
                        {isExpanded ? (
                          <>
                            <span>Collapse structure</span>
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            <span>Inspect detailed structure</span>
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-1.5 text-lg font-semibold text-slate-100">{sc.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{sc.desc}</p>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Capital Stack Allocation ({detail.tranches.length} tranches)</span>
                      <span className="font-mono-num">R420.0m Base Capex</span>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      {detail.tranches.map((tr, idx) => (
                        <div
                          key={tr.label}
                          style={{ width: `${tr.capexSharePct}%` }}
                          className={TRANCHE_BAR_COLORS[idx % TRANCHE_BAR_COLORS.length]}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={`mt-5 grid grid-cols-2 gap-4 border-y border-white/8 py-4 sm:grid-cols-3 ${isExpanded ? 'lg:grid-cols-6' : ''}`}>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Annual service
                      </div>
                      <div className={`font-mono-num mt-1 text-lg font-bold ${dA > 500 ? 'text-rose-300' : 'text-slate-100'}`}>
                        R{fmtM(stressed.annual)}m
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-400">
                        Base R{fmtM(base.annual)}m · {pct(stressed.annual, base.annual).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Total debt service
                      </div>
                      <div className={`font-mono-num mt-1 text-lg font-bold ${dT > 500 ? 'text-rose-300' : 'text-slate-100'}`}>
                        R{fmtM(stressed.total)}m
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-400">
                        Base R{fmtM(base.total)}m · {pct(stressed.total, base.total).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        FX-exposed debt
                      </div>
                      <div className="font-mono-num mt-1 text-base font-semibold text-slate-100">
                        R{fmtM(stressed.fxExposed)}m ({fxShare.toFixed(0)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Grant element
                      </div>
                      <div className="font-mono-num mt-1 text-base font-semibold text-teal-300">
                        R{fmtM(stressed.grant)}m
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-6 cursor-default space-y-5 border-t border-white/12 pt-5"
                    >
                      <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.04] p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
                          <Layers className="h-4 w-4" aria-hidden="true" />
                          <span>Structural Architecture &amp; Sizing Rationale</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-200">{detail.overview}</p>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-[#07101d] p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                            Waterfall &amp; Cashflow Mechanics
                          </h4>
                          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                            {detail.waterfallMechanics.map((item) => (
                              <li key={item}>· {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-[#07101d] p-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Security Package &amp; Covenants</span>
                          </div>
                          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                            {detail.securityAndCovenants.map((item) => (
                              <li key={item}>· {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-[#07101d] p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                            Representative Syndicate Institutions
                          </h4>
                          <ul className="mt-3 space-y-1.5 text-xs text-slate-200">
                            {detail.representativeInstitutions.map((inst) => (
                              <li key={inst} className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden="true" />
                                <span>{inst}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <EvidenceText level="inferred" />
                      <span>·</span>
                      <span>Est. close: {sc.time}</span>
                    </div>
                    {!isExpanded && (
                      <span className="font-semibold text-teal-300/90">
                        Click card to inspect waterfall &amp; syndicate
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
