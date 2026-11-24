import React, { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Layers, Trash2 } from 'lucide-react';
import { STAGE_LABEL, STAGE_ORDER } from '../data/capitalData';
import type {
  CapitalProvider,
  EpcContractor,
  GapStatus,
  LineFunctionDept,
  LineFunctionTask,
  Project,
  ProjectStage,
  Role,
  TabId,
  UploadedProjectDoc,
} from '../types/capital';
import { getCurrencySymbol } from '../utils/currencies';
import { formatBytes } from '../utils/fileHash';
import { fmtM } from '../utils/finance';
import {
  computePooledSpvSummary,
  scoreEpcProjectFit,
  type PooledSpvResult,
} from '../utils/strategyEngine';
import { ImpactDashboard } from './ImpactDashboard';
import { LineFunctionPanel } from './LineFunctionPanel';
import { EvidenceText, ReadinessMeter, SectionHeader, SeverityText } from './SharedUI';

interface WorkspaceViewProps {
  role: Role;
  projects: Record<string, Project>;
  workspaceProjectIds: string[];
  activeProjectId: string;
  focusedLineDept?: LineFunctionDept | null;
  onSelectProject: (id: string) => void;
  onRemoveFromWorkspace: (id: string) => void;
  capitalProviders: CapitalProvider[];
  epcContractors: EpcContractor[];
  onOpenBrief: (projectId: string) => void;
  onOpenNewProject?: () => void;
  onToggleActivity: (projectId: string, stageKey: string, activity: string) => void;
  onCycleGapStatus: (projectId: string, gapIndex: number) => void;
  onUpdateLineFunctionTask?: (
    projectId: string,
    dept: LineFunctionDept,
    updatedTask: LineFunctionTask,
    attachedDoc?: UploadedProjectDoc
  ) => void;
  onNavigate: (tab: TabId) => void;
  onToast?: (msg: string) => void;
  onCreatePooledSpv?: (pool: PooledSpvResult, selectedProjects: Project[]) => void;
}

