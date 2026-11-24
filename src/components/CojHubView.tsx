import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  Droplets,
  Leaf,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  COJ_BRAND,
  COJ_ENTITIES,
  COJ_MFMA_CALENDAR,
  computeCojLossRecoveryImpact,
  evaluateCojGreenBondEligibility,
} from '../data/joburgData';
import type { Project, TabId } from '../types/capital';
import { fmtM } from '../utils/finance';
import { SectionHeader } from './SharedUI';

interface CojHubViewProps {
  projects: Record<string, Project>;
  onSelectProjectWorkspace: (projectId: string) => void;
  onNavigate: (tab: TabId) => void;
}

export function CojHubView({
  projects,
  onSelectProjectWorkspace,
  onNavigate,
}: CojHubViewProps) {
  // Interactive Utility Turnaround Simulator state
  const [utilityMode, setUtilityMode] = useState<'water' | 'power'>('water');
  const [annualRevenueRm, setAnnualRevenueRm] = useState<number>(17800);
  const [currentLossPct, setCurrentLossPct] = useState<number>(44);
  const [targetLossPct, setTargetLossPct] = useState<number>(28);
  const [existingDebtServiceRm, setExistingDebtServiceRm] = useState<number>(2450);

  const handleSwitchUtility = (mode: 'water' | 'power') => {
    setUtilityMode(mode);
    if (mode === 'water') {
      setAnnualRevenueRm(17800);
      setCurrentLossPct(44);
      setTargetLossPct(28);
      setExistingDebtServiceRm(2450);
    } else {
      setAnnualRevenueRm(23400);
      setCurrentLossPct(26);
      setTargetLossPct(14);
      setExistingDebtServiceRm(2900);
    }
  };

  const simResult = useMemo(
    () =>
      computeCojLossRecoveryImpact({
        annualRevenueRm,
        currentLossPct,
        targetLossPct,
        existingDebtServiceRm,
      }),
    [annualRevenueRm, currentLossPct, targetLossPct, existingDebtServiceRm]
  );

  const cojProjects = useMemo(() => {
    return Object.values(projects).filter(
      (p) =>
        p.cojEntity ||
        p.jurisdiction.toLowerCase().includes('johannesburg') ||
        p.jurisdiction.toLowerCase().includes('metropolitan')
    );
  }, [projects]);

  const totalBacklogRbn = useMemo(
    () =>
      COJ_ENTITIES.filter((e) => e.id !== 'treasury')
        .reduce((acc, e) => acc + e.estimatedBacklogRbn, 0)
        .toFixed(1),
    []
  );

  return (
    <section aria-labelledby="coj-hub-heading" className="min-w-0 space-y-8">
      <SectionHeader
        title={`${COJ_BRAND.cityName} · Capital & MOE Structuring Hub`}
        hint={`${COJ_BRAND.tagline} · ${COJ_BRAND.motto} · ${COJ_BRAND.strategicFramework}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('publicdata')}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              Inspect JHB Treasury Public Data
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scenarios')}
              className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
            >
              Launch Scenarios Wizard →
            </button>
          </div>
        }
      />

      {/* Executive Heritage & Portfolio Overview */}
      <div className="grid gap-4 rounded-xl border border-amber-400/25 bg-gradient-to-br from-[#121c2e] via-[#0b1424] to-[#0b1a1c] p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            Municipal Owned Entities
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-slate-50">
            6 MOEs + Treasury
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            JW · City Power · JRA · Pikitup · JDA · Metrobus
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
            Aggregated Asset Backlog
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-slate-50">
            R{totalBacklogRbn}bn
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Water, Grid, Roads, Waste &amp; BRT Transit
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            JSE Green Bond Heritage
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-emerald-300">
            ICMA GBP Pioneer
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            First African city to issue a JSE-listed Green Bond (2014)
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            Active CoJ Pipeline
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-slate-50">
            {cojProjects.length} Mandates
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Pre-mapped to MFMA s46/s33 &amp; BFI gates
          </div>
        </div>
      </div>

      {/* Interactive NRW & Grid Loss Recovery -> DSCR & Borrowing Headroom Simulator */}
      <div className="min-w-0 rounded-xl border border-teal-400/25 bg-[#0b1424] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
              <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Turnaround-to-Bankability Simulator · Loss Recovery → Debt Headroom</span>
            </div>
            <h3 className="font-display mt-1 text-xl font-medium text-slate-100">
              Quantify how reducing Non-Revenue Water or City Power losses unlocks non-sovereign debt capacity
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSwitchUtility('water')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                utilityMode === 'water'
                  ? 'bg-teal-400 text-slate-950'
                  : 'border border-white/15 bg-[#08111e] text-slate-300'
              }`}
            >
              <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
              Johannesburg Water (NRW)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchUtility('power')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                utilityMode === 'power'
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-white/15 bg-[#08111e] text-slate-300'
              }`}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              City Power (Grid Losses)
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-6">
            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="coj-rev-slider" className="text-slate-300">
                  Annual Ring-Fenced Utility Revenue (ZARm)
                </label>
                <span className="font-mono-num font-bold text-slate-100">
                  R{annualRevenueRm.toLocaleString()}m
                </span>
              </div>
              <input
                id="coj-rev-slider"
                type="range"
                min={5000}
                max={32000}
                step={200}
                value={annualRevenueRm}
                onChange={(e) => setAnnualRevenueRm(Number(e.target.value))}
                className="mt-1.5 w-full accent-teal-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="coj-curr-loss" className="text-slate-300">
                    Current Loss Baseline
                  </label>
                  <span className="font-mono-num font-bold text-rose-300">
                    {currentLossPct}%
                  </span>
                </div>
                <input
                  id="coj-curr-loss"
                  type="range"
                  min={15}
                  max={60}
                  step={1}
                  value={currentLossPct}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCurrentLossPct(next);
                    if (targetLossPct > next) setTargetLossPct(next);
                  }}
                  className="mt-1.5 w-full accent-rose-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <label htmlFor="coj-target-loss" className="text-slate-300">
                    Post-Capex Target Loss
                  </label>
                  <span className="font-mono-num font-bold text-emerald-300">
                    {targetLossPct}%
                  </span>
                </div>
                <input
                  id="coj-target-loss"
                  type="range"
                  min={8}
                  max={currentLossPct}
                  step={1}
                  value={targetLossPct}
                  onChange={(e) => setTargetLossPct(Number(e.target.value))}
                  className="mt-1.5 w-full accent-emerald-400"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <label htmlFor="coj-debt-service" className="text-slate-300">
                  Existing Annual Debt Service (ZARm)
                </label>
                <span className="font-mono-num font-bold text-slate-100">
                  R{existingDebtServiceRm.toLocaleString()}m/yr
                </span>
              </div>
              <input
                id="coj-debt-service"
                type="range"
                min={500}
                max={6000}
                step={50}
                value={existingDebtServiceRm}
                onChange={(e) => setExistingDebtServiceRm(Number(e.target.value))}
                className="mt-1.5 w-full accent-amber-400"
              />
            </div>
          </div>

          <div className="min-w-0 grid grid-cols-2 gap-3 lg:col-span-6">
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Recovered Cashflow / yr
              </div>
              <div
                data-testid="coj-sim-recovered-rm"
                className="font-mono-num mt-1 text-2xl font-bold text-teal-300"
              >
                +R{simResult.recoveredRevenueRm.toLocaleString()}m
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Net cash retained after marginal treatment/wheeling O&amp;M
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Utility DSCR Uplift
              </div>
              <div
                data-testid="coj-sim-dscr"
                className="font-mono-num mt-1 text-2xl font-bold text-emerald-300"
              >
                {simResult.currentDscr}x → {simResult.improvedDscr}x
              </div>
              <div className="mt-1 text-[11px] text-emerald-300">
                +{simResult.dscrLift}x credit coverage improvement
              </div>
            </div>

            <div className="col-span-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Unlocked 15-Year Senior Borrowing Capacity (at 1.25x DSCR)
                </span>
                <span className="font-mono-num text-xs text-slate-300">
                  ~10.2% ZAR / JIBAR curve
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                <span
                  data-testid="coj-sim-capacity-rm"
                  className="font-mono-num text-3xl font-bold text-amber-300"
                >
                  R{simResult.additionalDebtCapacityRm.toLocaleString()}m
                </span>
                <span className="font-mono-num text-sm font-semibold text-slate-200">
                  (≈ ${simResult.additionalDebtCapacityUsdM}m USD eq.)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CoJ Municipal Owned Entity (MOE) Ring-Fencing Matrix */}
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Building2 className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <span>City of Johannesburg MOE Ring-Fencing &amp; Bankability Matrix</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1424]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Municipal Entity</th>
                <th className="px-4 py-3">Revenue &amp; Ring-Fencing</th>
                <th className="px-4 py-3">Backlog (Rbn)</th>
                <th className="px-4 py-3">Annual Demand (Rm)</th>
                <th className="px-4 py-3">Line Function Owner</th>
                <th className="px-4 py-3 text-right">Green Bond</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {COJ_ENTITIES.map((ent) => (
                <tr key={ent.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{ent.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {ent.collectionOrLossNote}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        ent.ringFencedRevenue ? 'text-teal-300' : 'text-slate-300'
                      }`}
                    >
                      {ent.ringFencedRevenue ? 'Ring-Fenced Tariff' : 'Rate / Grant Supported'}
                    </span>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {ent.revenueStream}
                    </div>
                  </td>
                  <td className="font-mono-num px-4 py-3 font-semibold text-slate-100">
                    R{ent.estimatedBacklogRbn.toFixed(1)}bn
                  </td>
                  <td className="font-mono-num px-4 py-3 font-semibold text-amber-300">
                    R{ent.annualCapexDemandRm.toLocaleString()}m
                  </td>
                  <td className="px-4 py-3 text-slate-300">{ent.primaryLineRole}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        ent.greenBondEligible ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      {ent.greenBondEligible ? 'ICMA Eligible' : 'SLB / General'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Green Bond Desk + Statutory Calendar */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-3 rounded-xl border border-white/10 bg-[#0b1424] p-5 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Leaf className="h-4 w-4" aria-hidden="true" />
            <span>Active Joburg Portfolio &amp; Green Bond Screening</span>
          </div>

          <div className="space-y-3">
            {cojProjects.map((p) => {
              const gb = evaluateCojGreenBondEligibility({
                sector: p.sector,
                desc: p.desc,
                greenBondFlag: p.greenBondEligible,
              });
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/8 bg-[#08111e] p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100">{p.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {p.cojEntity || p.jurisdiction} · R{fmtM(p.capex)}m · Readiness{' '}
                        <span className="font-mono-num text-teal-300">{p.readiness}/100</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectProjectWorkspace(p.id)}
                      className="rounded-lg bg-teal-400/15 border border-teal-400/40 px-2.5 py-1 text-[11px] font-semibold text-teal-200 hover:bg-teal-400/25 whitespace-nowrap shrink-0"
                    >
                      Open in Workspace →
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2 text-[11px]">
                    <span className="text-emerald-300">{gb.icmaCategory}</span>
                    <span className="font-mono-num text-amber-300">
                      Est. Greenium: -{gb.estimatedGreeniumBps} bps
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-xl border border-white/10 bg-[#0b1424] p-5 lg:col-span-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            <span>CoJ Statutory Approval &amp; BFI Grant Gate Calendar</span>
          </div>

          <div className="space-y-2.5">
            {COJ_MFMA_CALENDAR.map((gate) => (
              <div
                key={gate.id}
                className="rounded-xl border border-white/8 bg-[#08111e] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-100">{gate.gate}</strong>
                  <span
                    className={`text-[11px] font-semibold ${
                      gate.status === 'Active Window'
                        ? 'text-emerald-300'
                        : gate.status === 'Upcoming Gate'
                          ? 'text-amber-300'
                          : 'text-teal-300'
                    }`}
                  >
                    {gate.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  <strong className="text-slate-300">{gate.statute}</strong> · {gate.windowLabel}
                </div>
                <div className="mt-1 text-[11px] text-slate-300">
                  Artifact: {gate.requiredArtifact} ({gate.owner})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
