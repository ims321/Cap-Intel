import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileUp,
  Layers,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { JURISDICTION_OPTIONS, STAGE_LABEL } from '../data/capitalData';
import {
  COJ_ENTITIES,
  COJ_GDS_PILLARS,
  COJ_MFMA_OPTIONS,
  COJ_REVENUE_MODELS,
  createDefaultLineFunctionTasks,
  evaluateCojGreenBondEligibility,
} from '../data/joburgData';
import type {
  LineFunctionDept,
  LineFunctionTask,
  ProjectGap,
  StageKey,
  UploadedProjectDoc,
} from '../types/capital';
import {
  convertCapexAcrossLendingCurrencies,
  getCurrencySpec,
  getJurisdictionCurrencyProfile,
} from '../utils/currencies';
import { formatBytes, hashFileOrText } from '../utils/fileHash';

export interface IntakeWizardSubmitPayload {
  name: string;
  sector: string;
  stage: StageKey;
  capexM: number;
  currency: string;
  jurisdictionKey: string;
  desc: string;
  cojEntity?: string;
  gdsPillar?: string;
  mfmaClassification?: string;
  revenueModel?: string;
  greenBondEligible: boolean;
  wardOrNode?: string;
  readiness: number;
  gaps: ProjectGap[];
  uploadedDocs: UploadedProjectDoc[];
  lineFunctionTasks: LineFunctionTask[];
  autoOpenDealRoom: boolean;
}

interface ProjectIntakeWizardModalProps {
  open: boolean;
  jurisdiction?: string;
  onClose: () => void;
  onCreate: (payload: IntakeWizardSubmitPayload) => void;
}

const DATA_ROOM_FOLDERS = [
  '01-Mandate & Legal',
  '02-Technical & EPC',
  '03-Financial',
  '04-E&S',
];

const STATUTORY_PERMIT_ITEMS = [
  { id: 'council', label: 'Mayoral / Council Resolution Tabled (MFMA s46 / s33)' },
  { id: 'eia', label: 'Environmental Impact Assessment (EIA / BAR) Initiated' },
  { id: 'water_nersa', label: 'Sector License (DWS WULA / NERSA Generation / Licensing)' },
  { id: 'feasibility', label: 'National Treasury / MFMA s120 Feasibility Study' },
];

