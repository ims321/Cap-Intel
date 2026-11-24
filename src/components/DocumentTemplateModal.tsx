import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Download, FileCheck2, FileText, ShieldCheck, X } from 'lucide-react';
import type {
  CapitalProvider,
  DealDocumentKind,
  EngagementStatus,
  ExecutedDocRecord,
  Project,
} from '../types/capital';
import {
  defaultGoverningLawForJurisdiction,
  generateDealDocument,
} from '../utils/templates';

interface DocumentTemplateModalProps {
  open: boolean;
  docKind: DealDocumentKind;
  project: Project;
  provider: CapitalProvider;
  dataRoomFileName?: string;
  epcPartnerName?: string;
  existingRecord?: ExecutedDocRecord;
  onClose: () => void;
  onExecute: (record: ExecutedDocRecord, nextStatus?: EngagementStatus) => void;
}

export function DocumentTemplateModal({
  open,
  docKind,
  project,
  provider,
  dataRoomFileName,
  epcPartnerName,
  existingRecord,
  onClose,
  onExecute,
}: DocumentTemplateModalProps) {
  const [signatory, setSignatory] = useState(existingRecord?.signatory || '');
  const [signatoryTitle, setSignatoryTitle] = useState(
    existingRecord?.signatoryTitle || 'Municipal Accounting Officer / Project Sponsor'
  );
  const [counterpartyRep, setCounterpartyRep] = useState(
    existingRecord?.counterpartyRep || `${provider.name} Investment Committee`
  );
  const [governingLaw, setGoverningLaw] = useState(
    existingRecord?.governingLaw || defaultGoverningLawForJurisdiction(project.jurisdiction)
  );
  const [customTerms, setCustomTerms] = useState('');
  const [offtakerName, setOfftakerName] = useState(
    `${project.authorityName || project.jurisdiction} Ring-Fenced Utility`
  );
  const [tariffRate, setTariffRate] = useState(
    `${project.currency} indexed availability + volumetric tariff`
  );
  const [builderEpcName, setBuilderEpcName] = useState(
    epcPartnerName || 'Lead Turnkey EPC Consortium'
  );
  const [perfBondPct, setPerfBondPct] = useState(12);
  const [ldCapPct, setLdCapPct] = useState(15);
  const [localJvPct, setLocalJvPct] = useState(30);
  const [statutoryConfirmed, setStatutoryConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSignatory(existingRecord?.signatory || '');
    setSignatoryTitle(
      existingRecord?.signatoryTitle || 'Municipal Accounting Officer / Project Sponsor'
    );
    setCounterpartyRep(
      existingRecord?.counterpartyRep || `${provider.name} Investment Committee`
    );
    setGoverningLaw(
      existingRecord?.governingLaw || defaultGoverningLawForJurisdiction(project.jurisdiction)
    );
    setCustomTerms('');
    setOfftakerName(`${project.authorityName || project.jurisdiction} Ring-Fenced Utility`);
    setTariffRate(`${project.currency} indexed availability + volumetric tariff`);
    setBuilderEpcName(epcPartnerName || 'Lead Turnkey EPC Consortium');
    setPerfBondPct(12);
    setLdCapPct(15);
    setLocalJvPct(30);
    setStatutoryConfirmed(false);
    setError(null);
    setCopied(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, docKind, project.id, project.authorityName, project.jurisdiction, project.currency, provider.id, dataRoomFileName, epcPartnerName, existingRecord, onClose]);

  const doc = useMemo(
    () =>
      generateDealDocument(docKind, {
        project,
        provider,
        signatory,
        signatoryTitle,
        counterpartyRep,
        governingLaw,
        customTerms,
        dataRoomFileName,
        builderParams: {
          offtakerName,
          tariffRate,
          epcPartnerName: builderEpcName,
          perfBondPct,
          ldCapPct,
          localJvPct,
        },
      }),
    [
      docKind,
      project,
      provider,
      signatory,
      signatoryTitle,
      counterpartyRep,
      governingLaw,
      customTerms,
      dataRoomFileName,
      offtakerName,
      tariffRate,
      builderEpcName,
      perfBondPct,
      ldCapPct,
      localJvPct,
    ]
  );

  if (!open) return null;

  const isActionableStageTransition =
    docKind === 'nda' || docKind === 'termsheet' || docKind === 'closememo';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access unavailable in this context; use Download Draft.');
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([doc.plainText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.referenceCode.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionableStageTransition && !signatory.trim()) {
      setError('Enter the authorized signatory name before executing this instrument.');
      return;
    }
    if (isActionableStageTransition && !statutoryConfirmed) {
      setError(
        'Confirm statutory authority and counterparty disclosure review before executing.'
      );
      return;
    }
    setError(null);
    const record: ExecutedDocRecord = {
      docKind,
      title: doc.title,
      signatory: signatory.trim() || 'Authorized Sponsor Reviewer',
      signatoryTitle: signatoryTitle.trim() || 'Project Director',
      counterpartyRep: counterpartyRep.trim(),
      governingLaw: governingLaw.trim(),
      executedAt: '2026-11-23',
      referenceCode: doc.referenceCode,
    };
    onExecute(record, doc.targetNextStatus);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070f]/85 p-3 sm:p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b1526] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#08101e] px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-mono-num font-semibold text-teal-300">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {doc.referenceCode}
              </span>
              {existingRecord && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                  Executed {existingRecord.executedAt}
                </span>
              )}
              {existingRecord?.auditHash && (
                <span className="font-mono-num text-[11px] text-slate-400">
                  SHA-256: {existingRecord.auditHash.slice(0, 16)}…
                </span>
              )}
            </div>
            <h3 className="font-display mt-1 text-xl font-medium text-slate-100">
              {doc.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{doc.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" />
              Download draft
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document template"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Document Preview + Right Execution Controls */}
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-5 lg:overflow-hidden">
          {/* Formatted Legal/Transaction Document */}
          <div className="min-h-0 border-b border-white/10 bg-[#070e19] p-5 sm:p-6 lg:col-span-3 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="rounded-xl border border-white/10 bg-[#0c1627] p-6 shadow-inner">
              <div className="border-b border-white/10 pb-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                  Institutional Draft Template · Live Populated
                </div>
                <h4 className="font-display mt-1 text-lg font-medium text-slate-100">
                  {doc.title}
                </h4>
                <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <div>
                    <strong className="text-slate-200">Borrower / Authority:</strong>{' '}
                    {project.jurisdiction}
                  </div>
                  <div>
                    <strong className="text-slate-200">Counterparty:</strong>{' '}
                    {provider.name}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {doc.clauses.map((clause) => (
                  <div key={clause.heading}>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                      {clause.heading}
                    </h5>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                      {clause.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 border-t border-white/10 pt-4 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    For Project Authority
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">
                    {signatory.trim() || '[Pending signatory name]'}
                  </div>
                  <div className="text-slate-400">{signatoryTitle}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    For Capital Counterparty
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">
                    {counterpartyRep}
                  </div>
                  <div className="text-slate-400">{provider.name}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Customization & Pinned Execution Controls */}
          <form
            onSubmit={handleExecuteSubmit}
            className="flex min-h-0 flex-col bg-[#0b1526] lg:col-span-2 lg:overflow-hidden"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Customize &amp; Execute Instrument
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Editing fields below updates the live template on the left. Executing
                  this document updates the Deal Room stage and immutable audit trail.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-400/35 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="doc-signatory"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Authorized Signatory {isActionableStageTransition ? '*' : '(optional)'}
                </label>
                <input
                  id="doc-signatory"
                  type="text"
                  value={signatory}
                  onChange={(e) => setSignatory(e.target.value)}
                  placeholder="e.g. N. Mkhize (Municipal CFO)"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="doc-title"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Signatory Office / Title
                </label>
                <input
                  id="doc-title"
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="doc-counterparty"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Counterparty Representative
                </label>
                <input
                  id="doc-counterparty"
                  type="text"
                  value={counterpartyRep}
                  onChange={(e) => setCounterpartyRep(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="doc-govlaw"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Governing Law &amp; Statutory Framework
                </label>
                <input
                  id="doc-govlaw"
                  type="text"
                  value={governingLaw}
                  onChange={(e) => setGoverningLaw(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
                />
              </div>

              {docKind === 'ppa_offtake' && (
                <div className="space-y-2.5 rounded-lg border border-teal-400/25 bg-teal-400/[0.04] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                    Offtake &amp; Escrow Parameters
                  </div>
                  <div>
                    <label htmlFor="doc-offtaker" className="mb-1 block text-[11px] font-semibold text-slate-300">
                      Utility / Sovereign Offtaker
                    </label>
                    <input
                      id="doc-offtaker"
                      type="text"
                      value={offtakerName}
                      onChange={(e) => setOfftakerName(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="doc-tariff" className="mb-1 block text-[11px] font-semibold text-slate-300">
                      Base Tariff &amp; Indexation Formula
                    </label>
                    <input
                      id="doc-tariff"
                      type="text"
                      value={tariffRate}
                      onChange={(e) => setTariffRate(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {docKind === 'epc_wrap' && (
                <div className="space-y-2.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.04] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    FIDIC Completion Wrap &amp; Security Parameters
                  </div>
                  <div>
                    <label htmlFor="doc-epc-name" className="mb-1 block text-[11px] font-semibold text-slate-300">
                      Turnkey EPC Lead
                    </label>
                    <input
                      id="doc-epc-name"
                      type="text"
                      value={builderEpcName}
                      onChange={(e) => setBuilderEpcName(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-100 focus:border-teal-400/50 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="doc-perfbond" className="mb-1 block text-[11px] font-semibold text-slate-300">
                        Perf. Bond (%)
                      </label>
                      <input
                        id="doc-perfbond"
                        type="number"
                        min={5}
                        max={30}
                        value={perfBondPct}
                        onChange={(e) => setPerfBondPct(Math.max(5, Number(e.target.value) || 10))}
                        className="font-mono-num w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="doc-ldcap" className="mb-1 block text-[11px] font-semibold text-slate-300">
                        LD Cap (%)
                      </label>
                      <input
                        id="doc-ldcap"
                        type="number"
                        min={5}
                        max={30}
                        value={ldCapPct}
                        onChange={(e) => setLdCapPct(Math.max(5, Number(e.target.value) || 15))}
                        className="font-mono-num w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {docKind === 'ppp_gate' && (
                <div className="space-y-2 rounded-lg border border-teal-400/25 bg-teal-400/[0.04] p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="doc-local-jv" className="font-semibold text-teal-300">
                      Consortium Local JV / Citizen Share
                    </label>
                    <span className={`font-mono-num font-bold ${localJvPct >= 30 ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {localJvPct}%
                    </span>
                  </div>
                  <input
                    id="doc-local-jv"
                    type="range"
                    min={10}
                    max={70}
                    step={5}
                    value={localJvPct}
                    onChange={(e) => setLocalJvPct(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-[11px] text-slate-400">
                    {localJvPct >= 30
                      ? 'Clears standard >=30% domestic localization gate.'
                      : 'Below 30% benchmark — increase local JV share prior to bid.'}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="doc-terms"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Special Clauses / Pricing / Notes
                </label>
                <textarea
                  id="doc-terms"
                  rows={2}
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  placeholder="Optional carve-outs, target margin, or CP deadline..."
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Template Verification Points
                </div>
                <ul className="space-y-1 text-[11.5px] leading-snug text-slate-300">
                  {doc.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <ShieldCheck
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-white/10 bg-[#08101e] px-5 py-3.5 sm:px-6">
              {isActionableStageTransition && (
                <label className="flex items-start gap-2.5 rounded-lg border border-teal-400/25 bg-teal-400/[0.06] p-2.5 text-xs leading-snug text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statutoryConfirmed}
                    onChange={(e) => setStatutoryConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#08111e] text-teal-400 focus:ring-teal-400"
                  />
                  <span>
                    I confirm I have reviewed the full draft clauses above and am authorized
                    to execute under the selected governing statutory framework.
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                >
                  {doc.executionLabel}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
