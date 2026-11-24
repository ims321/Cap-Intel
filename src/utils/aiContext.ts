import {
  CATS,
  JURISDICTION_OPTIONS,
  LEGAL_BY_JURISDICTION,
  SCENARIOS,
  STAGE_LABEL,
} from '../data/capitalData';
import {
  EPC_CONTRACTORS,
  FOREIGN_EPC_COMPLIANCE_BY_JURISDICTION,
} from '../data/epcData';
import type {
  CapitalProvider,
  Engagement,
  Project,
  Role,
  TabId,
} from '../types/capital';
import type { PublicDataAiSummary } from '../types/publicData';
import { computeScenario, scoreMatch } from './finance';
import { resolveLegalKeyForProject } from './projectBrief';

export interface CapitalGuideContextPayload {
  activeTab: TabId;
  role: Role;
  jurisdiction: string;
  focusedCountry: string | null;
  projectName: string;
  projectId: string;
  projectStage: string;
  projectReadiness: number;
  openGaps: number;
  projectCapex: string;
  activeProjectDetail: string;
  projectsCatalogSummary: string[];
  relevantProviders: Array<{
    name: string;
    category: string;
    type: string;
    ticket: string;
    currency: string;
    stages: string[];
    geographies: string[];
    legal: string;
    overlooked?: boolean;
  }>;
  relevantEpcsSummary: string[];
  categorySummary: string;
  legalRegimesSummary: string[];
  foreignComplianceSummary: string[];
  scenariosSummary: string[];
  activeEngagementsSummary: string[];
  publicDataSummary?: PublicDataAiSummary;
  platformGuideSummary: string;
}

