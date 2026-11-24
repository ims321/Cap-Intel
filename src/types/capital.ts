export type Role = 'borrower' | 'provider' | 'epc';

export type TabId =
  | 'overview'
  | 'coj'
  | 'projects'
  | 'workspace'
  | 'legal'
  | 'scenarios'
  | 'matches'
  | 'dealroom'
  | 'epcs'
  | 'onboard'
  | 'capital'
  | 'flows'
  | 'map'
  | 'mandate'
  | 'opps'
  | 'pipeline'
  | 'publicdata'
  | 'guide';

export type StageKey =
  | 'concept'
  | 'feasibility'
  | 'structuring'
  | 'transaction'
  | 'construction'
  | 'ops';

export type ConfidenceLevel =
  | 'verified'
  | 'published'
  | 'open'
  | 'precedent'
  | 'mandate'
  | 'inferred';

export type EngagementStatus = 'none' | 'interest' | 'nda' | 'terms' | 'closed';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type GapStatus = 'Open' | 'In progress' | 'Closed';

export interface InstitutionKycRecord {
  registrationNumber: string;
  leiOrSwift?: string;
  regulatoryAuthority: string;
  uboAttested: boolean;
  sanctionsScreened: boolean;
  amlDocName?: string;
  amlDocHash?: string;
  contactEmail?: string;
  onboardedByUser?: boolean;
  onboardedAt?: string;
}

export interface EpcKycRecord extends InstitutionKycRecord {
  cidbGrade?: string;
  isoCertifications?: string[];
  beeOrLocalStatus?: string;
  bondingInsurer?: string;
  auditedTurnoverUsdM?: number;
}

export interface CapitalProvider {
  id: string;
  name: string;
  category: string;
  type: string;
  desc: string;
  ticket: string;
  currency: string;
  stages: StageKey[];
  sectors: string[];
  confidence: ConfidenceLevel;
  legal: string;
  source: string;
  verified: string;
  geographies: string[];
  hqCountry?: string;
  overlooked?: boolean;
  nontraditionalTag?: string;
  officialUrl?: string;
  kyc?: InstitutionKycRecord;
}

export type EpcCapability =
  | 'Turnkey EPC'
  | 'PPP / BOOT Developer'
  | 'Vendor / ECA Financing'
  | 'Co-Investment Equity'
  | 'O&M Operator';

export interface EpcContractor {
  id: string;
  name: string;
  hqCountry: string;
  originRegion: 'Africa' | 'Europe' | 'Asia-Pacific' | 'Middle East' | 'Americas';
  category: string;
  capabilities: EpcCapability[];
  sectors: string[];
  activeRegions: string[];
  ticketCapacityUsdM: string;
  bringsCapital: boolean;
  capitalNote: string;
  flagshipTrackRecord: string;
  confidence: ConfidenceLevel;
  complianceNotes: string;
  officialUrl?: string;
  kyc?: EpcKycRecord;
}

export interface ForeignComplianceGuide {
  jurisdictionKey: string;
  countryName: string;
  regulatorRegistration: string;
  localContentRule: string;
  fxRepatriationRule: string;
  taxAndPeRule: string;
  pppProcurementAct: string;
  workPermitsAndStandards: string;
  riskLevel: 'Streamlined' | 'Moderate Complexity' | 'High Localization';
  reviewed: string;
}

export interface ProjectStage {
  name: string;
  key: StageKey;
  status: 'complete' | 'active' | 'pending';
  activities: string[];
  outputs: string;
  completedActivities?: string[];
}

export interface ProjectGap {
  gap: string;
  severity: SeverityLevel;
  stage: string;
  remedy: string;
  status: GapStatus;
}

export type LineFunctionDept = 'engineering' | 'finance' | 'legal' | 'esg';

export type LineFunctionStatus =
  | 'Requested'
  | 'Drafted'
  | 'Dept Verified'
  | 'Executive Approved';

export interface LineFunctionTask {
  dept: LineFunctionDept;
  label: string;
  assigneeRole: string;
  assigneeName: string;
  dueDate: string;
  status: LineFunctionStatus;
  requestedFields: Array<{
    key: string;
    label: string;
    value: string;
    unit?: string;
    placeholder?: string;
  }>;
  notes?: string;
  updatedAt?: string;
}

