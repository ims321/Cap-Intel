import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Database,
  Download,
  Globe2,
  Landmark,
  Plus,
} from 'lucide-react';
import { STAGE_LABEL } from '../data/capitalData';
import { OFFICIAL_PIPELINE_SOURCES } from '../data/continentalProjects';
import type {
  CapitalProvider,
  EpcContractor,
  Project,
  Role,
  TabId,
} from '../types/capital';
import { getCurrencySymbol } from '../utils/currencies';
import { fmtM } from '../utils/finance';
import {
  matchesJurisdictionScope,
  resolveJurisdictionScope,
  scoreRoleProjectFit,
} from '../utils/strategyEngine';
import { ReadinessMeter, SectionHeader } from './SharedUI';

interface ProjectsViewProps {
  projects: Record<string, Project>;
  workspaceProjectIds: string[];
  activeProjectId: string;
  role: Role;
  jurisdiction: string;
  capitalProviders: CapitalProvider[];
  epcContractors: EpcContractor[];
  onOpenBrief: (id: string) => void;
  onAddToWorkspace: (id: string, openImmediately?: boolean) => void;
  onViewMatches: (id: string) => void;
  onOpenEngageProject: (id: string, name: string) => void;
  onExploreProviderKeyword: (keyword: string) => void;
  onOpenNewProject: () => void;
  onNavigate?: (tab: TabId) => void;
}

type OriginFilter =
  | 'all'
  | 'local'
  | 'AU Agenda 2063 / PIDA'
  | 'Multilateral / DFI'
  | 'National Official Agency';

const RECS = [
  'all',
  'SADC',
  'EAC',
  'ECOWAS',
  'COMESA',
  'ECCAS',
  'North Africa',
  'Continental',
];

