export interface CurrencySpec {
  code: string;
  symbol: string;
  name: string;
  /** Units of this currency per 1 USD (mid-market indicative reference) */
  perUsd: number;
  lenderNote: string;
}

export const CURRENCIES: Record<string, CurrencySpec> = {
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    perUsd: 17.85,
    lenderNote: 'Domestic DBSA, PIC, Futuregrowth & SA Big-4 banks (JIBAR-linked)',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    perUsd: 128.4,
    lenderNote: 'NSSF Kenya, KCB/Equity Bank, Dhamana & Kenya IFB/FLLoCA windows',
  },
  ZMW: {
    code: 'ZMW',
    symbol: 'ZK',
    name: 'Zambian Kwacha',
    perUsd: 26.8,
    lenderNote: 'NAPSA, ZANACO & InfraZamin Zambia local-currency wrapped debt',
  },
  CDF: {
    code: 'CDF',
    symbol: 'FC',
    name: 'Congolese Franc',
    perUsd: 2850,
    lenderNote: 'Local municipal/provincial receipts (OHADA dual-currency USD/CDF)',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    perUsd: 1620,
    lenderNote: 'InfraCredit AAA-wrapped bonds, FGN Sukuk, Access & Zenith Bank',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    perUsd: 15.8,
    lenderNote: 'GIIF domestic desk & SSNIT institutional infrastructure allocations',
  },
  EGP: {
    code: 'EGP',
    symbol: 'E£',
    name: 'Egyptian Pound',
    perUsd: 49.5,
    lenderNote: 'Banque Misr, NBE & TSFE sovereign co-investment facilities',
  },
  UGX: {
    code: 'UGX',
    symbol: 'USh ',
    name: 'Ugandan Shilling',
    perUsd: 3680,
    lenderNote: 'NSSF Uganda, Stanbic Uganda & EAC regional DFI on-lending',
  },
  XOF: {
    code: 'XOF',
    symbol: 'CFA ',
    name: 'West African CFA Franc',
    perUsd: 604,
    lenderNote: 'BOAD, UEMOA regional bond market & EUR-pegged BCEAO liquidity',
  },
  MAD: {
    code: 'MAD',
    symbol: 'MAD ',
    name: 'Moroccan Dirham',
    perUsd: 9.85,
    lenderNote: 'Fonds d’Équipement Communal (FEC), CDG & Attijariwafa Bank',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    perUsd: 1.0,
    lenderNote: 'AfDB, World Bank/IFC, US DFC, EXIM US, BADEA & IsDB',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    perUsd: 0.92,
    lenderNote: 'EIB Global, KfW, AFD / Proparco, FMO, BIO & SACE / Euler Hermes',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Renminbi (RMB)',
    perUsd: 7.24,
    lenderNote: 'China Development Bank, China Exim Bank, NDB BRICS & AIIB windows',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    perUsd: 0.79,
    lenderNote: 'British International Investment (BII), UKEF & PIDG / GuarantCo',
  },
  JPY: {
    code: 'JPY',
    symbol: 'JP¥',
    name: 'Japanese Yen',
    perUsd: 154.5,
    lenderNote: 'JICA ODA STEP concessional loans & JBIC / NEXI buyer credits',
  },
  AED: {
    code: 'AED',
    symbol: 'AED ',
    name: 'UAE Dirham',
    perUsd: 3.6725,
    lenderNote: 'ADFD, Masdar, AMEA Power, IsDB & Arab Coordination Group',
  },
  TZS: {
    code: 'TZS',
    symbol: 'TSh ',
    name: 'Tanzanian Shilling',
    perUsd: 2650,
    lenderNote: 'CRDB Bank, NMB Tanzania & East African DFI TZS facilities',
  },
  RWF: {
    code: 'RWF',
    symbol: 'RF ',
    name: 'Rwandan Franc',
    perUsd: 1355,
    lenderNote: 'Rwanda Development Bank (BRD), RSSB & Green Fund (FONERWA)',
  },
  ETB: {
    code: 'ETB',
    symbol: 'Br ',
    name: 'Ethiopian Birr',
    perUsd: 122,
    lenderNote: 'Commercial Bank of Ethiopia & Development Bank of Ethiopia on-lending',
  },
  BWP: {
    code: 'BWP',
    symbol: 'P ',
    name: 'Botswana Pula',
    perUsd: 13.6,
    lenderNote: 'BPOPF pension fund, FNB Botswana & SADC Pula liquidity',
  },
  NAD: {
    code: 'NAD',
    symbol: 'N$ ',
    name: 'Namibian Dollar',
    perUsd: 17.85,
    lenderNote: 'GIPF Namibia & DBN (1:1 CMA peg with ZAR)',
  },
  MZN: {
    code: 'MZN',
    symbol: 'MT ',
    name: 'Mozambican Metical',
    perUsd: 63.9,
    lenderNote: 'Banco de Moçambique registered FX corridors & DFI USD/EUR tranches',
  },
  AOA: {
    code: 'AOA',
    symbol: 'Kz ',
    name: 'Angolan Kwanza',
    perUsd: 912,
    lenderNote: 'FSDEA co-investment, BNA-cleared EUR/USD ECA & Lobito Corridor DFI debt',
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA ',
    name: 'Central African CFA Franc',
    perUsd: 604,
    lenderNote: 'BDEAC, CEMAC bond market & EUR-pegged BEAC liquidity',
  },
  TND: {
    code: 'TND',
    symbol: 'DT ',
    name: 'Tunisian Dinar',
    perUsd: 3.12,
    lenderNote: 'CDC Tunisie, EIB/EBRD EUR blended lines & Arab Coordination Group',
  },
  ZWG: {
    code: 'ZWG',
    symbol: 'ZiG ',
    name: 'Zimbabwe Gold / USD Corridor',
    perUsd: 26.5,
    lenderNote: 'Multi-currency USD-settled DFI, Afreximbank & IDBZ structured escrows',
  },
};

