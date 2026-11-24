import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  Database,
  FolderKanban,
  Globe2,
  Handshake,
  HardHat,
  Landmark,
  Layers,
  Lock,
  Menu,
  Pin,
  PinOff,
  Scale,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { JURISDICTION_OPTIONS } from '../data/capitalData';
import type { Role, TabId } from '../types/capital';

export const TABS_BORROWER: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'coj', label: 'Joburg Hub' },
  { id: 'projects', label: 'Projects database' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'publicdata', label: 'Public data' },
  { id: 'legal', label: 'Legal & compliance' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'matches', label: 'Matches' },
  { id: 'epcs', label: 'Developers & EPCs' },
  { id: 'onboard', label: 'Onboard / KYC' },
  { id: 'dealroom', label: 'Deal rooms' },
  { id: 'capital', label: 'Capital explorer' },
  { id: 'flows', label: 'Flows' },
  { id: 'map', label: 'Flows map' },
  { id: 'guide', label: 'User guide' },
];

export const TABS_PROVIDER: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'coj', label: 'Joburg Hub' },
  { id: 'mandate', label: 'My mandate' },
  { id: 'opps', label: 'Opportunities' },
  { id: 'projects', label: 'Projects database' },
  { id: 'publicdata', label: 'Public data' },
  { id: 'pipeline', label: 'My pipeline' },
  { id: 'epcs', label: 'Developers & EPCs' },
  { id: 'onboard', label: 'Onboard / KYC' },
  { id: 'dealroom', label: 'Deal rooms' },
  { id: 'capital', label: 'Capital explorer' },
  { id: 'flows', label: 'Flows' },
  { id: 'map', label: 'Flows map' },
  { id: 'legal', label: 'Legal & compliance' },
  { id: 'guide', label: 'User guide' },
];

export const TABS_EPC: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'coj', label: 'Joburg Hub' },
  { id: 'projects', label: 'Projects database' },
  { id: 'epcs', label: 'Developers & EPCs' },
  { id: 'onboard', label: 'Onboard / KYC' },
  { id: 'legal', label: 'Foreign compliance' },
  { id: 'workspace', label: 'Project workspace' },
  { id: 'dealroom', label: 'Deal rooms' },
  { id: 'publicdata', label: 'Public data' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'capital', label: 'Capital explorer' },
  { id: 'flows', label: 'Flows' },
  { id: 'map', label: 'Flows map' },
  { id: 'guide', label: 'User guide' },
];

export function getTabsForRole(role: Role): Array<{ id: TabId; label: string }> {
  if (role === 'provider') return TABS_PROVIDER;
  if (role === 'epc') return TABS_EPC;
  return TABS_BORROWER;
}

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  overview: Compass,
  coj: Landmark,
  projects: FolderKanban,
  workspace: Layers,
  legal: Scale,
  scenarios: TrendingUp,
  matches: Handshake,
  dealroom: Lock,
  epcs: HardHat,
  onboard: UserCheck,
  capital: Building2,
  flows: Activity,
  map: Globe2,
  mandate: Briefcase,
  opps: Compass,
  pipeline: FolderKanban,
  publicdata: Database,
  guide: BookOpen,
};

const ROLE_LABELS: Record<Role, string> = {
  borrower: 'Borrower',
  provider: 'Capital provider',
  epc: 'Developer / EPC',
};

interface TopNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  canGoBack: boolean;
  backLabel?: string;
  onGoBack: () => void;
  role: Role;
  onChangeRole: (role: Role) => void;
  jurisdiction: string;
  onChangeJurisdiction: (j: string) => void;
  onOpenTutorial: () => void;
}