export function buildCapitalGuidePayload(params: {
  question: string;
  activeTab: TabId;
  role: Role;
  jurisdiction: string;
  focusedCountry: string | null;
  activeProject: Project;
  projects: Record<string, Project>;
  capitalProviders: CapitalProvider[];
  engagements: Record<string, Engagement>;
  publicDataSummary?: PublicDataAiSummary;
}): CapitalGuideContextPayload {
  const {
    question,
    activeTab,
    role,
    jurisdiction,
    focusedCountry,
    activeProject,
    projects,
    capitalProviders,
    engagements,
    publicDataSummary,
  } = params;

  const openGapsList = activeProject.gaps.filter((g) => g.status !== 'Closed');
  const activeStage = activeProject.stages.find((s) => s.status === 'active');
  const pendingActivities = activeStage
    ? activeStage.activities.filter(
        (a) => !(activeStage.completedActivities || []).includes(a)
      )
    : [];

  const topMatchesForActive = capitalProviders
    .map((p) => ({ p, score: scoreMatch(activeProject, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(
      ({ p, score }) =>
        `${p.name} (${score}/100, ${p.category}, ${p.ticket} ${p.currency})`
    );

  const activeLegalKey = resolveLegalKeyForProject(activeProject);
  const activeProjectDetail = [
    `ID=${activeProject.id} | Name="${activeProject.name}" | Jurisdiction="${activeProject.jurisdiction}" (Legal key=${activeLegalKey}) | Sector=${activeProject.sector} | Stage=${STAGE_LABEL[activeProject.stage]} | Readiness=${activeProject.readiness}/100 | Capex=${activeProject.currency} ${(activeProject.capex / 1e6).toFixed(1)}m`,
    `Description: ${activeProject.desc}`,
    activeProject.financingGap
      ? `Primary Financing Gap: ${activeProject.financingGap}`
      : '',
    activeProject.agendaAlignment
      ? `Alignment: ${activeProject.agendaAlignment}`
      : '',
    pendingActivities.length
      ? `Pending Stage Activities (${activeStage?.name}): ${pendingActivities.join('; ')}`
      : '',
    openGapsList.length
      ? `Open Bankability Gaps: ${openGapsList.map((g) => `[${g.severity}/${g.status}] ${g.gap} -> Remedy: ${g.remedy}`).join(' | ')}`
      : 'No open bankability gaps.',
    `Top 6 Matched Providers for Active Project: ${topMatchesForActive.join(' ; ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const projectsCatalogSummary = Object.values(projects).map(
    (p) =>
      `${p.id} | ${p.name} | ${p.jurisdiction} | ${p.sector} | ${STAGE_LABEL[p.stage]} | ${p.currency} ${(p.capex / 1e6).toFixed(1)}m | R=${p.readiness}/100 | ${p.sourceCategory || 'Municipal/Custom'}${p.authorityName ? ` (${p.authorityName})` : ''}`
  );

  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  const rankedProviders = capitalProviders
    .map((p) => {
      const hay = `${p.name} ${p.category} ${p.type} ${p.desc} ${p.sectors.join(' ')} ${p.geographies.join(' ')} ${p.nontraditionalTag || ''} ${p.currency}`.toLowerCase();
      let qScore = 0;
      for (const tok of tokens) {
        if (hay.includes(tok)) qScore += 5;
      }
      const projCountry = activeProject.jurisdiction.split('—')[0].trim().toLowerCase();
      if (hay.includes(projCountry)) qScore += 2;
      if (p.overlooked) qScore += 1;
      return { p, qScore };
    })
    .sort((a, b) => b.qScore - a.qScore)
    .slice(0, 18)
    .map(({ p }) => ({
      name: p.name,
      category: p.category,
      type: p.type,
      ticket: p.ticket,
      currency: p.currency,
      stages: p.stages,
      geographies: p.geographies.slice(0, 5),
      legal: p.legal,
      overlooked: p.overlooked,
    }));

  const relevantEpcsSummary = EPC_CONTRACTORS.slice(0, 14).map(
    (e) =>
      `${e.name} (${e.hqCountry}, ${e.category}) | Cap=${e.ticketCapacityUsdM} | BringsCapital=${e.bringsCapital} | Capabilities=${e.capabilities.join('/')} | Regions=${e.activeRegions.slice(0, 4).join('/')}`
  );

  const categoryCounts = CATS.map((cat) => {
    const cnt = capitalProviders.filter((c) => c.category === cat).length;
    return `${cat}: ${cnt}`;
  }).join(' | ');

  const legalRegimesSummary = JURISDICTION_OPTIONS.map((opt) => {
    const prof = LEGAL_BY_JURISDICTION[opt.value];
    if (!prof) return `${opt.value}: ${opt.label}`;
    return `${opt.value} (${opt.label}): ${prof.summary} Rules: ${prof.rules
      .map((r) => `${r.q} [${r.status}, ${r.cite}]`)
      .join('; ')}`;
  });

  const foreignComplianceSummary = Object.values(FOREIGN_EPC_COMPLIANCE_BY_JURISDICTION)
    .slice(0, 12)
    .map(
      (f) =>
        `${f.countryName} (${f.jurisdictionKey}, ${f.riskLevel}): Regulator=${f.regulatorRegistration} | LocalContent=${f.localContentRule} | FX=${f.fxRepatriationRule}`
    );

  const scenariosSummary = SCENARIOS.map((sc) => {
    const base = computeScenario(sc, 0, 0);
    const stressed = computeScenario(sc, 15, 100);
    const tranches = sc.components
      .map(
        (c) =>
          `${c.label}: R${(c.amount / 1e6).toFixed(0)}m ${c.ccy}${c.grant ? ' (Grant)' : ` @ ${(c.rate * 100).toFixed(1)}%, ${c.years}Y/${c.grace}Y grace`}`
      )
      .join(' + ');
    return `Scenario ${sc.id} (${sc.name}${sc.recommended ? ' - RECOMMENDED' : ''}): ${tranches} | Base Total=R${(base.total / 1e6).toFixed(1)}m | +15% FX / +100bps Total=R${(stressed.total / 1e6).toFixed(1)}m (Annual=R${(stressed.annual / 1e6).toFixed(1)}m) | Est close=${sc.time} | Legal: ${sc.legal}`;
  });

  const activeEngagementsSummary = Object.entries(engagements)
    .filter(([, eng]) => eng.status !== 'none')
    .slice(0, 12)
    .map(([key, eng]) => {
      const [pid, cid] = key.split('-');
      const pName = projects[pid]?.name || pid;
      const cName = capitalProviders.find((c) => c.id === cid)?.name || cid;
      return `${pName} <-> ${cName}${eng.epcPartnerName ? ` (EPC: ${eng.epcPartnerName})` : ''}: status=${eng.status} (${eng.date}) | Note: ${eng.note}`;
    });

  const platformGuideSummary = [
    'Navigation: Auto-hiding left sidebar (City of Johannesburg edition) with 3 roles (Borrower, Capital provider, Developer / EPC), 24 Africa-wide jurisdictions (defaulting to za-metro City of Johannesburg), and persistent Back button.',
    'Views: Overview (CoJ branded hero + 5-step Animated Explainer), Joburg Hub (7 CoJ MOEs, NRW/Grid Loss Recovery -> DSCR Simulator, JSE Green Bond screener, MFMA s33/s46/s120 & BFI calendar), Projects database (unified registry + Borrower-only 4-step Project Intake & Document Upload Wizard), Workspace (active working projects, Line-Function Collaboration Desk for Engineering/Finance/Legal/E&S sign-off, Pooled Municipal Bond SPV Aggregator), Onboard / KYC (self-service KYC registration for Capital Providers and Developers/EPCs with SHA-256 docs), Public data, Legal & compliance (Domestic + Foreign EPC Compliance), Developers & EPCs, Scenarios, Matches, Deal rooms (Common Data Room auto-populated with wizard uploads + Q&A routing), Capital explorer, Flows, Flows map (fixed right-side Flow Intelligence Box so map is never obscured), User guide.',
  ].join(' ');

  return {
    activeTab,
    role,
    jurisdiction,
    focusedCountry,
    projectName: activeProject.name,
    projectId: activeProject.id,
    projectStage: STAGE_LABEL[activeProject.stage] || activeProject.stage,
    projectReadiness: activeProject.readiness,
    openGaps: openGapsList.length,
    projectCapex: `${activeProject.currency} ${(activeProject.capex / 1e6).toFixed(1)}m`,
    activeProjectDetail,
    projectsCatalogSummary,
    relevantProviders: rankedProviders,
    relevantEpcsSummary,
    categorySummary: `${capitalProviders.length} total real institutions: ${categoryCounts}`,
    legalRegimesSummary,
    foreignComplianceSummary,
    scenariosSummary,
    activeEngagementsSummary,
    publicDataSummary,
    platformGuideSummary,
  };
}
