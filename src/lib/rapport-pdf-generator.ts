import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RapportAnalyseRow } from '@/hooks/useRapportAnalyse';
import type { DossierRow } from '@/hooks/useDossiers';
import { SECTIONS, QUESTIONS, DECISION_LABELS, SYNTHESE_LABELS, CONDITIONS_PARTICULIERES_OPTIONS } from '@/data/questionnaire-structure';
import type { Question } from '@/types/rapport-analyse.types';
import type { AnalysisResult, AnalyseSectorielle, SyntheseNarrative } from '@/hooks/useDocumentAnalysis';

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

    // Compact page break check
    const checkPageBreak = (neededSpace = 20) => {
        if (y + neededSpace > pageHeight - 15) {
            doc.addPage();
            y = margin;
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

    // Compact subtitle
    const addSubtitle = (text: string, color: number[] = [51, 102, 153]) => {
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

    // ============ PAGE 1: COVER + SCORING ============
    y = 15;

    // Compact header
    doc.setFillColor(51, 102, 153);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("ANALYSE DE FINANCEMENT", pageWidth / 2, y + 7, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("Rapport d'étude", pageWidth / 2, y + 13, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 22;

    // Compact company info
    doc.setDrawColor(51, 102, 153);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');
    y += 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data?.entreprise?.raisonSociale || dossier?.raison_sociale || 'Entreprise', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`SIREN: ${data?.entreprise?.siren || dossier?.siren || '-'} • SIRET: ${data?.entreprise?.siret || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`${data?.entreprise?.formeJuridique || '-'} • ${data?.entreprise?.secteurActivite || '-'}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Code NAF: ${data?.entreprise?.codeNaf || '-'} • ${formatNumber(data?.entreprise?.nbSalaries) || 0} salariés`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Score box - compact
    const recommandation = analysisResult.recommandation;
    const scoreGlobal = score?.global || 0;

    const scoreColor = scoreGlobal >= 70 ? [39, 174, 96]
        : scoreGlobal >= 45 ? [241, 196, 15]
            : [231, 76, 60];

    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`SCORE: ${scoreGlobal}/100 • ${recommandation || 'À ÉVALUER'}`, pageWidth / 2, y + 7, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Seuil accordable: ${formatCurrencySpaced(analysisResult.seuilAccordable)}`, pageWidth / 2, y + 13, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 22;

    if (analysisResult.modelsUsed && analysisResult.modelsUsed.length > 0) {
        // Skip model display for confidentiality
        y += 2;
    }

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
            headStyles: { fillColor: [51, 102, 153], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
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
        const financeHeaders = ['Exercice', 'CA', 'Résultat Net', 'EBITDA', 'Capitaux Propres', 'Trésorerie'];
        const financeRows = data.finances.annees.map(a => [
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
            headStyles: { fillColor: [51, 102, 153], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = getAutoTableFinalY(doc) + 6;
    }

    // Funding request - compact
    if (data?.financement) {
        addSubtitle('Demande de financement');
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
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text(
            `Page ${i}/${totalPages} • Généré le ${formatDate()} • Document confidentiel`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
    }

    // Save
    const siren = data?.entreprise?.siren || dossier?.siren || 'unknown';
    const filename = `analyse_ia_${siren}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
