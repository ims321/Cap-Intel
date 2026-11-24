import React, { useState } from 'react';
import { FileCheck2, FileText, HardHat, Upload } from 'lucide-react';
import type {
  CapitalProvider,
  DealDocumentKind,
  Engagement,
  EngagementStatus,
  EpcContractor,
  ExecutedDocRecord,
  Project,
  Role,
} from '../types/capital';
import { DocumentTemplateModal } from './DocumentTemplateModal';
import { EngagementText, SectionHeader } from './SharedUI';

interface DealRoomViewProps {
  projects: Record<string, Project>;
  capitalProviders: CapitalProvider[];
  epcContractors: EpcContractor[];
  engagements: Record<string, Engagement>;
  role: Role;
  onExecuteDocument: (
    key: string,
    record: ExecutedDocRecord,
    nextStatus?: EngagementStatus
  ) => void;
  onPostMessage: (key: string, text: string) => void;
  onAssignEpcPartner: (key: string, epcId: string, epcName: string) => void;
  onAddDataRoomDoc: (key: string, doc: { folder: string; name: string }) => void;
}

const NEXT_STAGE_DOC: Partial<
  Record<
    EngagementStatus,
    { docKind: DealDocumentKind; label: string }
  >
> = {
  interest: { docKind: 'nda', label: 'Review & Execute NDA' },
  nda: { docKind: 'termsheet', label: 'Draft & Issue Term Sheet' },
  terms: { docKind: 'closememo', label: 'Review & Sign Close Memo' },
};

const TEMPLATE_BAR: Array<{ docKind: DealDocumentKind; label: string }> = [
  { docKind: 'nda', label: 'Mutual NDA' },
  { docKind: 'rfi', label: 'RFI Pack' },
  { docKind: 'termsheet', label: 'Term Sheet' },
  { docKind: 'ppa_offtake', label: 'PPA / Offtake' },
  { docKind: 'epc_wrap', label: 'EPC Wrap' },
  { docKind: 'ppp_gate', label: 'PPP / JV Gate' },
  { docKind: 'closememo', label: 'Close Memo' },
];

const SAMPLE_DOCS = [
  { folder: '01-Mandate & Legal', name: 'Municipal Council Resolution Draft.pdf', uploadedBy: 'Borrower PMO', status: 'Verified' },
  { folder: '02-Technical & EPC', name: 'NRW Zone Metering & FEED Schematic v2.pdf', uploadedBy: 'EPC Consortium', status: 'Uploaded' },
  { folder: '03-Financial', name: 'Tariff Affordability & Cashflow Model.xlsx', uploadedBy: 'Borrower PMO', status: 'Pending audit' },
  { folder: '04-E&S', name: 'Environmental & Social Screening Note.pdf', uploadedBy: 'DFI Advisor', status: 'Draft' },
];

const ROLE_TAG: Record<Role, string> = {
  borrower: 'Borrower PMO',
  provider: 'Capital Provider',
  epc: 'Developer / EPC',
};

