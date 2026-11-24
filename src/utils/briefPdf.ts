import { jsPDF } from 'jspdf';
import { STAGE_LABEL } from '../data/capitalData';
import type { Project } from '../types/capital';
import type { ProjectBriefModel } from './projectBrief';

function cleanText(raw: string): string {
  return String(raw || '')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll('·', '|')
    .replaceAll('×', 'x')
    .replaceAll('≥', '>=')
    .replaceAll('→', '->')
    .replaceAll('₂', '2')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

export function generateProjectBriefPdf(
  project: Project,
  brief: ProjectBriefModel
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const addSectionHeading = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(240, 249, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(title), margin + 3, y + 4.8);
    y += 10;
  };

  const addWrappedText = (
    text: string,
    opts?: { fontSize?: number; bold?: boolean; color?: [number, number, number]; indent?: number }
  ) => {
    const fontSize = opts?.fontSize ?? 9;
    const indent = opts?.indent ?? 0;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const [r, g, b] = opts?.color ?? [30, 41, 59];
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(cleanText(text), contentWidth - indent);
    const lineHeight = fontSize * 0.44;
    ensureSpace(lines.length * lineHeight + 2);
    doc.text(lines, margin + indent, y);
    y += lines.length * lineHeight + 2;
  };

  // Header Banner
  doc.setFillColor(10, 20, 36);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(45, 212, 191);
  doc.text(
    cleanText(`CAPITAL INTELLIGENCE  |  INVESTMENT COMMITTEE BRIEF  |  ${brief.referenceCode}`),
    margin,
    10
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(248, 250, 252);
  const titleLines = doc.splitTextToSize(cleanText(project.name), contentWidth - 28);
  doc.text(titleLines.slice(0, 2), margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    cleanText(
      `${project.jurisdiction}  |  ${project.sector}  |  Capex: ${brief.capexFormatted}  |  Stage: ${STAGE_LABEL[project.stage]}  |  Readiness: ${project.readiness}/100`
    ),
    margin,
    29
  );

  // Readiness badge top right
  doc.setFillColor(13, 148, 136);
  doc.roundedRect(pageWidth - margin - 22, 9, 22, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 12, 22);
  doc.text(`${project.readiness}`, pageWidth - margin - 11, 16.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('READINESS', pageWidth - margin - 11, 20.5, { align: 'center' });

  y = 40;

  // Metrics strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');
  const metrics = [
    ['CAPEX', brief.capexFormatted],
    ['STAGE', `${STAGE_LABEL[project.stage]} (${brief.completedStageCount}/6)`],
    ['TIER', brief.readinessTier],
    ['OPEN GAPS', `${project.gaps.filter((g) => g.status !== 'Closed').length} tracked`],
    ['VERIFIED', project.updated],
  ];
  const colW = contentWidth / metrics.length;
  metrics.forEach(([k, v], idx) => {
    const x = margin + idx * colW + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(cleanText(k), x, y + 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(v), x, y + 10.5);
  });
  y += 19;

  // 01 Executive Thesis
  addSectionHeading('01. EXECUTIVE INVESTMENT THESIS & ASSET MANDATE');
  addWrappedText(brief.executiveThesis, { fontSize: 9 });
  if (project.authorityName) {
    addWrappedText(
      `Registry / Authority: ${project.authorityName}${project.agendaAlignment ? ` | ${project.agendaAlignment}` : ''}`,
      { fontSize: 8.5, color: [71, 85, 105] }
    );
  }
  y += 1.5;

  // 02 Blended Capital Stack
  addSectionHeading('02. INDICATIVE BLENDED CAPITAL STACK & SOURCES OF FUNDS');
  addWrappedText(`Target DSCR Covenant: ${brief.targetDscr}`, {
    fontSize: 8.5,
    bold: true,
    color: [15, 118, 110],
  });

  brief.capitalStack.forEach((tr) => {
    ensureSpace(15);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3.5;
    addWrappedText(
      `${tr.tranche}  —  ${tr.sharePct}% (${brief.currencyLabel} ${tr.amountM.toFixed(1)}m)  |  ${tr.pricingBenchmark}`,
      { fontSize: 8.5, bold: true, color: [15, 23, 42] }
    );
    addWrappedText(
      `Tenor: ${tr.tenorSummary}  |  Target Institutions: ${tr.candidateProviders.join(', ')}`,
      { fontSize: 8, color: [71, 85, 105], indent: 2 }
    );
  });
  addWrappedText(`FX Protocol: ${brief.fxRiskAssessment}`, {
    fontSize: 8.5,
    color: [146, 64, 14],
  });
  y += 1.5;

  // 03 Legal Authority
  addSectionHeading('03. STATUTORY & LEGAL BORROWING AUTHORITY CHECK');
  addWrappedText(brief.legalProfile.summary, { fontSize: 8.5 });
  brief.legalProfile.rules.slice(0, 5).forEach((rule) => {
    addWrappedText(
      `[${rule.status.toUpperCase()}] ${rule.q} (${rule.cite}) - ${rule.note}`,
      { fontSize: 8, indent: 2, color: [51, 65, 85] }
    );
  });
  y += 1.5;

  // 04 Socioeconomic Impact
  addSectionHeading('04. 10-YEAR SOCIOECONOMIC IMPACT PROJECTION');
  addWrappedText(
    `Peak Annual Jobs: ${brief.impact.peakAnnualJobs.toLocaleString()} (${brief.impact.permanentOpsJobs.toLocaleString()} permanent O&M)  |  10Y GDP Uplift: ${brief.currencyLabel} ${brief.impact.cumulativeGdpM.toFixed(1)}m (${brief.impact.effectiveGdpMultiplier.toFixed(2)}x multiplier)  |  10Y Fiscal Return: ${brief.currencyLabel} ${brief.impact.cumulativeFiscalReturnM.toFixed(1)}m  |  Households Reached: ${brief.impact.householdsReached.toLocaleString()}`,
    { fontSize: 8.5, bold: true }
  );
  y += 1.5;

  // 05 Bankability Gaps
  addSectionHeading('05. BANKABILITY GAP & MITIGATION REGISTER');
  brief.criticalAndOpenGaps.forEach((g) => {
    addWrappedText(
      `[${g.severity.toUpperCase()} / ${g.status}] ${g.gap} (${g.stage}) -> Remedy: ${g.remedy}`,
      { fontSize: 8, indent: 2 }
    );
  });
  y += 1.5;

  // 06 Top Matched Providers
  addSectionHeading('06. TOP PRE-SCREENED REAL INSTITUTIONAL CAPITAL COUNTERPARTIES');
  brief.matchedProviders.forEach(({ provider, score }) => {
    addWrappedText(
      `${provider.name} (${score}/100 match) - ${provider.category} | ${provider.type} | Ticket: ${provider.ticket} (${provider.currency}) | ${provider.legal}`,
      { fontSize: 8, indent: 2 }
    );
  });
  y += 1.5;

  // 07 90-Day Roadmap
  addSectionHeading('07. 90-DAY TRANSACTION EXECUTION ROADMAP');
  brief.roadmap.forEach((phase) => {
    addWrappedText(`${phase.horizon} - ${phase.title}:`, {
      fontSize: 8.5,
      bold: true,
      color: [15, 23, 42],
    });
    phase.deliverables.forEach((d) => {
      addWrappedText(`* ${d}`, { fontSize: 8, indent: 3, color: [51, 65, 85] });
    });
  });

  // Page footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      cleanText(
        `Capital Intelligence Platform | Decision-Support Brief (${brief.referenceCode}) | Not a formal feasibility study or legal opinion`
      ),
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  doc.save(`${brief.referenceCode.toLowerCase()}-executive-brief.pdf`);
}
