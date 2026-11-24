import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrencySymbol } from './utils/currencies';
import {
  CAT_DEF,
  CATS,
  INITIAL_CAPITAL,
  INITIAL_ENGAGEMENTS,
  INITIAL_MANDATE,
  INITIAL_PROJECTS,
  JURISDICTION_OPTIONS,
} from './data/capitalData';
import { EPC_CONTRACTORS } from './data/epcData';
import type {
  CapitalProvider,
  Engagement,
  EngagementStatus,
  EpcContractor,
  ExecutedDocRecord,
  GapStatus,
  LineFunctionDept,
  LineFunctionTask,
  Project,
  ProviderMandate,
  Role,
  TabId,
  UploadedProjectDoc,
} from './types/capital';
import { getTabsForRole, TopNav } from './components/TopNav';
import { LandingView } from './components/LandingView';
import { CojHubView } from './components/CojHubView';
import { ProjectsView } from './components/ProjectsView';
import { WorkspaceView } from './components/WorkspaceView';
import { LegalView } from './components/LegalView';
import { ScenariosView } from './components/ScenariosView';
import { MatchesView } from './components/MatchesView';
import { DealRoomView } from './components/DealRoomView';
import { EpcDirectoryView } from './components/EpcDirectoryView';
import { OnboardingKycView } from './components/OnboardingKycView';
import { CapitalExplorerView } from './components/CapitalExplorerView';
import { FlowsView } from './components/FlowsView';
import { FlowsMapView } from './components/FlowsMapView';
import {
  MandateView,
  OpportunitiesView,
  PipelineView,
} from './components/ProviderViews';
import { GuideView } from './components/GuideView';
import {
  PublicDataView,
  type OriginatePublicProjectPayload,
} from './components/PublicDataView';
import type { PublicDataAiSummary } from './types/publicData';
import type { PooledSpvResult } from './utils/strategyEngine';
import {
  AddProviderModal,
  EngageModal,
  TutorialModal,
} from './components/Modals';
import {
  ProjectIntakeWizardModal,
  type IntakeWizardSubmitPayload,
} from './components/ProjectIntakeWizardModal';
import { ProjectBriefModal } from './components/ProjectBriefModal';
import { CapitalGuideWidget } from './components/CapitalGuideWidget';
import { ToastBanner } from './components/SharedUI';

const INITIAL_CAPITAL_IDS = new Set(INITIAL_CAPITAL.map((c) => c.id));
const INITIAL_EPC_IDS = new Set(EPC_CONTRACTORS.map((e) => e.id));

async function computeClientAuditHash(payload: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(payload);
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(canonical);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic 64-hex hash if crypto.subtle unavailable
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i += 1) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  ).repeat(4);
}

function resolveInitialTab(): {
  tab: TabId;
  role: Role;
  intakeProjectId?: string;
  intakeDept?: LineFunctionDept;
} {
  if (typeof window === 'undefined') {
    return { tab: 'overview', role: 'borrower' };
  }
  const params = new URLSearchParams(window.location.search);
  const rawRole = params.get('role');
  const roleParam: Role =
    rawRole === 'provider' ? 'provider' : rawRole === 'epc' ? 'epc' : 'borrower';
  const intakeProjectId = params.get('intake') || undefined;
  const rawDept = params.get('dept');
  const intakeDept =
    rawDept === 'engineering' ||
    rawDept === 'finance' ||
    rawDept === 'legal' ||
    rawDept === 'esg'
      ? rawDept
      : undefined;
  const rawTab = params.get('tab');
  const tabParam = (rawTab === 'pipelines' ? 'projects' : rawTab) as TabId | null;
  if (intakeProjectId) {
    return {
      tab: tabParam || 'workspace',
      role: 'borrower',
      intakeProjectId,
      intakeDept,
    };
  }
  if (tabParam) {
    return { tab: tabParam, role: roleParam };
  }
  if (params.get('autostart') === '1') {
    return {
      tab:
        roleParam === 'provider'
          ? 'opps'
          : roleParam === 'epc'
            ? 'projects'
            : 'workspace',
      role: roleParam,
    };
  }
  return { tab: 'overview', role: roleParam };
}