export function DealRoomView({
  projects,
  capitalProviders,
  epcContractors,
  engagements,
  role,
  onExecuteDocument,
  onPostMessage,
  onAssignEpcPartner,
  onAddDataRoomDoc,
}: DealRoomViewProps) {
  const [expandedPanel, setExpandedPanel] = useState<
    Record<string, 'dataroom' | 'qa' | 'audit' | null>
  >({});
  const [draftMsg, setDraftMsg] = useState<Record<string, string>>({});
  const [qaDeptTag, setQaDeptTag] = useState<Record<string, string>>({});
  const [docFolderDraft, setDocFolderDraft] = useState<Record<string, string>>({});
  const [docNameDraft, setDocNameDraft] = useState<Record<string, string>>({});
  const [activeDocModal, setActiveDocModal] = useState<{
    key: string;
    docKind: DealDocumentKind;
    dataRoomFileName?: string;
  } | null>(null);

  const rooms = Object.entries(engagements)
    .filter(([, eng]) => eng.status !== 'none')
    .map(([key, eng]) => {
      const [pid, cid] = key.split('-');
      const project = projects[pid];
      const capital = capitalProviders.find((c) => c.id === cid);
      return { key, project, capital, eng };
    })
    .filter((r) => r.project && r.capital);

  const togglePanel = (key: string, panel: 'dataroom' | 'qa' | 'audit') => {
    setExpandedPanel((prev) => ({
      ...prev,
      [key]: prev[key] === panel ? null : panel,
    }));
  };

  const modalRoom = activeDocModal
    ? rooms.find((r) => r.key === activeDocModal.key)
    : undefined;

  return (
    <section aria-labelledby="dealroom-heading" className="space-y-6">
      <SectionHeader
        title="Multi-party transaction deal rooms"
        hint="Shared NDA-gated workspace uniting Borrower, Capital Providers, and Developer / EPC consortiums across all stages and a common data room"
      />

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0b1424] p-12 text-center">
          <h3 className="text-base font-semibold text-slate-100">
            No active deal rooms
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Express interest from Matches, Projects database, or Opportunities to open a structured multi-party transaction room.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {rooms.map(({ key, project, capital, eng }) => {
            if (!project || !capital) return null;
            const activeSub = expandedPanel[key] || null;
            const nextAction = NEXT_STAGE_DOC[eng.status];
            const isNdaOrLater =
              eng.status === 'nda' ||
              eng.status === 'terms' ||
              eng.status === 'closed';
            const isTermsOrLater =
              eng.status === 'terms' || eng.status === 'closed';
            const isClosed = eng.status === 'closed';
            const executedCount = Object.keys(eng.executedDocs || {}).length;
            const combinedDocs: Array<{
              folder: string;
              name: string;
              uploadedBy: string;
              status: string;
              sha256?: string;
            }> = [
              ...SAMPLE_DOCS,
              ...(project.uploadedDocs || []).map((ud) => ({
                folder: ud.folder,
                name: ud.name,
                uploadedBy: ud.uploadedBy,
                status: 'SHA-256 Verified',
                sha256: ud.sha256,
              })),
              ...(eng.customDataRoomDocs || []),
            ];

            return (
              <article
                key={key}
                className="rounded-xl border border-white/10 bg-[#0b1424] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {project.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>
                        Borrower:{' '}
                        <strong className="text-slate-200">{project.authorityName || project.jurisdiction}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Capital:{' '}
                        <strong className="text-slate-200">{capital.name}</strong> ({capital.type})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Consortium EPC:{' '}
                        <strong className="text-amber-300">
                          {eng.epcPartnerName || 'Unassigned (select below)'}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {executedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                        <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {executedCount} signed doc{executedCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <EngagementText status={eng.status} />
                  </div>
                </div>

                {/* Consortium EPC Assignment Strip */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#08111e] px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <HardHat className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    <span>
                      Consortium Lead Developer / EPC Partner:
                    </span>
                  </div>
                  <select
                    aria-label={`Select consortium EPC partner for ${project.name}`}
                    value={eng.epcPartnerId || ''}
                    onChange={(e) => {
                      const chosen = epcContractors.find((c) => c.id === e.target.value);
                      if (chosen) {
                        onAssignEpcPartner(key, chosen.id, chosen.name);
                      }
                    }}
                    className="rounded-lg border border-white/15 bg-[#0b1424] px-3 py-1.5 text-xs font-medium text-slate-100 focus:border-teal-400/50 focus:outline-none"
                  >
                    <option value="">Assign Developer / EPC Consortium Lead...</option>
                    {epcContractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.hqCountry}) {c.bringsCapital ? '· Brings Capital' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4-Milestone Horizontal Progress */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/8 py-4 sm:grid-cols-4">
                  <div>
                    <div className="text-xs font-semibold text-teal-300">
                      01. Interest expressed
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {eng.date} · {eng.note || 'Logged'}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isNdaOrLater ? 'text-teal-300' : 'text-slate-500'
                      }`}
                    >
                      02. Mutual NDA &amp; common data room
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {eng.executedDocs?.nda
                        ? `Signed by ${eng.executedDocs.nda.signatory}`
                        : isNdaOrLater
                          ? 'Unlocked'
                          : 'Execute NDA to unlock downloads'}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isTermsOrLater ? 'text-teal-300' : 'text-slate-500'
                      }`}
                    >
                      03. Term sheet &amp; EPC pricing
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {eng.executedDocs?.termsheet
                        ? `Issued (${eng.executedDocs.termsheet.referenceCode})`
                        : isTermsOrLater
                          ? 'Active review'
                          : 'Term sheet pending'}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isClosed ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      04. Financial close
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {eng.executedDocs?.closememo
                        ? `Closed (${eng.executedDocs.closememo.executedAt})`
                        : isClosed
                          ? 'Closed'
                          : 'Close memo pending'}
                    </div>
                  </div>
                </div>

                {/* Action & Template Strip */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => togglePanel(key, 'dataroom')}
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        activeSub === 'dataroom'
                          ? 'bg-teal-400 text-slate-950'
                          : 'bg-white/10 text-slate-100 hover:bg-white/15'
                      }`}
                    >
                      {activeSub === 'dataroom'
                        ? 'Hide common data room'
                        : `Common data room (${combinedDocs.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePanel(key, 'qa')}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        activeSub === 'qa'
                          ? 'border-teal-400 bg-teal-400/15 text-teal-200'
                          : 'border-white/15 text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      Q&amp;A log ({(eng.qaLog || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePanel(key, 'audit')}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        activeSub === 'audit'
                          ? 'border-teal-400 bg-teal-400/15 text-teal-200'
                          : 'border-white/15 text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      Audit trail ({(eng.auditTrail || []).length})
                    </button>
                  </div>

                  {nextAction && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDocModal({ key, docKind: nextAction.docKind })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {nextAction.label}
                    </button>
                  )}
                </div>

                {/* Direct Template Openers */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/6 pt-3 text-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Execute / preview template:
                  </span>
                  {TEMPLATE_BAR.map((t) => {
                    const signed = Boolean(eng.executedDocs?.[t.docKind]);
                    return (
                      <button
                        key={t.docKind}
                        type="button"
                        onClick={() =>
                          setActiveDocModal({ key, docKind: t.docKind })
                        }
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          signed
                            ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
                            : 'border-white/12 bg-white/[0.03] text-slate-300 hover:border-teal-400/40 hover:text-teal-200'
                        }`}
                      >
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        {t.label}
                        {signed ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Common Data Room Sub-Panel */}
                {activeSub === 'dataroom' && (
                  <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-[#070f1b] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Shared Common Data Room (Borrower · Capital · EPC)
                      </h4>
                      <span className="text-xs text-slate-400">
                        {isNdaOrLater
                          ? 'Mutual NDA executed — shared documents unlocked'
                          : 'Execute Mutual NDA above to unlock shared downloads'}
                      </span>
                    </div>

                    <div className="divide-y divide-white/6">
                      {combinedDocs.map((doc) => (
                        <div
                          key={`${doc.folder}-${doc.name}`}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                        >
                          <div>
                            <span className="font-mono-num text-xs text-slate-500">
                              {doc.folder}/
                            </span>
                            <span className="ml-1.5 font-medium text-slate-200">
                              {doc.name}
                            </span>
                            <span className="ml-2 text-[11px] text-slate-400">
                              by {doc.uploadedBy}
                            </span>
                            {doc.sha256 && (
                              <span className="font-mono-num ml-2 text-[10px] text-emerald-300">
                                sha256:{doc.sha256.slice(0, 12)}…
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-teal-300">
                              {isNdaOrLater ? doc.status : 'NDA required'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDocModal({
                                  key,
                                  docKind: isNdaOrLater ? 'dataroom_doc' : 'nda',
                                  dataRoomFileName: isNdaOrLater ? doc.name : undefined,
                                })
                              }
                              className="rounded border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-teal-400/40 hover:text-teal-200"
                            >
                              {isNdaOrLater ? 'Inspect' : 'Sign NDA'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fname = (docNameDraft[key] || '').trim();
                        if (!fname) return;
                        onAddDataRoomDoc(key, {
                          folder: docFolderDraft[key] || '02-Technical & EPC',
                          name: fname,
                        });
                        setDocNameDraft((prev) => ({ ...prev, [key]: '' }));
                      }}
                      className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3"
                    >
                      <select
                        aria-label="Data room folder"
                        value={docFolderDraft[key] || '02-Technical & EPC'}
                        onChange={(e) =>
                          setDocFolderDraft((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="rounded-lg border border-white/10 bg-[#0b1424] px-2.5 py-1.5 text-xs text-slate-200 focus:border-teal-400/50 focus:outline-none"
                      >
                        <option>01-Mandate &amp; Legal</option>
                        <option>02-Technical &amp; EPC</option>
                        <option>03-Financial</option>
                        <option>04-E&amp;S</option>
                        <option>05-Term Sheets &amp; Security</option>
                      </select>
                      <input
                        type="text"
                        value={docNameDraft[key] || ''}
                        onChange={(e) =>
                          setDocNameDraft((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder="Add document title (e.g. EPC Turnkey Wrap Proposal.pdf)"
                        className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/15 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-400 hover:text-slate-950 whitespace-nowrap shrink-0"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        Register as {ROLE_TAG[role]}
                      </button>
                    </form>
                  </div>
                )}

                {activeSub === 'qa' && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-[#070f1b] p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      3-Party Transaction Q&amp;A Log
                    </h4>
                    <div className="space-y-3">
                      {(eng.qaLog || []).length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No questions logged yet. Post a technical, EPC pricing, or legal clarification below.
                        </p>
                      ) : (
                        (eng.qaLog || []).map((m) => (
                          <div
                            key={m.id}
                            className="rounded-lg border border-white/8 bg-white/[0.02] p-3"
                          >
                            <div className="flex justify-between text-xs text-slate-400">
                              <div>
                                <strong className="text-slate-200">{m.author}</strong>
                                {m.authorRole && (
                                  <span className="ml-2 text-teal-300">
                                    · {ROLE_TAG[m.authorRole]}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono-num">{m.date}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-300">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = (draftMsg[key] || '').trim();
                        if (!text) return;
                        const tag = qaDeptTag[key] || '';
                        onPostMessage(key, tag ? `[To ${tag}] ${text}` : text);
                        setDraftMsg((prev) => ({ ...prev, [key]: '' }));
                      }}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      <select
                        aria-label="Route question to line function"
                        value={qaDeptTag[key] || ''}
                        onChange={(e) =>
                          setQaDeptTag((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="rounded-lg border border-white/10 bg-[#0b1424] px-2.5 py-2 text-xs text-slate-200 focus:border-teal-400/50 focus:outline-none"
                      >
                        <option value="">All Deal Parties</option>
                        <option value="#Engineering BOQ">#Engineering BOQ</option>
                        <option value="#MOE Treasury">#MOE Treasury</option>
                        <option value="#Group Legal MFMA">#Group Legal MFMA</option>
                        <option value="#E&S / Green Bond">#E&amp;S / Green Bond</option>
                      </select>
                      <input
                        type="text"
                        value={draftMsg[key] || ''}
                        onChange={(e) =>
                          setDraftMsg((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={`Post entry as ${ROLE_TAG[role]}...`}
                        className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
                      >
                        Post entry
                      </button>
                    </form>
                  </div>
                )}

                {activeSub === 'audit' && (
                  <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-[#070f1b] p-4">
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Immutable Session Audit Trail
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {(eng.auditTrail || [{ date: eng.date, event: eng.note }]).map(
                          (item, idx) => (
                            <li key={idx} className="flex gap-3">
                              <span className="font-mono-num text-slate-500">
                                {item.date}
                              </span>
                              <span>{item.event}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {Object.values(eng.executedDocs || {}).length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                          Cryptographic Document Execution Digests (SHA-256)
                        </h5>
                        <div className="space-y-1.5">
                          {Object.values(eng.executedDocs || {}).map((rec) => (
                            <div
                              key={rec.docKind}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/8 bg-[#0b1424] px-3 py-1.5 text-[11px]"
                            >
                              <span className="font-medium text-slate-200">
                                {rec.referenceCode} · {rec.title}
                              </span>
                              <span className="font-mono-num text-teal-300">
                                {rec.auditHash ? `sha256:${rec.auditHash.slice(0, 20)}…` : `Signed ${rec.executedAt}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {activeDocModal && modalRoom?.project && modalRoom?.capital && (
        <DocumentTemplateModal
          open={true}
          docKind={activeDocModal.docKind}
          project={modalRoom.project}
          provider={modalRoom.capital}
          dataRoomFileName={activeDocModal.dataRoomFileName}
          epcPartnerName={modalRoom.eng.epcPartnerName}
          existingRecord={modalRoom.eng.executedDocs?.[activeDocModal.docKind]}
          onClose={() => setActiveDocModal(null)}
          onExecute={(record, nextStatus) =>
            onExecuteDocument(activeDocModal.key, record, nextStatus)
          }
        />
      )}
    </section>
  );
}
