import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Pause, Play, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Role, TabId } from '../types/capital';

interface ExplainerStep {
  num: string;
  title: string;
  subtitle: string;
  cityAction: string;
  capitalOutcome: string;
  waccPct: string;
  crowdingMultiple: string;
  stack: Array<{ label: string; pct: number; tone: string }>;
  ctaLabel: string;
  targetRole: Role;
  targetTab: TabId;
}

const STEPS: ExplainerStep[] = [
  {
    num: '01',
    title: 'Anchor Fiscal & Technical Reality',
    subtitle: 'Public Data Observatory + Projects Database',
    cityAction:
      'A city or national agency pulls audited Treasury / County / State accounts, selects an infrastructure mandate, and converts capex across local & hard lending currencies.',
    capitalOutcome:
      'Commercial banks and DFIs see verified fiscal capacity, AGSA audit history, and capex execution ratios upfront—cutting early screening time.',
    waccPct: '13.8%',
    crowdingMultiple: '1.0x',
    stack: [
      { label: 'Unblended Baseline Debt', pct: 85, tone: 'bg-slate-500' },
      { label: 'Municipal Budget', pct: 15, tone: 'bg-slate-700' },
    ],
    ctaLabel: 'Open Projects database',
    targetRole: 'borrower',
    targetTab: 'projects',
  },
  {
    num: '02',
    title: 'Clear Borrowing & Foreign-EPC Compliance',
    subtitle: 'Africa-Wide Statutory & Contractor Rules',
    cityAction:
      'Verify MFMA / PFMA / OHADA borrowing limits, National Treasury FX approvals, and foreign EPC licensing, B-BBEE / local-content, tax PE, and repatriation rules.',
    capitalOutcome:
      'International developers and lenders confirm legal enforceability before spending advisory fees on non-compliant structures.',
    waccPct: '12.6%',
    crowdingMultiple: '1.3x',
    stack: [
      { label: 'Compliant Senior Debt', pct: 70, tone: 'bg-sky-500' },
      { label: 'Statutory Municipal Slice', pct: 30, tone: 'bg-teal-600' },
    ],
    ctaLabel: 'Inspect Legal & Compliance',
    targetRole: 'borrower',
    targetTab: 'legal',
  },
  {
    num: '03',
    title: 'Assemble Blended Capital + EPC Consortium Wrap',
    subtitle: 'Interactive Scenarios Wizard + EPC Directory',
    cityAction:
      'Pair preparation grants (AfDB / DBSA PPF) with long-tenor DFI tranches, Tier-1 turnkey EPC completion guarantees, and vendor/ECA financing.',
    capitalOutcome:
      'Capital cost is bought down and construction overrun risk shifts onto balance-sheet-backed EPC & BOOT leads.',
    waccPct: '9.4%',
    crowdingMultiple: '1.9x',
    stack: [
      { label: 'Grant Buy-Down', pct: 22, tone: 'bg-emerald-400' },
      { label: 'Concessional DFI', pct: 38, tone: 'bg-teal-400' },
      { label: 'EPC / ECA Wrap', pct: 22, tone: 'bg-amber-400' },
      { label: 'Local Bank', pct: 18, tone: 'bg-sky-400' },
    ],
    ctaLabel: 'Launch Scenarios Wizard',
    targetRole: 'borrower',
    targetTab: 'scenarios',
  },
  {
    num: '04',
    title: 'Redirect Global Capital Flows to Your Mandate',
    subtitle: 'Flows Simulator · Credit Wraps & FX Hedging',
    cityAction:
      'Deploy TCX cross-currency swaps, GuarantCo/ATIDI partial credit guarantees, and ring-fenced tariff escrows to eliminate FX & sub-sovereign bottlenecks.',
    capitalOutcome:
      'Domestic pension funds, global SWFs, and climate funds shift liquidity out of competing OECD/LatAm corridors into your bankable project.',
    waccPct: '8.1%',
    crowdingMultiple: '2.5x',
    stack: [
      { label: 'Grant / PPF', pct: 18, tone: 'bg-emerald-400' },
      { label: 'DFI + Climate', pct: 32, tone: 'bg-teal-400' },
      { label: 'Guarantee-Wrapped Pension/Bond', pct: 32, tone: 'bg-sky-400' },
      { label: 'EPC / Sponsor Equity', pct: 18, tone: 'bg-amber-400' },
    ],
    ctaLabel: 'Simulate Flow Redirection',
    targetRole: 'provider',
    targetTab: 'flows',
  },
  {
    num: '05',
    title: 'Execute Under Mutual NDA to Financial Close',
    subtitle: 'Unified 3-Party Deal Room & Common Data Room',
    cityAction:
      'Convene the Government Borrower, Capital Providers, and Consortium EPC Lead in one permissioned workspace across NDA, Data Room, Q&A, Term Sheet, and Close.',
    capitalOutcome:
      'Every executed instrument, technical deliverable, and regulatory milestone sits in an immutable audit trail ready for disbursement.',
    waccPct: '7.8%',
    crowdingMultiple: '2.8x',
    stack: [
      { label: 'Grant Closed', pct: 18, tone: 'bg-emerald-400' },
      { label: 'DFI Senior Closed', pct: 34, tone: 'bg-teal-400' },
      { label: 'Wrapped Local Institutional', pct: 30, tone: 'bg-sky-400' },
      { label: 'EPC + Equity Closed', pct: 18, tone: 'bg-amber-400' },
    ],
    ctaLabel: 'Inspect Deal Rooms',
    targetRole: 'borrower',
    targetTab: 'dealroom',
  },
];

