import React from 'react';
import { SectionHeader } from './SharedUI';

export function GuideView() {
  const sections = [
    {
      num: '01',
      title: 'City of Johannesburg Edition & 3 Institutional Roles',
      body: 'Customised for the City of Johannesburg ("A World-Class African City") across all 7 MOEs (Johannesburg Water, City Power, JRA, Pikitup, JDA, Metrobus, CoJ Group Treasury) while preserving Africa-wide 24-jurisdiction coverage. Switch roles cleanly between Borrower, Capital provider, and Developer / EPC in the sidebar.',
    },
    {
      num: '02',
      title: 'Borrower-Only 4-Step Intake Wizard & Line-Function Desk',
      items: [
        'Borrower Intake & Upload Wizard — Exclusively available to Borrowers to register mandates with CoJ MOE classification, MFMA s33/s46/s120 route, multi-currency Capex, delegated line-function leads, and SHA-256 checksummed document uploads.',
        'Executive-to-Line-Function Collaboration — Executives initiate strategic mandates while Engineers, MOE Finance, Group Legal, and E&S officers populate capacities, NRW baselines, MTREF votes, and environmental licenses via scoped intake forms.',
        'Joburg Hub — Includes an interactive NRW & Grid Loss Recovery -> DSCR Simulator, MOE ring-fencing matrix, JSE Green Bond estimator, and statutory calendar.',
      ],
    },
    {
      num: '03',
      title: 'Self-Service Onboarding & KYC Registry',
      items: [
        'Onboard / KYC Tab — Unlisted Capital Providers and Developers / EPCs self-onboard with full institutional schema parity: company registration, LEI/SWIFT or CIDB grade, prudential/engineering regulator, UBO & PEP/sanctions attestations, and SHA-256 AML/tax uploads.',
        'Instant Live Registry Sync — Onboarded institutions immediately appear in Capital Explorer, Developers & EPCs Directory, Matches, and 3-Party Deal Rooms.',
      ],
    },
    {
      num: '04',
      title: 'Fixed Right-Side Map Intelligence & Live Scenarios',
      items: [
        'Fixed Map Flow Panel — Clicking any country or POI on the Flows Map updates the dedicated right-side Flow Intelligence Box so corridor arcs and geography are never obscured.',
        'Scenarios Wizard & Bi-Directional Flows — Sync live sovereign yield curves and TCX FX swaps into the 4-step stress simulator and inspect global inbound/outbound flows.',
      ],
    },
    {
      num: '05',
      title: 'Multi-Party Deal Rooms, Common Data Room & Audit Trail',
      items: [
        'Unified Common Data Room — Files uploaded during the Borrower Intake Wizard or Line-Function Verification automatically populate the Deal Room with SHA-256 integrity verification.',
        'Contract Builders & Q&A Routing — Execute Mutual NDAs, Term Sheets, Close Memos, PPA/EPC/PPP packs and route Deal Room Q&A directly to functional desks.',
      ],
    },
    {
      num: '06',
      title: 'Evidence labels & Capital Guide assistant',
      body: 'Every data point displays explicit provenance (Verified current, Published programme, Open funding call, Historical precedent, Mandate match, or Inferred). Use the Capital Guide button (bottom-right) for AI guidance tailored to your role, jurisdiction, and open screen.',
    },
  ];

  return (
    <section aria-labelledby="guide-heading" className="space-y-6">
      <SectionHeader
        title="User guide"
        hint="How Borrowers, Capital Providers, and Developers / EPCs structure and close African infrastructure deals"
      />

      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((s) => (
          <article
            key={s.num}
            className="rounded-xl border border-white/10 bg-[#0b1424] p-6"
          >
            <div className="font-mono-num text-xs font-semibold text-teal-300">
              {s.num}
            </div>
            <h3 className="mt-1.5 text-lg font-semibold text-slate-100">
              {s.title}
            </h3>
            {s.body && (
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {s.body}
              </p>
            )}
            {s.items && (
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
                {s.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
