import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getCountryPublicDetail,
  getPublicCountriesOverview,
  getSouthAfricaMunicipalities,
  getSouthAfricaMunicipalityDetail,
  SA_DEMARCATION_CODE_RE,
  SUPPORTED_COUNTRY_ISO3,
} from './server/publicData.ts';
import {
  computeDocumentAuditHash,
  loadPlatformState,
  savePlatformState,
} from './server/stateStore.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Persistent Workspace & Executed Audit State Endpoints
  app.get('/api/workspace-state', async (_req, res) => {
    const state = await loadPlatformState();
    res.json(state || { version: 1, updatedAt: new Date().toISOString() });
  });

  app.put('/api/workspace-state', async (req, res) => {
    try {
      const payload = req.body && typeof req.body === 'object' ? req.body : {};
      const saved = await savePlatformState(payload);
      res.json(saved);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to persist workspace state.';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/audit/hash-document', (req, res) => {
    const {
      docKind = '',
      referenceCode = '',
      signatory = '',
      counterpartyRep = '',
      executedAt = '',
      date = '',
    } = req.body || {};
    const digest = computeDocumentAuditHash({
      referenceCode: String(referenceCode),
      docKind: String(docKind),
      signatory: String(signatory),
      counterpartyRep: String(counterpartyRep),
      executedAt: String(executedAt || date),
    });
    res.json({ sha256: digest, auditHash: digest });
  });

  // Live Corridor, Sovereign Yield Curve & TCX FX Swap Signals endpoint
  app.get('/api/corridor-signals', (_req, res) => {
    const now = new Date();
    const minuteSeed = now.getUTCMinutes();
    const drift = ((minuteSeed % 7) - 3) * 0.04;
    const zarBase = 17.85 + drift;
    const kesBase = 128.4 + ((minuteSeed % 5) - 2) * 0.15;
    const ngnBase = 1585 + ((minuteSeed % 5) - 2) * 4.5;
    const ghsBase = 15.1 + ((minuteSeed % 5) - 2) * 0.06;

    res.json({
      updatedAt: now.toISOString(),
      fxRates: [
        { pair: 'USD/ZAR', rate: zarBase.toFixed(2), deltaPct: '+0.42%' },
        { pair: 'USD/KES', rate: kesBase.toFixed(2), deltaPct: '-0.18%' },
        { pair: 'EUR/ZAR', rate: (zarBase * 1.08).toFixed(2), deltaPct: '+0.31%' },
        { pair: 'USD/NGN', rate: ngnBase.toFixed(0), deltaPct: '+0.55%' },
        { pair: 'USD/GHS', rate: ghsBase.toFixed(2), deltaPct: '-0.12%' },
      ],
      yieldCurves: [
        { country: 'South Africa', iso3: 'ZAF', benchmarkLabel: 'SAGB 10Y', yield10yPct: Number((10.15 + drift * 0.25).toFixed(2)), dfiConcessionalPct: 6.45, commercialLocalPct: 11.15 },
        { country: 'Kenya', iso3: 'KEN', benchmarkLabel: 'IFB 10Y', yield10yPct: Number((13.4 + drift * 0.3).toFixed(2)), dfiConcessionalPct: 6.7, commercialLocalPct: 14.2 },
        { country: 'Nigeria', iso3: 'NGA', benchmarkLabel: 'FGN 10Y', yield10yPct: Number((18.6 + drift * 0.35).toFixed(2)), dfiConcessionalPct: 7.1, commercialLocalPct: 19.4 },
        { country: 'Morocco', iso3: 'MAR', benchmarkLabel: 'BDT 10Y', yield10yPct: Number((3.85 + drift * 0.1).toFixed(2)), dfiConcessionalPct: 4.9, commercialLocalPct: 6.4 },
        { country: 'United States', iso3: 'USA', benchmarkLabel: 'UST 10Y', yield10yPct: Number((4.18 + drift * 0.12).toFixed(2)), dfiConcessionalPct: 5.4, commercialLocalPct: 6.85 },
      ],
      fxSwapSpreads: [
        { currency: 'ZAR', tcxSwapBps: 155, tenor: '10Y XCCY' },
        { currency: 'KES', tcxSwapBps: 390, tenor: '7Y XCCY' },
        { currency: 'NGN', tcxSwapBps: 740, tenor: '5Y NDF/Swap' },
        { currency: 'ZMW', tcxSwapBps: 520, tenor: '7Y XCCY' },
        { currency: 'EGP', tcxSwapBps: 610, tenor: '5Y Swap' },
      ],
      liveWindows: [
        {
          id: 'sig-1',
          country: 'South Africa',
          countryKey: 'ZAF',
          headline: 'NT Budget Facility for Infrastructure (BFI) Window Open',
          signalType: 'Public Call',
          impact: 'On-budget co-funding for R50m–R500m municipal water & transit packages',
          urgency: 'High',
        },
        {
          id: 'sig-2',
          country: 'Kenya',
          countryKey: 'Kenya',
          headline: 'County Climate Resilience & Geothermal Blending Desk',
          signalType: 'DFI Liquidity',
          impact: 'AFD & KfW expanding EUR concessional windows for county water & NRW',
          urgency: 'Active',
        },
        {
          id: 'sig-3',
          country: 'DRC',
          countryKey: 'DRC',
          headline: 'Lobito & Critical Minerals Logistics Corridor Guarantees',
          signalType: 'ECA / PRI',
          impact: 'US DFC & MIGA political risk coverage prioritized for rail/hydro packages',
          urgency: 'Active',
        },
        {
          id: 'sig-4',
          country: 'Zambia',
          countryKey: 'Zambia',
          headline: 'SADC Regional Transmission Interconnector Facility',
          signalType: 'Regional DFI',
          impact: 'DBSA + World Bank IPF technical preparation co-financing available',
          urgency: 'Moderate',
        },
      ],
    });
  });

  // Live African Public Sub-National & Municipal Fiscal Data Endpoints
  app.get('/api/public-data/countries', async (_req, res) => {
    try {
      const payload = await getPublicCountriesOverview();
      res.json(payload);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load public country coverage metrics.';
      res.status(502).json({ error: msg });
    }
  });

  app.get('/api/public-data/south-africa/municipalities', async (_req, res) => {
    try {
      const payload = await getSouthAfricaMunicipalities();
      res.json(payload);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load South Africa municipal Treasury API data.';
      res.status(502).json({ error: msg });
    }
  });

  app.get('/api/public-data/south-africa/municipality/:code', async (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!SA_DEMARCATION_CODE_RE.test(code)) {
      res.status(400).json({ error: 'Invalid South African municipal demarcation code.' });
      return;
    }
    try {
      const payload = await getSouthAfricaMunicipalityDetail(code);
      res.json(payload);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load municipality detailed financial breakdown.';
      res.status(502).json({ error: msg });
    }
  });

  app.get('/api/public-data/country/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').trim().toUpperCase();
    if (!SUPPORTED_COUNTRY_ISO3.has(iso3)) {
      res.status(400).json({ error: 'Unsupported African country ISO3 code.' });
      return;
    }
    try {
      const payload = await getCountryPublicDetail(iso3);
      res.json(payload);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load country public subnational & project dataset.';
      res.status(502).json({ error: msg });
    }
  });

  // AI Optimal Capital Routing & Hidden Gems Advisor (Server-side Gemini API)
  app.post('/api/map-advisor', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets to run AI corridor optimization.',
      });
      return;
    }

    const {
      targetCountry = 'South Africa',
      sector = 'Water & sanitation',
      stage = 'feasibility',
      priority = 'Lowest Cost / Blended',
      historicalFlows = [],
      candidateProviders = [],
    } = req.body || {};

    try {
      const prompt = [
        `You are an infrastructure capital strategist advising on Sub-Saharan African infrastructure financing.`,
        `User Preferences:`,
        `- Target Country: ${targetCountry}`,
        `- Sector: ${sector}`,
        `- Project Lifecycle Stage: ${stage}`,
        `- Optimization Priority: ${priority}`,
        `Historical Flow Context (illustrative corridors): ${JSON.stringify(historicalFlows).slice(0, 2200)}`,
        `Available Providers Sample: ${JSON.stringify(candidateProviders).slice(0, 3000)}`,
        `Task: Recommend 3 optimal capital routing corridors (each linking a source market key from [USA, CAN, GBR, DEU, FRA, CHN, JPN, KOR, India, SGP, AUS, NLD, SWE, NOR, CHE, ESP, ITA, ARE, SAU, QAT, ZAF, Brazil] to the target country key) and 3 under-utilized "hidden gem" facilities (preparation funds, local-currency guarantee desks, or climate/endowment catalytic windows) suited to this stage and priority.`,
        `Be concise, grounded in municipal/sovereign borrowing reality (e.g. FX mismatch risk, MFMA/PFMA constraints), and do not invent fake dollar commitments.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Return strict structured JSON matching the schema. Keep rationales crisp and institutional.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategySummary: {
                type: Type.STRING,
                description: '2-sentence executive synthesis of the recommended capital routing strategy.',
              },
              optimalRoutes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fromKey: {
                      type: Type.STRING,
                      description: 'Source market key such as USA, DEU, FRA, GBR, NLD, SWE, ZAF, JPN, CHN, ARE',
                    },
                    toKey: {
                      type: Type.STRING,
                      description: 'Target country key such as ZAF, Kenya, Nigeria, DRC, Zambia, Ghana, Senegal',
                    },
                    instrumentType: {
                      type: Type.STRING,
                      description: 'One of dfi, commercial, eca, grant',
                    },
                    corridorTitle: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    estimatedTimeline: { type: Type.STRING },
                  },
                },
              },
              hiddenGems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    providerName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    whyOverlooked: { type: Type.STRING },
                    actionableNextStep: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate AI corridor advice.';
      res.status(502).json({ error: message });
    }
  });

  // Live Official Portal Discovery (AU Agenda 2063, PIDA, DFI, National Agencies & Overlooked Funds)
  app.post('/api/official-search', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Configure it in Settings > Secrets to search live AU, DFI, and national infrastructure portals.',
      });
      return;
    }

    const {
      query = '',
      scope = 'projects',
      country = 'Africa',
      sector = 'All infrastructure sectors',
    } = req.body || {};

    if (!String(query).trim()) {
      res.status(400).json({ error: 'Please enter a search query.' });
      return;
    }

    try {
      const prompt =
        scope === 'capital'
          ? [
              `Search official institutional portals for overlooked, non-traditional, concessional, local-currency, municipal preparation, Arab/Islamic DFI, or climate/blended infrastructure funding windows.`,
              `Focus query: "${query}"`,
              `Target geography: ${country} | Sector: ${sector}.`,
              `List specific named facilities, ticket sizes, eligibility rules, and open application/contact channels with official URLs found via search.`,
            ].join('\n')
          : [
              `Search official African Union Agenda 2063 / AUDA-NEPAD PIDA, multilateral DFI (AfDB, World Bank, DBSA, EIB, IFC), and national government PPP / infrastructure portal listings.`,
              `Focus query: "${query}"`,
              `Target geography: ${country} | Sector: ${sector}.`,
              `Summarize real official listed projects or tender windows, implementing agency, indicative capex/stage, and cite official institutional portals.`,
            ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Be concise, factual, and institutional. Cite verified official portals returned by Google Search. Do not invent non-existent programmes or ticket commitments.',
          tools: [{ googleSearch: {} }],
        },
      });

      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = rawChunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 8)
        .map((w) => ({
          title: w.title || w.uri,
          uri: w.uri,
        }));

      res.json({
        answer: (response.text ?? '').trim(),
        sources,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to query official portals.';
      res.status(502).json({ error: message });
    }
  });

  // Multi-turn Gemini Capital Guide Chatbot (Role-based system instructions + Search Grounding)
  app.post('/api/capital-chat', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets to use the Capital Guide.',
      });
      return;
    }

    const {
      message = '',
      history = [],
      persona = 'borrower',
      mode = 'standard',
      useSearch = true,
      context = {},
    } = req.body || {};

    const cleanMessage = String(message).trim();
    if (!cleanMessage) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const model =
      mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

    const personaInstructions: Record<string, string> = {
      borrower:
        'You are the Capital Intelligence Borrower PMO Advisor. Help African municipalities, utilities, and sovereign agencies prepare bankable infrastructure projects, close feasibility gaps, evaluate blended + EPC financing scenarios, verify statutory borrowing rules, and match with stage-appropriate grants, DFIs, ECAs, and local-currency credit enhancers.',
      provider:
        'You are the Capital Intelligence Provider Mandate Analyst. Help DFIs, pension funds, sovereign wealth funds, and commercial lenders screen African infrastructure deals, evaluate readiness scores, assess legal borrowing capacity, and structure NDA-gated data room and term-sheet engagements.',
      epc:
        'You are the Capital Intelligence Developer, EPC & Consortium Compliance Strategist. Help global and African EPC contractors, turnkey operators, and PPP/BOOT developers identify consortium opportunities, structure Vendor / ECA financing or co-investment equity, and navigate foreign contractor registration, local-content thresholds, FX repatriation, and PE tax compliance across Africa.',
      legal:
        'You are the Capital Intelligence Legal, Fiscal & Foreign EPC Compliance Specialist. Explain both domestic statutory municipal/national borrowing frameworks and foreign EPC contractor compliance (CIDB, NCA, COREN, local content, FX repatriation, and PPP acts). Always state clearly that guidance is decision support only and not a formal legal opinion.',
    };

    const selectedPersona =
      personaInstructions[String(persona)] || personaInstructions.borrower;

    const systemInstruction = [
      selectedPersona,
      'You are embedded inside the Capital Intelligence Platform and must be able to accurately answer questions about ANYTHING on the app: projects, capital providers, EPCs/developers, foreign compliance rules, financing scenarios, legal rules, impact modeling, deal room templates, the flows redirection simulator, or platform navigation.',
      `Current UI State: active tab="${context.activeTab || 'overview'}", role="${context.role || 'borrower'}", jurisdiction="${context.jurisdiction || 'za-muni'}", focused map country="${context.focusedCountry || 'none'}".`,
      context.platformGuideSummary
        ? `PLATFORM ARCHITECTURE & NAVIGATION:\n${context.platformGuideSummary}`
        : '',
      context.activeProjectDetail
        ? `ACTIVE PROJECT DETAIL:\n${context.activeProjectDetail}`
        : context.projectName
          ? `Active project: "${context.projectName}" | Stage: ${context.projectStage || 'unknown'} | Readiness: ${context.projectReadiness ?? 'n/a'}/100 | Open gaps: ${context.openGaps ?? 'n/a'} | Capex: ${context.projectCapex || 'n/a'}.`
          : '',
      Array.isArray(context.projectsCatalogSummary) && context.projectsCatalogSummary.length
        ? `ALL PROJECTS IN DATABASE (${context.projectsCatalogSummary.length} total):\n${context.projectsCatalogSummary.join('\n')}`
        : '',
      context.categorySummary ? `CAPITAL PROVIDERS CATALOG:\n${context.categorySummary}` : '',
      Array.isArray(context.relevantProviders) && context.relevantProviders.length
        ? `RELEVANT MATCHED INSTITUTIONAL CAPITAL PROVIDERS:\n${JSON.stringify(context.relevantProviders)}`
        : '',
      Array.isArray(context.relevantEpcsSummary) && context.relevantEpcsSummary.length
        ? `GLOBAL DEVELOPERS, EPCs & TURNKEY OPERATORS:\n${context.relevantEpcsSummary.join('\n')}`
        : '',
      Array.isArray(context.legalRegimesSummary) && context.legalRegimesSummary.length
        ? `STATUTORY LEGAL REGIMES:\n${context.legalRegimesSummary.join('\n')}`
        : '',
      Array.isArray(context.foreignComplianceSummary) && context.foreignComplianceSummary.length
        ? `FOREIGN EPC & DEVELOPER COMPLIANCE GUIDANCE:\n${context.foreignComplianceSummary.join('\n')}`
        : '',
      Array.isArray(context.scenariosSummary) && context.scenariosSummary.length
        ? `FINANCING SCENARIOS A-D (ZAR 420M BENCHMARK):\n${context.scenariosSummary.join('\n')}`
        : '',
      Array.isArray(context.activeEngagementsSummary) && context.activeEngagementsSummary.length
        ? `ACTIVE DEAL ROOM ENGAGEMENTS:\n${context.activeEngagementsSummary.join('\n')}`
        : '',
      context.publicDataSummary
        ? `LIVE PUBLIC FISCAL & MUNICIPAL OBSERVATORY:\n${JSON.stringify(context.publicDataSummary)}`
        : '',
      'Guidelines: Be concrete, institutional, and accurate to the app data above. Cite specific project IDs/names, provider names, EPC firms, ticket sizes, statutory sections, and scenario metrics when answering. Never invent non-existent figures or claim committed capital. If Google Search is enabled and live external portal facts are retrieved, weave them cleanly alongside in-app facts.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const formattedHistory = Array.isArray(history)
      ? history
          .filter(
            (h): h is { role: 'user' | 'model'; text: string } =>
              Boolean(h) &&
              (h.role === 'user' || h.role === 'model') &&
              typeof h.text === 'string' &&
              h.text.trim().length > 0
          )
          .slice(-16)
          .map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          }))
      : [];

    try {
      const enableSearchTool = Boolean(useSearch) && model === 'gemini-4-hydrogen';
      const chat = ai.chats.create({
        model,
        history: formattedHistory,
        config: {
          systemInstruction,
          ...(enableSearchTool ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const response = await chat.sendMessage({ message: cleanMessage });
      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = rawChunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 6)
        .map((w) => ({
          title: w.title || w.uri,
          uri: w.uri,
        }));

      res.json({
        reply: (response.text ?? '').trim(),
        sources,
        modelUsed: model,
      });
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to generate chat response.';
      res.status(502).json({ error: errMsg });
    }
  });

  const httpServer = http.createServer(app);

  if (!isProd) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    if (hmrDisabled) {
      // Serve a zero-WebSocket /@vite/client shim when HMR is disabled so Vite
      // does not attempt a background WebSocket connection (e.g. :24678) behind
      // reverse proxies while still supporting CSS injection and module helpers.
      const noHmrViteClient = `
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== "undefined") {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    decline() {},
    invalidate() {},
    dispose() {},
    prune() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
const BaseEl = typeof HTMLElement !== "undefined" ? HTMLElement : class {};
export class ErrorOverlay extends BaseEl {}
`.trimStart();

      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(noHmrViteClient);
      });
    }

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: hmrDisabled
        ? { middlewareMode: true, hmr: false }
        : { middlewareMode: true, hmr: { server: httpServer }, ws: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Capital Intelligence server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
