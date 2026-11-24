import React, { useState } from 'react';
import {
  JURISDICTION_OPTIONS,
  LEGAL_BY_JURISDICTION,
} from '../data/capitalData';
import { FOREIGN_EPC_COMPLIANCE_BY_JURISDICTION } from '../data/epcData';
import { LegalStatusText, SectionHeader } from './SharedUI';

interface LegalViewProps {
  jurisdiction: string;
  onChangeJurisdiction: (j: string) => void;
  defaultSubTab?: 'domestic' | 'foreign';
}

export function LegalView({
  jurisdiction,
  onChangeJurisdiction,
  defaultSubTab = 'domestic',
}: LegalViewProps) {
  const [subTab, setSubTab] = useState<'domestic' | 'foreign'>(defaultSubTab);

  const data =
    LEGAL_BY_JURISDICTION[jurisdiction] || LEGAL_BY_JURISDICTION['za-muni'];
  const foreignData =
    FOREIGN_EPC_COMPLIANCE_BY_JURISDICTION[jurisdiction] ||
    FOREIGN_EPC_COMPLIANCE_BY_JURISDICTION['za-muni'];

  const currentLabel =
    JURISDICTION_OPTIONS.find((j) => j.value === jurisdiction)?.label ||
    jurisdiction;

  const riskTone: Record<string, string> = {
    Streamlined: 'text-emerald-300',
    'Moderate Complexity': 'text-amber-300',
    'High Localization': 'text-rose-300',
  };

  return (
    <section aria-labelledby="legal-heading" className="space-y-6">
      <SectionHeader
        title="Legal, Fiscal & Foreign EPC Compliance"
        hint="Africa-wide statutory borrowing rules and foreign contractor / developer compliance guidance (decision support — verify with local counsel)"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="legal-jurisdiction-select"
              className="text-xs font-medium text-slate-400"
            >
              Jurisdiction:
            </label>
            <select
              id="legal-jurisdiction-select"
              value={jurisdiction}
              onChange={(e) => onChangeJurisdiction(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0b1424] px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-teal-400/50 focus:outline-none"
            >
              {JURISDICTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Two Clear Compliance Perspectives */}
      <div
        role="tablist"
        aria-label="Legal and regulatory sections"
        className="flex flex-wrap gap-2 border-b border-white/10 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'domestic'}
          onClick={() => setSubTab('domestic')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            subTab === 'domestic'
              ? 'bg-teal-400 text-slate-950'
              : 'border border-white/12 bg-[#0b1424] text-slate-300 hover:text-white'
          }`}
        >
          01. Domestic Borrower Statutory Authority
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'foreign'}
          onClick={() => setSubTab('foreign')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            subTab === 'foreign'
              ? 'bg-amber-300 text-slate-950'
              : 'border border-white/12 bg-[#0b1424] text-slate-300 hover:text-white'
          }`}
        >
          02. Foreign EPC, Developer &amp; Contractor Compliance
        </button>
      </div>

      {subTab === 'domestic' ? (
        <>
          <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Statutory Borrowing Summary · {currentLabel}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {data.summary}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1424]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="w-[24%] px-4 py-3">Authority Question</th>
                  <th className="w-[18%] px-4 py-3">Status</th>
                  <th className="px-4 py-3">Citation &amp; Note</th>
                  <th className="w-[12%] px-4 py-3 text-right">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {data.rules.map((r) => (
                  <tr key={r.q} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-semibold text-slate-100">
                      {r.q}
                    </td>
                    <td className="px-4 py-3.5">
                      <LegalStatusText status={r.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono-num text-xs text-slate-400">
                        {r.cite}
                      </div>
                      <p className="mt-1 text-sm text-slate-200">{r.note}</p>
                    </td>
                    <td className="font-mono-num px-4 py-3.5 text-right text-xs text-slate-400">
                      {r.reviewed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Foreign Service Provider &amp; EPC Compliance Briefing ·{' '}
                  {foreignData.countryName}
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Essential market-entry, contractor grading, local equity/content, FX
                  repatriation, and Permanent Establishment tax guide for international
                  EPCs and project developers.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Compliance Profile
                </div>
                <div
                  className={`text-sm font-semibold ${
                    riskTone[foreignData.riskLevel] || 'text-slate-200'
                  }`}
                >
                  {foreignData.riskLevel}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                01. Contractor Licensing &amp; Regulatory Grading
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.regulatorRegistration}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                02. Local Content, B-BBEE &amp; Joint Venture Quotas
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.localContentRule}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                03. FX Controls &amp; Profit / Debt Repatriation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.fxRepatriationRule}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                04. Corporate Tax, PE Rules &amp; Withholding Tax
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.taxAndPeRule}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                05. PPP &amp; Public Procurement Legislation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.pppProcurementAct}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                06. Expatriate Permits &amp; Engineering Standards
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {foreignData.workPermitsAndStandards}
              </p>
              <div className="font-mono-num mt-3 text-[11px] text-slate-500">
                Verified: {foreignData.reviewed}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#0b1424] p-5">
        <h3 className="text-sm font-semibold text-amber-300">
          Compliance &amp; Governance Boundary
        </h3>
        <p className="mt-1.5 text-sm text-slate-300">
          Capital Intelligence surfaces statutory borrowing caps, National Treasury approval
          gates, and foreign contractor localization requirements up front. It does not
          recommend off-balance-sheet structures to bypass public debt limits.
        </p>
      </div>
    </section>
  );
}