export interface UploadedProjectDoc {
  id: string;
  name: string;
  folder: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Project {
  id: string;
  name: string;
  sector: string;
  jurisdiction: string;
  stage: StageKey;
  capex: number;
  currency: string;
  updated: string;
  readiness: number;
  desc: string;
  stages: ProjectStage[];
  gaps: ProjectGap[];
  sourceCategory?: OfficialPipelineSource;
  authorityName?: string;
  rec?: 'SADC' | 'EAC' | 'ECOWAS' | 'COMESA' | 'ECCAS' | 'North Africa' | 'Continental';
  agendaAlignment?: string;
  financingGap?: string;
  recommendedOverlookedCapital?: string[];
  cojEntity?: string;
  gdsPillar?: string;
  mfmaClassification?: string;
  revenueModel?: string;
  greenBondEligible?: boolean;
  wardOrNode?: string;
  uploadedDocs?: UploadedProjectDoc[];
  lineFunctionTasks?: LineFunctionTask[];
}

export interface DealRoomMessage {
  id: string;
  author: string;
  authorRole?: Role;
  date: string;
  text: string;
}

export type DealDocumentKind =
  | 'nda'
  | 'rfi'
  | 'termsheet'
  | 'closememo'
  | 'dataroom_doc'
  | 'ppa_offtake'
  | 'epc_wrap'
  | 'ppp_gate';

export interface ExecutedDocRecord {
  docKind: DealDocumentKind;
  title: string;
  signatory: string;
  signatoryTitle: string;
  counterpartyRep: string;
  governingLaw: string;
  executedAt: string;
  referenceCode: string;
  auditHash?: string;
}

export interface Engagement {
  status: EngagementStatus;
  date: string;
  note: string;
  epcPartnerId?: string;
  epcPartnerName?: string;
  customDataRoomDocs?: Array<{
    folder: string;
    name: string;
    uploadedBy: string;
    status: string;
  }>;
  qaLog?: DealRoomMessage[];
  auditTrail?: { date: string; event: string }[];
  executedDocs?: Partial<Record<DealDocumentKind, ExecutedDocRecord>>;
}

export type OfficialPipelineSource =
  | 'AU Agenda 2063 / PIDA'
  | 'Multilateral / DFI'
  | 'National Official Agency';

export interface OfficialPipelineProject {
  id: string;
  name: string;
  sourceCategory: OfficialPipelineSource;
  authorityName: string;
  country: string;
  jurisdictionKey: string;
  rec: 'SADC' | 'EAC' | 'ECOWAS' | 'COMESA' | 'ECCAS' | 'North Africa' | 'Continental';
  sector: string;
  stage: StageKey;
  capexUsdM: number;
  financingGap: string;
  summary: string;
  agendaAlignment: string;
  recommendedOverlookedCapital: string[];
  lastVerified: string;
}

export type LegalRuleStatus =
  | 'prohibition'
  | 'conditional'
  | 'approval'
  | 'allowed'
  | 'unsettled';

export interface LegalRule {
  q: string;
  status: LegalRuleStatus;
  cite: string;
  note: string;
  reviewed: string;
}

export interface JurisdictionLegalProfile {
  summary: string;
  rules: LegalRule[];
}

export interface ScenarioComponent {
  label: string;
  amount: number;
  rate: number;
  years: number;
  grace: number;
  ccy: string;
  fl?: number;
  grant?: boolean;
}

export interface FinancingScenario {
  id: string;
  name: string;
  desc: string;
  components: ScenarioComponent[];
  legal: string;
  time: string;
  recommended?: boolean;
}

export interface ScenarioResult {
  annual: number;
  total: number;
  fxExposed: number;
  debt: number;
  grant: number;
  interest: number;
}

export type FlowInstrumentType = 'dfi' | 'commercial' | 'eca' | 'grant';

export interface FlowArc {
  from: string;
  to: string;
  vol: number;
  type: FlowInstrumentType;
  sector?: string;
}

export interface FlowInstrumentShare {
  name: string;
  pct: number;
  color: string;
}

export interface FlowDriver {
  title: string;
  text: string;
}

export interface TransactionRecord {
  project: string;
  country: string;
  providers: string;
  structure: string;
  amount: string;
  year: string;
  status: 'Closed' | 'Implementation' | 'Preparation';
}

export interface ProviderMandate {
  institution: string;
  type: string;
  ticketSize: string;
  geographies: string;
  sectors: string[];
  notes: string;
}