export interface JurisdictionCurrencyProfile {
  jurisdictionKey: string;
  countryName: string;
  defaultLocalCode: string;
  selectableInputCodes: string[];
  availableLendingCodes: string[];
  currencyPolicyNote: string;
}

export const JURISDICTION_CURRENCY_PROFILES: Record<string, JurisdictionCurrencyProfile> = {
  'za-muni': {
    jurisdictionKey: 'za-muni',
    countryName: 'South Africa (Local Municipality)',
    defaultLocalCode: 'ZAR',
    selectableInputCodes: ['ZAR', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['ZAR', 'USD', 'EUR', 'CNY', 'GBP', 'JPY'],
    currencyPolicyNote:
      'MFMA s48 requires National Treasury approval for foreign-currency municipal debt; prioritize ZAR tranches or TCX swaps.',
  },
  'za-metro': {
    jurisdictionKey: 'za-metro',
    countryName: 'South Africa (Metropolitan)',
    defaultLocalCode: 'ZAR',
    selectableInputCodes: ['ZAR', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['ZAR', 'USD', 'EUR', 'CNY', 'GBP', 'JPY'],
    currencyPolicyNote:
      'Metros access JSE green/municipal bonds in ZAR alongside NT-cleared EUR/USD DFI credit lines.',
  },
  'za-nat': {
    jurisdictionKey: 'za-nat',
    countryName: 'South Africa (National)',
    defaultLocalCode: 'ZAR',
    selectableInputCodes: ['ZAR', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['ZAR', 'USD', 'EUR', 'CNY', 'GBP', 'JPY', 'AED'],
    currencyPolicyNote:
      'National entities & SOEs access NDB BRICS ZAR/RMB facilities, KfW/AFD EUR concessional lines & World Bank USD.',
  },
  'ke-county': {
    jurisdictionKey: 'ke-county',
    countryName: 'Kenya (County / National)',
    defaultLocalCode: 'KES',
    selectableInputCodes: ['KES', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['KES', 'USD', 'EUR', 'CNY', 'GBP', 'JPY', 'AED'],
    currencyPolicyNote:
      'County revenues are KES-denominated; PFMA s140-142 requires National Treasury guarantee clearance for hard-currency borrowing.',
  },
  'zm-muni': {
    jurisdictionKey: 'zm-muni',
    countryName: 'Zambia (Local Authority)',
    defaultLocalCode: 'ZMW',
    selectableInputCodes: ['ZMW', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['ZMW', 'USD', 'EUR', 'CNY', 'GBP'],
    currencyPolicyNote:
      'Local authorities earn ZMW user tariffs; pair InfraZamin ZMW guarantees with USD/EUR DFI or RMB bilateral lines.',
  },
  'drc-prov': {
    jurisdictionKey: 'drc-prov',
    countryName: 'DRC (Provincial)',
    defaultLocalCode: 'CDF',
    selectableInputCodes: ['USD', 'CDF', 'EUR', 'CNY'],
    availableLendingCodes: ['USD', 'CDF', 'EUR', 'CNY', 'AED'],
    currencyPolicyNote:
      'DRC operates a dual USD/CDF fiscal regime; mining & transport PPPs commonly clear in USD/EUR with MIGA/ATIDI cover.',
  },
  'ng-state': {
    jurisdictionKey: 'ng-state',
    countryName: 'Nigeria (State / FCT)',
    defaultLocalCode: 'NGN',
    selectableInputCodes: ['NGN', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['NGN', 'USD', 'EUR', 'CNY', 'GBP'],
    currencyPolicyNote:
      'Combine InfraCredit NGN domestic pension-backed bonds or FGN Sukuk with USD/EUR DFI lines.',
  },
  'gh-nat': {
    jurisdictionKey: 'gh-nat',
    countryName: 'Ghana (Region / MMDA)',
    defaultLocalCode: 'GHS',
    selectableInputCodes: ['GHS', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['GHS', 'USD', 'EUR', 'CNY', 'GBP'],
    currencyPolicyNote:
      'Sub-national revenue collection is in GHS; structure export or availability PPPs in USD/EUR with MIGA/GuarantCo cover.',
  },
  'ug-nat': {
    jurisdictionKey: 'ug-nat',
    countryName: 'Uganda (District / Authority)',
    defaultLocalCode: 'UGX',
    selectableInputCodes: ['UGX', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['UGX', 'USD', 'EUR', 'CNY', 'GBP'],
    currencyPolicyNote:
      'Districts report in UGX while utility/DFI on-lending commonly settles in USD or EUR.',
  },
  'sn-nat': {
    jurisdictionKey: 'sn-nat',
    countryName: 'Senegal (Region / UEMOA)',
    defaultLocalCode: 'XOF',
    selectableInputCodes: ['XOF', 'EUR', 'USD', 'CNY'],
    availableLendingCodes: ['XOF', 'EUR', 'USD', 'CNY', 'AED'],
    currencyPolicyNote:
      'XOF maintains a fixed BCEAO peg to EUR (655.957 CFA/EUR), minimizing EUR-denominated DFI FX mismatch.',
  },
  'ma-nat': {
    jurisdictionKey: 'ma-nat',
    countryName: 'Morocco (Region / Sovereign)',
    defaultLocalCode: 'MAD',
    selectableInputCodes: ['MAD', 'EUR', 'USD', 'AED'],
    availableLendingCodes: ['MAD', 'EUR', 'USD', 'AED', 'CNY'],
    currencyPolicyNote:
      'Moroccan regions blend FEC MAD municipal debt with EUR EIB/KfW/AFD facilities.',
  },
  'eg-nat': {
    jurisdictionKey: 'eg-nat',
    countryName: 'Egypt (Governorate / Sovereign)',
    defaultLocalCode: 'EGP',
    selectableInputCodes: ['EGP', 'USD', 'EUR', 'AED', 'CNY'],
    availableLendingCodes: ['EGP', 'USD', 'EUR', 'AED', 'CNY'],
    currencyPolicyNote:
      'Governorate projects coordinate centrally with Ministry of Finance, EBRD, AfDB, and Arab Coordination Group.',
  },
  'tz-nat': {
    jurisdictionKey: 'tz-nat',
    countryName: 'Tanzania (Authority / Sovereign)',
    defaultLocalCode: 'TZS',
    selectableInputCodes: ['TZS', 'USD', 'EUR', 'CNY'],
    availableLendingCodes: ['TZS', 'USD', 'EUR', 'CNY', 'GBP'],
    currencyPolicyNote:
      'Municipalities require Ministry of Finance concurrence; BOT/PPP energy & port projects pair TZS revenue with USD DFI/ECA debt.',
  },
  'rw-nat': {
    jurisdictionKey: 'rw-nat',
    countryName: 'Rwanda (City / Sovereign)',
    defaultLocalCode: 'RWF',
    selectableInputCodes: ['RWF', 'USD', 'EUR'],
    availableLendingCodes: ['RWF', 'USD', 'EUR', 'GBP'],
    currencyPolicyNote:
      'MINECOFIN oversees external borrowing; RWF green & municipal projects leverage Ireme Invest, BRD, and EIB blending.',
  },
  'et-nat': {
    jurisdictionKey: 'et-nat',
    countryName: 'Ethiopia (Region / Sovereign)',
    defaultLocalCode: 'ETB',
    selectableInputCodes: ['USD', 'ETB', 'EUR', 'CNY'],
    availableLendingCodes: ['USD', 'EUR', 'CNY', 'ETB', 'AED'],
    currencyPolicyNote:
      'National Bank of Ethiopia FX convertibility rules govern repatriation; priority energy/corridor PPPs utilize off-shore escrow accounts.',
  },
  'ci-nat': {
    jurisdictionKey: 'ci-nat',
    countryName: "Côte d'Ivoire (District / UEMOA)",
    defaultLocalCode: 'XOF',
    selectableInputCodes: ['XOF', 'EUR', 'USD'],
    availableLendingCodes: ['XOF', 'EUR', 'USD', 'AED', 'CNY'],
    currencyPolicyNote:
      'Fixed XOF-EUR peg removes EUR FX mismatch for European DFI & ECA financing alongside BOAD local tranches.',
  },
  'cm-nat': {
    jurisdictionKey: 'cm-nat',
    countryName: 'Cameroon (Council / CEMAC)',
    defaultLocalCode: 'XAF',
    selectableInputCodes: ['XAF', 'EUR', 'USD'],
    availableLendingCodes: ['XAF', 'EUR', 'USD', 'CNY'],
    currencyPolicyNote:
      'XAF pegged to EUR via BEAC; municipal and port PPPs blend FEICOM/BDEAC domestic liquidity with EIB/AFD EUR tranches.',
  },
  'bw-nat': {
    jurisdictionKey: 'bw-nat',
    countryName: 'Botswana (Local / Sovereign)',
    defaultLocalCode: 'BWP',
    selectableInputCodes: ['BWP', 'USD', 'ZAR', 'EUR'],
    availableLendingCodes: ['BWP', 'ZAR', 'USD', 'EUR'],
    currencyPolicyNote:
      'Investment-grade domestic institutional market allows long-dated BWP pension-backed bonds alongside DBSA/AfDB tranches.',
  },
  'na-nat': {
    jurisdictionKey: 'na-nat',
    countryName: 'Namibia (Municipality / Sovereign)',
    defaultLocalCode: 'NAD',
    selectableInputCodes: ['NAD', 'ZAR', 'USD', 'EUR'],
    availableLendingCodes: ['NAD', 'ZAR', 'USD', 'EUR'],
    currencyPolicyNote:
      'NAD is pegged 1:1 to ZAR under the Common Monetary Area, enabling seamless ZAR/NAD JIBAR syndication and green hydrogen EUR lines.',
  },
  'mz-nat': {
    jurisdictionKey: 'mz-nat',
    countryName: 'Mozambique (Municipality / Sovereign)',
    defaultLocalCode: 'MZN',
    selectableInputCodes: ['USD', 'MZN', 'EUR', 'ZAR'],
    availableLendingCodes: ['USD', 'EUR', 'ZAR', 'MZN', 'CNY'],
    currencyPolicyNote:
      'Bank of Mozambique registration mandatory for external project loans; corridor/energy PPPs structure USD/ZAR offtake.',
  },
  'ao-nat': {
    jurisdictionKey: 'ao-nat',
    countryName: 'Angola (Province / Sovereign)',
    defaultLocalCode: 'AOA',
    selectableInputCodes: ['USD', 'EUR', 'AOA', 'CNY'],
    availableLendingCodes: ['USD', 'EUR', 'CNY', 'AOA'],
    currencyPolicyNote:
      'MINFIN Public Debt Unit clears sovereign/concession guarantees; BNA authorization required for FX debt service accounts.',
  },
  'tn-nat': {
    jurisdictionKey: 'tn-nat',
    countryName: 'Tunisia (Municipality / Sovereign)',
    defaultLocalCode: 'TND',
    selectableInputCodes: ['TND', 'EUR', 'USD'],
    availableLendingCodes: ['TND', 'EUR', 'USD', 'AED'],
    currencyPolicyNote:
      'CPSCL channels municipal debt; solar & water concessions combine EIB/EBRD EUR tranches with Central Bank convertibility undertakings.',
  },
  'zw-nat': {
    jurisdictionKey: 'zw-nat',
    countryName: 'Zimbabwe (Local / Sovereign)',
    defaultLocalCode: 'USD',
    selectableInputCodes: ['USD', 'ZAR', 'ZWG'],
    availableLendingCodes: ['USD', 'ZAR', 'CNY'],
    currencyPolicyNote:
      'Infrastructure SPVs commonly denominate tariffs and debt service in USD/ZAR via Afreximbank or IDBZ ring-fenced escrow accounts.',
  },
  'af-continental': {
    jurisdictionKey: 'af-continental',
    countryName: 'Pan-African / AfCFTA Regional Corridor',
    defaultLocalCode: 'USD',
    selectableInputCodes: ['USD', 'EUR', 'ZAR', 'XOF'],
    availableLendingCodes: ['USD', 'EUR', 'ZAR', 'XOF', 'CNY', 'GBP', 'AED'],
    currencyPolicyNote:
      'Cross-border AUDA-NEPAD PIDA corridors require harmonized bilateral treaty treaties, MIGA/ATIDI PRI, and PAPSS/TCX FX clearing.',
  },
};

export function getCurrencySpec(code: string): CurrencySpec {
  return CURRENCIES[code] || CURRENCIES.USD;
}

export function getCurrencySymbol(code: string): string {
  return (CURRENCIES[code] || { symbol: code }).symbol;
}

export function getJurisdictionCurrencyProfile(
  jurisdictionKey: string
): JurisdictionCurrencyProfile {
  return (
    JURISDICTION_CURRENCY_PROFILES[jurisdictionKey] ||
    JURISDICTION_CURRENCY_PROFILES['za-muni']
  );
}

export interface ConvertedCurrencyRow {
  code: string;
  symbol: string;
  name: string;
  amountMillions: number;
  formattedMillions: string;
  lenderNote: string;
  isBaseInput: boolean;
}

export function convertCapexAcrossLendingCurrencies(
  amountM: number,
  fromCode: string,
  jurisdictionKey: string
): ConvertedCurrencyRow[] {
  const safeAmount = Number.isFinite(amountM) && amountM > 0 ? amountM : 0;
  const fromSpec = getCurrencySpec(fromCode);
  const usdMillions = safeAmount / fromSpec.perUsd;

  const profile = getJurisdictionCurrencyProfile(jurisdictionKey);
  const codes = Array.from(
    new Set([fromCode, ...profile.availableLendingCodes])
  );

  return codes.map((code) => {
    const spec = getCurrencySpec(code);
    const converted = usdMillions * spec.perUsd;
    const formatted =
      converted >= 10000
        ? `${spec.symbol}${Math.round(converted).toLocaleString('en-US')}m`
        : converted >= 100
          ? `${spec.symbol}${converted.toLocaleString('en-US', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}m`
          : `${spec.symbol}${converted.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}m`;

    return {
      code: spec.code,
      symbol: spec.symbol,
      name: spec.name,
      amountMillions: Number(converted.toFixed(2)),
      formattedMillions: formatted,
      lenderNote: spec.lenderNote,
      isBaseInput: spec.code === fromSpec.code,
    };
  });
}
