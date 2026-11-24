import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import countries110m from 'world-atlas/countries-110m.json';
import {
  CENTROIDS,
  CONF_META,
  FLOW_DATA,
  TYPE_COLOR,
} from '../data/capitalData';
import type { Role, TabId } from '../types/capital';
import { AnimatedExplainer } from './AnimatedExplainer';
import { EvidenceText } from './SharedUI';

const HERO_IMG = '/src/assets/images/hero_africa_infra_1795347519043.jpg';

interface LandingViewProps {
  projectCount: number;
  providerCount: number;
  epcCount: number;
  engagementCount: number;
  onNavigate: (tab: TabId) => void;
  onEnterRole: (role: Role, tab: TabId) => void;
  onFocusMapCountry: (countryKey: string) => void;
  onOpenProjectWorkspace: (projectId: string) => void;
  onOpenProjectBrief?: (projectId: string) => void;
  onOpenTutorial: () => void;
}

const FEATURED_HUBS: Array<{
  key: string;
  label: string;
  volume: string;
}> = [
  { key: 'ZAF', label: 'South Africa', volume: '$1.12bn inbound' },
  { key: 'Kenya', label: 'Kenya', volume: '$1.14bn inbound' },
  { key: 'DRC', label: 'DRC', volume: '$475m inbound' },
  { key: 'Nigeria', label: 'Nigeria', volume: '$695m inbound' },
];