export function WorkspaceView({
  role,
  projects,
  workspaceProjectIds,
  activeProjectId,
  focusedLineDept,
  onSelectProject,
  onRemoveFromWorkspace,
  capitalProviders,
  epcContractors,
  onOpenBrief,
  onOpenNewProject,
  onToggleActivity,
  onCycleGapStatus,
  onUpdateLineFunctionTask,
  onNavigate,
  onToast,
  onCreatePooledSpv,
}: WorkspaceViewProps) {
  const workingProjects = workspaceProjectIds
    .map((id) => projects[id])
    .filter((p): p is Project => Boolean(p));

  const poolCandidates = useMemo(() => {
    const workingSet = new Set(workingProjects.map((p) => p.id));
    const extras = Object.values(projects).filter(
      (p) => !workingSet.has(p.id) && !p.id.startsWith('pool-')
    );
    return [...workingProjects, ...extras].slice(0, 6);
  }, [projects, workingProjects]);

  const [poolSelectedIds, setPoolSelectedIds] = useState<string[]>(() =>
    workingProjects.slice(0, 2).map((p) => p.id)
  );
  const [firstLossPct, setFirstLossPct] = useState<number>(20);

  const selectedPoolProjects = useMemo(
    () => poolCandidates.filter((p) => poolSelectedIds.includes(p.id)),
    [poolCandidates, poolSelectedIds]
  );

  const poolSummary = useMemo(
    () => computePooledSpvSummary(selectedPoolProjects, firstLossPct),
    [selectedPoolProjects, firstLossPct]
  );

  const togglePoolCandidate = (id: string) => {
    setPoolSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const project =
    workingProjects.find((p) => p.id === activeProjectId) || workingProjects[0];

  const stages: ProjectStage[] =
    project && project.stages.length > 0
      ? project.stages
      : STAGE_ORDER.map((key) => ({
          name: STAGE_LABEL[key],
          key,
          status:
            project && key === project.stage
              ? 'active'
              : project &&
                  STAGE_ORDER.indexOf(key) < STAGE_ORDER.indexOf(project.stage)
                ? 'complete'
                : 'pending',
          activities: ['Stage scoping & institutional alignment'],
          completedActivities: [],
          outputs: 'Draft baseline captured in session.',
        }));

  const defaultStageIndex = Math.max(
    0,
    stages.findIndex((s) => s.status === 'active')
  );
  const [selectedStageIdx, setSelectedStageIdx] = useState(defaultStageIndex);

  useEffect(() => {
    setSelectedStageIdx(
      Math.max(
        0,
        stages.findIndex((s) => s.status === 'active')
      )
    );
  }, [project?.id]);

  if (workingProjects.length === 0 || !project) {
    return (
      <section aria-labelledby="workspace-empty-heading" className="space-y-6">
        <SectionHeader
          title="My Project Workspace"
          hint="Only projects you are actively structuring appear here"
        />
        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-12 text-center">
          <h2
            id="workspace-empty-heading"
            className="font-display text-2xl font-medium text-slate-100"
          >
            Your working portfolio is empty
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Browse the Projects database or Public Data Observatory to add specific projects you
            are working on into your personal workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Browse Projects database
            </button>
            <button
              type="button"
              onClick={() => onNavigate('publicdata')}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              Originate from Public Data
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentStage = stages[selectedStageIdx] || stages[0];
  const stageFunding = capitalProviders
    .filter((c) => c.stages.includes(currentStage.key))
    .slice(0, 4);

  const matchedEpcs = epcContractors
    .map((epc) => ({ epc, score: scoreEpcProjectFit(project, epc) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const openGaps = project.gaps.filter((g) => g.status !== 'Closed').length;
  const criticalGaps = project.gaps.filter(
    (g) => g.severity === 'critical' && g.status !== 'Closed'
  ).length;

  const gapButtonTone: Record<GapStatus, string> = {
    Open: 'border-rose-400/30 text-rose-200 hover:bg-rose-400/10',
    'In progress': 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10',
    Closed: 'border-teal-400/30 text-teal-200 hover:bg-teal-400/10',
  };

  return (
    <section aria-labelledby="workspace-heading" className="min-w-0 space-y-8 overflow-x-hidden">
      {/* Focused Working Portfolio Selector (ONLY user's active working projects) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              My Active Working Projects ({workingProjects.length})
            </h2>
            <p className="text-xs text-slate-500">
              Select a project below to open its full 6-stage checklist, bankability gaps, and
              consortium matches.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === 'borrower' && onOpenNewProject && (
              <button
                type="button"
                onClick={onOpenNewProject}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
              >
                + Project Intake Wizard
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/10 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-400/20 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Add from Projects database
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workingProjects.map((wp) => {
            const isSelected = wp.id === project.id;
            return (
              <div
                key={wp.id}
                className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border p-3.5 transition-colors ${
                  isSelected
                    ? 'border-teal-400 bg-[#0d1d33]'
                    : 'border-white/10 bg-[#0b1424] hover:border-white/25'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectProject(wp.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-semibold text-slate-100">
                    {wp.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {wp.jurisdiction} ·{' '}
                    <span className="font-mono-num text-teal-300">
                      {getCurrencySymbol(wp.currency)}
                      {fmtM(wp.capex)}m
                    </span>{' '}
                    · {STAGE_LABEL[wp.stage]}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFromWorkspace(wp.id)}
                  aria-label={`Remove ${wp.name} from workspace`}
                  title="Remove from working portfolio"
                  className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Working Project Detail Header */}
      <div className="rounded-xl border border-white/10 bg-[#0b1424] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                {project.cojEntity
                  ? `${project.cojEntity}`
                  : project.sourceCategory
                    ? `${project.sourceCategory} · ${project.authorityName}`
                    : 'Municipal / Sub-Sovereign Mandate'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{project.jurisdiction}</span>
              <span aria-hidden="true">·</span>
              <span>{project.sector}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {getCurrencySymbol(project.currency)}
                {fmtM(project.capex)}m
              </span>
            </div>
            <h2
              id="workspace-heading"
              className="font-display text-2xl font-medium text-slate-100"
            >
              {project.name}
            </h2>
            {(project.mfmaClassification || project.gdsPillar || project.greenBondEligible) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
                {project.mfmaClassification && (
                  <span className="font-medium text-amber-300">
                    {project.mfmaClassification}
                  </span>
                )}
                {project.gdsPillar && (
                  <span className="text-slate-300">{project.gdsPillar}</span>
                )}
                {project.greenBondEligible && (
                  <span className="font-semibold text-emerald-300">
                    ICMA Green Bond Eligible
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenBrief(project.id)}
              className="rounded-lg border border-teal-400/45 bg-teal-400/15 px-3.5 py-2 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-400/25 whitespace-nowrap shrink-0"
            >
              Executive Brief (1-Pager)
            </button>
            <ReadinessMeter score={project.readiness} />
          </div>
        </div>
      </div>

      {/* 6-Stage Lifecycle Stepper */}
      <div>
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            Project Lifecycle Stages
          </span>
          <span>Click any stage to inspect deliverables &amp; stage-matched capital</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s, idx) => {
            const isSelected = idx === selectedStageIdx;
            const statusLabel =
              s.status === 'complete'
                ? 'Complete'
                : s.status === 'active'
                  ? 'In progress'
                  : 'Not started';
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedStageIdx(idx)}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-teal-400 bg-teal-400/10'
                    : s.status === 'complete'
                      ? 'border-teal-400/25 bg-teal-400/[0.04] hover:border-teal-400/45'
                      : 'border-white/10 bg-[#0b1424] hover:border-white/20'
                }`}
              >
                <span className="font-mono-num text-[11px] font-semibold text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="mt-1 text-xs font-semibold text-slate-100">
                  {s.name}
                </span>
                <span
                  className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${
                    s.status === 'complete' || s.status === 'active'
                      ? 'text-teal-300'
                      : 'text-slate-500'
                  }`}
                >
                  {statusLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Activities + Stage-Matched Capital & EPCs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#0b1424] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Stage {selectedStageIdx + 1}: {currentStage.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Check off completed deliverables to update workspace progress.
          </p>

          <ul className="mt-4 divide-y divide-white/8">
            {currentStage.activities.map((act) => {
              const checked = (currentStage.completedActivities || []).includes(act);
              return (
                <li key={act} className="py-2.5">
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200 hover:text-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onToggleActivity(project.id, currentStage.key, act)
                      }
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-teal-400"
                    />
                    <span className={checked ? 'line-through text-slate-400' : ''}>
                      {act}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-lg border border-teal-400/20 bg-teal-400/[0.05] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              Output status
            </h4>
            <p className="mt-1.5 text-sm text-slate-300">
              {currentStage.outputs || '—'}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4 rounded-xl border border-white/10 bg-[#0b1424] p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stage-matched capital ({STAGE_LABEL[currentStage.key]})
            </p>
            <button
              type="button"
              onClick={() => onNavigate('matches')}
              className="text-xs font-semibold text-teal-300 hover:text-teal-200 whitespace-nowrap shrink-0"
            >
              View all matches →
            </button>
          </div>

          <div className="space-y-2.5">
            {stageFunding.length > 0 ? (
              stageFunding.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-white/8 bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm font-semibold text-slate-100">
                      {c.name}
                    </strong>
                    <EvidenceText level={c.confidence} />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {c.type} <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono-num">{c.ticket}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                No capital facilities matched directly to this stage.
              </p>
            )}
          </div>

          <div className="border-t border-white/8 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Top matched Developer / EPC Consortiums
              </p>
              <button
                type="button"
                onClick={() => onNavigate('epcs')}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap shrink-0"
              >
                Open EPC Directory →
              </button>
            </div>
            <div className="mt-2.5 space-y-2">
              {matchedEpcs.map(({ epc, score }) => (
                <div
                  key={epc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100">
                      {epc.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      {epc.hqCountry} · {epc.bringsCapital ? 'Brings Vendor/Equity Capital' : 'Pure Turnkey EPC'}
                    </div>
                  </div>
                  <span className="font-mono-num shrink-0 font-semibold text-amber-300">
                    {score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bankability Gap Register */}
      <div>
        <SectionHeader
          title="Bankability gap register"
          hint={`${openGaps} open gaps (${criticalGaps} critical) · Click a status button to update progress`}
        />
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1424]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Gap</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Remedy</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {project.gaps.length > 0 ? (
                project.gaps.map((g, idx) => (
                  <tr key={g.gap} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {g.gap}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityText severity={g.severity} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{g.stage}</td>
                    <td className="px-4 py-3 text-slate-300">{g.remedy}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onCycleGapStatus(project.id, idx)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          gapButtonTone[g.status]
                        }`}
                      >
                        {g.status}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No bankability gaps registered yet for this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive-to-Line-Function Technical Collaboration Desk */}
      {onUpdateLineFunctionTask && (
        <LineFunctionPanel
          project={project}
          role={role}
          focusedDept={focusedLineDept}
          onUpdateTask={onUpdateLineFunctionTask}
          onToast={onToast}
        />
      )}

      {/* Uploaded Project Intake & Line-Function Documents */}
      {project.uploadedDocs && project.uploadedDocs.length > 0 && (
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#0b1424] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              Verified Intake &amp; Line-Function Uploads ({project.uploadedDocs.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('dealroom')}
              className="text-xs font-semibold text-teal-300 hover:text-teal-200"
            >
              Inspect in Deal Room Data Room →
            </button>
          </div>
          <div className="divide-y divide-white/8 text-xs">
            {project.uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <span className="text-slate-400">{doc.folder}/</span>
                  <strong className="ml-1 text-slate-100">{doc.name}</strong>
                  <span className="ml-2 text-slate-400">by {doc.uploadedBy}</span>
                </div>
                <div className="font-mono-num text-[11px] text-emerald-300">
                  {formatBytes(doc.sizeBytes)} · sha256:{doc.sha256.slice(0, 14)}…
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Socioeconomic Impact Dashboard */}
      <ImpactDashboard project={project} />

      {/* Pooled Municipal Bond & Regional SPV Aggregator */}
      <div className="min-w-0 rounded-xl border border-white/10 bg-[#0b1424] p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pooled Municipal Bond &amp; Regional SPV Aggregator</span>
            </div>
            <h3 className="font-display mt-1 text-xl font-medium text-slate-100">
              Bundle smaller sub-sovereign mandates to hit the $150m institutional bond floor
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Select 2+ municipal or utility projects and size a GuarantCo / ATIDI / InfraCredit first-loss wrap to quantify coupon compression and create a joint SPV mandate.
            </p>
          </div>
          {onCreatePooledSpv && (
            <button
              type="button"
              disabled={selectedPoolProjects.length < 2}
              onClick={() => onCreatePooledSpv(poolSummary, selectedPoolProjects)}
              className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              + Create Pooled SPV Mandate ({selectedPoolProjects.length})
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-2.5 lg:col-span-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Select Constituent Mandates ({poolCandidates.length} available)
            </div>
            <div className="space-y-2">
              {poolCandidates.map((cand) => {
                const checked = poolSelectedIds.includes(cand.id);
                return (
                  <label
                    key={cand.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                      checked
                        ? 'border-teal-400/50 bg-teal-400/[0.07]'
                        : 'border-white/10 bg-[#08111e] hover:border-white/25'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePoolCandidate(cand.id)}
                        className="h-4 w-4 shrink-0 accent-teal-400"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-100">
                          {cand.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {cand.jurisdiction} · R={cand.readiness}/100
                        </span>
                      </span>
                    </span>
                    <span className="font-mono-num shrink-0 font-semibold text-teal-300">
                      {getCurrencySymbol(cand.currency)}
                      {fmtM(cand.capex)}m {cand.currency}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 space-y-4 rounded-xl border border-white/10 bg-[#08111e] p-4 lg:col-span-6">
            <div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="pool-first-loss" className="font-semibold text-slate-200">
                  GuarantCo / ATIDI First-Loss Credit Wrap
                </label>
                <span className="font-mono-num font-bold text-amber-300">
                  {firstLossPct}% coverage
                </span>
              </div>
              <input
                id="pool-first-loss"
                type="range"
                min={0}
                max={40}
                step={5}
                value={firstLossPct}
                onChange={(e) => setFirstLossPct(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-white/8 bg-[#0b1424] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Pool Size (USD)
                </div>
                <div
                  className={`font-mono-num mt-1 text-base font-bold ${
                    poolSummary.meetsInstitutionalFloor ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  ${poolSummary.totalPoolUsdM.toFixed(1)}m
                </div>
                <div className="text-[10px] text-slate-500">
                  Floor ${poolSummary.institutionalThresholdUsdM}m
                </div>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#0b1424] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Spread Savings
                </div>
                <div className="font-mono-num mt-1 text-base font-bold text-teal-300">
                  -{poolSummary.couponCompressionBps} bps
                </div>
                <div className="text-[10px] text-slate-500">All-in yield drop</div>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#0b1424] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Annual Savings
                </div>
                <div className="font-mono-num mt-1 text-base font-bold text-emerald-300">
                  ${poolSummary.projectedAnnualDebtSavingsUsdM.toFixed(2)}m/yr
                </div>
                <div className="text-[10px] text-slate-500">70% debt share</div>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#0b1424] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Pool Readiness
                </div>
                <div className="font-mono-num mt-1 text-base font-bold text-slate-100">
                  {poolSummary.averageReadiness}/100
                </div>
                <div className="text-[10px] text-slate-500">{poolSummary.projectCount} assets</div>
              </div>
            </div>

            <div className="rounded-lg border border-teal-400/25 bg-teal-400/[0.06] p-3 text-xs">
              <div className="font-semibold text-teal-300">
                {poolSummary.recommendedVehicle}
              </div>
              {poolSummary.constituents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {poolSummary.constituents.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="font-mono-num shrink-0 text-slate-200">
                        ${c.capexUsdM}m ({c.weightPct}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2 text-[11px] text-slate-300">
                {poolSummary.structuringSteps.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Next Action */}
      <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.05] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-teal-300">
                Recommended next action
              </h3>
              <EvidenceText level="inferred" />
            </div>
            <p className="mt-1.5 text-sm text-slate-200">
              {criticalGaps > 0
                ? `Prioritise closing ${criticalGaps} critical bankability gap(s) using preparation grants while verifying municipal borrowing headroom in Legal & compliance.`
                : 'Critical gaps addressed — launch the Scenarios Wizard and shortlist capital + EPC consortium leads in Matches & Deal Rooms.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('legal')}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              Verify legal &amp; EPC compliance
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scenarios')}
              className="rounded-lg bg-teal-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
            >
              Launch Scenarios Wizard
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
