import React, { useMemo, useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import {
  FLOW_DRIVERS,
  FLOW_INSTRUMENTS,
  TRANSACTIONS,
} from '../data/capitalData';
import type { TabId } from '../types/capital';
import {
  FLOW_INTERVENTIONS,
  type FlowInterventionId,
  resolveJurisdictionScope,
  simulateFlowRedirection,
} from '../utils/strategyEngine';
import { SectionHeader } from './SharedUI';

const TARGET_MARKETS = [
  'South Africa',
  'Kenya',
  'Nigeria',
  'Zambia',
  'Ghana',
  'DRC',
  'Tanzania',
  'Ethiopia',
  'Rwanda',
  'Uganda',
  'Morocco',
  'Egypt',
  'Senegal',
  "Côte d'Ivoire",
  'Mozambique',
  'Angola',
  'Namibia',
  'Botswana',
  'Cameroon',
  'Tunisia',
  'Zimbabwe',
];

export function FlowsView({
  jurisdiction = 'za-muni',
  onNavigate,
}: {
  jurisdiction?: string;
  onNavigate: (tab: TabId) => void;
}) {
  const scope = useMemo(() => resolveJurisdictionScope(jurisdiction), [jurisdiction]);
  const defaultCountry = TARGET_MARKETS.includes(scope.countryName)
    ? scope.countryName
    : 'South Africa';

  const [targetCountry, setTargetCountry] = useState(defaultCountry);
  const [baseVolumeM, setBaseVolumeM] = useState(850);
  const [selectedInterventions, setSelectedInterventions] = useState<FlowInterventionId[]>([
    'credit_wrap',
    'fx_hedge',
  ]);
  const [statusFilter, setStatusFilter] = useState('all');

  const toggleIntervention = (id: FlowInterventionId) => {
    setSelectedInterventions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const simResult = useMemo(
    () =>
      simulateFlowRedirection({
        targetCountry,
        baseCorridorVolumeM: baseVolumeM,
        selectedInterventions,
      }),
    [targetCountry, baseVolumeM, selectedInterventions]
  );

  const filteredTxns = useMemo(
    () =>
      TRANSACTIONS.filter(
        (t) => statusFilter === 'all' || t.status === statusFilter
      ),
    [statusFilter]
  );

  const statusTone: Record<string, string> = {
    Closed: 'text-teal-300',
    Implementation: 'text-sky-300',
    Preparation: 'text-amber-300',
  };

  return (
    <section aria-labelledby="flows-heading" className="space-y-8">
      <SectionHeader
        title="Capital flows & redirection simulator"
        hint="Model policy, credit-wrap, FX-hedging, and EPC interventions to shift global capital flows toward your project & country"
        action={
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
          >
            Open interactive Flows Map
          </button>
        }
      />

      {/* Interactive Global Flow Redirection Simulator */}
      <div className="rounded-2xl border border-teal-400/25 bg-[#0b1424] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Global Capital Flow Redirection Simulator</span>
            </div>
            <h3 className="font-display mt-1 text-xl font-medium text-slate-100">
              What interventions divert capital from competing global markets into {targetCountry}?
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              aria-label="Target African country"
              value={targetCountry}
              onChange={(e) => setTargetCountry(e.target.value)}
              className="w-full sm:w-auto max-w-full min-w-0 rounded-lg border border-white/15 bg-[#08111e] px-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-teal-400 focus:outline-none"
            >
              {TARGET_MARKETS.map((c) => (
                <option key={c} value={c}>
                  Target: {c}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#08111e] px-3 py-1.5 text-xs">
              <span className="text-slate-400">Baseline pool:</span>
              <input
                aria-label="Baseline corridor volume in USD millions"
                type="range"
                min={200}
                max={3000}
                step={50}
                value={baseVolumeM}
                onChange={(e) => setBaseVolumeM(Number(e.target.value))}
                className="w-24"
              />
              <span className="font-mono-num font-bold text-slate-100">${baseVolumeM}m</span>
            </div>
          </div>
        </div>

        {/* Intervention Toggles */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FLOW_INTERVENTIONS.map((item) => {
            const active = selectedInterventions.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleIntervention(item.id)}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-teal-400/60 bg-teal-400/10'
                    : 'border-white/10 bg-[#08111e] hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {item.title}
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        active
                          ? 'border-teal-400 bg-teal-400 text-slate-950'
                          : 'border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                    {item.mechanism}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2 font-mono-num text-[11px]">
                  <span className="text-teal-300">
                    +{Math.round(item.redirectMultiplierLift * 100)}% shift
                  </span>
                  <span className="text-amber-300">-{item.waccReductionBps} bps WACC</span>
                  <span className="text-slate-400">{item.timelineWeeks}w</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Simulation Outputs */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-12">
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Redirected Flows Unlocked
              </div>
              <div className="font-mono-num mt-1 text-2xl font-bold text-teal-300">
                +${simResult.redirectedFlowsM.toLocaleString()}m
              </div>
              <div className="text-[11px] text-slate-400">
                Projected total ${simResult.projectedTotalM.toLocaleString()}m
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Crowding-In Multiple
              </div>
              <div className="font-mono-num mt-1 text-2xl font-bold text-emerald-300">
                {simResult.crowdingInMultiple.toFixed(2)}×
              </div>
              <div className="text-[11px] text-slate-400">vs base public anchor</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                WACC Compression
              </div>
              <div className="font-mono-num mt-1 text-2xl font-bold text-amber-300">
                -{simResult.waccCompressionBps} bps
              </div>
              <div className="text-[11px] text-slate-400">Blended cost reduction</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Bankability Score
              </div>
              <div className="font-mono-num mt-1 text-2xl font-bold text-slate-100">
                {simResult.bankabilityUpliftPct}/100
              </div>
              <div className="text-[11px] text-slate-400">Target {targetCountry}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 lg:col-span-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-300">
              Competing Global Destinations Displaced
            </h4>
            {simResult.competingShifts.length === 0 ? (
              <p className="text-xs text-slate-400">
                Activate interventions above to model where redirected flows originate.
              </p>
            ) : (
              <div className="space-y-2.5">
                {simResult.competingShifts.map((shift) => {
                  const barPct = Math.min(100, Math.round((shift.shiftedM / Math.max(1, simResult.projectedTotalM)) * 180));
                  return (
                    <div key={shift.driver} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="truncate pr-2">{shift.fromCorridor}</span>
                        <span className="font-mono-num font-semibold text-teal-300 shrink-0">
                          +${shift.shiftedM}m → {targetCountry}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div style={{ width: `${barPct}%` }} className="h-full rounded-full bg-teal-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 lg:col-span-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-300">
              Prioritized Execution Sequence for {targetCountry}
            </h4>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
              {simResult.prioritizedActions.map((act) => (
                <li key={act}>· {act}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Headline Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Indicative annual flow to SSA
          </div>
          <div className="font-mono-num mt-2 text-3xl font-bold text-slate-100">
            ~$48bn
          </div>
          <p className="mt-1 text-xs text-slate-400">
            All sources · multi-year aggregate concept
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Preparation vs construction
          </div>
          <div className="font-mono-num mt-2 text-3xl font-bold text-amber-300">
            ~8% / 92%
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Upstream preparation remains structurally under-funded
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Blended structures
          </div>
          <div className="font-mono-num mt-2 text-3xl font-bold text-teal-300">
            ~34%
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Of closed deals used a concessional or grant layer
          </p>
        </div>
      </div>

      {/* Flows by Instrument */}
      <div>
        <h3 className="font-display mb-4 text-xl font-medium text-slate-100">
          Flows by instrument
        </h3>
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0b1424] p-6">
          {FLOW_INSTRUMENTS.map((f) => (
            <div key={f.name}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-slate-200">{f.name}</span>
                <strong className="font-mono-num text-slate-100">{f.pct}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Structural Drivers */}
      <div>
        <h3 className="font-display mb-4 text-xl font-medium text-slate-100">
          Why capital goes where it goes
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FLOW_DRIVERS.map((d) => (
            <div
              key={d.title}
              className="rounded-xl border border-white/10 bg-[#0b1424] p-5"
            >
              <h4 className="text-sm font-semibold text-slate-100">{d.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {d.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Transactions */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-medium text-slate-100">
            Sample transactions
          </h3>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b1424] p-1">
            {['all', 'Closed', 'Implementation', 'Preparation'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-teal-400/20 text-teal-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1424]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Providers</th>
                <th className="px-4 py-3">Structure</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filteredTxns.map((t) => (
                <tr key={t.project} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-slate-100">
                    {t.project}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{t.country}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {t.providers}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {t.structure}
                  </td>
                  <td className="font-mono-num px-4 py-3 font-semibold text-slate-100">
                    {t.amount}
                  </td>
                  <td className="font-mono-num px-4 py-3 text-slate-400">
                    {t.year}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-xs font-semibold ${
                      statusTone[t.status] || 'text-slate-300'
                    }`}
                  >
                    {t.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
