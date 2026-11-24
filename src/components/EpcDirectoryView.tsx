import React, { useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { EPC_CATEGORIES, EPC_CONTRACTORS } from '../data/epcData';
import type { EpcCapability, EpcContractor, Project, TabId } from '../types/capital';
import {
  extractEpcCountries,
  filterEpcContractors,
  resolveJurisdictionScope,
  scoreEpcProjectFit,
} from '../utils/strategyEngine';
import { EvidenceText, SectionHeader } from './SharedUI';

interface EpcDirectoryViewProps {
  epcContractors?: EpcContractor[];
  activeProject?: Project;
  jurisdiction: string;
  onNavigate: (tab: TabId) => void;
  onInviteEpc: (epc: EpcContractor) => void;
  onOpenOnboard?: () => void;
}

const CAPABILITIES: Array<'all' | EpcCapability> = [
  'all',
  'Turnkey EPC',
  'PPP / BOOT Developer',
  'Vendor / ECA Financing',
  'Co-Investment Equity',
  'O&M Operator',
];

const ORIGIN_REGIONS = ['all', 'Africa', 'Europe', 'Asia-Pacific', 'Middle East', 'Americas'];

export function EpcDirectoryView({
  epcContractors,
  activeProject,
  jurisdiction,
  onNavigate,
  onInviteEpc,
  onOpenOnboard,
}: EpcDirectoryViewProps) {
  const directoryList =
    epcContractors && epcContractors.length > 0 ? epcContractors : EPC_CONTRACTORS;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [capability, setCapability] = useState<'all' | EpcCapability>('all');
  const [originRegion, setOriginRegion] = useState('all');
  const [activeCountry, setActiveCountry] = useState('all');
  const [hqCountry, setHqCountry] = useState('all');
  const [bringsCapitalOnly, setBringsCapitalOnly] = useState(false);
  const [matchJurisdiction, setMatchJurisdiction] = useState(false);

  const scope = useMemo(() => resolveJurisdictionScope(jurisdiction), [jurisdiction]);
  const countryFacets = useMemo(() => extractEpcCountries(directoryList), [directoryList]);

  const filtered = useMemo(() => {
    const base = filterEpcContractors(directoryList, {
      search,
      category,
      capability,
      originRegion,
      activeCountry,
      hqCountry,
      onlyBringsCapital: bringsCapitalOnly,
    });
    return base
      .filter((epc) => {
        if (matchJurisdiction && !scope.isContinental) {
          const regHay = epc.activeRegions.join(' ').toLowerCase();
          if (
            !regHay.includes('africa') &&
            !scope.searchTokens.some((tok) => regHay.includes(tok))
          ) {
            return false;
          }
        }
        return true;
      })
      .map((epc) => ({
        epc,
        fitScore: activeProject ? scoreEpcProjectFit(activeProject, epc) : null,
      }));
  }, [
    search,
    category,
    capability,
    originRegion,
    activeCountry,
    hqCountry,
    bringsCapitalOnly,
    matchJurisdiction,
    scope,
    activeProject,
  ]);

  const hasFilters =
    search ||
    category !== 'all' ||
    capability !== 'all' ||
    originRegion !== 'all' ||
    activeCountry !== 'all' ||
    hqCountry !== 'all' ||
    bringsCapitalOnly ||
    matchJurisdiction;

  return (
    <section aria-labelledby="epcs-heading" className="space-y-6">
      <SectionHeader
        title="Developers, EPCs & Turnkey Operators Directory"
        hint={`${directoryList.length} global & regional consortium leads, BOOT developers, and turnkey contractors co-arranging ECA or sponsor capital`}
        action={
          <div className="flex flex-wrap gap-2">
            {onOpenOnboard && (
              <button
                type="button"
                onClick={onOpenOnboard}
                className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
              >
                + Onboard EPC (KYC)
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('legal')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/45 bg-amber-300/12 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20 whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Check Foreign EPC Compliance ({scope.countryName})
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#0b1424] p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="search"
            aria-label="Search EPC contractors and developers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Bechtel, Veolia, Mota-Engil, Scatec, Hyundai..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />

          <select
            aria-label="Filter by EPC specialization category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full max-w-full min-w-0 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="all">All EPC &amp; Developer Categories</option>
            {EPC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by consortium capability"
            value={capability}
            onChange={(e) => setCapability(e.target.value as 'all' | EpcCapability)}
            className="w-full max-w-full min-w-0 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            {CAPABILITIES.map((cap) => (
              <option key={cap} value={cap}>
                {cap === 'all' ? 'All Consortium Capabilities' : cap}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by active operating country"
            value={activeCountry}
            onChange={(e) => setActiveCountry(e.target.value)}
            className="w-full max-w-full min-w-0 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="all">
              All Operating Countries ({countryFacets.activeCountries.length})
            </option>
            {countryFacets.activeCountries.map((c) => (
              <option key={c} value={c}>
                Active in: {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by HQ country"
            value={hqCountry}
            onChange={(e) => setHqCountry(e.target.value)}
            className="w-full max-w-full min-w-0 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="all">
              All HQ Countries ({countryFacets.hqCountries.length})
            </option>
            {countryFacets.hqCountries.map((c) => (
              <option key={c} value={c}>
                HQ: {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by HQ origin region"
            value={originRegion}
            onChange={(e) => setOriginRegion(e.target.value)}
            className="w-full max-w-full min-w-0 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            {ORIGIN_REGIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg === 'all' ? 'All HQ Regions (Global)' : `Region: ${reg}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={bringsCapitalOnly}
                onChange={(e) => setBringsCapitalOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-amber-400"
              />
              <span>Only show EPCs / Developers that bring ECA or equity capital</span>
            </label>

            {!scope.isContinental && (
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={matchJurisdiction}
                  onChange={(e) => setMatchJurisdiction(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-teal-400"
                />
                <span>
                  Active in <strong className="text-teal-300">{scope.countryName}</strong>
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setCapability('all');
                  setOriginRegion('all');
                  setActiveCountry('all');
                  setHqCountry('all');
                  setBringsCapitalOnly(false);
                  setMatchJurisdiction(false);
                }}
                className="font-semibold text-teal-300 hover:text-teal-200 whitespace-nowrap shrink-0"
              >
                Reset filters
              </button>
            )}
            <span className="font-mono-num text-slate-400">
              {filtered.length} of {directoryList.length} global companies
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map(({ epc, fitScore }) => (
          <article
            key={epc.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1424] p-6 transition-colors hover:border-white/20"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{epc.hqCountry}</span>
                    <span aria-hidden="true">·</span>
                    <span>{epc.originRegion}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-teal-300">
                      {epc.ticketCapacityUsdM}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold text-slate-100">
                    {epc.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">{epc.category}</p>
                </div>

                {fitScore !== null && activeProject && (
                  <div className="shrink-0 text-right">
                    <div className="font-mono-num text-lg font-bold text-amber-300">
                      {fitScore}/100
                    </div>
                    <div className="text-[10px] text-slate-400">Fit vs active</div>
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-300">
                <span className="font-semibold text-slate-200">Capabilities: </span>
                {epc.capabilities.join(' · ')}
              </div>

              <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                <strong className="text-slate-100">Track record:</strong>{' '}
                {epc.flagshipTrackRecord}
              </p>

              <div className="mt-3 rounded-lg border border-white/8 bg-[#08111e] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-semibold ${
                      epc.bringsCapital ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {epc.bringsCapital
                      ? 'Brings Capital / ECA Financing'
                      : 'Pure Turnkey Execution Partner'}
                  </span>
                  <EvidenceText level={epc.confidence} />
                </div>
                <p className="mt-1 text-slate-300">{epc.capitalNote}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Compliance note:</strong>{' '}
                  {epc.complianceNotes}
                </p>
                {epc.kyc?.onboardedByUser && (
                  <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">
                    KYC Verified · Reg {epc.kyc.registrationNumber}
                    {epc.kyc.cidbGrade ? ` · Grade ${epc.kyc.cidbGrade}` : ''}
                    {epc.kyc.amlDocHash ? ` · sha256:${epc.kyc.amlDocHash.slice(0, 12)}…` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onInviteEpc(epc)}
                  className="rounded-lg bg-teal-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                >
                  Invite to Deal Room Consortium
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('legal')}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
                >
                  Foreign Compliance
                </button>
              </div>
              {epc.officialUrl && (
                <a
                  href={epc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-teal-200"
                >
                  Website <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