export function LandingView({
  projectCount,
  providerCount,
  epcCount,
  engagementCount,
  onNavigate,
  onEnterRole,
  onFocusMapCountry,
}: LandingViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredHub, setHoveredHub] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroBgY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const heroBgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.08]);

  const worldGeo = useMemo(() => {
    const topo = countries110m as unknown as Parameters<
      typeof topojson.feature
    >[0];
    const obj = (
      countries110m as unknown as {
        objects: { countries: Parameters<typeof topojson.feature>[1] };
      }
    ).objects.countries;
    return topojson.feature(topo, obj) as unknown as GeoJSON.FeatureCollection;
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 520;
    const height = 470;
    const projection = d3
      .geoOrthographic()
      .scale(215)
      .translate([width / 2, height / 2])
      .rotate([-20, -4, 0])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection);
    const graticule = d3.geoGraticule().step([20, 20]);

    const defs = svg.append('defs');
    const globeGrad = defs
      .append('radialGradient')
      .attr('id', 'heroGlobeFill')
      .attr('cx', '40%')
      .attr('cy', '35%')
      .attr('r', '65%');
    globeGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgba(18, 38, 63, 0.92)');
    globeGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgba(7, 15, 28, 0.96)');

    svg
      .append('path')
      .datum({ type: 'Sphere' } as d3.GeoPermissibleObjects)
      .attr('d', path)
      .attr('fill', 'url(#heroGlobeFill)')
      .attr('stroke', 'rgba(45, 212, 191, 0.3)')
      .attr('stroke-width', 1.2);

    svg
      .append('path')
      .datum(graticule() as d3.GeoPermissibleObjects)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.06)')
      .attr('stroke-width', 0.6);

    svg
      .append('g')
      .selectAll('path')
      .data(worldGeo.features)
      .join('path')
      .attr('d', (d) => path(d as d3.GeoPermissibleObjects) || '')
      .attr('fill', (d) => {
        const name = (d.properties as { name?: string })?.name || '';
        if (
          [
            'South Africa',
            'Kenya',
            'Nigeria',
            'Ghana',
            'Zambia',
            'Senegal',
            'Dem. Rep. Congo',
            'Ethiopia',
            'Egypt',
            'Morocco',
            'Mozambique',
            'Angola',
            'Tanzania',
            'Rwanda',
            'Botswana',
            'Namibia',
            'Uganda',
            "Côte d'Ivoire",
          ].includes(name)
        ) {
          return '#184054';
        }
        return '#101f33';
      })
      .attr('stroke', 'rgba(255, 255, 255, 0.09)')
      .attr('stroke-width', 0.5);

    const arcGroup = svg.append('g');
    FLOW_DATA.slice(0, 45).forEach((f) => {
      const a = CENTROIDS[f.from];
      const b = CENTROIDS[f.to];
      if (!a || !b) return;
      const line: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [a, b],
      };
      const dStr = path(line as d3.GeoPermissibleObjects);
      if (!dStr) return;
      const isHighlighted =
        hoveredHub &&
        (f.to === hoveredHub ||
          f.from === hoveredHub ||
          (hoveredHub === 'ZAF' && f.to === 'South Africa'));
      arcGroup
        .append('path')
        .attr('d', dStr)
        .attr('fill', 'none')
        .attr('stroke', TYPE_COLOR[f.type])
        .attr('stroke-width', isHighlighted ? 2.5 : 1.15)
        .attr('stroke-opacity', hoveredHub ? (isHighlighted ? 0.95 : 0.16) : 0.6)
        .attr('stroke-linecap', 'round');
    });

    const hubGroup = svg.append('g');
    Object.entries(CENTROIDS).forEach(([key, coords]) => {
      if (key === 'South Africa') return;
      const proj = projection(coords);
      if (!proj) return;
      const dist = d3.geoDistance(coords, [20, 4]);
      if (dist > Math.PI / 2) return;
      const active = hoveredHub === key;
      hubGroup
        .append('circle')
        .attr('cx', proj[0])
        .attr('cy', proj[1])
        .attr('r', active ? 6 : 3.6)
        .attr('fill', active ? '#e8c36a' : '#2dd4bf')
        .attr('stroke', '#060c16')
        .attr('stroke-width', 1.2)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredHub(key))
        .on('mouseleave', () => setHoveredHub(null))
        .on('click', () => onFocusMapCountry(key));
    });
  }, [worldGeo, hoveredHub, onFocusMapCountry]);

  return (
    <div className="space-y-16 pb-14">
      {/* SIMPLIFIED HERO WITH TWO ENTRY BUTTONS */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]"
      >
        <motion.div
          aria-hidden="true"
          style={prefersReducedMotion ? undefined : { y: heroBgY, scale: heroBgScale }}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {!heroImgFailed ? (
            <img
              src={HERO_IMG}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="h-full w-full object-cover opacity-45"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#0d2238] via-[#07101d] to-[#122a3a]" />
          )}
        </motion.div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#060c16]/96 via-[#060c16]/85 to-[#060c16]/55"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060c16] via-transparent to-[#060c16]/40"
        />

        <div className="relative px-8 py-12 lg:px-14 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 lg:col-span-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                City of Johannesburg · A World-Class African City · Service with Pride
              </p>
              <h1
                className="font-display font-normal tracking-tight text-slate-50"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.55rem)',
                  lineHeight: 1.07,
                  textWrap: 'balance',
                }}
              >
                Source competitive capital for Joburg &amp; African infrastructure.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-200">
                Built for City of Johannesburg MOEs, municipal borrowers, institutional capital
                providers, and turnkey EPC consortiums inside one compliance-verified,
                MFMA &amp; NDA-gated transaction platform.
              </p>

              {/* Two Clean Primary Entry Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onEnterRole('borrower', 'workspace')}
                  className="rounded-lg bg-teal-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 whitespace-nowrap shrink-0"
                >
                  Enter as Borrower
                </button>
                <button
                  type="button"
                  onClick={() => onEnterRole('provider', 'mandate')}
                  className="rounded-lg border border-amber-300/50 bg-amber-300/15 px-6 py-3.5 text-sm font-semibold text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-300/25 whitespace-nowrap shrink-0"
                >
                  Enter as Capital Provider
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-400">
                <span>
                  Turnkey EPC or BOOT developer?{' '}
                  <button
                    type="button"
                    onClick={() => onEnterRole('epc', 'projects')}
                    className="font-semibold text-teal-300 underline decoration-teal-400/40 underline-offset-4 hover:text-teal-200"
                  >
                    Enter as Developer / EPC →
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('coj')}
                  className="font-semibold text-amber-300 underline decoration-amber-400/40 underline-offset-4 hover:text-amber-200"
                >
                  Open Joburg MOE Hub →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('onboard')}
                  className="font-semibold text-emerald-300 underline decoration-emerald-400/40 underline-offset-4 hover:text-emerald-200"
                >
                  Institution Onboarding (KYC) →
                </button>
              </div>
            </motion.div>

            {/* Orthographic Corridor Globe */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center lg:col-span-5"
            >
              <div className="relative w-full max-w-[420px]">
                <svg
                  ref={svgRef}
                  viewBox="0 0 520 470"
                  className="h-auto w-full drop-shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
                  aria-label="Interactive orthographic map of African infrastructure capital corridors"
                />
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                  {FEATURED_HUBS.map((hub) => (
                    <button
                      key={hub.key}
                      type="button"
                      onMouseEnter={() => setHoveredHub(hub.key)}
                      onMouseLeave={() => setHoveredHub(null)}
                      onClick={() => onFocusMapCountry(hub.key)}
                      className={`transition-colors whitespace-nowrap shrink-0 ${
                        hoveredHub === hub.key
                          ? 'text-amber-300 underline underline-offset-4'
                          : 'hover:text-teal-300'
                      }`}
                    >
                      {hub.label} · <span className="font-mono-num">{hub.volume}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quantitative Proof Strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/15 pt-7 sm:grid-cols-4">
            <div className="border-r border-white/10 pr-4 last:border-r-0">
              <div className="font-mono-num text-3xl font-semibold text-slate-50">
                {projectCount}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-300">
                Projects in unified database
              </div>
            </div>
            <div className="border-r border-white/10 pr-4 last:border-r-0">
              <div className="font-mono-num text-3xl font-semibold text-teal-300">
                {providerCount}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-300">
                Global capital providers
              </div>
            </div>
            <div className="border-r border-white/10 pr-4 last:border-r-0">
              <div className="font-mono-num text-3xl font-semibold text-amber-300">
                {epcCount}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-300">
                Developers, EPCs &amp; operators
              </div>
            </div>
            <div>
              <div className="font-mono-num text-3xl font-semibold text-slate-50">
                {engagementCount + 4}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-300">
                Active multi-party deal rooms
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANIMATED ENTERPRISE EXPLAINER */}
      <AnimatedExplainer onEnterRole={onEnterRole} />

      {/* THREE INSTITUTIONAL ROLES */}
      <section aria-labelledby="roles-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
              Three Categories · One Deal Architecture
            </p>
            <h2
              id="roles-heading"
              className="font-display mt-1.5 text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl"
            >
              Built for borrowers, capital providers, and turnkey consortiums
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="text-sm font-semibold text-teal-300 hover:text-teal-200 whitespace-nowrap shrink-0"
          >
            Browse Projects database →
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <article className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1424] p-6">
            <div>
              <div className="font-mono-num text-xs font-semibold text-teal-300">
                01 · BORROWER
              </div>
              <h3 className="font-display mt-2 text-xl font-medium text-slate-100">
                Municipalities, Utilities &amp; Ministries
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                Anchor projects in live public fiscal data, check MFMA/PFMA/OHADA borrowing
                authority, run the guided Scenarios Wizard, and shortlist capital + EPC partners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEnterRole('borrower', 'workspace')}
              className="mt-5 w-fit rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300 whitespace-nowrap shrink-0"
            >
              Open Borrower Workspace
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1424] p-6">
            <div>
              <div className="font-mono-num text-xs font-semibold text-amber-300">
                02 · CAPITAL PROVIDER
              </div>
              <h3 className="font-display mt-2 text-xl font-medium text-slate-100">
                DFIs, Pension Funds, SWFs &amp; Banks
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                Configure deployment mandates, screen pre-vetted African &amp; AU PIDA projects,
                model flow interventions, and execute NDA-gated deals alongside Tier-1 EPCs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEnterRole('provider', 'mandate')}
              className="mt-5 w-fit rounded-lg border border-amber-300/45 bg-amber-300/15 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/25 whitespace-nowrap shrink-0"
            >
              Configure Provider Mandate
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1424] p-6">
            <div>
              <div className="font-mono-num text-xs font-semibold text-sky-300">
                03 · DEVELOPER / EPC / TURNKEY
              </div>
              <h3 className="font-display mt-2 text-xl font-medium text-slate-100">
                Consortium Leads &amp; Turnkey Operators
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                Match turnkey capabilities and vendor/ECA financing to active mandates, and
                review country-by-country foreign contractor licensing, B-BBEE, tax &amp; FX rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEnterRole('epc', 'epcs')}
              className="mt-5 w-fit rounded-lg border border-sky-300/45 bg-sky-300/12 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-300/20 whitespace-nowrap shrink-0"
            >
              Open EPC &amp; Compliance Hub
            </button>
          </article>
        </div>
      </section>

      {/* EVIDENCE LABELS */}
      <section aria-labelledby="evidence-heading">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2
            id="evidence-heading"
            className="font-display text-xl font-medium tracking-tight text-slate-100"
          >
            Provenance &amp; verification discipline
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('capital')}
            className="text-xs font-semibold text-teal-300 hover:text-teal-200 whitespace-nowrap shrink-0"
          >
            Inspect {providerCount} Capital Providers →
          </button>
        </div>

        <div className="grid gap-x-8 gap-y-3 rounded-xl border border-white/10 bg-[#0b1424] p-5 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CONF_META) as Array<keyof typeof CONF_META>).map((key) => (
            <div key={key} className="flex flex-col gap-0.5 py-1">
              <EvidenceText level={key} />
              <p className="text-xs text-slate-400">{CONF_META[key].description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
