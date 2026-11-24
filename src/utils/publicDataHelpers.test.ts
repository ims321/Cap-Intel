import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapWorldBankProjectsResponse,
  mergeSouthAfricaMunicipalCubes,
  parseCsvRfc4180,
  parseGeoBoundariesFeatures,
  parseKenyaCaraCsv,
  parseNigeriaFaacCsv,
  parseNumericCell,
  sanitizeHttpUrl,
} from './publicDataHelpers';

test('sanitizeHttpUrl accepts http/https and rejects javascript/data protocols', () => {
  assert.equal(sanitizeHttpUrl('https://municipaldata.treasury.gov.za/audit.pdf'), 'https://municipaldata.treasury.gov.za/audit.pdf');
  assert.equal(sanitizeHttpUrl('www.capetown.gov.za'), 'https://www.capetown.gov.za/');
  assert.equal(sanitizeHttpUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeHttpUrl('data:text/html,<script>'), null);
  assert.equal(sanitizeHttpUrl(''), null);
});

test('parseCsvRfc4180 handles quoted multiline headers and commas', () => {
  const sample =
    'County,"2018/2019 Equitable Share","Conditional\r\nGrants"\n' +
    'Nairobi City,"15,794,700,000","2,450,000,000"\n' +
    'Lamu,"2,598,000,000",-\n';
  const rows = parseCsvRfc4180(sample);
  assert.equal(rows.length, 3);
  assert.equal(rows[0][2], 'Conditional\r\nGrants');
  assert.equal(rows[1][0], 'Nairobi City');
  assert.equal(parseNumericCell(rows[1][1]), 15_794_700_000);
  assert.equal(parseNumericCell(rows[2][2]), 0);
});

test('parseKenyaCaraCsv extracts counties and drops Total footer row', () => {
  const csv = [
    'County,2017/2018 Allocation ratio,2017/2018 Equitable Share,2018/2019 Allocation ratio,2018/2019 Equitable Share,Hosp,HQ,UserFee,MedEq,RoadLevy,Poly,"Total Conditional Grants from National Government Revenue","Total Loans and Grants",Total Allocations,"Per capita Allocation"',
    'Lamu,0.8,2416000000,0.83,"2,598,000,000",-,-,"3,000,000",200000000,"68,000,000",10000000,"281,000,000","120,000,000","2,999,000,000","29,510"',
    'Nairobi,5.2,15400000000,5.03,"15,794,700,000",-,-,"80,000,000",200000000,"416,000,000",40000000,"736,000,000","350,000,000","16,880,700,000","5,379"',
    'Total,100,"302,000,000,000",100,"314,000,000,000",0,0,0,0,0,0,"1,017,000,000","470,000,000","19,879,700,000","9,654"',
  ].join('\n');

  const parsed = parseKenyaCaraCsv(csv);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].name, 'Nairobi');
  assert.equal(parsed.rows[0].equitableShare, 15_794_700_000);
  assert.equal(parsed.rows[0].totalAllocation, 16_880_700_000);
  assert.equal(parsed.rows[1].name, 'Lamu');
});

test('parseNigeriaFaacCsv skips metadata lines and aggregates monthly FAAC by full year', () => {
  const csv = [
    ',,,',
    'FAAC Allocation (₦) by State 2016 - 2019,,,',
    'state,year,month,total',
    'Lagos,2018,January,9000000000',
    'Lagos,2018,February,8500000000',
    'FCT,2018,January,2100000000',
    'Nigeria,2018,January,550000000000',
  ].join('\n');

  const parsed = parseNigeriaFaacCsv(csv);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].name, 'Lagos');
  assert.equal(parsed.rows[0].totalAllocation, 17_500_000_000);
  assert.equal(parsed.rows[1].name, 'FCT Abuja');
  assert.equal(parsed.rows[1].unitType, 'Federal Capital Territory');
});

test('mergeSouthAfricaMunicipalCubes merges financial & audit cubes accurately and skips inactive historical demarcations', () => {
  const merged = mergeSouthAfricaMunicipalCubes({
    members: [
      {
        'municipality.demarcation_code': 'CPT',
        'municipality.name': 'City of Cape Town',
        'municipality.long_name': 'City of Cape Town Metropolitan Municipality',
        'municipality.province_code': 'WC',
        'municipality.province_name': 'Western Cape',
        'municipality.category': 'A',
        'municipality.miif_category': 'A',
        'municipality.url': 'http://www.capetown.gov.za',
      },
      {
        'municipality.demarcation_code': 'OLD1',
        'municipality.name': 'Dissolved Council',
        'municipality.province_name': 'Eastern Cape',
        'municipality.category': 'B',
      },
    ],
    capAuda25: [{ 'demarcation.code': 'CPT', 'amount.sum': 9_200_000_000 }],
    capOrgb25: [{ 'demarcation.code': 'CPT', 'amount.sum': 10_000_000_000 }],
    capAuda24: [],
    capOrgb24: [],
    incRev25: [{ 'demarcation.code': 'CPT', 'amount.sum': 62_000_000_000 }],
    incExp25: [{ 'demarcation.code': 'CPT', 'amount.sum': 58_000_000_000 }],
    fpCash25: [{ 'demarcation.code': 'CPT', 'amount.sum': 16_600_000_000 }],
    fpBorrow25: [{ 'demarcation.code': 'CPT', 'amount.sum': 6_870_000_000 }],
    fpLiab25: [{ 'demarcation.code': 'CPT', 'amount.sum': 28_500_000_000 }],
    grantsTrfr24: [{ 'demarcation.code': 'CPT', 'amount.sum': 6_100_000_000 }],
    auditFacts24: [
      {
        'demarcation.code': 'CPT',
        'opinion.code': 'unqualified',
        'opinion.label': 'Unqualified - No findings',
        'opinion.report_url': 'https://municipaldata.treasury.gov.za/audit/cpt.pdf',
      },
    ],
  });

  assert.equal(merged.municipalities.length, 1);
  const cpt = merged.municipalities[0];
  assert.equal(cpt.code, 'CPT');
  assert.equal(cpt.categoryLabel, 'Metro');
  assert.equal(cpt.capexExecutionPct, 92.0);
  assert.equal(cpt.surplusDeficitFy25, 4_000_000_000);
  assert.equal(merged.nationalTotals.unqualifiedAudits, 1);
});

test('mapWorldBankProjectsResponse & parseGeoBoundariesFeatures normalize upstream API structures', () => {
  const wb = mapWorldBankProjectsResponse({
    total: 48,
    projects: {
      P179077: {
        id: 'P179077',
        project_name: 'South Africa Energy Transition DPL',
        countrycode: 'ZA',
        countryshortname: 'South Africa',
        status: 'Active',
        boardapprovaldate: '2023-10-01T00:00:00Z',
        totalamt: '1,000,000,000',
        sector1: { Name: 'Renewable Energy Solar' },
      },
    },
  });
  assert.equal(wb.total, 48);
  assert.equal(wb.projects[0].totalCommitmentUsd, 1_000_000_000);
  assert.equal(wb.projects[0].approvalDate, '2023-10-01');

  const gb = parseGeoBoundariesFeatures(
    {
      features: [
        { properties: { shapeName: 'Lusaka', shapeID: 'ZMB-1', shapeISO: 'ZM-09' } },
        { properties: { shapeName: 'Chadiza', shapeID: 'ZMB-2', shapeISO: '' } },
      ],
    },
    'District Council',
    'ZMB'
  );
  assert.equal(gb.length, 2);
  assert.equal(gb[0].name, 'Chadiza');
});
