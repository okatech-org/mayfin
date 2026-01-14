import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RapportAnalyseRow } from '@/hooks/useRapportAnalyse';
import type { DossierRow } from '@/hooks/useDossiers';
import { SECTIONS, QUESTIONS, DECISION_LABELS, SYNTHESE_LABELS, CONDITIONS_PARTICULIERES_OPTIONS } from '@/data/questionnaire-structure';
import type { Question } from '@/types/rapport-analyse.types';
import type { AnalysisResult, AnalyseSectorielle, SyntheseNarrative } from '@/hooks/useDocumentAnalysis';

// MayFin Brand Colors (RGB for jsPDF)
const MAYFIN_COLORS = {
    green: [0, 145, 90] as [number, number, number],      // #00915A - Primary brand
    darkGrey: [44, 44, 44] as [number, number, number],   // #2C2C2C - Text
    lightGrey: [245, 245, 245] as [number, number, number], // #F5F5F5 - Background
    blue: [0, 102, 204] as [number, number, number],      // #0066CC - Accent
    alertRed: [211, 47, 47] as [number, number, number],  // #D32F2F - Danger
    successGreen: [56, 142, 60] as [number, number, number], // #388E3C - Success
    warningOrange: [245, 124, 0] as [number, number, number], // #F57C00 - Warning
};

// Helper to get final Y position after autoTable
const getAutoTableFinalY = (doc: jsPDF): number => {
    return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
};

// Format number with space separators (French style)
const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Format currency with space separators
const formatCurrencySpaced = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${formatNumber(Math.round(value))} €`;
};

// Format percentage with French comma
const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2).replace('.', ',')} %`;
};

// Get score color based on value
const getScoreColor = (score: number): [number, number, number] => {
    if (score >= 70) return MAYFIN_COLORS.successGreen;
    if (score >= 50) return MAYFIN_COLORS.warningOrange;
    return MAYFIN_COLORS.alertRed;
};

// Get ratio status evaluation
const getRatioStatus = (value: number, threshold: number, higherBetter = true): string => {
    if (higherBetter) {
        return value >= threshold ? '✓ Conforme' : '⚠ À améliorer';
    }
    return value <= threshold ? '✓ Conforme' : '⚠ Élevé';
};

// Get DSCR status
const getDSCRStatus = (dscr: number): string => {
    if (dscr >= 1.5) return '✓ Excellent';
    if (dscr >= 1.2) return '✓ Bon';
    if (dscr >= 1.0) return '⚠ Limite';
    return '✗ Insuffisant';
};

/**
 * Generate PDF for a completed Bank Analysis Report
 */
