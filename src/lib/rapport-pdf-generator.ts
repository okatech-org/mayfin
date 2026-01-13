import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { RapportAnalyseRow } from '@/hooks/useRapportAnalyse';
import type { DossierRow } from '@/hooks/useDossiers';
import { SECTIONS, QUESTIONS, DECISION_LABELS, SYNTHESE_LABELS, CONDITIONS_PARTICULIERES_OPTIONS } from '@/data/questionnaire-structure';
import type { Question } from '@/types/rapport-analyse.types';

// Extend jsPDF type for autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: unknown) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

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
    addText('Montant demandé', `${dossier.montant_demande?.toLocaleString('fr-FR')} €`);
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

            doc.autoTable({
                startY: y,
                head: [columns.map(c => c.replace(/_/g, ' '))],
                body: tableData.map(row => columns.map(c => String(row[c] ?? '-'))),
                margin: { left: margin },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [51, 102, 153] }
            });

            y = doc.lastAutoTable.finalY + 5;
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
    doc.text('Document généré automatiquement - Confidentiel', pageWidth / 2, y, { align: 'center' });

    // Save
    const filename = `rapport_analyse_${dossier.siren}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