export default function App() {
  const initial = useMemo(() => resolveInitialTab(), []);

  const [role, setRole] = useState<Role>(initial.role);
  const [activeTab, setActiveTab] = useState<TabId>(initial.tab);
  const [tabHistory, setTabHistory] = useState<Array<{ tab: TabId; role: Role }>>([]);
  const [jurisdiction, setJurisdiction] = useState<string>('za-metro');
  const [focusedLineDept, setFocusedLineDept] = useState<LineFunctionDept | null>(
    initial.intakeDept || null
  );

  const [projects, setProjects] =
    useState<Record<string, Project>>(INITIAL_PROJECTS);
  const [workspaceProjectIds, setWorkspaceProjectIds] = useState<string[]>(() => {
    const base = ['p1', 'p2', 'p3', 'p4'];
    if (initial.intakeProjectId && !base.includes(initial.intakeProjectId)) {
      return [initial.intakeProjectId, ...base];
    }
    return base;
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(
    initial.intakeProjectId || 'p1'
  );
  const [capitalProviders, setCapitalProviders] =
    useState<CapitalProvider[]>(INITIAL_CAPITAL);
  const [epcContractors, setEpcContractors] =
    useState<EpcContractor[]>(EPC_CONTRACTORS);
  const [engagements, setEngagements] =
    useState<Record<string, Engagement>>(INITIAL_ENGAGEMENTS);
  const [mandate, setMandate] = useState<ProviderMandate>(INITIAL_MANDATE);

  // Cross-view map & explorer integration state
  const [focusedMapCountry, setFocusedMapCountry] = useState<string | null>(
    null
  );
  const [explorerGeoSearch, setExplorerGeoSearch] = useState<string>('');
  const [publicDataSummary, setPublicDataSummary] = useState<
    PublicDataAiSummary | undefined
  >(undefined);

  // Modals & UI feedback
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [briefProjectId, setBriefProjectId] = useState<string | null>(null);
  const [engageTarget, setEngageTarget] = useState<{
    type: 'capital' | 'project' | 'epc';
    id: string;
    name: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  // Hydrate persistent multi-tenant workspace state from Express backend on mount
  useEffect(() => {
    let active = true;
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const hasUrlRoleOrTab = Boolean(
      params?.get('role') || params?.get('tab') || params?.get('autostart')
    );

    fetch('/api/workspace-state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (!hasUrlRoleOrTab && (data.role === 'borrower' || data.role === 'provider' || data.role === 'epc')) {
          setRole(data.role);
        }
        if (typeof data.jurisdiction === 'string' && data.jurisdiction.trim()) {
          setJurisdiction(data.jurisdiction);
        }
        if (data.projects && typeof data.projects === 'object' && Object.keys(data.projects).length > 0) {
          setProjects((prev) => ({ ...prev, ...data.projects }));
        }
        if (Array.isArray(data.workspaceProjectIds) && data.workspaceProjectIds.length > 0) {
          setWorkspaceProjectIds(data.workspaceProjectIds);
        }
        if (typeof data.activeProjectId === 'string' && data.activeProjectId.trim()) {
          setActiveProjectId(data.activeProjectId);
        }
        if (data.engagements && typeof data.engagements === 'object' && Object.keys(data.engagements).length > 0) {
          setEngagements((prev) => ({ ...prev, ...data.engagements }));
        }
        if (data.mandate && typeof data.mandate === 'object') {
          setMandate((prev) => ({ ...prev, ...data.mandate }));
        }
        if (Array.isArray(data.capitalProviders) && data.capitalProviders.length > 0) {
          const customOnly = (data.capitalProviders as CapitalProvider[]).filter(
            (c) => !INITIAL_CAPITAL_IDS.has(c.id)
          );
          if (customOnly.length > 0) {
            setCapitalProviders([...customOnly, ...INITIAL_CAPITAL]);
          }
        }
        if (Array.isArray(data.epcContractors) && data.epcContractors.length > 0) {
          const customEpcs = (data.epcContractors as EpcContractor[]).filter(
            (e) => !INITIAL_EPC_IDS.has(e.id)
          );
          if (customEpcs.length > 0) {
            setEpcContractors([...customEpcs, ...EPC_CONTRACTORS]);
          }
        }
      })
      .catch(() => {
        // Non-blocking fallback to in-memory seed data
      })
      .finally(() => {
        if (active) {
          hydratedRef.current = true;
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Debounced background save whenever persisted workspace state mutates
  useEffect(() => {
    if (!hydratedRef.current) return;
    const customProviders = capitalProviders.filter((c) => !INITIAL_CAPITAL_IDS.has(c.id));
    const customEpcs = epcContractors.filter((e) => !INITIAL_EPC_IDS.has(e.id));
    const timer = window.setTimeout(() => {
      void fetch('/api/workspace-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          jurisdiction,
          activeProjectId,
          workspaceProjectIds,
          projects,
          engagements,
          mandate,
          capitalProviders: customProviders,
          epcContractors: customEpcs,
        }),
      }).catch(() => {});
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    role,
    jurisdiction,
    activeProjectId,
    workspaceProjectIds,
    projects,
    engagements,
    mandate,
    capitalProviders,
    epcContractors,
  ]);

  const pushHistory = (prevTab: TabId, prevRole: Role) => {
    setTabHistory((prev) => [...prev.slice(-24), { tab: prevTab, role: prevRole }]);
  };

  const handleChangeRole = (nextRole: Role) => {
    const validTabs = getTabsForRole(nextRole).map((t) => t.id);
    const nextTab = validTabs.includes(activeTab) ? activeTab : 'overview';
    if (nextRole !== role || nextTab !== activeTab) {
      pushHistory(activeTab, role);
    }
    setRole(nextRole);
    setActiveTab(nextTab);
  };

  const handleSelectTab = (tab: TabId) => {
    if (tab !== activeTab) {
      pushHistory(activeTab, role);
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEnterRole = (nextRole: Role, targetTab: TabId) => {
    if (nextRole !== role || targetTab !== activeTab) {
      pushHistory(activeTab, role);
    }
    setRole(nextRole);
    setActiveTab(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabHistoryRef = useRef(tabHistory);
  tabHistoryRef.current = tabHistory;

  const handleGoBack = useCallback(() => {
    const prev = tabHistoryRef.current;
    if (prev.length === 0) return;
    const last = prev[prev.length - 1];
    setTabHistory(prev.slice(0, -1));
    setRole(last.role);
    setActiveTab(last.tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGoBack]);

  const handleAddToWorkspace = (projectId: string, openImmediately = true) => {
    setWorkspaceProjectIds((prev) =>
      prev.includes(projectId) ? prev : [projectId, ...prev]
    );
    setActiveProjectId(projectId);
    if (openImmediately) {
      handleSelectTab('workspace');
    } else {
      showToast(`Added "${projects[projectId]?.name || projectId}" to your working projects.`);
    }
  };

  const handleRemoveFromWorkspace = (projectId: string) => {
    setWorkspaceProjectIds((prev) => {
      const next = prev.filter((id) => id !== projectId);
      if (activeProjectId === projectId && next.length > 0) {
        setActiveProjectId(next[0]);
      }
      return next;
    });
    showToast(`Removed project from active workspace (still available in Projects database).`);
  };

  const handleCreateProjectFromWizard = (payload: IntakeWizardSubmitPayload) => {
    const id = `p${Object.keys(projects).length + 1}`;
    const jKey = payload.jurisdictionKey || jurisdiction;
    const jurisdictionLabel =
      JURISDICTION_OPTIONS.find((j) => j.value === jKey)?.label ||
      'South Africa — Metropolitan (City of Johannesburg)';

    const newProj: Project = {
      id,
      name: payload.name,
      sector: payload.sector,
      jurisdiction: jurisdictionLabel,
      stage: payload.stage,
      capex: payload.capexM * 1e6,
      currency: payload.currency || 'ZAR',
      updated: '2026-11-24',
      readiness: payload.readiness,
      desc: payload.desc,
      authorityName: payload.cojEntity || jurisdictionLabel,
      cojEntity: payload.cojEntity,
      gdsPillar: payload.gdsPillar,
      mfmaClassification: payload.mfmaClassification,
      revenueModel: payload.revenueModel,
      greenBondEligible: payload.greenBondEligible,
      wardOrNode: payload.wardOrNode,
      uploadedDocs: payload.uploadedDocs,
      lineFunctionTasks: payload.lineFunctionTasks,
      stages: [],
      gaps: payload.gaps,
    };

    setJurisdiction(jKey);
    setProjects((prev) => ({ ...prev, [id]: newProj }));
    setWorkspaceProjectIds((prev) => [id, ...prev]);
    setActiveProjectId(id);

    if (payload.autoOpenDealRoom) {
      const roomKey = `${id}-c13`;
      setEngagements((prev) => ({
        ...prev,
        [roomKey]: {
          status: 'interest',
          date: '2026-11-24',
          note: `Borrower intake room initialized with ${payload.uploadedDocs.length} SHA-256 verified file(s).`,
          qaLog: [],
          auditTrail: [
            {
              date: '2026-11-24',
              event: `Project originated via Borrower Intake Wizard (${payload.uploadedDocs.length} uploaded doc(s))`,
            },
          ],
        },
      }));
    }

    handleSelectTab('workspace');
    showToast(
      `Project "${payload.name}" (${getCurrencySymbol(newProj.currency)}${payload.capexM}m ${newProj.currency}) created with ${payload.uploadedDocs.length} uploaded doc(s).`
    );
  };

  const handleUpdateLineFunctionTask = (
    projectId: string,
    dept: LineFunctionDept,
    updatedTask: LineFunctionTask,
    attachedDoc?: UploadedProjectDoc
  ) => {
    setProjects((prev) => {
      const proj = prev[projectId];
      if (!proj) return prev;
      const existingTasks =
        proj.lineFunctionTasks && proj.lineFunctionTasks.length > 0
          ? proj.lineFunctionTasks
          : [];
      const hasDept = existingTasks.some((t) => t.dept === dept);
      const nextTasks = hasDept
        ? existingTasks.map((t) => (t.dept === dept ? updatedTask : t))
        : [...existingTasks, updatedTask];
      const verifiedCount = nextTasks.filter(
        (t) => t.status === 'Dept Verified' || t.status === 'Executive Approved'
      ).length;
      const nextReadiness = Math.min(96, Math.max(proj.readiness, 45 + verifiedCount * 10));
      return {
        ...prev,
        [projectId]: {
          ...proj,
          lineFunctionTasks: nextTasks,
          uploadedDocs: attachedDoc
            ? [...(proj.uploadedDocs || []), attachedDoc]
            : proj.uploadedDocs,
          readiness: nextReadiness,
        },
      };
    });
    showToast(`Saved ${updatedTask.label} (${updatedTask.status}) update.`);
  };

  const handleOnboardCapitalProvider = (newProvider: CapitalProvider) => {
    setCapitalProviders((prev) => [newProvider, ...prev]);
    showToast(`KYC Verified & onboarded capital provider "${newProvider.name}".`);
  };

  const handleOnboardEpcContractor = (newEpc: EpcContractor) => {
    setEpcContractors((prev) => [newEpc, ...prev]);
    showToast(`KYC Verified & onboarded Developer / EPC "${newEpc.name}".`);
  };

  const handleOriginatePublicProject = (payload: OriginatePublicProjectPayload) => {
    const cleanSlug = payload.idHint.replace(/[^a-z0-9-]/gi, '').slice(0, 18);
    const id = projects[cleanSlug] ? `${cleanSlug}-${Date.now().toString().slice(-4)}` : cleanSlug;

    const newProj: Project = {
      id,
      name: payload.name,
      sector: payload.sector,
      jurisdiction: payload.jurisdictionLabel,
      stage: payload.stage,
      capex: payload.capex,
      currency: payload.currency,
      updated: '2026-11-24',
      readiness: payload.readiness,
      desc: payload.desc,
      authorityName: payload.authorityName,
      financingGap: payload.financingGap,
      stages: [],
      gaps: [
        {
          gap: payload.financingGap || 'Confirm statutory borrowing authority & affordability ceiling',
          severity: 'critical',
          stage: 'Structuring',
          remedy: 'Run Legal & compliance check and size blended DFI/grant stack in Scenarios',
          status: 'Open',
        },
        {
          gap: 'Technical feasibility & tariff cash-flow ring-fencing verification',
          severity: 'high',
          stage: 'Feasibility',
          remedy: 'Submit preparation grant enquiry via Matches & Deal Room',
          status: 'Open',
        },
      ],
    };

    setJurisdiction(payload.jurisdictionKey);
    setRole('borrower');
    setProjects((prev) => ({ ...prev, [id]: newProj }));
    setWorkspaceProjectIds((prev) => [id, ...prev]);
    setActiveProjectId(id);
    handleSelectTab('workspace');
    showToast(
      `Originated "${payload.name}" from live public registry into Workspace.`
    );
  };

  const handleToggleActivity = (
    projectId: string,
    stageKey: string,
    activity: string
  ) => {
    setProjects((prev) => {
      const proj = prev[projectId];
      if (!proj) return prev;
      const updatedStages = proj.stages.map((s) => {
        if (s.key !== stageKey) return s;
        const curr = s.completedActivities || [];
        const next = curr.includes(activity)
          ? curr.filter((a) => a !== activity)
          : [...curr, activity];
        return { ...s, completedActivities: next };
      });
      return {
        ...prev,
        [projectId]: {
          ...proj,
          stages: updatedStages,
          readiness: Math.min(98, proj.readiness + 2),
        },
      };
    });
  };

  const handleCycleGapStatus = (projectId: string, gapIndex: number) => {
    const order: GapStatus[] = ['Open', 'In progress', 'Closed'];
    setProjects((prev) => {
      const proj = prev[projectId];
      if (!proj) return prev;
      const updatedGaps = proj.gaps.map((g, i) => {
        if (i !== gapIndex) return g;
        const nextStatus = order[(order.indexOf(g.status) + 1) % order.length];
        return { ...g, status: nextStatus };
      });
      const closedCount = updatedGaps.filter((g) => g.status === 'Closed').length;
      const readinessBump = closedCount * 6;
      return {
        ...prev,
        [projectId]: {
          ...proj,
          gaps: updatedGaps,
          readiness: Math.min(96, Math.max(15, 36 + readinessBump)),
        },
      };
    });
  };

  const handleAddProvider = (input: {
    name: string;
    category: string;
    type: string;
    ticket: string;
    geographies: string;
    sectors: string;
    desc: string;
  }) => {
    const ci = CATS.indexOf(input.category);
    const D = Object.values(CAT_DEF).find((d) => d.c === ci) || CAT_DEF.PE;
    const geos = input.geographies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const secs = input.sectors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newProvider: CapitalProvider = {
      id: `c${capitalProviders.length + 1}u`,
      name: input.name,
      category: input.category,
      type: input.type,
      desc: input.desc || D.d,
      ticket: input.ticket,
      currency: 'Multi',
      stages: D.stg,
      sectors: secs.length ? secs : ['Energy'],
      confidence: 'mandate',
      legal: D.legal,
      source: 'User-submitted — pending verification',
      verified: '2026-11-24',
      geographies: geos.length ? geos : ['Africa'],
    };

    setCapitalProviders((prev) => [newProvider, ...prev]);
    showToast(`Added "${input.name}" to Capital Explorer.`);
  };

  const handleImportProviders = (imported: CapitalProvider[]) => {
    if (!imported.length) {
      showToast('No valid provider rows found in CSV.');
      return;
    }
    setCapitalProviders((prev) => [...imported, ...prev]);
    showToast(`Imported ${imported.length} providers from CSV.`);
  };

  const handleSubmitEngage = (
    action: 'interest' | 'nda' | 'rfi',
    note: string
  ) => {
    if (!engageTarget) return;
    const key =
      engageTarget.type === 'capital'
        ? `${activeProjectId}-${engageTarget.id}`
        : `${engageTarget.id}-c13`;

    const nextStatus: EngagementStatus = action === 'nda' ? 'nda' : 'interest';
    const label =
      action === 'nda'
        ? 'NDA & common data room requested'
        : action === 'rfi'
          ? 'Information request submitted'
          : 'Interest expressed';

    setEngagements((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          ...existing,
          status: nextStatus,
          date: '2026-11-24',
          note: note || label,
          qaLog: existing?.qaLog || [],
          auditTrail: [
            ...(existing?.auditTrail || []),
            { date: '2026-11-24', event: `${label} (${engageTarget.name})` },
          ],
        },
      };
    });

    showToast(`${label} for ${engageTarget.name}.`);
  };

  const handleExecuteDealDocument = (
    key: string,
    record: ExecutedDocRecord,
    nextStatus?: EngagementStatus
  ) => {
    const labels: Record<EngagementStatus, string> = {
      none: 'Reset',
      interest: 'Interest expressed',
      nda: 'Mutual NDA signed & common data room unlocked',
      terms: 'Indicative Term Sheet issued',
      closed: 'Signed Financial Close recorded',
    };

    const hashPayload = {
      key,
      docKind: record.docKind,
      referenceCode: record.referenceCode,
      signatory: record.signatory,
      counterpartyRep: record.counterpartyRep,
      governingLaw: record.governingLaw,
      executedAt: record.executedAt,
    };

    const applyRecord = (digest: string) => {
      const stampedRecord: ExecutedDocRecord = { ...record, auditHash: digest };
      setEngagements((prev) => {
        const existing = prev[key];
        if (!existing) return prev;
        const updatedStatus = nextStatus || existing.status;
        const eventText = `${record.title} (${record.referenceCode}) executed by ${record.signatory} · SHA-256 ${digest.slice(0, 12)}…`;
        return {
          ...prev,
          [key]: {
            ...existing,
            status: updatedStatus,
            date: record.executedAt,
            executedDocs: {
              ...(existing.executedDocs || {}),
              [record.docKind]: stampedRecord,
            },
            auditTrail: [
              ...(existing.auditTrail || []),
              { date: record.executedAt, event: eventText },
            ],
          },
        };
      });
    };

    void (async () => {
      const fallbackDigest = await computeClientAuditHash(hashPayload);
      applyRecord(fallbackDigest);
      try {
        const res = await fetch('/api/audit/hash-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hashPayload),
        });
        if (res.ok) {
          const data: { sha256?: string } = await res.json();
          if (data.sha256 && data.sha256 !== fallbackDigest) {
            setEngagements((prev) => {
              const existing = prev[key];
              if (!existing?.executedDocs?.[record.docKind]) return prev;
              return {
                ...prev,
                [key]: {
                  ...existing,
                  executedDocs: {
                    ...existing.executedDocs,
                    [record.docKind]: {
                      ...existing.executedDocs[record.docKind]!,
                      auditHash: data.sha256,
                    },
                  },
                },
              };
            });
          }
        }
      } catch {
        // Fallback client digest already recorded
      }
    })();

    if (nextStatus) {
      showToast(`${labels[nextStatus]} (${record.referenceCode})`);
    } else {
      showToast(`Document ${record.referenceCode} stamped & logged to audit trail.`);
    }
  };

  const handleCreatePooledSpv = (pool: PooledSpvResult, selectedProjects: Project[]) => {
    const id = `pool-${Date.now().toString().slice(-5)}`;
    const first = selectedProjects[0];
    const allSameSector =
      selectedProjects.length > 0 &&
      selectedProjects.every((p) => p.sector === first?.sector);

    const pooledProj: Project = {
      id,
      name: `Pooled SPV Bond (${selectedProjects.length} Authorities · $${pool.totalPoolUsdM.toFixed(0)}m)`,
      sector: allSameSector && first ? first.sector : 'Water & sanitation',
      jurisdiction: 'Regional Pooled SPV (Multi-Authority)',
      stage: 'structuring',
      capex: Math.round(pool.totalPoolUsdM * 1e6),
      currency: 'USD',
      updated: '2026-11-24',
      readiness: Math.min(92, Math.max(45, pool.averageReadiness + 10)),
      authorityName: `Pooled Municipal SPV · ${selectedProjects.map((p) => p.authorityName || p.name).join(' + ')}`,
      financingGap: `Structure ${pool.firstLossGuaranteePct}% GuarantCo/ATIDI first-loss credit wrap to lock -${pool.couponCompressionBps} bps coupon compression ($${pool.projectedAnnualDebtSavingsUsdM.toFixed(2)}m/yr annual debt savings).`,
      desc: `Pooled multi-authority bond SPV consolidating ${selectedProjects.map((p) => p.name).join(', ')}. ${pool.recommendedVehicle}.`,
      stages: [],
      gaps: [
        {
          gap: 'Execute Inter-Municipal / Multi-Sponsor SPV Pooling Agreement',
          severity: 'critical',
          stage: 'Structuring',
          remedy: pool.structuringSteps[0] || 'Adopt harmonized SPV pooling resolution across constituent councils.',
          status: 'Open',
        },
        {
          gap: `Secure ${pool.firstLossGuaranteePct}% Partial Credit Guarantee (GuarantCo / ATIDI / InfraCredit)`,
          severity: 'high',
          stage: 'Structuring',
          remedy: pool.structuringSteps[1] || 'Submit pooled bond dossier for partial credit wrap.',
          status: 'Open',
        },
      ],
    };

    setProjects((prev) => ({ ...prev, [id]: pooledProj }));
    setWorkspaceProjectIds((prev) => [id, ...prev]);
    setActiveProjectId(id);
    showToast(
      `Created Pooled SPV Mandate ($${pool.totalPoolUsdM.toFixed(1)}m USD · -${pool.couponCompressionBps} bps).`
    );
  };

  const handleAssignDealRoomEpc = (
    key: string,
    epcId: string,
    epcName: string
  ) => {
    setEngagements((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          epcPartnerId: epcId,
          epcPartnerName: epcName,
          auditTrail: [
            ...(existing.auditTrail || []),
            {
              date: '2026-11-24',
              event: `Consortium Lead Developer / EPC assigned: ${epcName}`,
            },
          ],
        },
      };
    });
    showToast(`Assigned ${epcName} as consortium EPC lead in Deal Room.`);
  };

  const handleAddDataRoomDoc = (
    key: string,
    doc: { folder: string; name: string }
  ) => {
    const roleName =
      role === 'borrower'
        ? 'Borrower PMO'
        : role === 'epc'
          ? 'EPC Consortium'
          : mandate.institution;
    setEngagements((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          customDataRoomDocs: [
            ...(existing.customDataRoomDocs || []),
            {
              folder: doc.folder,
              name: doc.name,
              uploadedBy: roleName,
              status: 'Uploaded',
            },
          ],
          auditTrail: [
            ...(existing.auditTrail || []),
            {
              date: '2026-11-24',
              event: `Common Data Room upload (${doc.folder}/${doc.name}) by ${roleName}`,
            },
          ],
        },
      };
    });
    showToast(`Registered "${doc.name}" in shared Common Data Room.`);
  };

  const handleInviteEpcFromDirectory = (epc: EpcContractor) => {
    const targetEntry =
      Object.entries(engagements).find(
        ([k, eng]) => eng.status !== 'none' && k.startsWith(`${activeProjectId}-`)
      ) || Object.entries(engagements).find(([, eng]) => eng.status !== 'none');

    if (targetEntry) {
      handleAssignDealRoomEpc(targetEntry[0], epc.id, epc.name);
      handleSelectTab('dealroom');
      return;
    }

    const newKey = `${activeProjectId}-c13`;
    setEngagements((prev) => ({
      ...prev,
      [newKey]: {
        status: 'interest',
        date: '2026-11-24',
        note: `Consortium transaction room opened with ${epc.name}`,
        epcPartnerId: epc.id,
        epcPartnerName: epc.name,
        qaLog: [],
        auditTrail: [
          {
            date: '2026-11-24',
            event: `Deal room initialized with EPC consortium partner ${epc.name}`,
          },
        ],
      },
    }));
    showToast(`Opened 3-party Deal Room with ${epc.name}.`);
    handleSelectTab('dealroom');
  };

  const handlePostDealMessage = (key: string, text: string) => {
    setEngagements((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const author =
        role === 'borrower'
          ? 'Borrower PMO'
          : role === 'epc'
            ? existing.epcPartnerName || 'EPC Consortium Lead'
            : mandate.institution;
      return {
        ...prev,
        [key]: {
          ...existing,
          qaLog: [
            ...(existing.qaLog || []),
            {
              id: `msg-${Date.now()}`,
              author,
              authorRole: role,
              date: '2026-11-24',
              text,
            },
          ],
        },
      };
    });
    showToast('Q&A entry posted to deal room.');
  };

  const activeProject = projects[activeProjectId] || Object.values(projects)[0];
  const engagementCount = Object.values(engagements).filter(
    (e) => e.status !== 'none'
  ).length;
  const lastHistoryEntry = tabHistory[tabHistory.length - 1];
  const backLabel = lastHistoryEntry
    ? getTabsForRole(lastHistoryEntry.role).find((t) => t.id === lastHistoryEntry.tab)
        ?.label
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-[#060c16] text-slate-100">
      <TopNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        canGoBack={tabHistory.length > 0}
        backLabel={backLabel}
        onGoBack={handleGoBack}
        role={role}
        onChangeRole={handleChangeRole}
        jurisdiction={jurisdiction}
        onChangeJurisdiction={setJurisdiction}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
        {activeTab === 'overview' && (
          <LandingView
            projectCount={Object.keys(projects).length}
            providerCount={capitalProviders.length}
            epcCount={epcContractors.length}
            engagementCount={engagementCount}
            onNavigate={handleSelectTab}
            onEnterRole={handleEnterRole}
            onFocusMapCountry={(countryKey) => {
              setFocusedMapCountry(countryKey);
              handleSelectTab('map');
            }}
            onOpenProjectWorkspace={(projId) => {
              setRole('borrower');
              handleAddToWorkspace(projId, true);
            }}
            onOpenProjectBrief={(projId) => setBriefProjectId(projId)}
            onOpenTutorial={() => setTutorialOpen(true)}
          />
        )}

        {activeTab === 'coj' && (
          <CojHubView
            projects={projects}
            onSelectProjectWorkspace={(projId) => {
              setRole('borrower');
              handleAddToWorkspace(projId, true);
            }}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            workspaceProjectIds={workspaceProjectIds}
            activeProjectId={activeProjectId}
            role={role}
            jurisdiction={jurisdiction}
            capitalProviders={capitalProviders}
            epcContractors={epcContractors}
            onOpenBrief={(id) => setBriefProjectId(id)}
            onAddToWorkspace={(id, openNow = true) => handleAddToWorkspace(id, openNow)}
            onViewMatches={(id) => {
              setActiveProjectId(id);
              handleSelectTab('matches');
            }}
            onOpenEngageProject={(id, name) =>
              setEngageTarget({ type: 'project', id, name })
            }
            onExploreProviderKeyword={(providerKeyword) => {
              setExplorerGeoSearch(providerKeyword);
              handleSelectTab('capital');
            }}
            onOpenNewProject={() => {
              if (role === 'borrower') setNewProjectOpen(true);
            }}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'workspace' && (
          <WorkspaceView
            role={role}
            projects={projects}
            workspaceProjectIds={workspaceProjectIds}
            activeProjectId={activeProjectId}
            focusedLineDept={focusedLineDept}
            onSelectProject={(id) => {
              setFocusedLineDept(null);
              setActiveProjectId(id);
            }}
            onRemoveFromWorkspace={handleRemoveFromWorkspace}
            capitalProviders={capitalProviders}
            epcContractors={epcContractors}
            onOpenBrief={(id) => setBriefProjectId(id)}
            onOpenNewProject={() => {
              if (role === 'borrower') setNewProjectOpen(true);
            }}
            onToggleActivity={handleToggleActivity}
            onCycleGapStatus={handleCycleGapStatus}
            onUpdateLineFunctionTask={handleUpdateLineFunctionTask}
            onNavigate={handleSelectTab}
            onToast={showToast}
            onCreatePooledSpv={handleCreatePooledSpv}
          />
        )}

        {activeTab === 'epcs' && (
          <EpcDirectoryView
            epcContractors={epcContractors}
            activeProject={activeProject}
            jurisdiction={jurisdiction}
            onNavigate={handleSelectTab}
            onInviteEpc={handleInviteEpcFromDirectory}
            onOpenOnboard={() => handleSelectTab('onboard')}
          />
        )}

        {activeTab === 'onboard' && (
          <OnboardingKycView
            onOnboardCapitalProvider={handleOnboardCapitalProvider}
            onOnboardEpcContractor={handleOnboardEpcContractor}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'legal' && (
          <LegalView
            jurisdiction={jurisdiction}
            onChangeJurisdiction={setJurisdiction}
            defaultSubTab={role === 'epc' ? 'foreign' : 'domestic'}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenariosView
            activeProject={activeProject}
            jurisdiction={jurisdiction}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'matches' && activeProject && (
          <MatchesView
            project={activeProject}
            capitalProviders={capitalProviders}
            engagements={engagements}
            onOpenEngage={(capId, capName) =>
              setEngageTarget({ type: 'capital', id: capId, name: capName })
            }
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'dealroom' && (
          <DealRoomView
            projects={projects}
            capitalProviders={capitalProviders}
            epcContractors={epcContractors}
            engagements={engagements}
            role={role}
            onExecuteDocument={handleExecuteDealDocument}
            onPostMessage={handlePostDealMessage}
            onAssignEpcPartner={handleAssignDealRoomEpc}
            onAddDataRoomDoc={handleAddDataRoomDoc}
          />
        )}

        {activeTab === 'capital' && (
          <CapitalExplorerView
            providers={capitalProviders}
            initialSearch={explorerGeoSearch}
            onClearInitialSearch={() => setExplorerGeoSearch('')}
            onOpenAddProvider={() => setAddProviderOpen(true)}
            onOpenOnboard={() => handleSelectTab('onboard')}
            onImportProviders={handleImportProviders}
          />
        )}

        {activeTab === 'flows' && (
          <FlowsView jurisdiction={jurisdiction} onNavigate={handleSelectTab} />
        )}

        {activeTab === 'map' && (
          <FlowsMapView
            providers={capitalProviders}
            focusedCountry={focusedMapCountry}
            onFocusCountry={setFocusedMapCountry}
            onExploreProvidersForCountry={(countryName) => {
              setExplorerGeoSearch(countryName);
              handleSelectTab('capital');
            }}
            onInspectLegalForJurisdiction={(jKey) => {
              setJurisdiction(jKey);
              handleSelectTab('legal');
            }}
            onOpenProjectWorkspace={(projId) => {
              setRole('borrower');
              handleAddToWorkspace(projId, true);
            }}
          />
        )}

        {activeTab === 'mandate' && (
          <MandateView
            mandate={mandate}
            onSaveMandate={(m) => {
              setMandate(m);
              showToast('Capital provider mandate preferences saved.');
            }}
            onPreviewOpportunities={() => handleSelectTab('opps')}
          />
        )}

        {activeTab === 'opps' && (
          <OpportunitiesView
            projects={projects}
            mandate={mandate}
            onOpenBrief={(id) => setBriefProjectId(id)}
            onOpenEngageProject={(projId, projName) =>
              setEngageTarget({ type: 'project', id: projId, name: projName })
            }
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineView
            projects={projects}
            capitalProviders={capitalProviders}
            engagements={engagements}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'publicdata' && (
          <PublicDataView
            jurisdiction={jurisdiction}
            onChangeJurisdiction={setJurisdiction}
            onOriginateProject={handleOriginatePublicProject}
            onCheckLegal={(jKey) => {
              setJurisdiction(jKey);
              handleSelectTab('legal');
            }}
            onNavigate={handleSelectTab}
            onUpdateAiSummary={setPublicDataSummary}
          />
        )}

        {activeTab === 'guide' && <GuideView />}
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-500">
        City of Johannesburg · Capital Intelligence · Infrastructure funding platform · Live
        public data sourced directly from South Africa National Treasury Municipal Money API,
        openAFRICA, World Bank Open Data &amp; GeoBoundaries. Analytical views are decision
        support, not a formal legal opinion or claim of committed capital.
      </footer>

      <CapitalGuideWidget
        activeTab={activeTab}
        role={role}
        activeProject={activeProject}
        projects={projects}
        capitalProviders={capitalProviders}
        engagements={engagements}
        jurisdiction={jurisdiction}
        focusedCountry={focusedMapCountry}
        publicDataSummary={publicDataSummary}
        onNavigate={handleSelectTab}
      />

      {role === 'borrower' && (
        <ProjectIntakeWizardModal
          open={newProjectOpen}
          jurisdiction={jurisdiction}
          onClose={() => setNewProjectOpen(false)}
          onCreate={handleCreateProjectFromWizard}
        />
      )}

      <AddProviderModal
        open={addProviderOpen}
        onClose={() => setAddProviderOpen(false)}
        onAdd={handleAddProvider}
      />

      <EngageModal
        target={engageTarget}
        onClose={() => setEngageTarget(null)}
        onSubmit={handleSubmitEngage}
      />

      <TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />

      <ProjectBriefModal
        project={briefProjectId ? projects[briefProjectId] || null : null}
        capitalProviders={capitalProviders}
        onClose={() => setBriefProjectId(null)}
        onOpenWorkspace={(id) => {
          setRole('borrower');
          handleAddToWorkspace(id, true);
        }}
        onViewMatches={(id) => {
          setRole('borrower');
          setActiveProjectId(id);
          handleSelectTab('matches');
        }}
        onNavigateTab={(tab) => {
          handleSelectTab(tab);
        }}
      />

      <ToastBanner message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
