import React, { useEffect, useMemo, useState } from 'react';
import { CATS, JURISDICTION_OPTIONS } from '../data/capitalData';
import type { StageKey } from '../types/capital';
import {
  convertCapexAcrossLendingCurrencies,
  getCurrencySpec,
  getJurisdictionCurrencyProfile,
} from '../utils/currencies';

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070f]/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1829] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-medium text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md px-2 py-1 text-lg text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function NewProjectModal({
  open,
  jurisdiction = 'za-muni',
  onClose,
  onCreate,
}: {
  open: boolean;
  jurisdiction?: string;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    sector: string;
    stage: StageKey;
    capexM: number;
    currency: string;
    jurisdictionKey: string;
    desc: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('Water & sanitation');
  const [stage, setStage] = useState<StageKey>('concept');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(jurisdiction);
  const currencyProfile = useMemo(
    () => getJurisdictionCurrencyProfile(selectedJurisdiction),
    [selectedJurisdiction]
  );
  const [currencyCode, setCurrencyCode] = useState(
    currencyProfile.defaultLocalCode
  );
  const [capex, setCapex] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedJurisdiction(jurisdiction);
      setCurrencyCode(getJurisdictionCurrencyProfile(jurisdiction).defaultLocalCode);
    }
  }, [open, jurisdiction]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a project name.');
      return;
    }
    const parsedCapex = parseFloat(capex);
    if (!capex.trim() || Number.isNaN(parsedCapex) || parsedCapex <= 0) {
      setError('Please enter a valid positive capex estimate in millions.');
      return;
    }
    setError(null);
    onCreate({
      name: name.trim(),
      sector,
      stage,
      capexM: parsedCapex,
      currency: currencyCode,
      jurisdictionKey: selectedJurisdiction,
      desc: desc.trim() || 'New infrastructure project concept.',
    });
    setName('');
    setCapex('');
    setDesc('');
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title="Register new project"
      subtitle="Start with a concept or existing package. The platform sizes multi-currency lending equivalents and identifies statutory gaps."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="np-name"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Project name *
          </label>
          <input
            id="np-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. District water treatment upgrade"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="np-jurisdiction"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Country / Jurisdiction
            </label>
            <select
              id="np-jurisdiction"
              value={selectedJurisdiction}
              onChange={(e) => handleJurisdictionChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
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
              htmlFor="np-sector"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Sector
            </label>
            <select
              id="np-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
            >
              <option>Water &amp; sanitation</option>
              <option>Renewable energy</option>
              <option>Transport / logistics</option>
              <option>Municipal services</option>
              <option>Climate adaptation</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="np-stage"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Current stage
            </label>
            <select
              id="np-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as StageKey)}
              className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
            >
              <option value="concept">Concept</option>
              <option value="feasibility">Feasibility</option>
              <option value="structuring">Structuring</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>
        </div>

        {/* Capex Input with Country Currency Symbol & Selectable Currency */}
        <div className="rounded-xl border border-white/10 bg-[#08111e] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="np-capex"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Indicative Capex ({activeCurrencySpec.name} — {activeCurrencySpec.symbol} millions) *
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="np-ccy" className="text-[11px] text-slate-400">
                Input Currency:
              </label>
              <select
                id="np-ccy"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="rounded-md border border-white/15 bg-[#0d1829] px-2 py-1 text-xs font-semibold text-teal-200 focus:border-teal-400/50 focus:outline-none"
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
              id="np-capex"
              type="number"
              min="1"
              step="any"
              value={capex}
              onChange={(e) => setCapex(e.target.value)}
              placeholder={`e.g. 420 (${activeCurrencySpec.code}m)`}
              className="font-mono-num w-full rounded-lg border border-white/15 bg-white/[0.04] py-2.5 pl-14 pr-28 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="font-mono-num pointer-events-none absolute right-3 text-xs font-semibold text-slate-400">
              {activeCurrencySpec.code} million
            </span>
          </div>

          {/* Live Conversion Across All Major Lending Currencies Available to Jurisdiction */}
          <div className="border-t border-white/8 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">
                Available Lending Currency Equivalents ({currencyProfile.countryName})
              </span>
              <span className="text-[10px] text-slate-500">
                Indicative mid-market parity
              </span>
            </div>

            {numericCapex > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {convertedRows.map((row) => (
                  <div
                    key={row.code}
                    className={`rounded-lg border px-2.5 py-2 ${
                      row.isBaseInput
                        ? 'border-teal-400/45 bg-teal-400/10'
                        : 'border-white/8 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {row.code}
                      </span>
                      <span className="font-mono-num text-sm font-bold text-slate-100">
                        {row.formattedMillions}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-400">
                      {row.lenderNote}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Enter an amount above to preview live equivalents in USD ($), EUR (€), CNY/RMB (¥), GBP (£), and domestic {currencyProfile.defaultLocalCode} ({getCurrencySpec(currencyProfile.defaultLocalCode).symbol}) funding windows.
              </p>
            )}

            <p className="mt-2.5 text-[11px] leading-relaxed text-amber-200/90">
              <strong>Statutory FX Rule:</strong> {currencyProfile.currencyPolicyNote}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="np-desc"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Description
          </label>
          <textarea
            id="np-desc"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Problem, beneficiaries, location..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            Create project
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function AddProviderModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: {
    name: string;
    category: string;
    type: string;
    ticket: string;
    geographies: string;
    sectors: string;
    desc: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATS[4]);
  const [type, setType] = useState('Equity');
  const [ticket, setTicket] = useState('');
  const [geographies, setGeographies] = useState('');
  const [sectors, setSectors] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a provider name.');
      return;
    }
    setError(null);
    onAdd({
      name: name.trim(),
      category,
      type,
      ticket: ticket.trim() || 'Case-by-case',
      geographies: geographies.trim() || 'Africa',
      sectors: sectors.trim() || 'Energy',
      desc: desc.trim(),
    });
    setName('');
    setTicket('');
    setGeographies('');
    setSectors('');
    setDesc('');
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title="Add capital provider"
      subtitle="New records enter as “Mandate match” until source verification."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="ap-name"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Institution name *
          </label>
          <input
            id="ap-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nordic Municipal Infrastructure Fund"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ap-cat"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Category
            </label>
            <select
              id="ap-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="ap-type"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Instrument
            </label>
            <select
              id="ap-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
            >
              <option>Equity</option>
              <option>Commercial debt</option>
              <option>Concessional debt</option>
              <option>Grant / technical assistance</option>
              <option>Project preparation</option>
              <option>ECA / guarantee</option>
              <option>Guarantee / risk</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="ap-ticket"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Ticket size
          </label>
          <input
            id="ap-ticket"
            type="text"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="e.g. USD 20m–150m"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ap-geo"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Geographies (comma-separated)
            </label>
            <input
              id="ap-geo"
              type="text"
              value={geographies}
              onChange={(e) => setGeographies(e.target.value)}
              placeholder="Africa, South Africa"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ap-sec"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Sectors (comma-separated)
            </label>
            <input
              id="ap-sec"
              type="text"
              value={sectors}
              onChange={(e) => setSectors(e.target.value)}
              placeholder="Energy, Water, Transport"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="ap-desc"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Mandate notes
          </label>
          <textarea
            id="ap-desc"
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Mandate, appetite, constraints..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            Add provider
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function EngageModal({
  target,
  onClose,
  onSubmit,
}: {
  target: { type: 'capital' | 'project' | 'epc'; id: string; name: string } | null;
  onClose: () => void;
  onSubmit: (action: 'interest' | 'nda' | 'rfi', note: string) => void;
}) {
  const [action, setAction] = useState<'interest' | 'nda' | 'rfi'>('interest');
  const [msg, setMsg] = useState('');

  if (!target) return null;

  return (
    <ModalShell
      open={Boolean(target)}
      title={
        target.type === 'capital'
          ? `Engage: ${target.name}`
          : target.type === 'epc'
            ? `Invite Consortium Lead: ${target.name}`
            : `Express Interest: ${target.name}`
      }
      subtitle={
        target.type === 'capital'
          ? 'Logged action. NDA requests notify the counterparty before common data-room access.'
          : 'All transaction parties are notified in the shared multi-party deal room.'
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(action, msg.trim());
          setMsg('');
          onClose();
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="engage-action"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Workflow action
          </label>
          <select
            id="engage-action"
            value={action}
            onChange={(e) =>
              setAction(e.target.value as 'interest' | 'nda' | 'rfi')
            }
            className="w-full rounded-lg border border-white/10 bg-[#08111e] px-3 py-2 text-sm text-slate-100 focus:border-teal-400/50 focus:outline-none"
          >
            <option value="interest">Express interest (non-binding)</option>
            <option value="nda">Request NDA &amp; common data-room access</option>
            <option value="rfi">Submit request for information</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="engage-msg"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Message (optional)
          </label>
          <textarea
            id="engage-msg"
            rows={3}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Brief note for counterparty..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            Submit
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Capital Intelligence',
    paragraphs: [
      'Capital Intelligence connects African Borrowers, Institutional Capital Providers, and Global Developers / EPCs in one end-to-end infrastructure structuring workspace.',
      'Start from the Home page using the primary Borrower or Capital Provider entry buttons — or switch into Developer / EPC from the left navigation rail.',
    ],
  },
  {
    title: 'Three Institutional Roles, One Shared Database',
    paragraphs: [
      'Use the Borrower / Provider / Dev & EPC switcher inside the left navigation menu to adapt views and fit scoring immediately.',
    ],
    bullets: [
      'Borrowers search the unified Projects database (municipal + AU Agenda 2063 / PIDA + DFI), add working mandates to their focused Workspace, and match capital.',
      'Capital Providers define mandates, evaluate readiness & scoped municipal health in Public Data, and issue term sheets.',
      'Developers / EPCs identify turnkey consortium opportunities, check Foreign EPC Compliance rules across 24 African jurisdictions, and co-invest or bring ECA financing.',
    ],
  },
  {
    title: 'Scoped Jurisdiction & Foreign EPC Compliance',
    paragraphs: [
      'When you select a specific country or South African municipality in Public Data or Legal & compliance, the platform isolates that single authority rather than drowning you in continental noise.',
      'Foreign EPCs and developers get country-by-country guidance on regulator registration (e.g. CIDB, NCA, COREN), local content rules, FX repatriation, PE tax, and PPP procurement acts.',
    ],
  },
  {
    title: 'Guided Scenarios Wizard & Flows Redirection Simulator',
    paragraphs: [
      'The 4-step Scenarios Wizard sizes grants, DFI debt, commercial loans, and EPC vendor/ECA credit under FX shocks to output concrete bankability conclusions.',
      'In the Flows tab, toggle credit wraps, TCX currency swaps, and statutory clearances to simulate how to redirect global capital into your country.',
    ],
  },
  {
    title: '3-Party Deal Rooms & Common Data Room',
    paragraphs: [
      'In Deal rooms, Borrowers, Capital Providers, and Consortium EPC leads collaborate on the same transaction, execute mutual NDAs, and upload/inspect files inside the shared Common Data Room.',
    ],
  },
];

export function TutorialModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = TUTORIAL_STEPS[step];
  const isLast = step >= TUTORIAL_STEPS.length - 1;

  return (
    <ModalShell
      open={open}
      title={current.title}
      subtitle={`Step ${step + 1} of ${TUTORIAL_STEPS.length}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {TUTORIAL_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= step ? 'bg-teal-400' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          {current.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {current.bullets && (
            <ul className="space-y-1.5 pl-4">
              {current.bullets.map((b, i) => (
                <li key={i}>· {b}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3">
          {!isLast && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast) onClose();
              else setStep((s) => s + 1);
            }}
            className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            {isLast ? 'Get started' : 'Continue'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
