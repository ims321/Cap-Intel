import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { STAGE_LABEL, STAGE_ORDER } from '../data/capitalData';
import type { CapitalProvider, Project, TabId } from '../types/capital';
import { generateProjectBriefPdf } from '../utils/briefPdf';
import { buildProjectBrief } from '../utils/projectBrief';
import { EvidenceText, ReadinessMeter, SeverityText } from './SharedUI';

interface ProjectBriefModalProps {
  project: Project | null;
  capitalProviders: CapitalProvider[];
  onClose: () => void;
  onOpenWorkspace: (projectId: string) => void;
  onViewMatches: (projectId: string) => void;
  onNavigateTab: (tab: TabId) => void;
}

export function ProjectBriefModal({
  project,
  capitalProviders,
  onClose,
  onOpenWorkspace,
  onViewMatches,
  onNavigateTab,
}: ProjectBriefModalProps) {
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [liveIntel, setLiveIntel] = useState<{
    answer: string;
    sources: Array<{ title: string; uri: string }>;
  } | null>(null);

  useEffect(() => {
    setLiveIntel(null);
    setLiveError(null);
    setPdfNotice(null);
    setLiveLoading(false);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project, onClose]);

  const brief = useMemo(
    () => (project ? buildProjectBrief(project, capitalProviders) : null),
    [project, capitalProviders]
  );

  if (!project || !brief) return null;

  const handleDownloadBrief = () => {
    const blob = new Blob([brief.plainTextReport], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.referenceCode.toLowerCase()}-executive-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintBrief = () => {
    try {
      generateProjectBriefPdf(project, brief);
      setPdfNotice(`Saved ${brief.referenceCode.toLowerCase()}-executive-brief.pdf`);
      setTimeout(() => setPdfNotice(null), 4000);
    } catch {
      setLiveError('Unable to generate PDF in this browser session.');
    }
  };

  const handleFetchLiveIntel = async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/official-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${project.name} ${project.jurisdiction} financing tender DFI co-financing status`,
          scope: 'projects',
          country: project.jurisdiction,
          sector: project.sector,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLiveError(
          data?.error || 'Unable to retrieve live web intelligence for this project.'
        );
      } else {
        setLiveIntel(data);
      }
    } catch {
      setLiveError('Network error connecting to live intelligence endpoint.');
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brief-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-6 print:static print:bg-white print:p-0"
    >
      <div className="my-4 w-full max-w-5xl rounded-2xl border border-white/15 bg-[#0a1424] shadow-2xl print:my-0 print:max-w-none print:border-0 print:bg-white print:text-slate-900 print:shadow-none">
        {/* Sticky Institutional Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-white/10 bg-[#08111e]/95 px-6 py-4 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <span className="font-mono-num text-xs font-semibold uppercase tracking-wider text-teal-300">
              Investment Committee One-Pager Brief · {brief.referenceCode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFetchLiveIntel}
              disabled={liveLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-400/15 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-400/25 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {liveLoading ? 'Fetching Live Brief Intel…' : 'Enrich with Live Search'}
            </button>
            <button
              type="button"
              onClick={handleDownloadBrief}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export Brief
            </button>
            <button
              type="button"
              onClick={handlePrintBrief}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/15 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-400/25"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {pdfNotice ? 'PDF Downloaded' : 'Print / Save PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Executive Brief"
              className="rounded-lg border border-white/10 px-2.5 py-1 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              × Close
            </button>
          </div>
        </div>
        {pdfNotice && (
          <div className="border-b border-teal-400/20 bg-teal-400/10 px-6 py-2 text-xs font-medium text-teal-200">
            {pdfNotice} — ready to print or circulate to Investment Committee.
          </div>
        )}

        {/* Executive One-Pager+ Document Body */}
        <div className="space-y-7 p-6 sm:p-8">
          {/* Header Block */}
          <header className="border-b border-white/12 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-amber-300/15 px-2 py-0.5 font-semibold text-amber-300">
                    {brief.classification}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{project.jurisdiction}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{project.sector}</span>
                </div>

                <h2
                  id="brief-modal-title"
                  className="font-display text-2xl font-medium tracking-tight text-slate-50 sm:text-3xl"
                >
                  {project.name}
                </h2>

                {project.authorityName && (
                  <p className="text-xs text-slate-400">
                    Implementing / Registry Authority:{' '}
                    <span className="font-semibold text-slate-200">
                      {project.authorityName}
                    </span>
                    {project.agendaAlignment ? ` · ${project.agendaAlignment}` : ''}
                  </p>
                )}
              </div>

              <ReadinessMeter score={project.readiness} />
            </div>

            {/* Key Deal Metrics Strip */}
            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#07101d] p-4 sm:grid-cols-5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Headline Capex
                </dt>
                <dd className="font-mono-num mt-1 text-base font-bold text-slate-50">
                  {brief.capexFormatted}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Current Stage
                </dt>
                <dd className="mt-1 text-sm font-semibold text-teal-300">
                  {STAGE_LABEL[project.stage]} ({brief.completedStageCount}/6 done)
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Readiness Tier
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">
                  {brief.readinessTier}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Open Gaps
                </dt>
                <dd className="font-mono-num mt-1 text-sm font-bold text-amber-300">
                  {project.gaps.filter((g) => g.status !== 'Closed').length} tracked
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Last Verified
                </dt>
                <dd className="font-mono-num mt-1 text-sm font-semibold text-slate-300">
                  {project.updated}
                </dd>
              </div>
            </dl>
          </header>

          {/* Optional Live Grounded Intelligence Callout */}
          {liveError && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200">
              {liveError}
            </div>
          )}
          {liveIntel && (
            <section className="rounded-xl border border-violet-400/35 bg-violet-400/[0.06] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Live Grounded Intelligence Update (Google Search)</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-200">
                {liveIntel.answer}
              </p>
              {liveIntel.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2.5">
                  {liveIntel.sources.map((s) => (
                    <a
                      key={s.uri}
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-200 hover:bg-violet-400/20"
                    >
                      <span className="max-w-[220px] truncate">{s.title}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 1. Executive Thesis */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              01 · Executive Investment Thesis &amp; Asset Mandate
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">
              {brief.executiveThesis}
            </p>
          </section>

          {/* 2. Indicative Blended Capital Stack & Sources/Uses */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                02 · Indicative Blended Capital Stack &amp; Sources of Funds
              </h3>
              <span className="font-mono-num text-xs text-slate-400">
                Target DSCR Covenant: {brief.targetDscr}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#07101d]">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Capital Tranche &amp; Role</th>
                    <th className="px-4 py-3 text-right">Share</th>
                    <th className="px-4 py-3 text-right">Indicative Size</th>
                    <th className="px-4 py-3">Pricing Benchmark &amp; Tenor</th>
                    <th className="px-4 py-3">Target Real Institutions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {brief.capitalStack.map((row) => (
                    <tr key={row.tranche} className="align-top hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{row.tranche}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {row.roleNote}
                        </div>
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right font-semibold text-teal-300">
                        {row.sharePct}%
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right font-semibold text-slate-100 whitespace-nowrap">
                        {brief.currencyLabel} {row.amountM.toFixed(1)}m
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        <div>{row.pricingBenchmark}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {row.tenorSummary}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {row.candidateProviders.join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-relaxed text-slate-200">
              <strong className="text-amber-200">Currency &amp; FX Mismatch Protocol: </strong>
              {brief.fxRiskAssessment}
            </div>
          </section>

          {/* 3. Lifecycle Progression & Statutory Legal Authority */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-[#07101d] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>03 · Statutory &amp; Legal Borrowing Authority</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {brief.legalProfile.summary}
              </p>
              <div className="mt-3 divide-y divide-white/8">
                {brief.legalProfile.rules.slice(0, 4).map((rule) => (
                  <div key={rule.q} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{rule.q}</span>
                      <span className="font-mono-num rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                        {rule.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-teal-300">{rule.cite}</div>
                    <p className="mt-0.5 text-[11px] text-slate-400">{rule.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#07101d] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <span>04 · Socioeconomic &amp; Lifecycle Snapshot</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 border-b border-white/10 pb-4">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Peak Annual Jobs
                  </dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-slate-100">
                    {brief.impact.peakAnnualJobs.toLocaleString()}
                  </dd>
                  <dd className="text-[10px] text-slate-400">
                    {brief.impact.permanentOpsJobs.toLocaleString()} permanent O&amp;M
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    10Y GDP Impact
                  </dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-teal-300">
                    {brief.currencyLabel} {brief.impact.cumulativeGdpM.toFixed(0)}m
                  </dd>
                  <dd className="text-[10px] text-slate-400">
                    {brief.impact.effectiveGdpMultiplier.toFixed(2)}× capex multiplier
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    10Y Fiscal Uplift
                  </dt>
                  <dd className="font-mono-num mt-1 text-base font-bold text-amber-300">
                    {brief.currencyLabel} {brief.impact.cumulativeFiscalReturnM.toFixed(1)}m
                  </dd>
                  <dd className="text-[10px] text-slate-400">
                    {brief.impact.householdsReached.toLocaleString()} households
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  6-Stage Gate Status (Active: {brief.activeStageName})
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {STAGE_ORDER.map((k, idx) => {
                    const st = project.stages.find((s) => s.key === k);
                    const status = st?.status || (k === project.stage ? 'active' : 'pending');
                    return (
                      <div
                        key={k}
                        className={`rounded border px-2 py-1.5 text-center text-[10px] font-semibold ${
                          status === 'complete'
                            ? 'border-teal-400/40 bg-teal-400/15 text-teal-200'
                            : status === 'active'
                              ? 'border-amber-300/50 bg-amber-300/15 text-amber-200'
                              : 'border-white/10 bg-white/[0.02] text-slate-500'
                        }`}
                      >
                        <div>0{idx + 1}</div>
                        <div className="truncate">{STAGE_LABEL[k]}</div>
                      </div>
                    );
                  })}
                </div>
                {brief.pendingActivities.length > 0 && (
                  <p className="mt-2.5 text-xs text-slate-300">
                    <strong className="text-slate-100">Next gate deliverables: </strong>
                    {brief.pendingActivities.join(' · ')}
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* 5. Bankability Risk Register */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              05 · Bankability Gap &amp; Mitigation Register
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#07101d]">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5">Identified Gap</th>
                    <th className="px-4 py-2.5">Severity</th>
                    <th className="px-4 py-2.5">Gate</th>
                    <th className="px-4 py-2.5">Designated Remedy</th>
                    <th className="px-4 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {brief.criticalAndOpenGaps.map((g) => (
                    <tr key={g.gap}>
                      <td className="px-4 py-2.5 font-medium text-slate-100">{g.gap}</td>
                      <td className="px-4 py-2.5">
                        <SeverityText severity={g.severity} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{g.stage}</td>
                      <td className="px-4 py-2.5 text-slate-300">{g.remedy}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-200">
                        {g.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. Pre-Screened Institutional Counterparties */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              06 · Pre-Screened Real Institutional Capital Counterparties (Top {brief.matchedProviders.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brief.matchedProviders.map(({ provider, score, overlookedHighlight }) => (
                <div
                  key={provider.id}
                  className="rounded-xl border border-white/10 bg-[#07101d] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] font-semibold text-violet-300">
                      {provider.category}
                    </div>
                    <span className="font-mono-num rounded bg-teal-400/15 px-2 py-0.5 text-[11px] font-bold text-teal-300">
                      {score}/100
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span>{provider.name}</span>
                  </div>
                  <div className="font-mono-num mt-1 text-[11px] text-slate-400">
                    {provider.type} · {provider.ticket} ({provider.currency})
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                    {provider.legal}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/8 pt-2">
                    <EvidenceText level={provider.confidence} />
                    {overlookedHighlight && (
                      <span className="text-[10px] font-semibold text-amber-300">
                        {provider.nontraditionalTag || 'Catalytic Window'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. 90-Day Transaction Execution Roadmap */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              07 · 90-Day Transaction Execution Roadmap
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {brief.roadmap.map((phase) => (
                <div
                  key={phase.horizon}
                  className="rounded-xl border border-white/10 bg-[#07101d] p-4"
                >
                  <div className="font-mono-num text-xs font-bold text-amber-300">
                    {phase.horizon}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-100">
                    {phase.title}
                  </div>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-slate-300">
                    {phase.deliverables.map((d) => (
                      <li key={d} className="flex items-start gap-1.5">
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300"
                          aria-hidden="true"
                        />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Footer Action Bar */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-5 print:hidden">
            <p className="max-w-xl text-[11px] text-slate-400">
              Decision-support Investment Brief generated from verified institutional facility
              mandates and jurisdiction rules. Confirm final terms with formal due diligence and local
              legal counsel.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('legal');
                }}
                className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Check Legal Authority
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewMatches(project.id);
                }}
                className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Open Capital Matches
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWorkspace(project.id);
                }}
                className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
              >
                Open Project Workspace
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