export function ProjectsView({
  projects,
  workspaceProjectIds,
  activeProjectId,
  role,
  jurisdiction,
  capitalProviders,
  epcContractors,
  onOpenBrief,
  onAddToWorkspace,
  onViewMatches,
  onOpenEngageProject,
  onExploreProviderKeyword,
  onOpenNewProject,
  onNavigate,
}: ProjectsViewProps) {
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [rec, setRec] = useState('all');
  const [sector, setSector] = useState('all');
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');
  const [fitLens, setFitLens] = useState<Role>(role);
  const [scopeToJurisdiction, setScopeToJurisdiction] = useState(false);

  useEffect(() => {
    setFitLens(role);
  }, [role]);

  const scopeInfo = useMemo(
    () => resolveJurisdictionScope(jurisdiction),
    [jurisdiction]
  );

  const allProjects = useMemo(() => Object.values(projects), [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      const originMatch =
        originFilter === 'all'
          ? true
          : originFilter === 'local'
            ? !p.sourceCategory
            : p.sourceCategory === originFilter;
      const recMatch = rec === 'all' || p.rec === rec;
      const sectorMatch =
        sector === 'all' || p.sector.toLowerCase().includes(sector.toLowerCase());
      const stageMatch = stage === 'all' || p.stage === stage;
      const geoMatch =
        !scopeToJurisdiction || matchesJurisdictionScope(p, jurisdiction);
      const hay = `${p.name} ${p.jurisdiction} ${p.sector} ${p.authorityName || ''} ${p.desc} ${p.agendaAlignment || ''}`.toLowerCase();
      return (
        originMatch &&
        recMatch &&
        sectorMatch &&
        stageMatch &&
        geoMatch &&
        (!q || hay.includes(q))
      );
    });
  }, [
    allProjects,
    originFilter,
    rec,
    sector,
    stage,
    scopeToJurisdiction,
    jurisdiction,
    search,
  ]);

  const counts = useMemo(
    () => ({
      all: allProjects.length,
      local: allProjects.filter((p) => !p.sourceCategory).length,
      au: allProjects.filter((p) => p.sourceCategory === 'AU Agenda 2063 / PIDA')
        .length,
      dfi: allProjects.filter((p) => p.sourceCategory === 'Multilateral / DFI')
        .length,
      nat: allProjects.filter(
        (p) => p.sourceCategory === 'National Official Agency'
      ).length,
    }),
    [allProjects]
  );

  const handleExportCSV = () => {
    const headers = [
      'id',
      'name',
      'sourceCategory',
      'authorityName',
      'jurisdiction',
      'rec',
      'sector',
      'stage',
      'capex',
      'currency',
      'readiness',
      'updated',
    ];
    const escapeCell = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replaceAll('"', '""')}"`
        : s;
    };
    const rows = [
      headers.join(','),
      ...filtered.map((p) =>
        [
          p.id,
          p.name,
          p.sourceCategory || 'Municipal / Custom',
          p.authorityName || '',
          p.jurisdiction,
          p.rec || '',
          p.sector,
          p.stage,
          p.capex,
          p.currency,
          p.readiness,
          p.updated,
        ]
          .map(escapeCell)
          .join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects-database.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="projects-heading" className="space-y-6">
      <SectionHeader
        title="Projects database"
        hint="Unified repository of municipal, national agency, AU Agenda 2063 / PIDA, and multilateral DFI projects with role-specific fit scoring across Borrowers, Capital Providers, and Developer / EPCs"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
            {role === 'borrower' && (
              <button
                type="button"
                data-testid="borrower-intake-wizard-btn"
                onClick={onOpenNewProject}
                className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 whitespace-nowrap shrink-0"
              >
                + Project Intake Wizard
              </button>
            )}
          </div>
        }
      />

      {/* Origin Summary Tiles (Includes folded AU & DFI sources) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setOriginFilter('all')}
          className={`rounded-xl border p-4 text-left transition-colors ${
            originFilter === 'all'
              ? 'border-teal-400 bg-teal-400/12'
              : 'border-white/10 bg-[#0b1424] hover:border-white/20'
          }`}
        >
          <div className="font-mono-num text-2xl font-bold text-slate-100">
            {counts.all}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Database className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
            <span>All database records</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOriginFilter('local')}
          className={`rounded-xl border p-4 text-left transition-colors ${
            originFilter === 'local'
              ? 'border-teal-400 bg-teal-400/12'
              : 'border-white/10 bg-[#0b1424] hover:border-white/20'
          }`}
        >
          <div className="font-mono-num text-2xl font-bold text-slate-100">
            {counts.local}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
            <span>Municipal / Custom</span>
          </div>
        </button>

        {OFFICIAL_PIPELINE_SOURCES.map((src) => {
          const count =
            src === 'AU Agenda 2063 / PIDA'
              ? counts.au
              : src === 'Multilateral / DFI'
                ? counts.dfi
                : counts.nat;
          const active = originFilter === src;
          return (
            <button
              key={src}
              type="button"
              onClick={() => setOriginFilter(src)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-teal-400 bg-teal-400/12'
                  : 'border-white/10 bg-[#0b1424] hover:border-white/20'
              }`}
            >
              <div className="font-mono-num text-2xl font-bold text-slate-100">
                {count}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                {src === 'AU Agenda 2063 / PIDA' ? (
                  <Landmark className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                ) : src === 'Multilateral / DFI' ? (
                  <Globe2 className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                )}
                <span className="truncate">{src}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Fit Lens + Jurisdiction Scope + Multi-Filter Bar */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#0b1424] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Evaluate fit as:
            </span>
            <div
              role="group"
              aria-label="Evaluate project fit by role category"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#07101d] p-0.5"
            >
              {(
                [
                  { id: 'borrower', label: 'Borrower Fit' },
                  { id: 'provider', label: 'Capital Provider Fit' },
                  { id: 'epc', label: 'Developer / EPC Fit' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFitLens(item.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    fitLens === item.id
                      ? 'bg-teal-400/20 text-teal-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!scopeInfo.isContinental && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={scopeToJurisdiction}
                onChange={(e) => setScopeToJurisdiction(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-teal-400"
              />
              <span>
                Only show projects in{' '}
                <strong className="text-teal-300">{scopeInfo.countryName}</strong>
              </span>
            </label>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            aria-label="Search projects database"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, country, agency, corridor..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />

          <select
            aria-label="Filter by Regional Economic Community"
            value={rec}
            onChange={(e) => setRec(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            {RECS.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All African regions / RECs' : r}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="all">All infrastructure sectors</option>
            <option value="Water">Water &amp; sanitation</option>
            <option value="Renewable energy">Renewable energy</option>
            <option value="Transport">Transport / logistics</option>
            <option value="Climate">Climate adaptation</option>
          </select>

          <select
            aria-label="Filter by lifecycle stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="all">All lifecycle stages</option>
            <option value="concept">Concept</option>
            <option value="feasibility">Feasibility</option>
            <option value="structuring">Structuring</option>
            <option value="transaction">Transaction</option>
            <option value="construction">Construction</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span className="font-mono-num">
          Showing {filtered.length} of {allProjects.length} projects
          {scopeToJurisdiction && !scopeInfo.isContinental
            ? ` · scoped strictly to ${scopeInfo.countryName}`
            : ''}
        </span>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('workspace')}
            className="font-semibold text-teal-300 hover:text-teal-200"
          >
            Open Active Workspace ({workspaceProjectIds.length}) →
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-10 text-center">
          <h3 className="text-base font-semibold text-slate-100">
            No projects match your current filters
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Reset filters or disable strict jurisdiction scoping to see continental opportunities.
          </p>
          <button
            type="button"
            onClick={() => {
              setOriginFilter('all');
              setRec('all');
              setSector('all');
              setStage('all');
              setSearch('');
              setScopeToJurisdiction(false);
            }}
            className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((p) => {
            const inWorkspace = workspaceProjectIds.includes(p.id);
            const isCurrent = p.id === activeProjectId && inWorkspace;
            const roleFit = scoreRoleProjectFit(
              p,
              fitLens,
              epcContractors,
              capitalProviders
            );
            const openGapCount = p.gaps.filter((g) => g.status !== 'Closed').length;

            return (
              <article
                key={p.id}
                className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
                  isCurrent
                    ? 'border-teal-400/40 bg-[#0d192b]'
                    : 'border-white/10 bg-[#0b1424] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{p.jurisdiction}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.sector}</span>
                        {p.sourceCategory && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-300">
                              {p.sourceCategory}
                              {p.rec ? ` (${p.rec})` : ''}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1.5 text-lg font-semibold text-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenBrief(p.id)}
                          className="text-left transition-colors hover:text-teal-300"
                        >
                          {p.name}
                        </button>
                      </h3>
                      {(p.authorityName || p.cojEntity) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {p.cojEntity ? (
                            <span className="font-semibold text-amber-300">
                              CoJ Entity: {p.cojEntity}
                              {p.mfmaClassification ? ` · ${p.mfmaClassification.split('·')[0].trim()}` : ''}
                            </span>
                          ) : (
                            <span>Authority: {p.authorityName}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <ReadinessMeter score={p.readiness} />
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{p.desc}</p>

                  {/* Role-Specific Fit Readout */}
                  <div className="mt-4 rounded-lg border border-white/8 bg-[#08111e] p-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-teal-300">
                        {fitLens === 'epc'
                          ? 'Developer / EPC Consortium Fit'
                          : fitLens === 'provider'
                            ? 'Capital Provider Mandate Fit'
                            : 'Borrower Readiness Fit'}
                        : {roleFit.fitTier}
                      </span>
                      <span className="font-mono-num font-semibold text-slate-200">
                        {roleFit.score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300">{roleFit.headline}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {fitLens === 'epc' ? 'Matched EPC leads: ' : 'Top capital matches: '}
                      {roleFit.topCounterparties.join(', ')}
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-4 gap-3 border-y border-white/8 py-3">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Stage
                      </dt>
                      <dd className="mt-1 text-xs font-semibold text-slate-100">
                        {STAGE_LABEL[p.stage]}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Capex
                      </dt>
                      <dd className="font-mono-num mt-1 text-xs font-semibold text-slate-100">
                        {getCurrencySymbol(p.currency)}
                        {fmtM(p.capex)}m
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Gaps
                      </dt>
                      <dd className="font-mono-num mt-1 text-xs font-semibold text-amber-300">
                        {openGapCount} open
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Updated
                      </dt>
                      <dd className="font-mono-num mt-1 text-xs font-semibold text-slate-300">
                        {p.updated}
                      </dd>
                    </div>
                  </dl>

                  {p.recommendedOverlookedCapital &&
                    p.recommendedOverlookedCapital.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Catalytic windows:
                        </span>
                        {p.recommendedOverlookedCapital.map((cap, idx) => (
                          <React.Fragment key={cap}>
                            <button
                              type="button"
                              onClick={() => onExploreProviderKeyword(cap)}
                              className="font-medium text-teal-300 hover:underline"
                            >
                              {cap}
                            </button>
                            {idx < p.recommendedOverlookedCapital!.length - 1 && (
                              <span aria-hidden="true">·</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpenBrief(p.id)}
                    className="rounded-lg border border-teal-400/45 bg-teal-400/12 px-3 py-2 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-400/20 whitespace-nowrap shrink-0"
                  >
                    Executive Brief
                  </button>

                  {inWorkspace ? (
                    <button
                      type="button"
                      onClick={() => onAddToWorkspace(p.id, true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300 whitespace-nowrap shrink-0"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      In Workspace · Open
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToWorkspace(p.id, false)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300 whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add to Workspace
                    </button>
                  )}

                  {fitLens === 'borrower' ? (
                    <button
                      type="button"
                      onClick={() => onViewMatches(p.id)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      View matches
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenEngageProject(p.id, p.name)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/5 whitespace-nowrap shrink-0"
                    >
                      {fitLens === 'epc' ? 'Propose EPC Consortium' : 'Express Interest'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