export function ProjectIntakeWizardModal({
  open,
  jurisdiction = 'za-metro',
  onClose,
  onCreate,
}: ProjectIntakeWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Mandate & Spatial Identity
  const [name, setName] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(jurisdiction);
  const [cojEntity, setCojEntity] = useState(COJ_ENTITIES[0].name);
  const [sector, setSector] = useState('Water & sanitation');
  const [gdsPillar, setGdsPillar] = useState(COJ_GDS_PILLARS[0]);
  const [wardOrNode, setWardOrNode] = useState('');
  const [desc, setDesc] = useState('');

  // Step 2: Capex, Currency & MFMA Revenue Model
  const currencyProfile = useMemo(
    () => getJurisdictionCurrencyProfile(selectedJurisdiction),
    [selectedJurisdiction]
  );
  const [currencyCode, setCurrencyCode] = useState(currencyProfile.defaultLocalCode);
  const [capex, setCapex] = useState('');
  const [revenueModel, setRevenueModel] = useState(COJ_REVENUE_MODELS[0]);
  const [mfmaClassification, setMfmaClassification] = useState(COJ_MFMA_OPTIONS[0]);
  const [greenBondOverride, setGreenBondOverride] = useState<boolean | null>(null);

  // Step 3: Stage, Statutory Permits & Line-Function Delegation
  const [stage, setStage] = useState<StageKey>('feasibility');
  const [checkedPermits, setCheckedPermits] = useState<string[]>(['council']);
  const [delegatedDepts, setDelegatedDepts] = useState<Record<LineFunctionDept, boolean>>({
    engineering: true,
    finance: true,
    legal: true,
    esg: true,
  });
  const [deptAssignees, setDeptAssignees] = useState<Record<LineFunctionDept, string>>({
    engineering: 'Chief Engineer (Line Utility)',
    finance: 'Deputy Director: Capital Finance',
    legal: 'Senior Legal Advisor: MFMA & PPPs',
    esg: 'E&S & Green Bond Specialist',
  });

  // Step 4: Document Upload & Common Data Room Seeding
  const [uploadFolder, setUploadFolder] = useState(DATA_ROOM_FOLDERS[1]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedProjectDoc[]>([]);
  const [autoOpenDealRoom, setAutoOpenDealRoom] = useState(true);
  const [hashingFiles, setHashingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setSelectedJurisdiction(jurisdiction);
    setCurrencyCode(getJurisdictionCurrencyProfile(jurisdiction).defaultLocalCode);
  }, [open, jurisdiction]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleJurisdictionChange = (nextKey: string) => {
    setSelectedJurisdiction(nextKey);
    setCurrencyCode(getJurisdictionCurrencyProfile(nextKey).defaultLocalCode);
  };

  const activeCurrencySpec = getCurrencySpec(currencyCode);
  const numericCapex = parseFloat(capex);
  const convertedRows = useMemo(
    () =>
      convertCapexAcrossLendingCurrencies(
        !Number.isNaN(numericCapex) && numericCapex > 0 ? numericCapex : 0,
        currencyCode,
        selectedJurisdiction
      ),
    [numericCapex, currencyCode, selectedJurisdiction]
  );

  const greenBondEval = useMemo(
    () =>
      evaluateCojGreenBondEligibility({
        sector,
        desc: `${name} ${desc}`,
        greenBondFlag: greenBondOverride ?? undefined,
      }),
    [sector, name, desc, greenBondOverride]
  );

  const computedReadiness = useMemo(() => {
    const baseByStage: Record<StageKey, number> = {
      concept: 22,
      feasibility: 40,
      structuring: 58,
      transaction: 72,
      construction: 85,
      ops: 92,
    };
    const permitBonus = checkedPermits.length * 4;
    const docBonus = Math.min(12, uploadedDocs.length * 4);
    return Math.min(95, baseByStage[stage] + permitBonus + docBonus);
  }, [stage, checkedPermits.length, uploadedDocs.length]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setHashingFiles(true);
    try {
      const nextDocs: UploadedProjectDoc[] = [];
      for (const f of Array.from(files)) {
        const digest = await hashFileOrText(f);
        nextDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: f.name,
          folder: uploadFolder,
          sizeBytes: f.size,
          mimeType: f.type || 'application/octet-stream',
          sha256: digest,
          uploadedAt: '2026-11-24',
          uploadedBy: 'Borrower Executive Sponsor',
        });
      }
      setUploadedDocs((prev) => [...prev, ...nextDocs]);
    } finally {
      setHashingFiles(false);
    }
  };

  const handleRegisterSampleDoc = async () => {
    const sampleName =
      uploadFolder === '01-Mandate & Legal'
        ? 'CoJ Council s46 Authority Briefing Note.pdf'
        : uploadFolder === '02-Technical & EPC'
          ? 'Line Function Preliminary BOQ & Scoping Memo.pdf'
          : uploadFolder === '03-Financial'
            ? 'Ring-Fenced Tariff & DSCR Cashflow Model.xlsx'
            : 'ICMA Green Bond Use-of-Proceeds Screening.pdf';
    const digest = await hashFileOrText(`${sampleName}:${name || 'coj-mandate'}:${Date.now()}`);
    setUploadedDocs((prev) => [
      ...prev,
      {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: sampleName,
        folder: uploadFolder,
        sizeBytes: 428400,
        mimeType: 'application/pdf',
        sha256: digest,
        uploadedAt: '2026-11-24',
        uploadedBy: 'Borrower Executive Sponsor',
      },
    ]);
  };

  const isSouthAfricaMetro = selectedJurisdiction === 'za-metro';

  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1 && !name.trim()) {
      setError('Step 1 requires a project title before proceeding.');
      return false;
    }
    if (targetStep === 2) {
      if (Number.isNaN(numericCapex) || numericCapex <= 0) {
        setError('Step 2 requires a valid positive Capex amount in millions.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const handleFinish = () => {
    if (!validateStep(1) || !validateStep(2)) return;

    const baseTasks = createDefaultLineFunctionTasks(
      isSouthAfricaMetro ? cojEntity : 'Municipal Authority',
      stage
    );
    const activeTasks: LineFunctionTask[] = baseTasks
      .filter((t) => delegatedDepts[t.dept])
      .map((t) => ({
        ...t,
        status: 'Requested',
        assigneeName: deptAssignees[t.dept] || t.assigneeName,
        notes: `Delegated during executive intake wizard for ${name.trim()}.`,
      }));

    const missingPermits = STATUTORY_PERMIT_ITEMS.filter(
      (item) => !checkedPermits.includes(item.id)
    );
    const generatedGaps: ProjectGap[] = missingPermits.slice(0, 3).map((item) => ({
      gap: `Complete ${item.label}`,
      severity: item.id === 'council' || item.id === 'feasibility' ? 'critical' : 'high',
      stage: STAGE_LABEL[stage],
      remedy: `Assign to line function & upload verified evidence to ${DATA_ROOM_FOLDERS[0]}`,
      status: 'Open',
    }));

    if (generatedGaps.length === 0) {
      generatedGaps.push({
        gap: 'Finalize ring-fenced cash waterfall & Second-Party Opinion',
        severity: 'medium',
        stage: STAGE_LABEL[stage],
        remedy: 'Lock DFI/Green Bond tranche mix in Scenarios Wizard',
        status: 'Open',
      });
    }

    onCreate({
      name: name.trim(),
      sector,
      stage,
      capexM: numericCapex,
      currency: currencyCode,
      jurisdictionKey: selectedJurisdiction,
      desc:
        desc.trim() ||
        `${isSouthAfricaMetro ? `${cojEntity} mandate under ${gdsPillar}. ` : ''}Executive borrower project registered via 4-step intake wizard.`,
      cojEntity: isSouthAfricaMetro ? cojEntity : undefined,
      gdsPillar: isSouthAfricaMetro ? gdsPillar : undefined,
      mfmaClassification: isSouthAfricaMetro ? mfmaClassification : undefined,
      revenueModel,
      greenBondEligible: greenBondEval.eligible,
      wardOrNode: wardOrNode.trim() || undefined,
      readiness: computedReadiness,
      gaps: generatedGaps,
      uploadedDocs,
      lineFunctionTasks: activeTasks.length > 0 ? activeTasks : baseTasks,
      autoOpenDealRoom,
    });

    setName('');
    setWardOrNode('');
    setDesc('');
    setCapex('');
    setUploadedDocs([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Borrower Project Intake & Upload Wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070f]/85 p-3 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-amber-400/25 bg-[#0b1424] p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Borrower-Only Project Origination · Step {step} of 4
            </div>
            <h3 className="font-display mt-1 text-xl font-medium text-slate-50">
              Project Intake, Line-Function Delegation &amp; Data Room Wizard
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Structure project metadata, assign technical/finance line functionaries, and upload SHA-256 hashed files directly into your Deal Room.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close intake wizard"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { num: 1, label: '01 · Identity & CoJ MOE' },
            { num: 2, label: '02 · Capex & MFMA' },
            { num: 3, label: '03 · Line Delegation' },
            { num: 4, label: '04 · File Upload' },
          ].map((item) => {
            const active = step === item.num;
            const done = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num < step || validateStep(step)) {
                    setError(null);
                    setStep(item.num);
                  }
                }}
                className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                  active
                    ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                    : done
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                      : 'border-white/10 bg-[#08111e] text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="block truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-400/35 bg-rose-400/10 px-3.5 py-2.5 text-xs text-rose-200"
          >
            {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="wiz-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Project / Mandate Title *
              </label>
              <input
                id="wiz-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Power Soweto Microgrid & BESS Phase 2"
                className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wiz-jur"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Jurisdiction
                </label>
                <select
                  id="wiz-jur"
                  value={selectedJurisdiction}
                  onChange={(e) => handleJurisdictionChange(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/60 focus:outline-none"
                >
                  {JURISDICTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-sector"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Infrastructure Sector
                </label>
                <select
                  id="wiz-sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/60 focus:outline-none"
                >
                  <option>Water &amp; sanitation</option>
                  <option>Renewable energy</option>
                  <option>Transport / logistics</option>
                  <option>Municipal services</option>
                  <option>Climate adaptation</option>
                </select>
              </div>
            </div>

            {isSouthAfricaMetro && (
              <div className="grid gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wiz-coj-entity"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-amber-300"
                  >
                    City of Johannesburg MOE / Department
                  </label>
                  <select
                    id="wiz-coj-entity"
                    value={cojEntity}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCojEntity(next);
                      const found = COJ_ENTITIES.find((c) => c.name === next);
                      if (found) setSector(found.sectorFocus);
                    }}
                    className="w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-amber-400/60 focus:outline-none"
                  >
                    {COJ_ENTITIES.map((ent) => (
                      <option key={ent.id} value={ent.name}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wiz-gds"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-amber-300"
                  >
                    Joburg 2040 GDS Alignment
                  </label>
                  <select
                    id="wiz-gds"
                    value={gdsPillar}
                    onChange={(e) => setGdsPillar(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-amber-400/60 focus:outline-none"
                  >
                    {COJ_GDS_PILLARS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wiz-ward"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Spatial Node / Region / Ward (Optional)
                </label>
                <input
                  id="wiz-ward"
                  type="text"
                  value={wardOrNode}
                  onChange={(e) => setWardOrNode(e.target.value)}
                  placeholder="e.g. Region D · Soweto / Region F Inner City"
                  className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="wiz-desc"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Executive Scope &amp; Outcome Summary
                </label>
                <input
                  id="wiz-desc"
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Problem statement, beneficiaries & catalytic asset outcome"
                  className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="wiz-capex"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Total Capex ({activeCurrencySpec.name} — {activeCurrencySpec.symbol} millions) *
                </label>
                <div className="flex items-center gap-2">
                  <label htmlFor="wiz-ccy" className="text-[11px] text-slate-400">
                    Currency:
                  </label>
                  <select
                    id="wiz-ccy"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="rounded-md border border-white/15 bg-[#0d1829] px-2 py-1 text-xs font-semibold text-teal-200 focus:outline-none"
                  >
                    {currencyProfile.selectableInputCodes.map((code) => {
                      const spec = getCurrencySpec(code);
                      return (
                        <option key={code} value={code}>
                          {spec.code} ({spec.symbol})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="font-mono-num pointer-events-none absolute left-3 text-sm font-bold text-teal-300">
                  {activeCurrencySpec.symbol}
                </span>
                <input
                  id="wiz-capex"
                  type="number"
                  min="1"
                  step="any"
                  value={capex}
                  onChange={(e) => setCapex(e.target.value)}
                  placeholder={`e.g. 680 (${activeCurrencySpec.code}m)`}
                  className="font-mono-num w-full rounded-lg border border-white/15 bg-white/[0.04] py-2.5 pl-14 pr-28 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none"
                />
                <span className="font-mono-num pointer-events-none absolute right-3 text-xs font-semibold text-slate-400">
                  {activeCurrencySpec.code} million
                </span>
              </div>

              {numericCapex > 0 && (
                <div className="grid gap-2 border-t border-white/8 pt-3 sm:grid-cols-3">
                  {convertedRows.slice(0, 3).map((row) => (
                    <div
                      key={row.code}
                      className={`rounded-lg border px-2.5 py-2 ${
                        row.isBaseInput
                          ? 'border-teal-400/45 bg-teal-400/10'
                          : 'border-white/8 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-semibold text-slate-300">{row.code}</span>
                        <span className="font-mono-num font-bold text-slate-100">
                          {row.formattedMillions}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wiz-rev"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Revenue &amp; Repayment Ring-Fencing
                </label>
                <select
                  id="wiz-rev"
                  value={revenueModel}
                  onChange={(e) => setRevenueModel(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/60 focus:outline-none"
                >
                  {COJ_REVENUE_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="wiz-mfma"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Statutory Authority Route
                </label>
                <select
                  id="wiz-mfma"
                  value={mfmaClassification}
                  onChange={(e) => setMfmaClassification(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/60 focus:outline-none"
                >
                  {COJ_MFMA_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CoJ Green Bond Assessment */}
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-emerald-300">
                    Green Bond / Sustainability-Linked Classification:
                  </span>{' '}
                  <span className="text-slate-200">{greenBondEval.icmaCategory}</span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={greenBondEval.eligible}
                    onChange={(e) => setGreenBondOverride(e.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-400"
                  />
                  <span>Tag Green / SLB Eligible (-{greenBondEval.estimatedGreeniumBps} bps est.)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wiz-stage"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Current Lifecycle Stage
                </label>
                <select
                  id="wiz-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as StageKey)}
                  className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/60 focus:outline-none"
                >
                  <option value="concept">01 · Concept</option>
                  <option value="feasibility">02 · Feasibility</option>
                  <option value="structuring">03 · Structuring</option>
                  <option value="transaction">04 · Transaction</option>
                </select>
              </div>

              <div className="rounded-xl border border-teal-400/25 bg-teal-400/[0.06] px-4 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
                  Live Projected Readiness Score
                </div>
                <div className="font-mono-num mt-0.5 text-2xl font-bold text-slate-50">
                  {computedReadiness}/100
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                Completed Statutory &amp; Technical Gates
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STATUTORY_PERMIT_ITEMS.map((item) => {
                  const checked = checkedPermits.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/8 bg-[#0b1424] px-3 py-2 text-xs text-slate-200 hover:border-white/20"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCheckedPermits((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((x) => x !== item.id)
                              : [...prev, item.id]
                          )
                        }
                        className="h-3.5 w-3.5 accent-teal-400"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>Executive-to-Line-Function Delegation Setup</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Executives initiate the strategic mandate; line functionaries populate engineering capacities, MTREF votes, and environmental permits in the Workspace collaboration desk.
              </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    { dept: 'engineering', label: 'Engineering & BOQ Desk' },
                    { dept: 'finance', label: 'MOE Finance & Group Treasury' },
                    { dept: 'legal', label: 'Group Legal & MFMA Compliance' },
                    { dept: 'esg', label: 'E&S / WULA & Green Bond Desk' },
                  ] as const
                ).map((d) => (
                  <div
                    key={d.dept}
                    className="rounded-lg border border-white/10 bg-[#0b1424] p-2.5 text-xs"
                  >
                    <label className="flex cursor-pointer items-center justify-between gap-2 font-semibold text-slate-200">
                      <span>{d.label}</span>
                      <input
                        type="checkbox"
                        checked={delegatedDepts[d.dept]}
                        onChange={(e) =>
                          setDelegatedDepts((prev) => ({
                            ...prev,
                            [d.dept]: e.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 accent-amber-400"
                      />
                    </label>
                    <input
                      type="text"
                      value={deptAssignees[d.dept]}
                      onChange={(e) =>
                        setDeptAssignees((prev) => ({
                          ...prev,
                          [d.dept]: e.target.value,
                        }))
                      }
                      aria-label={`${d.label} assigned officer`}
                      className="mt-2 w-full rounded border border-white/10 bg-[#08111e] px-2 py-1 text-[11px] text-slate-200 focus:border-amber-400/50 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-dashed border-teal-400/40 bg-[#08111e] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  <span>Upload Bankability &amp; Statutory Package (SHA-256 Verified)</span>
                </div>
                <select
                  aria-label="Target Common Data Room Folder"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                >
                  {DATA_ROOM_FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  aria-label="Choose project documents to upload"
                  onChange={(e) => {
                    void handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={hashingFiles}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                >
                  <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {hashingFiles ? 'Computing SHA-256…' : 'Choose Files (PDF, XLSX, DOCX)'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRegisterSampleDoc()}
                  className="rounded-lg border border-white/15 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 whitespace-nowrap shrink-0"
                >
                  + Attach Standard {uploadFolder.split('-')[1]} Pack
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Every uploaded document receives a local WebCrypto SHA-256 integrity hash and seeds the Common Data Room automatically.
              </p>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#08111e] p-3.5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Staged Documents ({uploadedDocs.length})
                </div>
                <div className="divide-y divide-white/8">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-100">
                          <span className="text-teal-300">{doc.folder}/</span>
                          {doc.name}
                        </div>
                        <div className="font-mono-num text-[10px] text-slate-400">
                          {formatBytes(doc.sizeBytes)} · sha256:{doc.sha256.slice(0, 18)}…
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedDocs((prev) => prev.filter((x) => x.id !== doc.id))
                        }
                        aria-label={`Remove ${doc.name}`}
                        className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Layers className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>Executive Intake Summary</span>
              </div>
              <div className="grid gap-2 text-slate-300 sm:grid-cols-2">
                <div>
                  Mandate: <strong className="text-white">{name || '—'}</strong>
                </div>
                <div>
                  Capex:{' '}
                  <strong className="font-mono-num text-teal-300">
                    {activeCurrencySpec.symbol}
                    {numericCapex || 0}m {currencyCode}
                  </strong>
                </div>
                <div>
                  MOE / Sponsor:{' '}
                  <strong className="text-amber-200">
                    {isSouthAfricaMetro ? cojEntity : currencyProfile.countryName}
                  </strong>
                </div>
                <div>
                  Projected Readiness:{' '}
                  <strong className="font-mono-num text-emerald-300">
                    {computedReadiness}/100
                  </strong>
                </div>
              </div>

              <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-2.5 text-slate-300">
                <input
                  type="checkbox"
                  checked={autoOpenDealRoom}
                  onChange={(e) => setAutoOpenDealRoom(e.target.checked)}
                  className="h-3.5 w-3.5 accent-teal-400"
                />
                <span>
                  Automatically initialize an NDA-ready Deal Room &amp; seed uploaded files into Common Data Room
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Borrower-only intake · Audit &amp; line-function tasks persisted</span>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                ← Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-teal-400 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
              >
                Continue to Step {step + 1} →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Submit Project to Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