export function AnimatedExplainer({
  onEnterRole,
}: {
  onEnterRole: (role: Role, tab: TabId) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(!prefersReducedMotion);

  useEffect(() => {
    if (!playing || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % STEPS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [playing, prefersReducedMotion]);

  const current = STEPS[stepIdx];

  return (
    <section
      aria-labelledby="explainer-heading"
      className="rounded-2xl border border-white/10 bg-[#081221] p-6 lg:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
            How It Works For Cities &amp; Sovereigns
          </p>
          <h2
            id="explainer-heading"
            className="font-display mt-1.5 text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl"
          >
            From raw municipal priority to competitive financial close
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx((prev) => (prev - 1 + STEPS.length) % STEPS.length);
            }}
            aria-label="Previous explainer step"
            className="rounded-lg border border-white/12 bg-white/[0.03] p-2 text-slate-300 transition-colors hover:border-teal-400/40 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-teal-400/45 hover:text-teal-200 whitespace-nowrap shrink-0"
          >
            {playing ? (
              <>
                <Pause className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                <span>Pause sequence</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                <span>Play sequence</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx((prev) => (prev + 1) % STEPS.length);
            }}
            aria-label="Next explainer step"
            className="rounded-lg border border-white/12 bg-white/[0.03] p-2 text-slate-300 transition-colors hover:border-teal-400/40 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Interactive 5-Step Selector Rail */}
      <div
        role="tablist"
        aria-label="Capital origination workflow stages"
        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {STEPS.map((s, idx) => {
          const active = idx === stepIdx;
          return (
            <button
              key={s.num}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setPlaying(false);
                setStepIdx(idx);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-teal-400/60 bg-teal-400/12 text-slate-100'
                  : 'border-white/8 bg-[#0b1628] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={`font-mono-num ${active ? 'text-teal-300' : 'text-slate-500'}`}>
                  Step {s.num}
                </span>
                {active && (
                  <span className="font-mono-num text-[10px] text-amber-300">
                    {s.waccPct} WACC
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-xs font-semibold">{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Animated Stage Canvas */}
      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#060d19] p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.num}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <div className="space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-mono-num font-semibold text-teal-300">
                  Stage {current.num}
                </span>
                <span aria-hidden="true">·</span>
                <span>{current.subtitle}</span>
              </div>

              <h3 className="font-display text-2xl font-medium text-slate-100">
                {current.title}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
                    City / Sovereign Action
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {current.cityAction}
                  </p>
                </div>

                <div className="rounded-xl border border-white/8 bg-[#0b1424] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Competitive Capital Response
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {current.capitalOutcome}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Capital Stack Compression & Crowding-In Readout */}
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1424] p-5 lg:col-span-5">
              <div>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/8 pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Illustrative Blended WACC
                    </div>
                    <div className="font-mono-num mt-1 text-3xl font-semibold text-teal-300">
                      {current.waccPct}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Crowding-In Multiple
                    </div>
                    <div className="font-mono-num mt-1 text-3xl font-semibold text-amber-300">
                      {current.crowdingMultiple}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-slate-400">
                    <span>Indicative Capital Stack Evolution</span>
                    <span className="font-mono-num">100% Capex</span>
                  </div>
                  <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    {current.stack.map((slice) => (
                      <motion.div
                        key={slice.label}
                        initial={prefersReducedMotion ? false : { scaleX: 0.4, opacity: 0.5 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        style={{ width: `${slice.pct}%`, transformOrigin: 'left' }}
                        title={`${slice.label}: ${slice.pct}%`}
                        className={`${slice.tone} h-full`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-300">
                    {current.stack.map((slice) => (
                      <div key={slice.label} className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-400">{slice.label}</span>
                        <span className="font-mono-num font-semibold text-slate-100">
                          {slice.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                <span className="font-mono-num text-xs text-slate-500">
                  {stepIdx + 1} / {STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => onEnterRole(current.targetRole, current.targetTab)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300 whitespace-nowrap shrink-0"
                >
                  <span>{current.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