export async function generateRapportPDF(
    rapport: RapportAnalyseRow,
    dossier: DossierRow
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Helper functions
    const addTitle = (text: string, size = 16) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', 'bold');
        doc.text(text, pageWidth / 2, y, { align: 'center' });
        y += size * 0.5;
    };

    const addSubtitle = (text: string) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 102, 153);
        doc.text(text, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
    };

    const addText = (label: string, value: string | null | undefined, inline = true) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}: `, margin, y);

        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');

        const displayValue = value || '-';

        if (inline) {
            doc.text(displayValue, margin + labelWidth, y);
            y += 6;
        } else {
            y += 5;
            const lines = doc.splitTextToSize(displayValue, pageWidth - 2 * margin);
            doc.text(lines, margin, y);
            y += lines.length * 5 + 3;
        }
    };

    const addParagraph = (text: string | null | undefined) => {
        if (!text) return;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 5;
    };

    const checkPageBreak = (neededSpace = 30) => {
        if (y + neededSpace > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
        }
    };

    const formatBoolean = (value: boolean | null | undefined): string => {
        if (value === true) return 'Oui';
        if (value === false) return 'Non';
        return '-';
    };

    const formatDate = (): string => {
        return new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    // ============ PAGE 1: COVER ============
    y = 40;
    addTitle("RAPPORT D'ANALYSE DE FINANCEMENT", 20);
    y += 15;

    // Dossier info box
    doc.setDrawColor(51, 102, 153);
    doc.setFillColor(240, 245, 250);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, 'FD');
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(dossier.raison_sociale, pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`SIREN: ${dossier.siren}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text(`${dossier.forme_juridique || '-'} • ${dossier.secteur_activite || '-'}`, pageWidth / 2, y, { align: 'center' });

    y += 25;

    // Financement info
    addSubtitle('Demande de financement');
    addText('Type', dossier.type_financement?.replace(/_/g, ' ').toUpperCase());
    addText('Montant demandé', formatCurrencySpaced(dossier.montant_demande));
    addText('Durée', dossier.duree_mois ? `${dossier.duree_mois} mois` : '-');

    y += 10;

    // Decision box
    const decisionColor = rapport.decision_finale === 'accord_favorable' ? [39, 174, 96]
        : rapport.decision_finale === 'accord_conditionne' ? [241, 196, 15]
            : rapport.decision_finale === 'refus' ? [231, 76, 60]
                : [149, 165, 166];

    doc.setFillColor(decisionColor[0], decisionColor[1], decisionColor[2]);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, 'F');

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(
        `DÉCISION: ${DECISION_LABELS[rapport.decision_finale || ''] || '-'}`,
        pageWidth / 2,
        y + 12,
        { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);

    y += 35;

    // Metadata
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(`Rapport généré le ${formatDate()}`, pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ============ FOLLOWING PAGES: SECTIONS ============
    doc.addPage();
    y = margin;

    // Process each section
    for (const section of SECTIONS) {
        checkPageBreak(40);

        addTitle(section.label.toUpperCase(), 14);
        y += 5;

        const questions = QUESTIONS.filter(q => q.section === section.code);

        for (const question of questions) {
            renderQuestion(doc, question, rapport, margin, pageWidth);
        }

        y += 10;
    }

    function renderQuestion(
        doc: jsPDF,
        question: Question,
        data: RapportAnalyseRow,
        margin: number,
        pageWidth: number
    ) {
        const value = data[question.code as keyof RapportAnalyseRow];

        // Skip empty non-required fields
        if (!question.obligatoire && (value === null || value === undefined || value === '')) {
            return;
        }

        checkPageBreak(20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(question.libelle, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');

        if (question.type === 'oui_non') {
            doc.text(formatBoolean(value as boolean | null), margin + 5, y);
            y += 6;
        } else if (question.type === 'select') {
            const displayValue = question.code === 'decision_finale'
                ? DECISION_LABELS[value as string]
                : question.code === 'synthese_collaborateur'
                    ? SYNTHESE_LABELS[value as string]
                    : (value as string)?.replace(/_/g, ' ').toUpperCase() || '-';
            doc.text(displayValue, margin + 5, y);
            y += 6;
        } else if (question.type === 'textarea' || question.type === 'texte') {
            const text = (value as string) || '-';
            const lines = doc.splitTextToSize(text, pageWidth - 2 * margin - 5);
            doc.text(lines, margin + 5, y);
            y += lines.length * 5 + 4;
        } else if (question.type === 'tableau' && Array.isArray(value) && value.length > 0) {
            // Handle table data
            y += 2;
            const tableData = value as Record<string, unknown>[];
            const columns = Object.keys(tableData[0] || {});

            autoTable(doc, {
                startY: y,
                head: [columns.map(c => c.replace(/_/g, ' '))],
                body: tableData.map(row => columns.map(c => String(row[c] ?? '-'))),
                margin: { left: margin },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [51, 102, 153] }
            });

            y = getAutoTableFinalY(doc) + 5;
        }

        // Process sub-questions
        if (question.sousQuestions) {
            for (const sq of question.sousQuestions) {
                // Check dependencies
                if (sq.dependances) {
                    const shouldShow = sq.dependances.some(dep => {
                        const parentValue = data[dep.questionCode as keyof RapportAnalyseRow];
                        return parentValue === dep.valeurCondition;
                    });
                    if (!shouldShow) continue;
                }

                renderQuestion(doc, sq, data, margin + 5, pageWidth);
            }
        }
    }

    // ============ FINAL PAGE: SUMMARY ============
    checkPageBreak(60);

    addTitle('SYNTHÈSE ET CONDITIONS', 14);
    y += 5;

    addSubtitle('Synthèse collaborateur');
    addText('Conclusion', SYNTHESE_LABELS[rapport.synthese_collaborateur || ''] || '-');

    if (rapport.synthese_motif_non_concluant) {
        addText('Motif', rapport.synthese_motif_non_concluant, false);
    }

    if (rapport.point_attention) {
        addSubtitle("Points d'attention");
        addParagraph(rapport.point_attention);
    }

    if (rapport.decision_finale === 'accord_conditionne' && rapport.conditions_particulieres) {
        const conditions = rapport.conditions_particulieres as string[];
        if (conditions.length > 0) {
            addSubtitle('Conditions particulières');
            for (const cond of conditions) {
                const option = CONDITIONS_PARTICULIERES_OPTIONS.find(o => o.value === cond);
                doc.text(`• ${option?.label || cond}`, margin + 5, y);
                y += 5;
            }
        }
    }

    // Footer on last page
    y = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('Document confidentiel - Usage interne', pageWidth / 2, y, { align: 'center' });

    // Save
    const filename = `rapport_analyse_${dossier.siren}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

/**
 * Generate enhanced PDF with AI analysis results (Multi-LLM)
 * Optimized layout with compact spacing and proper page structure
 */
export function generateSmartAnalysisPDF(
    analysisResult: AnalysisResult,
    dossier?: Partial<DossierRow>
): void {
    if (!analysisResult || !analysisResult.data) {
        throw new Error('Données d\'analyse manquantes pour générer le PDF');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Helper to draw MayFin logo header on any page
    const drawPageHeader = (isFirstPage = false) => {
        // MayFin branded header stripe
        doc.setFillColor(...MAYFIN_COLORS.green);
        doc.rect(0, 0, pageWidth, 4, 'F');
        
        // Draw MayFin logo with 3 colored squares (compact version for non-first pages)
        const logoX = margin;
        const logoY = 8;
        const squareSize = isFirstPage ? 8 : 5;
        const squareGap = isFirstPage ? 2 : 1.5;
        const squareRadius = 1;
        
        // Green square
        doc.setFillColor(76, 175, 80);
        doc.roundedRect(logoX, logoY, squareSize, squareSize, squareRadius, squareRadius, 'F');
        
        // Yellow square
        doc.setFillColor(255, 193, 7);
        doc.roundedRect(logoX + squareSize + squareGap, logoY, squareSize, squareSize, squareRadius, squareRadius, 'F');
        
        // Blue square (smaller)
        doc.setFillColor(33, 100, 175);
        const blueOffset = isFirstPage ? 2 : 1;
        doc.roundedRect(logoX + 2 * (squareSize + squareGap), logoY + blueOffset, squareSize - blueOffset, squareSize - blueOffset, squareRadius, squareRadius, 'F');
        
        // MAYFIN text
        const fontSize = isFirstPage ? 14 : 9;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 115, 65);
        doc.text('MAY', logoX, logoY + squareSize + (isFirstPage ? 8 : 5));
        const mayWidth = doc.getTextWidth('MAY');
        doc.setTextColor(33, 100, 175);
        doc.text('FIN', logoX + mayWidth, logoY + squareSize + (isFirstPage ? 8 : 5));
        
        // Page number (except first page)
        if (!isFirstPage) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(128, 128, 128);
            const pageNum = doc.getNumberOfPages();
            doc.text(`Page ${pageNum}`, pageWidth - margin, logoY + squareSize + 5, { align: 'right' });
        }
        
        doc.setTextColor(0, 0, 0);
        return isFirstPage ? 38 : 22;
    };

    // Compact page break check with header
    const checkPageBreak = (neededSpace = 20) => {
        if (y + neededSpace > pageHeight - 15) {
            doc.addPage();
            y = drawPageHeader(false);
        }
    };

    // Compact title
    const addTitle = (text: string, size = 14) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 102, 153);
        doc.text(text, pageWidth / 2, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += size * 0.5;
    };

    // Compact subtitle with MayFin green
    const addSubtitle = (text: string, color: number[] = MAYFIN_COLORS.green as number[]) => {
        checkPageBreak(10);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
    };

    // Compact inline text
    const addInlineText = (label: string, value: string | number | null | undefined) => {
        checkPageBreak(6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}: `, margin, y);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value ?? '-'), margin + labelWidth, y);
        y += 5;
    };

    // Compact paragraph with tighter line spacing
    const addParagraph = (text: string | null | undefined, indented = false, fontSize = 9) => {
        if (!text) return;
        checkPageBreak(12);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'normal');
        const xPos = indented ? margin + 3 : margin;
        const width = indented ? contentWidth - 3 : contentWidth;
        const lines = doc.splitTextToSize(text, width);
        doc.text(lines, xPos, y);
        y += lines.length * 4 + 2;
    };

    // Compact bullet list
    const addBulletList = (items: string[], color?: number[], fontSize = 9) => {
        for (const item of items) {
            checkPageBreak(6);
            if (color) doc.setTextColor(color[0], color[1], color[2]);
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 8);
            doc.text(lines, margin + 3, y);
            y += lines.length * 4 + 1;
            doc.setTextColor(0, 0, 0);
        }
    };

    const formatDate = (): string => {
        return new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const data = analysisResult.data;
    const score = analysisResult.score;
    const synthese = analysisResult.syntheseNarrative;
    const secteur = analysisResult.analyseSectorielle;
    const besoin = analysisResult.besoinAnalyse;

    // ============ PAGE 1: COVER + SCORING (MayFin Branded) ============
    y = drawPageHeader(true);
    
    // Confidential text on first page
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MAYFIN_COLORS.darkGrey);
    doc.text('Analyse de Financement - Document Confidentiel', pageWidth - margin, 21, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Title box with MayFin green
    doc.setFillColor(...MAYFIN_COLORS.green);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("RAPPORT D'ANALYSE DE FINANCEMENT", pageWidth / 2, y + 9, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Étude Multi-LLM par Intelligence Artificielle", pageWidth / 2, y + 15, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 26;

    // Company info box
    doc.setDrawColor(...MAYFIN_COLORS.green);
    doc.setFillColor(...MAYFIN_COLORS.lightGrey);
    doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');
    y += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MAYFIN_COLORS.darkGrey);
    doc.text(data?.entreprise?.raisonSociale || dossier?.raison_sociale || 'Entreprise', pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`SIREN: ${data?.entreprise?.siren || dossier?.siren || '-'} • SIRET: ${data?.entreprise?.siret || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`${data?.entreprise?.formeJuridique || '-'} • ${data?.entreprise?.secteurActivite || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Code NAF: ${data?.entreprise?.codeNaf || '-'} • ${formatNumber(data?.entreprise?.nbSalaries) || 0} salariés`, pageWidth / 2, y, { align: 'center' });
    y += 14;

    // Score box with dynamic color
    const recommandation = analysisResult.recommandation;
    const scoreGlobal = score?.global || 0;
    const scoreColor = getScoreColor(scoreGlobal);

    doc.setFillColor(...scoreColor);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`SCORE: ${scoreGlobal}/100`, pageWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${recommandation || 'À ÉVALUER'} • Seuil accordable: ${formatCurrencySpaced(analysisResult.seuilAccordable)}`, pageWidth / 2, y + 16, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 28;

    // Financing summary table
    const montantDemande = data?.financement?.montantDemande || dossier?.montant_demande || 0;
    const apportClient = besoin?.apportClient || 0;
    const tauxApport = besoin?.tauxApport || 0;
    const mensualite = besoin?.mensualiteEstimee || 0;

    const summaryData = [
        ['Montant demandé', formatCurrencySpaced(montantDemande)],
        ['Apport client', formatCurrencySpaced(apportClient)],
        ['Taux d\'apport', formatPercentage(tauxApport)],
        ['Mensualité estimée', formatCurrencySpaced(mensualite)],
    ];

    autoTable(doc, {
        startY: y,
        body: summaryData,
        margin: { left: margin + 20, right: margin + 20 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
            1: { halign: 'right' }
        },
        theme: 'plain',
    });
    y = getAutoTableFinalY(doc) + 8;

    // Analyst and date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(`Analyste: Système d'Analyse IA - MayFin • Date: ${formatDate()}`, pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ============ SCORING TABLE (on page 1) ============
    y += 3;
    addTitle('ANALYSE DU SCORING', 12);
    y += 3;

    if (score?.details) {
        const scoreData = [
            ['Critère', 'Score', 'Pondération', 'Contribution'],
            ['Solvabilité', `${score.details.solvabilite}/100`, '30%', `${Math.round(score.details.solvabilite * 0.3)}`],
            ['Rentabilité', `${score.details.rentabilite}/100`, '30%', `${Math.round(score.details.rentabilite * 0.3)}`],
            ['Structure financière', `${score.details.structure}/100`, '20%', `${Math.round(score.details.structure * 0.2)}`],
            ['Activité', `${score.details.activite}/100`, '20%', `${Math.round(score.details.activite * 0.2)}`],
        ];

        autoTable(doc, {
            startY: y,
            head: [scoreData[0]],
            body: scoreData.slice(1),
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: MAYFIN_COLORS.green as [number, number, number], textColor: 255 },
            alternateRowStyles: { fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
        });
        y = getAutoTableFinalY(doc) + 6;
    }

    // Justifications - compact
    if (score?.justifications) {
        addSubtitle('Justifications détaillées');

        const justifLabels: Record<string, string> = {
            solvabilite: 'Solvabilité',
            rentabilite: 'Rentabilité',
            structure: 'Structure financière',
            activite: 'Activité'
        };

        for (const [key, label] of Object.entries(justifLabels)) {
            const justif = score.justifications[key as keyof typeof score.justifications];
            if (justif) {
                checkPageBreak(12);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(label, margin, y);
                y += 4;
                addParagraph(justif, true, 8);
            }
        }
    }

    // ============ RATIOS FINANCIERS CLÉS ============
    checkPageBreak(60);
    y += 5;
    addTitle('RATIOS FINANCIERS CLÉS', 12);
    y += 3;

    // Calculate ratios from available data
    const tauxApportRatio = besoin?.tauxApport || 0;
    const capaciteRemb = besoin?.capaciteRemboursement || 0;
    const mensualiteEstimee = besoin?.mensualiteEstimee || 0;
    
    // Calculate DSCR (Debt Service Coverage Ratio)
    const dscr = mensualiteEstimee > 0 ? (capaciteRemb / mensualiteEstimee) : 0;
    
    // Get financial data for ratios
    const latestYear = data?.finances?.annees?.[0];
    const ca = latestYear?.chiffreAffaires || 0;
    const ebitda = latestYear?.ebitda || 0;
    const capitauxPropres = latestYear?.capitauxPropres || 0;
    const dettesFinancieres = latestYear?.dettesFinancieres || 0;
    const totalActif = latestYear?.totalActif || 0;
    
    // Calculate additional ratios
    const tauxEndettement = totalActif > 0 ? ((dettesFinancieres / totalActif) * 100) : 0;
    const margeBrute = ca > 0 ? ((ebitda / ca) * 100) : 0;
    const autonomieFinanciere = totalActif > 0 ? ((capitauxPropres / totalActif) * 100) : 0;

    const ratiosData = [
        ['Ratio', 'Valeur', 'Standard bancaire', 'Analyse'],
        [
            'Taux d\'apport',
            formatPercentage(tauxApportRatio),
            '> 20%',
            getRatioStatus(tauxApportRatio, 20, true)
        ],
        [
            'DSCR (Couverture dette)',
            dscr > 0 ? dscr.toFixed(2) : '-',
            '> 1,20',
            dscr > 0 ? getDSCRStatus(dscr) : '-'
        ],
        [
            'Taux d\'endettement',
            tauxEndettement > 0 ? formatPercentage(tauxEndettement) : '-',
            '< 70%',
            tauxEndettement > 0 ? getRatioStatus(tauxEndettement, 70, false) : '-'
        ],
        [
            'Marge EBITDA',
            margeBrute > 0 ? formatPercentage(margeBrute) : '-',
            '> 10%',
            margeBrute > 0 ? getRatioStatus(margeBrute, 10, true) : '-'
        ],
        [
            'Autonomie financière',
            autonomieFinanciere > 0 ? formatPercentage(autonomieFinanciere) : '-',
            '> 30%',
            autonomieFinanciere > 0 ? getRatioStatus(autonomieFinanciere, 30, true) : '-'
        ],
        [
            'Capacité de remboursement',
            formatCurrencySpaced(capaciteRemb),
            '-',
            capaciteRemb > mensualiteEstimee ? '✓ Suffisante' : '⚠ À vérifier'
        ],
    ];

    autoTable(doc, {
        startY: y,
        head: [ratiosData[0]],
        body: ratiosData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: MAYFIN_COLORS.green as [number, number, number], textColor: 255 },
        alternateRowStyles: { fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 },
            1: { halign: 'center', cellWidth: 35 },
            2: { halign: 'center', cellWidth: 35 },
            3: { halign: 'center' }
        },
        didParseCell: (data) => {
            // Color the status column based on content
            if (data.column.index === 3 && data.section === 'body') {
                const text = String(data.cell.raw);
                if (text.includes('✓')) {
                    data.cell.styles.textColor = MAYFIN_COLORS.successGreen;
                } else if (text.includes('⚠')) {
                    data.cell.styles.textColor = MAYFIN_COLORS.warningOrange;
                } else if (text.includes('✗')) {
                    data.cell.styles.textColor = MAYFIN_COLORS.alertRed;
                }
            }
        }
    });
    y = getAutoTableFinalY(doc) + 8;

    // Add legend
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('DSCR = Capacité de remboursement / Mensualité estimée • Standards conformes aux recommandations Bâle III/IV', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    // ============ PAGE 2: ANALYSE DU BESOIN CLIENT ============
    doc.addPage();
    y = margin;

    addTitle('ANALYSE DU BESOIN CLIENT', 12);
    y += 3;

    if (besoin) {
        // Investment summary table - compact
        const besoinData = [
            ['Paramètre', 'Valeur'],
            ['Type d\'investissement', besoin.typeInvestissement || besoin.categorieInvestissement || '-'],
            ['Apport client', formatCurrencySpaced(besoin.apportClient)],
            ['Taux d\'apport', `${besoin.tauxApport?.toFixed(1) || 0}%`],
            ['Montant financé', formatCurrencySpaced(besoin.montantFinance)],
            ['Mensualité estimée', formatCurrencySpaced(besoin.mensualiteEstimee)],
            ['Capacité de remboursement', formatCurrencySpaced(besoin.capaciteRemboursement)],
            ['Score adéquation', `${besoin.adequationBesoin || 0}/100`],
        ];

        autoTable(doc, {
            startY: y,
            head: [besoinData[0]],
            body: besoinData.slice(1),
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [51, 102, 153], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 55 },
                1: { halign: 'right' }
            }
        });
        y = getAutoTableFinalY(doc) + 6;

        // Justification
        if (besoin.justificationAdequation) {
            addSubtitle('Justification');
            addParagraph(besoin.justificationAdequation, false, 9);
        }

        // Product recommendation - compact
        if (besoin.produitRecommande) {
            checkPageBreak(30);
            addSubtitle('Produit recommandé', [39, 174, 96]);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(besoin.produitRecommande.nom, margin, y);
            y += 4;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(besoin.produitRecommande.type || '', margin, y);
            y += 5;

            if (besoin.produitRecommande.avantages?.length > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Avantages:', margin, y);
                y += 4;
                addBulletList(besoin.produitRecommande.avantages, [39, 174, 96], 8);
            }

            if (besoin.produitRecommande.conditions?.length > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Conditions:', margin, y);
                y += 4;
                addBulletList(besoin.produitRecommande.conditions, undefined, 8);
            }

            if (besoin.produitRecommande.alternative) {
                checkPageBreak(12);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Alternative: ${besoin.produitRecommande.alternative.nom} - ${besoin.produitRecommande.alternative.raison}`, margin, y);
                doc.setTextColor(0, 0, 0);
                y += 5;
            }
        }

        // Alerts - compact
        if (besoin.alertes?.length > 0) {
            checkPageBreak(15);
            addSubtitle('Alertes', [231, 76, 60]);
            addBulletList(besoin.alertes, [200, 60, 50], 8);
        }

        // Structuring recommendations
        if (besoin.recommandationsStructuration?.length > 0) {
            checkPageBreak(15);
            addSubtitle('Recommandations de structuration');
            addBulletList(besoin.recommandationsStructuration, undefined, 8);
        }
    }

    // ============ PAGE 3: DONNÉES FINANCIÈRES + ANALYSE SECTORIELLE ============
    doc.addPage();
    y = margin;

    addTitle('DONNÉES FINANCIÈRES EXTRAITES', 12);
    y += 3;

    if (data?.finances?.annees && data.finances.annees.length > 0) {
        // Sort years in ascending order for display
        const sortedYears = [...data.finances.annees].sort((a, b) => (a.annee || 0) - (b.annee || 0));
        
        const financeHeaders = ['Exercice', 'CA', 'Résultat Net', 'EBITDA', 'Capitaux Propres', 'Trésorerie'];
        const financeRows = sortedYears.map(a => [
            String(a.annee || '-'),
            formatCurrencySpaced(a.chiffreAffaires),
            formatCurrencySpaced(a.resultatNet),
            formatCurrencySpaced(a.ebitda),
            formatCurrencySpaced(a.capitauxPropres),
            formatCurrencySpaced(a.tresorerie),
        ]);

        autoTable(doc, {
            startY: y,
            head: [financeHeaders],
            body: financeRows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: MAYFIN_COLORS.green as [number, number, number], textColor: 255 },
            alternateRowStyles: { fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
        });
        y = getAutoTableFinalY(doc) + 8;
    }

    // ============ PRÉVISIONNELS SUR 3 ANS ============
    checkPageBreak(50);
    addSubtitle('Compte de résultat prévisionnel');

    // Check if we have multi-year data to build forecasts
    if (data?.finances?.annees && data.finances.annees.length >= 2) {
        const sortedYears = [...data.finances.annees].sort((a, b) => (a.annee || 0) - (b.annee || 0));
        const lastYear = sortedYears[sortedYears.length - 1];
        const prevYear = sortedYears[sortedYears.length - 2];
        
        // Calculate growth rates
        const caGrowth = prevYear?.chiffreAffaires && lastYear?.chiffreAffaires 
            ? (lastYear.chiffreAffaires - prevYear.chiffreAffaires) / prevYear.chiffreAffaires 
            : 0.05; // Default 5% growth
        
        const baseYear = lastYear?.annee || new Date().getFullYear();
        const baseCA = lastYear?.chiffreAffaires || 0;
        const baseEBITDA = lastYear?.ebitda || 0;
        const baseRN = lastYear?.resultatNet || 0;
        
        // Project 3 years forward with calculated or assumed growth
        const growthRate = Math.min(Math.max(caGrowth, 0.03), 0.25); // Clamp between 3% and 25%
        
        const previsionHeaders = ['Indicateurs', `Année ${baseYear + 1}`, `Année ${baseYear + 2}`, `Année ${baseYear + 3}`];
        const previsionRows = [
            [
                'Chiffre d\'affaires',
                formatCurrencySpaced(baseCA * (1 + growthRate)),
                formatCurrencySpaced(baseCA * Math.pow(1 + growthRate, 2)),
                formatCurrencySpaced(baseCA * Math.pow(1 + growthRate, 3)),
            ],
            [
                'EBITDA',
                formatCurrencySpaced(baseEBITDA * (1 + growthRate * 0.8)),
                formatCurrencySpaced(baseEBITDA * Math.pow(1 + growthRate * 0.8, 2)),
                formatCurrencySpaced(baseEBITDA * Math.pow(1 + growthRate * 0.8, 3)),
            ],
            [
                'Résultat net',
                formatCurrencySpaced(baseRN * (1 + growthRate * 0.7)),
                formatCurrencySpaced(baseRN * Math.pow(1 + growthRate * 0.7, 2)),
                formatCurrencySpaced(baseRN * Math.pow(1 + growthRate * 0.7, 3)),
            ],
            [
                'Évolution CA',
                `+${(growthRate * 100).toFixed(1)}%`,
                `+${(growthRate * 100).toFixed(1)}%`,
                `+${(growthRate * 100).toFixed(1)}%`,
            ],
        ];

        autoTable(doc, {
            startY: y,
            head: [previsionHeaders],
            body: previsionRows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: MAYFIN_COLORS.green as [number, number, number], textColor: 255 },
            alternateRowStyles: { fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
            },
        });
        y = getAutoTableFinalY(doc) + 5;

        // Add projection note
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text(`Projections basées sur le taux de croissance historique de ${(growthRate * 100).toFixed(1)}% - À titre indicatif`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
    } else if (data?.finances?.annees && data.finances.annees.length === 1) {
        // Single year available - show simple projection
        const year = data.finances.annees[0];
        const baseYear = year?.annee || new Date().getFullYear();
        const growthRate = 0.05; // Assume 5% growth
        
        const previsionHeaders = ['Indicateurs', `Année ${baseYear + 1}`, `Année ${baseYear + 2}`, `Année ${baseYear + 3}`];
        const previsionRows = [
            [
                'Chiffre d\'affaires',
                formatCurrencySpaced((year?.chiffreAffaires || 0) * (1 + growthRate)),
                formatCurrencySpaced((year?.chiffreAffaires || 0) * Math.pow(1 + growthRate, 2)),
                formatCurrencySpaced((year?.chiffreAffaires || 0) * Math.pow(1 + growthRate, 3)),
            ],
            [
                'EBITDA',
                formatCurrencySpaced((year?.ebitda || 0) * (1 + growthRate)),
                formatCurrencySpaced((year?.ebitda || 0) * Math.pow(1 + growthRate, 2)),
                formatCurrencySpaced((year?.ebitda || 0) * Math.pow(1 + growthRate, 3)),
            ],
            [
                'Résultat net',
                formatCurrencySpaced((year?.resultatNet || 0) * (1 + growthRate)),
                formatCurrencySpaced((year?.resultatNet || 0) * Math.pow(1 + growthRate, 2)),
                formatCurrencySpaced((year?.resultatNet || 0) * Math.pow(1 + growthRate, 3)),
            ],
        ];

        autoTable(doc, {
            startY: y,
            head: [previsionHeaders],
            body: previsionRows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: MAYFIN_COLORS.green as [number, number, number], textColor: 255 },
            alternateRowStyles: { fillColor: MAYFIN_COLORS.lightGrey as [number, number, number] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
            },
        });
        y = getAutoTableFinalY(doc) + 5;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('Projections basées sur une hypothèse de croissance de 5% par an - À titre indicatif', margin, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
    } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('Données financières insuffisantes pour générer des prévisionnels', margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
    }

    // ============ PLAN DE FINANCEMENT ============
    checkPageBreak(70);
    addSubtitle('Plan de financement');

    // Get financing data
    const montantDemandePlan = data?.financement?.montantDemande || dossier?.montant_demande || 0;
    const apportClientPlan = besoin?.apportClient || 0;
    const montantFinancePlan = besoin?.montantFinance || montantDemandePlan;
    
    // Estimate BFR and investments based on available data
    const latestYearData = data?.finances?.annees?.[0];
    const stocks = latestYearData?.stocks || 0;
    const creancesClients = latestYearData?.creancesClients || 0;
    const dettesFournisseurs = latestYearData?.dettesFournisseurs || 0;
    const bfrEstime = stocks + creancesClients - dettesFournisseurs;
    
    // Calculate total needs (investment + BFR)
    const investissements = montantDemandePlan > 0 ? montantDemandePlan : 0;
    const totalBesoins = investissements + Math.max(bfrEstime, 0);
    
    // Calculate total resources
    const autresFinancements = Math.max(0, totalBesoins - apportClientPlan - montantFinancePlan);
    const totalRessources = apportClientPlan + montantFinancePlan + autresFinancements;

    // Create the plan de financement table with two sections
    const planData = [
        ['BESOINS', 'Montant', 'RESSOURCES', 'Montant'],
        ['Investissements matériels', formatCurrencySpaced(investissements), 'Apport personnel', formatCurrencySpaced(apportClientPlan)],
        ['Besoin en fonds de roulement', formatCurrencySpaced(Math.max(bfrEstime, 0)), 'Financement bancaire', formatCurrencySpaced(montantFinancePlan)],
        ['Frais d\'établissement', formatCurrencySpaced(0), 'Autres financements', formatCurrencySpaced(autresFinancements)],
        ['', '', '', ''],
        ['TOTAL BESOINS', formatCurrencySpaced(totalBesoins), 'TOTAL RESSOURCES', formatCurrencySpaced(totalRessources)],
    ];

    autoTable(doc, {
        startY: y,
        body: planData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: MAYFIN_COLORS.lightGrey as [number, number, number], cellWidth: 45 },
            1: { halign: 'right', cellWidth: 35 },
            2: { fontStyle: 'bold', fillColor: MAYFIN_COLORS.lightGrey as [number, number, number], cellWidth: 45 },
            3: { halign: 'right', cellWidth: 35 },
        },
        didParseCell: (cellData) => {
            // Style the header row
            if (cellData.row.index === 0) {
                cellData.cell.styles.fillColor = MAYFIN_COLORS.green;
                cellData.cell.styles.textColor = [255, 255, 255];
                cellData.cell.styles.fontStyle = 'bold';
            }
            // Style the total row
            if (cellData.row.index === 5) {
                cellData.cell.styles.fillColor = MAYFIN_COLORS.green;
                cellData.cell.styles.textColor = [255, 255, 255];
                cellData.cell.styles.fontStyle = 'bold';
            }
            // Empty row styling
            if (cellData.row.index === 4) {
                cellData.cell.styles.fillColor = [255, 255, 255];
                cellData.cell.styles.minCellHeight = 2;
            }
        },
        theme: 'plain',
    });
    y = getAutoTableFinalY(doc) + 5;

    // Taux d'apport indicator
    const tauxApportCalc = totalBesoins > 0 ? (apportClientPlan / totalBesoins) * 100 : 0;
    const tauxApportStatus = tauxApportCalc >= 20 ? '✓' : '⚠';
    const tauxApportColor = tauxApportCalc >= 20 ? MAYFIN_COLORS.successGreen : MAYFIN_COLORS.warningOrange;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...tauxApportColor);
    doc.text(`${tauxApportStatus} Taux d'apport: ${tauxApportCalc.toFixed(1)}% (standard bancaire > 20%)`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Funding request details - compact
    if (data?.financement) {
        addSubtitle('Détails de la demande');
        addInlineText('Montant demandé', formatCurrencySpaced(data.financement.montantDemande));
        addInlineText('Objet', data.financement.objetFinancement);
        addInlineText('Durée', data.financement.dureeEnMois ? `${data.financement.dureeEnMois} mois` : '-');
        y += 3;
    }

    // ANALYSE SECTORIELLE (on same page if space permits)
    if (secteur) {
        checkPageBreak(50);

        addTitle('ANALYSE SECTORIELLE', 12);
        y += 3;

        addSubtitle('Contexte de marché');
        addParagraph(secteur.contexteMarche, false, 9);

        if (secteur.risquesSecteur?.length > 0) {
            checkPageBreak(20);
            addSubtitle('Risques sectoriels identifiés', [231, 76, 60]);
            addBulletList(secteur.risquesSecteur, [180, 60, 50], 8);
        }
    }

    // ============ PAGE 4: OPPORTUNITÉS + BENCHMARK + SOURCES ============
    if (secteur) {
        doc.addPage();
        y = margin;

        if (secteur.opportunites?.length > 0) {
            addSubtitle('Opportunités', [39, 174, 96]);
            addBulletList(secteur.opportunites, [30, 140, 80], 8);
        }

        if (secteur.benchmarkConcurrents) {
            checkPageBreak(25);
            addSubtitle('Benchmark concurrentiel');
            addParagraph(secteur.benchmarkConcurrents, false, 9);
        }

        // Sources - displayed prominently
        if (secteur.sources?.length > 0) {
            checkPageBreak(30);
            addSubtitle('Sources de l\'analyse');
            doc.setFontSize(8);
            for (const src of secteur.sources) {
                checkPageBreak(5);
                const srcText = src.length > 100 ? src.substring(0, 97) + '...' : src;
                doc.setTextColor(51, 102, 153);
                doc.text(`• ${srcText}`, margin + 2, y);
                y += 4;
            }
            doc.setTextColor(0, 0, 0);
            y += 3;
        }
    }

    // ============ SYNTHÈSE IA (if available) ============
    if (synthese) {
        checkPageBreak(60);

        // Start new page if not enough space
        if (y > pageHeight - 80) {
            doc.addPage();
            y = margin;
        }

        addTitle('SYNTHÈSE', 12);
        y += 3;

        // Executive summary
        if (synthese.resumeExecutif) {
            addSubtitle('Résumé exécutif');
            addParagraph(synthese.resumeExecutif, false, 9);
        }

        if (synthese.pointsForts?.length > 0) {
            checkPageBreak(15);
            addSubtitle('Points forts', [39, 174, 96]);
            addBulletList(synthese.pointsForts, [30, 140, 80], 8);
        }

        if (synthese.pointsVigilance?.length > 0) {
            checkPageBreak(15);
            addSubtitle('Points de vigilance', [241, 196, 15]);
            addBulletList(synthese.pointsVigilance, [180, 140, 20], 8);
        }

        if (synthese.recommandationsConditions?.length > 0) {
            checkPageBreak(15);
            addSubtitle('Recommandations et conditions');
            addBulletList(synthese.recommandationsConditions, undefined, 8);
        }

        if (synthese.conclusionArgumentee) {
            checkPageBreak(20);
            addSubtitle('Conclusion argumentée');
            addParagraph(synthese.conclusionArgumentee, false, 9);
        }
    }

    // ============ FOOTER ON ALL PAGES ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        
        // Footer text
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        
        // Left: Document confidentiel - MayFin
        doc.text('Document confidentiel - MayFin', margin, pageHeight - 7);
        
        // Center: Date de génération
        doc.text(`Généré le ${formatDate()}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        
        // Right: Page number
        doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    // Save
    const siren = data?.entreprise?.siren || dossier?.siren || 'unknown';
    const filename = `analyse_ia_${siren}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