export function TopNav({
  activeTab,
  onSelectTab,
  canGoBack,
  backLabel,
  onGoBack,
  role,
  onChangeRole,
  jurisdiction,
  onChangeJurisdiction,
  onOpenTutorial,
}: TopNavProps) {
  const [hoveredOpen, setHoveredOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const tabs = getTabsForRole(role);
  const activeTabLabel =
    tabs.find((t) => t.id === activeTab)?.label || 'Overview';
  const primaryWorkspaceTab: TabId =
    role === 'provider' ? 'opps' : role === 'epc' ? 'projects' : 'workspace';
  const sidebarVisible = hoveredOpen || pinned;

  const openSidebar = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoveredOpen(true);
  };

  const scheduleCloseSidebar = () => {
    if (pinned) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredOpen(false);
    }, 180);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (
        e.clientX > 0 &&
        e.clientX <= 8 &&
        e.clientY >= 140 &&
        e.clientY <= window.innerHeight - 80
      ) {
        openSidebar();
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const currentJurisdictionLabel =
    JURISDICTION_OPTIONS.find((j) => j.value === jurisdiction)?.label ||
    'Jurisdiction';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060c16]/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => (sidebarVisible ? setHoveredOpen(false) : openSidebar())}
              aria-label="Open left navigation menu"
              aria-expanded={sidebarVisible}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-teal-400/45 hover:text-teal-200 whitespace-nowrap shrink-0"
            >
              <Menu className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            <button
              type="button"
              onClick={onGoBack}
              disabled={!canGoBack}
              aria-label={
                canGoBack
                  ? `Go back to ${backLabel || 'previous view'}`
                  : 'Back'
              }
              title={
                canGoBack
                  ? `Go back to ${backLabel || 'previous view'} (Alt + ←)`
                  : 'At start of navigation history'
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                canGoBack
                  ? 'border-teal-400/35 bg-teal-400/12 text-teal-200 hover:bg-teal-400/20'
                  : 'border-white/8 bg-white/[0.02] text-slate-500 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {canGoBack && backLabel ? `Back · ${backLabel}` : 'Back'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('overview')}
              className="font-display ml-0.5 sm:ml-1 flex items-baseline gap-2 truncate text-sm sm:text-base lg:text-lg font-semibold tracking-tight text-slate-100 hover:text-amber-200 transition-colors whitespace-nowrap"
            >
              <span>City of Johannesburg</span>
              <span className="hidden sm:inline text-xs font-medium text-amber-300">
                Capital Intelligence
              </span>
            </button>

            <span className="hidden md:inline text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="hidden md:inline text-xs font-medium text-teal-300 whitespace-nowrap truncate max-w-[240px]">
              {ROLE_LABELS[role]} · {activeTabLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden lg:inline-block max-w-[220px] truncate text-xs font-medium text-slate-400">
              {currentJurisdictionLabel}
            </span>

            {activeTab === 'overview' ? (
              <button
                type="button"
                onClick={() => onSelectTab(primaryWorkspaceTab)}
                className="rounded-lg bg-teal-400 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300 whitespace-nowrap shrink-0"
              >
                Enter Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                Tutorial
              </button>
            )}
          </div>
        </div>
      </header>

      {!sidebarVisible && (
        <div
          aria-hidden="true"
          onMouseEnter={openSidebar}
          className="fixed left-0 top-36 bottom-20 z-40 w-2.5 cursor-e-resize print:hidden"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex h-24 w-1.5 items-center justify-center rounded-r-full bg-teal-400/55 transition-all hover:w-2 hover:bg-teal-300" />
        </div>
      )}

      <aside
        aria-label="Primary Sidebar Navigation"
        onMouseEnter={openSidebar}
        onMouseLeave={scheduleCloseSidebar}
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-white/12 bg-[#07101d]/96 shadow-[12px_0_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-transform duration-200 ease-out print:hidden ${
          sidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('overview');
              if (!pinned) setHoveredOpen(false);
            }}
            className="font-display text-base font-semibold tracking-tight text-slate-100 hover:text-teal-200 whitespace-nowrap"
          >
            Capital Intelligence
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              title={
                pinned
                  ? 'Unpin sidebar (auto-hide on mouse leave)'
                  : 'Pin sidebar open'
              }
              aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              className={`rounded-md p-1.5 text-xs transition-colors ${
                pinned
                  ? 'bg-teal-400/20 text-teal-300'
                  : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
              }`}
            >
              {pinned ? (
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setPinned(false);
                setHoveredOpen(false);
              }}
              aria-label="Hide sidebar"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-3 border-b border-white/10 px-4 py-3.5">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Platform Role
            </span>
            <div
              role="group"
              aria-label="Platform role"
              className="grid grid-cols-3 gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5"
            >
              <button
                type="button"
                onClick={() => onChangeRole('borrower')}
                className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  role === 'borrower'
                    ? 'bg-teal-400/20 text-teal-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Borrower
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('provider')}
                className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  role === 'provider'
                    ? 'bg-teal-400/20 text-teal-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Provider
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('epc')}
                className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  role === 'epc'
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dev / EPC
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="sidebar-jurisdiction-select"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Active Jurisdiction
            </label>
            <select
              id="sidebar-jurisdiction-select"
              value={jurisdiction}
              onChange={(e) => onChangeJurisdiction(e.target.value)}
              className="w-full rounded-lg border border-white/12 bg-[#0d1728] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-teal-400/50 focus:outline-none"
            >
              {JURISDICTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav
          aria-label="Platform views"
          role="tablist"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
        >
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {ROLE_LABELS[role]} Views
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = TAB_ICONS[tab.id] || Compass;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  onSelectTab(tab.id);
                  if (!pinned) setHoveredOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border border-teal-400/35 bg-teal-400/15 text-teal-200'
                    : 'border border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-teal-300' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-400">
          <div className="flex items-center justify-between gap-2">
            <span>{pinned ? 'Sidebar pinned' : 'Auto-hides off edge'}</span>
            <button
              type="button"
              onClick={() => {
                onOpenTutorial();
                if (!pinned) setHoveredOpen(false);
              }}
              className="font-semibold text-teal-300 hover:text-teal-200"
            >
              Walkthrough
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
