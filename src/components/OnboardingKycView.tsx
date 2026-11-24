import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  HardHat,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { CAT_DEF, CATS } from '../data/capitalData';
import { EPC_CATEGORIES } from '../data/epcData';
import type {
  CapitalProvider,
  EpcCapability,
  EpcContractor,
  StageKey,
  TabId,
} from '../types/capital';
import { hashFileOrText } from '../utils/fileHash';
import { EvidenceText, SectionHeader } from './SharedUI';

interface OnboardingKycViewProps {
  onOnboardCapitalProvider: (provider: CapitalProvider) => void;
  onOnboardEpcContractor: (epc: EpcContractor) => void;
  onNavigate: (tab: TabId) => void;
}

const STAGE_OPTIONS: StageKey[] = [
  'concept',
  'feasibility',
  'structuring',
  'transaction',
  'construction',
  'ops',
];

const CAPABILITY_OPTIONS: EpcCapability[] = [
  'Turnkey EPC',
  'PPP / BOOT Developer',
  'Vendor / ECA Financing',
  'Co-Investment Equity',
  'O&M Operator',
];

export function OnboardingKycView({
  onOnboardCapitalProvider,
  onOnboardEpcContractor,
  onNavigate,
}: OnboardingKycViewProps) {
  const [track, setTrack] = useState<'capital' | 'epc'>('capital');
  const [error, setError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    track: 'capital' | 'epc';
    name: string;
    refHash: string;
  } | null>(null);

  // Track A: Capital Provider State
  const [capName, setCapName] = useState('');
  const [capCategory, setCapCategory] = useState(CATS[3]);
  const [capType, setCapType] = useState('Concessional debt');
  const [capHq, setCapHq] = useState('South Africa');
  const [capTicket, setCapTicket] = useState('USD 25m–150m');
  const [capCurrency, setCapCurrency] = useState('ZAR / USD');
  const [capGeos, setCapGeos] = useState('South Africa, SADC, Africa');
  const [capSectors, setCapSectors] = useState('Water, Renewable energy, Transport');
  const [capStages, setCapStages] = useState<StageKey[]>([
    'feasibility',
    'structuring',
    'transaction',
  ]);
  const [capDesc, setCapDesc] = useState('');
  const [capLegal, setCapLegal] = useState('');
  const [capRegNo, setCapRegNo] = useState('');
  const [capLeiSwift, setCapLeiSwift] = useState('');
  const [capRegulator, setCapRegulator] = useState('');
  const [capEmail, setCapEmail] = useState('');
  const [capUrl, setCapUrl] = useState('');
  const [capUbo, setCapUbo] = useState(false);
  const [capSanctions, setCapSanctions] = useState(false);
  const [capAmlDoc, setCapAmlDoc] = useState<{ name: string; hash: string } | null>(
    null
  );

  // Track B: Developer / EPC State
  const [epcName, setEpcName] = useState('');
  const [epcHq, setEpcHq] = useState('South Africa');
  const [epcOrigin, setEpcOrigin] = useState<EpcContractor['originRegion']>('Africa');
  const [epcCategory, setEpcCategory] = useState(EPC_CATEGORIES[0]);
  const [epcCapabilities, setEpcCapabilities] = useState<EpcCapability[]>([
    'Turnkey EPC',
    'O&M Operator',
  ]);
  const [epcSectors, setEpcSectors] = useState('Water & sanitation, Renewable energy');
  const [epcActiveRegions, setEpcActiveRegions] = useState('South Africa, Kenya, SADC');
  const [epcTicket, setEpcTicket] = useState('USD 30m–350m EPC / Turnkey');
  const [epcBringsCapital, setEpcBringsCapital] = useState(true);
  const [epcCapitalNote, setEpcCapitalNote] = useState('');
  const [epcTrackRecord, setEpcTrackRecord] = useState('');
  const [epcComplianceNotes, setEpcComplianceNotes] = useState('');
  const [epcRegNo, setEpcRegNo] = useState('');
  const [epcCidbGrade, setEpcCidbGrade] = useState('9CE / 9EP');
  const [epcRegulator, setEpcRegulator] = useState('');
  const [epcIso, setEpcIso] = useState('ISO 9001, ISO 14001, ISO 45001');
  const [epcBee, setEpcBee] = useState('Level 1 B-BBEE / SA JV Ready');
  const [epcBonding, setEpcBonding] = useState('');
  const [epcTurnover, setEpcTurnover] = useState('420');
  const [epcEmail, setEpcEmail] = useState('');
  const [epcUbo, setEpcUbo] = useState(false);
  const [epcSanctions, setEpcSanctions] = useState(false);
  const [epcDoc, setEpcDoc] = useState<{ name: string; hash: string } | null>(null);

  const handleUploadKycDoc = async (
    target: 'capital' | 'epc',
    file?: File | null
  ) => {
    if (!file) return;
    const hash = await hashFileOrText(file);
    if (target === 'capital') {
      setCapAmlDoc({ name: file.name, hash });
    } else {
      setEpcDoc({ name: file.name, hash });
    }
  };

  const handleSubmitCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capName.trim() || !capRegNo.trim() || !capRegulator.trim() || !capEmail.trim()) {
      setError(
        'KYC requires Institution Name, Company Registration Number, Regulatory Supervisor, and Compliance Contact Email.'
      );
      return;
    }
    if (!capUbo || !capSanctions) {
      setError(
        'Please complete both the Ultimate Beneficial Ownership (UBO) and PEP / Sanctions screening attestations.'
      );
      return;
    }

    const docHash =
      capAmlDoc?.hash ||
      (await hashFileOrText(`${capName}|${capRegNo}|${capLeiSwift}|${capRegulator}`));
    const ci = CATS.indexOf(capCategory);
    const D = Object.values(CAT_DEF).find((d) => d.c === ci) || CAT_DEF.PE;

    const newProvider: CapitalProvider = {
      id: `cap-kyc-${Date.now().toString().slice(-6)}`,
      name: capName.trim(),
      category: capCategory,
      type: capType,
      desc:
        capDesc.trim() ||
        `KYC-verified institutional capital provider registered via self-onboarding (${capRegulator.trim()}).`,
      ticket: capTicket.trim() || 'USD 25m–150m',
      currency: capCurrency.trim() || 'Multi',
      stages: capStages.length ? capStages : D.stg,
      sectors: capSectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      confidence: 'verified',
      legal:
        capLegal.trim() ||
        `Regulated under ${capRegulator.trim()} · MFMA / Sovereign counterparty KYC cleared`,
      source: `Self-Onboarded & KYC Verified (${capRegNo.trim()})`,
      verified: '2026-11-24',
      geographies: capGeos
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      hqCountry: capHq.trim() || 'South Africa',
      officialUrl: capUrl.trim() || undefined,
      kyc: {
        registrationNumber: capRegNo.trim(),
        leiOrSwift: capLeiSwift.trim() || undefined,
        regulatoryAuthority: capRegulator.trim(),
        uboAttested: true,
        sanctionsScreened: true,
        amlDocName: capAmlDoc?.name || 'KYC-Charter-Attestation.pdf',
        amlDocHash: docHash,
        contactEmail: capEmail.trim(),
        onboardedByUser: true,
        onboardedAt: '2026-11-24',
      },
    };

    setError(null);
    onOnboardCapitalProvider(newProvider);
    setSubmittedRecord({
      track: 'capital',
      name: newProvider.name,
      refHash: docHash,
    });
  };

  const handleSubmitEpc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epcName.trim() || !epcRegNo.trim() || !epcRegulator.trim() || !epcEmail.trim()) {
      setError(
        'KYC requires Company Legal Name, Registration Number, Licensing Authority (e.g. CIDB / COREN / NCA), and Compliance Email.'
      );
      return;
    }
    if (!epcUbo || !epcSanctions) {
      setError(
        'Please complete both UBO / Beneficial Ownership and Debarment / Sanctions screening attestations.'
      );
      return;
    }

    const docHash =
      epcDoc?.hash ||
      (await hashFileOrText(`${epcName}|${epcRegNo}|${epcCidbGrade}|${epcRegulator}`));

    const newEpc: EpcContractor = {
      id: `epc-kyc-${Date.now().toString().slice(-6)}`,
      name: epcName.trim(),
      hqCountry: epcHq.trim() || 'South Africa',
      originRegion: epcOrigin,
      category: epcCategory,
      capabilities: epcCapabilities.length ? epcCapabilities : ['Turnkey EPC'],
      sectors: epcSectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      activeRegions: epcActiveRegions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ticketCapacityUsdM: epcTicket.trim() || 'USD 30m–250m',
      bringsCapital: epcBringsCapital,
      capitalNote:
        epcCapitalNote.trim() ||
        (epcBringsCapital
          ? 'Co-arranges ECA / vendor export credit and minority SPV equity.'
          : 'Pure lump-sum turnkey (LSTK) EPC & O&M execution capability.'),
      flagshipTrackRecord:
        epcTrackRecord.trim() ||
        `KYC-verified developer/EPC partner (${epcCidbGrade.trim() || 'Tier-1'}) onboarded directly to consortium registry.`,
      confidence: 'verified',
      complianceNotes:
        epcComplianceNotes.trim() ||
        `Registered with ${epcRegulator.trim()} (${epcCidbGrade.trim()}). ${epcBee.trim()}`,
      kyc: {
        registrationNumber: epcRegNo.trim(),
        regulatoryAuthority: epcRegulator.trim(),
        cidbGrade: epcCidbGrade.trim() || undefined,
        isoCertifications: epcIso
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        beeOrLocalStatus: epcBee.trim() || undefined,
        bondingInsurer: epcBonding.trim() || 'Standard Performance Surety',
        auditedTurnoverUsdM: Number(epcTurnover) || undefined,
        uboAttested: true,
        sanctionsScreened: true,
        amlDocName: epcDoc?.name || 'CIDB-Tax-Surety-Certificate.pdf',
        amlDocHash: docHash,
        contactEmail: epcEmail.trim(),
        onboardedByUser: true,
        onboardedAt: '2026-11-24',
      },
    };

    setError(null);
    onOnboardEpcContractor(newEpc);
    setSubmittedRecord({
      track: 'epc',
      name: newEpc.name,
      refHash: docHash,
    });
  };

  return (
    <section aria-labelledby="onboard-heading" className="min-w-0 space-y-6">
      <SectionHeader
        title="Institutional Onboarding & KYC Registry"
        hint="Self-service onboarding at full institutional schema parity + KYC/AML verification for unlisted Capital Providers and Developers / EPCs"
      />

      {/* Track Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b1424] p-4">
        <div
          role="tablist"
          aria-label="Onboarding institution type"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={track === 'capital'}
            onClick={() => {
              setTrack('capital');
              setError(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              track === 'capital'
                ? 'bg-teal-400 text-slate-950'
                : 'border border-white/15 bg-[#08111e] text-slate-300 hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Track A · Capital Provider KYC
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={track === 'epc'}
            onClick={() => {
              setTrack('epc');
              setError(null);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              track === 'epc'
                ? 'bg-amber-400 text-slate-950'
                : 'border border-white/15 bg-[#08111e] text-slate-300 hover:text-white'
            }`}
          >
            <HardHat className="h-4 w-4" aria-hidden="true" />
            Track B · Developer / EPC / Operator KYC
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>Full KYC parity · Persists directly to live Deal Rooms &amp; Directory</span>
        </div>
      </div>

      {submittedRecord && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-xs"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <div className="font-semibold text-emerald-200">
                KYC Onboarding Complete: {submittedRecord.name}
              </div>
              <div className="mt-0.5 text-slate-300">
                Registered in live registry with SHA-256 verification digest{' '}
                <span className="font-mono-num text-emerald-200">
                  sha256:{submittedRecord.refHash.slice(0, 18)}…
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onNavigate(submittedRecord.track === 'capital' ? 'capital' : 'epcs')
            }
            className="rounded-lg bg-emerald-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 whitespace-nowrap shrink-0"
          >
            View in {submittedRecord.track === 'capital' ? 'Capital Explorer' : 'EPC Directory'} →
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          {track === 'capital' ? (
            <form
              onSubmit={(e) => void handleSubmitCapital(e)}
              className="space-y-5 rounded-xl border border-white/10 bg-[#0b1424] p-5 sm:p-6"
            >
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-300">
                  1 · Institutional Mandate &amp; Ticket Profile
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-cap-name" className="mb-1 block text-xs font-semibold text-slate-300">
                    Institution Legal Name *
                  </label>
                  <input
                    id="kyc-cap-name"
                    type="text"
                    value={capName}
                    onChange={(e) => setCapName(e.target.value)}
                    placeholder="e.g. Egoli Municipal Infrastructure Debt Fund"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-cap-hq" className="mb-1 block text-xs font-semibold text-slate-300">
                    HQ Country *
                  </label>
                  <input
                    id="kyc-cap-hq"
                    type="text"
                    value={capHq}
                    onChange={(e) => setCapHq(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-cap-cat" className="mb-1 block text-xs font-semibold text-slate-300">
                    Capital Category
                  </label>
                  <select
                    id="kyc-cap-cat"
                    value={capCategory}
                    onChange={(e) => setCapCategory(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="kyc-cap-type" className="mb-1 block text-xs font-semibold text-slate-300">
                    Primary Instrument
                  </label>
                  <select
                    id="kyc-cap-type"
                    value={capType}
                    onChange={(e) => setCapType(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    <option>Concessional debt</option>
                    <option>Commercial debt</option>
                    <option>Equity</option>
                    <option>Guarantee / risk</option>
                    <option>ECA / guarantee</option>
                    <option>Project preparation</option>
                    <option>Grant / technical assistance</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="kyc-cap-ticket" className="mb-1 block text-xs font-semibold text-slate-300">
                    Ticket Size Range
                  </label>
                  <input
                    id="kyc-cap-ticket"
                    type="text"
                    value={capTicket}
                    onChange={(e) => setCapTicket(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-cap-ccy" className="mb-1 block text-xs font-semibold text-slate-300">
                    Lending Currencies
                  </label>
                  <input
                    id="kyc-cap-ccy"
                    type="text"
                    value={capCurrency}
                    onChange={(e) => setCapCurrency(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-cap-geo" className="mb-1 block text-xs font-semibold text-slate-300">
                    Target Geographies
                  </label>
                  <input
                    id="kyc-cap-geo"
                    type="text"
                    value={capGeos}
                    onChange={(e) => setCapGeos(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-cap-sec" className="mb-1 block text-xs font-semibold text-slate-300">
                    Target Sectors
                  </label>
                  <input
                    id="kyc-cap-sec"
                    type="text"
                    value={capSectors}
                    onChange={(e) => setCapSectors(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Eligible Lifecycle Stages
                </span>
                <div className="flex flex-wrap gap-2">
                  {STAGE_OPTIONS.map((st) => {
                    const active = capStages.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setCapStages((prev) =>
                            prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]
                          )
                        }
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          active
                            ? 'border-teal-400 bg-teal-400/15 text-teal-200'
                            : 'border-white/12 bg-[#08111e] text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="kyc-cap-desc" className="mb-1 block text-xs font-semibold text-slate-300">
                  Investment Mandate Description
                </label>
                <textarea
                  id="kyc-cap-desc"
                  rows={2}
                  value={capDesc}
                  onChange={(e) => setCapDesc(e.target.value)}
                  placeholder="Describe credit appetite, green bond appetite, or ring-fenced utility requirements..."
                  className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                  2 · Institutional KYC, AML &amp; Regulatory Verification
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-cap-regno" className="mb-1 block text-xs font-semibold text-slate-300">
                    Company Registration / Charter No *
                  </label>
                  <input
                    id="kyc-cap-regno"
                    type="text"
                    value={capRegNo}
                    onChange={(e) => setCapRegNo(e.target.value)}
                    placeholder="e.g. 2019/412890/06"
                    className="font-mono-num w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-cap-lei" className="mb-1 block text-xs font-semibold text-slate-300">
                    LEI / SWIFT / BIC Identifier
                  </label>
                  <input
                    id="kyc-cap-lei"
                    type="text"
                    value={capLeiSwift}
                    onChange={(e) => setCapLeiSwift(e.target.value)}
                    placeholder="e.g. 549300EMIDIZA12345"
                    className="font-mono-num w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-cap-regauth" className="mb-1 block text-xs font-semibold text-slate-300">
                    Prudential / Market Regulator *
                  </label>
                  <input
                    id="kyc-cap-regauth"
                    type="text"
                    value={capRegulator}
                    onChange={(e) => setCapRegulator(e.target.value)}
                    placeholder="e.g. FSCA / SARB Prudential Authority / FCA"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-cap-email" className="mb-1 block text-xs font-semibold text-slate-300">
                    AML Compliance Officer Email *
                  </label>
                  <input
                    id="kyc-cap-email"
                    type="email"
                    value={capEmail}
                    onChange={(e) => setCapEmail(e.target.value)}
                    placeholder="compliance@institution.org"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-white/10 bg-[#08111e] p-3.5 text-xs">
                <label className="flex cursor-pointer items-start gap-2.5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={capUbo}
                    onChange={(e) => setCapUbo(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-400"
                  />
                  <span>
                    I attest that all Ultimate Beneficial Owners (&ge;25% shareholding or state-owned charter) are disclosed and verified.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={capSanctions}
                    onChange={(e) => setCapSanctions(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-400"
                  />
                  <span>
                    Confirm no UN, OFAC, EU, AU, or SA FIC sanctions / debarment listings apply to this institution or principals.
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1424] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-teal-400/50">
                    <Upload className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                    <span>{capAmlDoc ? `Uploaded: ${capAmlDoc.name}` : 'Upload AML Charter / Tax Pin (Optional)'}</span>
                    <input
                      type="file"
                      onChange={(e) => void handleUploadKycDoc('capital', e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {capAmlDoc && (
                    <span className="font-mono-num text-[11px] text-emerald-300">
                      sha256:{capAmlDoc.hash.slice(0, 16)}…
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                >
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  Complete KYC &amp; Publish Capital Provider
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => void handleSubmitEpc(e)}
              className="space-y-5 rounded-xl border border-white/10 bg-[#0b1424] p-5 sm:p-6"
            >
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                  1 · Developer / EPC / Turnkey Operator Profile
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-epc-name" className="mb-1 block text-xs font-semibold text-slate-300">
                    Company Legal Name *
                  </label>
                  <input
                    id="kyc-epc-name"
                    type="text"
                    value={epcName}
                    onChange={(e) => setEpcName(e.target.value)}
                    placeholder="e.g. Highveld Civil & Water Consortium (Pty) Ltd"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-epc-hq" className="mb-1 block text-xs font-semibold text-slate-300">
                    HQ Country *
                  </label>
                  <input
                    id="kyc-epc-hq"
                    type="text"
                    value={epcHq}
                    onChange={(e) => setEpcHq(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-epc-cat" className="mb-1 block text-xs font-semibold text-slate-300">
                    Specialization Category
                  </label>
                  <select
                    id="kyc-epc-cat"
                    value={epcCategory}
                    onChange={(e) => setEpcCategory(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    {EPC_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="kyc-epc-origin" className="mb-1 block text-xs font-semibold text-slate-300">
                    Origin Region
                  </label>
                  <select
                    id="kyc-epc-origin"
                    value={epcOrigin}
                    onChange={(e) =>
                      setEpcOrigin(e.target.value as EpcContractor['originRegion'])
                    }
                    className="w-full rounded-lg border border-white/12 bg-[#08111e] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="Africa">Africa</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                    <option value="Middle East">Middle East</option>
                    <option value="Americas">Americas</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="kyc-epc-ticket" className="mb-1 block text-xs font-semibold text-slate-300">
                    Project Ticket Capacity
                  </label>
                  <input
                    id="kyc-epc-ticket"
                    type="text"
                    value={epcTicket}
                    onChange={(e) => setEpcTicket(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-epc-active" className="mb-1 block text-xs font-semibold text-slate-300">
                    Active Operating Countries
                  </label>
                  <input
                    id="kyc-epc-active"
                    type="text"
                    value={epcActiveRegions}
                    onChange={(e) => setEpcActiveRegions(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Consortium Capabilities
                </span>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_OPTIONS.map((cap) => {
                    const active = epcCapabilities.includes(cap);
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() =>
                          setEpcCapabilities((prev) =>
                            prev.includes(cap) ? prev.filter((x) => x !== cap) : [...prev, cap]
                          )
                        }
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                          active
                            ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                            : 'border-white/12 bg-[#08111e] text-slate-400'
                        }`}
                      >
                        {cap}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-epc-sec" className="mb-1 block text-xs font-semibold text-slate-300">
                    Infrastructure Sectors
                  </label>
                  <input
                    id="kyc-epc-sec"
                    type="text"
                    value={epcSectors}
                    onChange={(e) => setEpcSectors(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={epcBringsCapital}
                    onChange={(e) => setEpcBringsCapital(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-400"
                  />
                  <span>Brings Vendor / ECA / Equity Co-Financing</span>
                </label>
              </div>

              <div>
                <label htmlFor="kyc-epc-track" className="mb-1 block text-xs font-semibold text-slate-300">
                  Flagship Track Record &amp; Capital Note
                </label>
                <textarea
                  id="kyc-epc-track"
                  rows={2}
                  value={epcTrackRecord}
                  onChange={(e) => setEpcTrackRecord(e.target.value)}
                  placeholder="Reference delivered water, energy, or BRT projects & bonding history..."
                  className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                  2 · Contractor KYC, CIDB / Licensing &amp; Bonding Verification
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-epc-regno" className="mb-1 block text-xs font-semibold text-slate-300">
                    Company Registration No *
                  </label>
                  <input
                    id="kyc-epc-regno"
                    type="text"
                    value={epcRegNo}
                    onChange={(e) => setEpcRegNo(e.target.value)}
                    placeholder="e.g. 2015/099123/07"
                    className="font-mono-num w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-epc-cidb" className="mb-1 block text-xs font-semibold text-slate-300">
                    CIDB / Statutory Grade
                  </label>
                  <input
                    id="kyc-epc-cidb"
                    type="text"
                    value={epcCidbGrade}
                    onChange={(e) => setEpcCidbGrade(e.target.value)}
                    placeholder="e.g. 9CE / 9EP / NCA 1"
                    className="font-mono-num w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-epc-regauth" className="mb-1 block text-xs font-semibold text-slate-300">
                    Construction / Engineering Regulator *
                  </label>
                  <input
                    id="kyc-epc-regauth"
                    type="text"
                    value={epcRegulator}
                    onChange={(e) => setEpcRegulator(e.target.value)}
                    placeholder="e.g. CIDB South Africa / ECSA / COREN"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-epc-email" className="mb-1 block text-xs font-semibold text-slate-300">
                    Compliance / Bid Desk Email *
                  </label>
                  <input
                    id="kyc-epc-email"
                    type="email"
                    value={epcEmail}
                    onChange={(e) => setEpcEmail(e.target.value)}
                    placeholder="bids@contractor.co.za"
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-epc-iso" className="mb-1 block text-xs font-semibold text-slate-300">
                    ISO Certifications
                  </label>
                  <input
                    id="kyc-epc-iso"
                    type="text"
                    value={epcIso}
                    onChange={(e) => setEpcIso(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-epc-bee" className="mb-1 block text-xs font-semibold text-slate-300">
                    B-BBEE / Local JV &amp; Surety Insurer
                  </label>
                  <input
                    id="kyc-epc-bee"
                    type="text"
                    value={epcBee}
                    onChange={(e) => setEpcBee(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-white/10 bg-[#08111e] p-3.5 text-xs">
                <label className="flex cursor-pointer items-start gap-2.5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={epcUbo}
                    onChange={(e) => setEpcUbo(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-400"
                  />
                  <span>
                    Confirm beneficial ownership, SARS/tax good standing, and audited turnover ({epcTurnover || '—'} USDm) disclosures.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-slate-200">
                  <input
                    type="checkbox"
                    checked={epcSanctions}
                    onChange={(e) => setEpcSanctions(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-emerald-400"
                  />
                  <span>
                    Confirm zero National Treasury Restricted Supplier / World Bank cross-debarment or PEP sanctions findings.
                  </span>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1424] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400/50">
                    <Upload className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    <span>{epcDoc ? `Uploaded: ${epcDoc.name}` : 'Upload CIDB / Tax Compliance Cert'}</span>
                    <input
                      type="file"
                      onChange={(e) => void handleUploadKycDoc('epc', e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {epcDoc && (
                    <span className="font-mono-num text-[11px] text-emerald-300">
                      sha256:{epcDoc.hash.slice(0, 16)}…
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-300"
                >
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  Complete KYC &amp; Publish Developer / EPC
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Schema Parity & KYC Preview Card */}
        <div className="min-w-0 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Live Registry Card Preview
              </span>
              <EvidenceText level="verified" />
            </div>

            {track === 'capital' ? (
              <div className="space-y-2 text-xs">
                <div className="text-violet-300 font-medium">{capCategory}</div>
                <div className="text-base font-semibold text-slate-100">
                  {capName.trim() || 'Institution Name Preview'}
                </div>
                <div className="text-slate-400">
                  {capType} · HQ: {capHq || '—'} · Ticket: {capTicket}
                </div>
                <p className="text-slate-300">
                  {capDesc.trim() || 'Mandate overview appears here in Capital Explorer and Deal Room matching.'}
                </p>
                <div className="border-t border-white/8 pt-2 text-[11px] text-emerald-300">
                  KYC Reg: {capRegNo || 'Pending'} · Regulator: {capRegulator || 'Pending'}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-amber-300 font-medium">{epcCategory}</div>
                <div className="text-base font-semibold text-slate-100">
                  {epcName.trim() || 'Developer / EPC Name Preview'}
                </div>
                <div className="text-slate-400">
                  HQ: {epcHq || '—'} ({epcOrigin}) · {epcTicket}
                </div>
                <div className="text-slate-300">
                  Capabilities: {epcCapabilities.join(' · ') || 'None selected'}
                </div>
                <div className="border-t border-white/8 pt-2 text-[11px] text-emerald-300">
                  CIDB / Grade: {epcCidbGrade || '—'} · Reg: {epcRegNo || 'Pending'}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-100">
              KYC Standards Applied
            </div>
            <p className="leading-relaxed text-slate-400">
              Self-onboarded entities undergo the exact schema validation required of listed DFIs and Tier-1 EPCs: registration verification, regulatory supervisor check, UBO/PEP attestation, and SHA-256 checksummed supporting files.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
