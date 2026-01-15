/**
 * BNP Paribas 35-Question Bank Analysis Report PDF Generator
 * Generates professional 20-30 page PDF reports conforming to BNP Paribas format
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DossierRow } from '@/hooks/useDossiers';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import {
    type BNPQuestionnaireData,
    type BNPRecommandationFinale,
    type BNPProjectType,
    BNP_SECTIONS,
    getDecisionLabel,
    getDecisionColor,
    getDSCRRating,
    isProjectTypeRequiringCession,
} from '@/types/bnp-rapport.types';

// ============= CONSTANTS =============

const COLORS = {
    primary: [0, 51, 102] as [number, number, number],      // #003366 - BNP Blue
    accent: [0, 102, 204] as [number, number, number],      // #0066CC - Light Blue
    success: [0, 102, 0] as [number, number, number],       // #006600 - Green
    warning: [255, 140, 0] as [number, number, number],     // #FF8C00 - Orange
    danger: [204, 0, 0] as [number, number, number],        // #CC0000 - Red
    grey: [128, 128, 128] as [number, number, number],      // #808080 - Grey
    lightGrey: [245, 245, 245] as [number, number, number], // #F5F5F5 - Background
    white: [255, 255, 255] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
};

const PAGE = {
    width: 210,
    height: 297,
    margin: 15,
    contentWidth: 180,
};

// ============= HELPERS =============

const getAutoTableFinalY = (doc: jsPDF): number => {
    return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
};

const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${formatNumber(Math.round(value))} €`;
};

const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1).replace('.', ',')} %`;
};

const formatDate = (): string => {
    return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

// ============= MAIN GENERATOR =============

export interface BNPReportInput {
    questionnaire: BNPQuestionnaireData;
    dossier: Partial<DossierRow>;
    analysisResult?: AnalysisResult;
    projectType: BNPProjectType;
    recommandation: BNPRecommandationFinale;
}

/**
 * Generate a complete BNP Paribas format bank analysis report (35 questions, 20-30 pages)
 */
export function generateBNPRapportPDF(input: BNPReportInput): void {
    const { questionnaire, dossier, analysisResult, projectType, recommandation } = input;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    let y = PAGE.margin;
    const margin = PAGE.margin;
    const pageWidth = PAGE.width;
    const contentWidth = PAGE.contentWidth;
    const pageHeight = PAGE.height;

    // ============= HELPER FUNCTIONS =============

    const checkPageBreak = (neededSpace = 25): void => {
        if (y + neededSpace > pageHeight - margin - 15) {
            doc.addPage();
            y = margin;
            addHeader();
        }
    };

    const addHeader = (): void => {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.grey);
        doc.text(`Rapport d'analyse - ${dossier.raison_sociale || 'Dossier'}`, margin, 8);
        doc.text(`Confidentiel - BNP Paribas`, pageWidth - margin, 8, { align: 'right' });
        doc.setTextColor(...COLORS.black);
    };

    const addFooter = (pageNum: number, totalPages: number): void => {
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.grey);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.text('Document confidentiel - BNP Paribas', margin, pageHeight - 7);
        doc.text(`Généré le ${formatDate()}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        doc.text(`Page ${pageNum}/${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
        doc.setTextColor(...COLORS.black);
    };

    const addSectionTitle = (text: string): void => {
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(text, margin, y);
        y += 8;
        doc.setTextColor(...COLORS.black);
    };

    const addQuestionTitle = (code: string, text: string): void => {
        checkPageBreak(15);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text(`${code} - ${text}`, margin, y);
        y += 6;
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'normal');
    };

    const addResponse = (label: string, isPositive?: boolean): void => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        if (isPositive !== undefined) {
            const color = isPositive ? COLORS.success : COLORS.danger;
            doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(label, margin, y);
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'normal');
        y += 5;
    };

    const addParagraph = (text: string | null | undefined, fontSize = 10): void => {
        if (!text) return;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, contentWidth);
        for (const line of lines) {
            checkPageBreak(5);
            doc.text(line, margin, y);
            y += 4;
        }
        y += 2;
    };

    const addAlert = (text: string, type: 'warning' | 'danger' | 'info' = 'warning'): void => {
        const color = type === 'danger' ? COLORS.danger : type === 'warning' ? COLORS.warning : COLORS.accent;
        const icon = type === 'danger' ? '✗' : type === 'warning' ? '⚠️' : 'ℹ️';
        doc.setFontSize(9);
        doc.setTextColor(...color);
        doc.text(`${icon} ${text}`, margin + 5, y);
        doc.setTextColor(...COLORS.black);
        y += 5;
    };

    const addBulletPoint = (text: string, indent = 0): void => {
        checkPageBreak(5);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, contentWidth - 10 - indent);
        doc.text('•', margin + indent, y);
        doc.text(lines[0], margin + indent + 5, y);
        y += 4;
        for (let i = 1; i < lines.length; i++) {
            doc.text(lines[i], margin + indent + 5, y);
            y += 4;
        }
    };

    // ============= PAGE DE GARDE =============

    y = 60;
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text("RAPPORT D'ANALYSE", pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.text('DE FINANCEMENT BANCAIRE', pageWidth / 2, y, { align: 'center' });
    y += 30;

    // Info table
    const infoData = [
        ['Dossier', dossier.raison_sociale || '-'],
        ['Porteur de projet', `${dossier.dirigeant_prenom || ''} ${dossier.dirigeant_nom || ''}`.trim() || '-'],
        ['Type de financement', dossier.type_financement || '-'],
        ['Montant demandé', formatCurrency(dossier.montant_demande)],
        ["Date d'analyse", formatDate()],
        ['Chargé d\'affaires', 'BNP Paribas - Département TPE'],
    ];

    autoTable(doc, {
        startY: y,
        body: infoData,
        margin: { left: margin + 20, right: margin + 20 },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [230, 242, 255], cellWidth: 50 },
            1: { cellWidth: 100 },
        },
        theme: 'grid',
    });
    y = getAutoTableFinalY(doc) + 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Statut du rapport : BROUILLON', margin + 20, y);
    y += 6;
    doc.setTextColor(...COLORS.danger);
    doc.text('Confidentiel - Document interne BNP Paribas', margin + 20, y);
    doc.setTextColor(...COLORS.black);

    doc.addPage();
    y = margin;

    // ============= SECTION 1: INFORMATIONS PROJET =============

    addSectionTitle('SECTION 1 : INFORMATIONS SUR LE PROJET');

    addQuestionTitle('Q1.1', 'Présenter en détail la demande');
    addParagraph(questionnaire.detailDemande);

    addQuestionTitle('Q1.2', "Zone d'exploitation du besoin financé");
    addResponse(`Adresse : ${questionnaire.zoneExploitationAdresse}`);
    addResponse(`Code postal : ${questionnaire.zoneExploitationCodePostal}`);
    addResponse(`Commune : ${questionnaire.zoneExploitationCommune}`);
    y += 3;

    addQuestionTitle('Q1.3', "Comment l'exploitation du besoin financé ?");
    addParagraph(questionnaire.commentaireZoneExploitation);

    checkPageBreak(30);

    // ============= SECTION 2: PORTEUR DE PROJET =============

    addSectionTitle('SECTION 2 : LE PORTEUR DE PROJET');

    addQuestionTitle('Q2.1', "S'agit-il d'une première expérience entrepreneuriale ?");
    addResponse(questionnaire.premiereExperienceEntrepreneuriale ? 'Réponse : OUI' : 'Réponse : NON', !questionnaire.premiereExperienceEntrepreneuriale);
    if (questionnaire.premiereExperienceEntrepreneuriale) {
        addAlert('Vigilance renforcée nécessaire - Accompagnement recommandé');
    }
    if (questionnaire.experienceEntrepreneurialeDetail) {
        addParagraph(questionnaire.experienceEntrepreneurialeDetail);
    }

    addQuestionTitle('Q2.2', "Le porteur répond-il aux exigences d'accès à la profession ?");
    addResponse(questionnaire.exigencesAccesProfession ? 'Réponse : OUI' : 'Réponse : NON', questionnaire.exigencesAccesProfession);
    if (questionnaire.exigencesAccesCommentaire) {
        addParagraph(questionnaire.exigencesAccesCommentaire);
    }

    addQuestionTitle('Q2.3', 'Liens entre les associés');
    if (questionnaire.liensAssocies) {
        addParagraph(questionnaire.liensAssocies);
    } else {
        addResponse('Non applicable - Structure avec associé unique.');
    }

    addQuestionTitle('Q2.4', "Le conjoint/concubin a-t-il un rôle dans l'activité ?");
    addResponse(questionnaire.conjointRoleActivite ? 'Réponse : OUI' : 'Réponse : NON');
    if (questionnaire.conjointRoleDetail) {
        addParagraph(questionnaire.conjointRoleDetail);
    }

    addQuestionTitle('Q2.5', 'Autres informations sur le porteur de projet');
    addResponse('Réponse : OUI', true);
    addParagraph(questionnaire.autresInfosPorteur);

    addQuestionTitle('Q2.6', "L'emprunteur est-il multi-bancarisé ?");
    if (questionnaire.emprunteurMultiBancarise === null || questionnaire.emprunteurMultiBancarise === undefined) {
        addResponse('Information non communiquée - À vérifier');
    } else {
        addResponse(questionnaire.emprunteurMultiBancarise ? 'Réponse : OUI' : 'Réponse : NON');
    }

    doc.addPage();
    y = margin;

    // ============= SECTION 3: CESSION =============

    addSectionTitle('SECTION 3 : ANALYSE DE LA CESSION');

    if (!isProjectTypeRequiringCession(projectType)) {
        addResponse(`Section non applicable - Il s'agit d'une création d'entreprise, pas d'une acquisition.`);
        y += 5;
    } else {
        addQuestionTitle('Q3.1', 'Présence de justificatif de cession');
        addResponse(questionnaire.presenceJustificatifCession ? 'Réponse : OUI' : 'Réponse : NON', questionnaire.presenceJustificatifCession);

        addQuestionTitle('Q3.2', 'Salariés repris');
        addResponse(`Réponse : ${questionnaire.salariesRepris?.toUpperCase() || 'NC'}`);
        if (questionnaire.salariesReprisCommentaire) {
            addParagraph(questionnaire.salariesReprisCommentaire);
        }

        addQuestionTitle('Q3.3', 'Raisons de la cession');
        addParagraph(questionnaire.raisonsCession);

        addQuestionTitle('Q3.5', 'Autres informations sur le projet');
        addParagraph(questionnaire.autresInfosProjet);
    }

    // Q3.4 - Toujours inclus même en création
    addQuestionTitle('Q3.4', "Commentaire sur l'environnement local");
    addParagraph(questionnaire.commentaireEnvironnementLocal);

    doc.addPage();
    y = margin;

    // ============= SECTION 4: ANALYSE FINANCIÈRE =============

    addSectionTitle('SECTION 4 : ANALYSE FINANCIÈRE');

    addQuestionTitle('Q4.1', 'Commentaires sur la structure financière');
    if (projectType === 'creation') {
        addResponse('Non applicable - Création d\'entreprise sans historique comptable.');
        addResponse('Analyse du plan de financement initial :', true);
    }
    addParagraph(questionnaire.commentaireBilansConsolides);

    addQuestionTitle('Q4.2', 'Synthèse sur le compte de résultat');
    addResponse('Analyse des prévisionnels sur 3 ans :', true);

    // Tableau compte de résultat
    checkPageBreak(60);
    const financeData = analysisResult?.data?.finances?.annees || [];
    if (financeData.length > 0) {
        const crData = [
            ['', 'Année 1', 'Année 2', 'Année 3'],
            ['Chiffre d\'affaires',
                formatCurrency(financeData[0]?.chiffreAffaires),
                formatCurrency(financeData[1]?.chiffreAffaires),
                formatCurrency(financeData[2]?.chiffreAffaires)],
            ['EBITDA',
                formatCurrency(financeData[0]?.ebitda),
                formatCurrency(financeData[1]?.ebitda),
                formatCurrency(financeData[2]?.ebitda)],
            ['Résultat net',
                formatCurrency(financeData[0]?.resultatNet),
                formatCurrency(financeData[1]?.resultatNet),
                formatCurrency(financeData[2]?.resultatNet)],
        ];

        autoTable(doc, {
            startY: y,
            head: [crData[0]],
            body: crData.slice(1),
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
            alternateRowStyles: { fillColor: COLORS.lightGrey },
        });
        y = getAutoTableFinalY(doc) + 8;
    }

    addParagraph(questionnaire.syntheseCompteResultat);

    addQuestionTitle('Q4.3', "Événements conjoncturels impactant l'activité");
    addResponse(questionnaire.evenementsConjoncturels ? 'Réponse : OUI' : 'Réponse : NON');
    if (questionnaire.evenementsConjoncturelsDetail) {
        addParagraph(questionnaire.evenementsConjoncturelsDetail);
    }

    addQuestionTitle('Q4.4', 'Commentaires sur les dettes fiscales et sociales');
    if (projectType === 'creation') {
        addResponse('Non applicable - Création d\'entreprise, aucun historique de dettes.');
    } else {
        addParagraph(questionnaire.commentaireDettesFS);
    }

    addQuestionTitle('Q4.6', "Autres informations sur l'analyse financière");
    addResponse('Réponse : OUI - Éléments complémentaires', true);
    addParagraph(questionnaire.autresInfosAnalyseFinanciere);

    doc.addPage();
    y = margin;

    // ============= SECTION 5: ANALYSE PRÉVISIONNELLE =============

    addSectionTitle('SECTION 5 : ANALYSE PRÉVISIONNELLE');

    addQuestionTitle('Q5.1', 'Tableau des charges prévisionnelles');
    checkPageBreak(50);

    const charges = questionnaire.chargesPrevisionnelles;
    const chargesData = [
        ['Poste', 'Année 1', 'Année 2', 'Année 3'],
        ['Charges variables',
            `${formatCurrency(charges.annee1.chargesVariables)} (${charges.annee1.chargesVariablesPct}%)`,
            `${formatCurrency(charges.annee2.chargesVariables)} (${charges.annee2.chargesVariablesPct}%)`,
            `${formatCurrency(charges.annee3.chargesVariables)} (${charges.annee3.chargesVariablesPct}%)`],
        ['Charges fixes exploitation',
            formatCurrency(charges.annee1.chargesFixesExploitation),
            formatCurrency(charges.annee2.chargesFixesExploitation),
            formatCurrency(charges.annee3.chargesFixesExploitation)],
        ['Charges de personnel',
            formatCurrency(charges.annee1.chargesPersonnel),
            formatCurrency(charges.annee2.chargesPersonnel),
            formatCurrency(charges.annee3.chargesPersonnel)],
    ];

    autoTable(doc, {
        startY: y,
        head: [chargesData[0]],
        body: chargesData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    });
    y = getAutoTableFinalY(doc) + 8;

    addQuestionTitle('Q5.2', 'Les charges sont-elles bien réparties ?');
    addResponse(questionnaire.chargesBienReparties ? 'Réponse : OUI' : 'Réponse : NON', questionnaire.chargesBienReparties);
    if (questionnaire.chargesBienRepartiesCommentaire) {
        addParagraph(questionnaire.chargesBienRepartiesCommentaire);
    }

    addQuestionTitle('Q5.3', 'Commentaires charges externes prévisionnelles');
    addParagraph(questionnaire.commentaireChargesExternes);

    addQuestionTitle('Q5.4', 'Commentaires marge brute prévisionnelle');
    addParagraph(questionnaire.commentaireMargeBrute);

    addQuestionTitle('Q5.5', 'Évolution fonds propres et dettes prévisionnels');
    addParagraph(questionnaire.commentaireEvolutionFondsPropres);

    addQuestionTitle('Q5.6', 'La CAF couvre-t-elle les annuités sur 3 ans ?');

    const cafData = questionnaire.cafData;
    const dscrA1 = getDSCRRating(cafData.annee1.dscr);
    addResponse(questionnaire.validationCafPrevisionnel ? `Réponse : OUI ${dscrA1.icon}` : `Réponse : NON ${dscrA1.icon}`, questionnaire.validationCafPrevisionnel);

    checkPageBreak(50);
    const cafTableData = [
        ['', 'Année 1', 'Année 2', 'Année 3'],
        ['CAF (Résultat + Amortissements)',
            formatCurrency(cafData.annee1.caf),
            formatCurrency(cafData.annee2.caf),
            formatCurrency(cafData.annee3.caf)],
        ['Annuités de crédits',
            formatCurrency(cafData.annee1.annuites),
            formatCurrency(cafData.annee2.annuites),
            formatCurrency(cafData.annee3.annuites)],
        ['CAF - Annuités',
            formatCurrency(cafData.annee1.solde),
            formatCurrency(cafData.annee2.solde),
            formatCurrency(cafData.annee3.solde)],
        ['Ratio couverture (DSCR)',
            cafData.annee1.dscr.toFixed(2),
            cafData.annee2.dscr.toFixed(2),
            cafData.annee3.dscr.toFixed(2)],
    ];

    autoTable(doc, {
        startY: y,
        head: [cafTableData[0]],
        body: cafTableData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
        alternateRowStyles: { fillColor: COLORS.lightGrey },
    });
    y = getAutoTableFinalY(doc) + 8;

    addQuestionTitle('Q5.7', "Validation capacité d'autofinancement prévisionnel");
    addResponse(questionnaire.validationCafGlobal ? 'Réponse : OUI ✓' : 'Réponse : NON ✗', questionnaire.validationCafGlobal);
    addParagraph(questionnaire.validationCafJustification);

    doc.addPage();
    y = margin;

    // ============= SECTION 6: ENDETTEMENT PRIVÉ =============

    addSectionTitle('SECTION 6 : ENDETTEMENT PRIVÉ DE L\'EMPRUNTEUR');
    addAlert('ATTENTION : Les renseignements sur la vie privée et l\'endettement personnel du dirigeant sont indispensables à l\'analyse', 'danger');

    addQuestionTitle('Q6.1', "Aides financières de l'État");
    addResponse(questionnaire.beneficieAidesEtat ? 'Réponse : OUI' : 'Réponse : NON');
    if (questionnaire.aidesEtatDetail) {
        addBulletPoint(`Type d'aide : ${questionnaire.aidesEtatDetail.type}`);
        if (questionnaire.aidesEtatDetail.montant) {
            addBulletPoint(`Montant : ${formatCurrency(questionnaire.aidesEtatDetail.montant)}`);
        }
        if (questionnaire.aidesEtatDetail.impact) {
            addParagraph(questionnaire.aidesEtatDetail.impact);
        }
    }

    addQuestionTitle('Q6.2', 'Revenus actuels et futurs du dirigeant/cautions');
    checkPageBreak(40);

    if (questionnaire.revenusCautions.length > 0) {
        const revenusData = [
            ['Personne', 'Revenus actuels', 'Revenus futurs', 'Source'],
            ...questionnaire.revenusCautions.map(r => [r.nom, r.revenusActuels, r.revenusFuturs, r.source]),
        ];

        autoTable(doc, {
            startY: y,
            head: [revenusData[0]],
            body: revenusData.slice(1),
            margin: { left: margin, right: margin },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
        });
        y = getAutoTableFinalY(doc) + 8;
    } else {
        addAlert('INFORMATIONS MANQUANTES À COLLECTER', 'danger');
    }

    addQuestionTitle('Q6.3', "Taux d'endettement et reste à vivre");
    if (questionnaire.commentaireEndettement) {
        addParagraph(questionnaire.commentaireEndettement);
    } else {
        addAlert('Analyse à compléter impérativement avec données financières personnelles', 'danger');
    }

    doc.addPage();
    y = margin;

    // ============= SECTION 7: COMMENTAIRES =============

    addSectionTitle('SECTION 7 : COMMENTAIRES SUR LE PRÉVISIONNEL');

    addQuestionTitle('Q7.1', 'Charges de personnels prévisionnelles');
    addParagraph(questionnaire.commentaireChargesPersonnel);

    // ============= SECTION 8: CONTRÔLES =============

    addSectionTitle('SECTION 8 : CONTRÔLES ET VALIDATIONS');

    addQuestionTitle('Q8.1', 'Présence de financements liés');
    addResponse(questionnaire.presenceFinancementsLies ? 'Réponse : OUI' : 'Réponse : NON');
    if (questionnaire.financementsLiesDetail) {
        addParagraph(questionnaire.financementsLiesDetail);
    }

    addQuestionTitle('Q8.2', 'Présentation DECLIC');
    addResponse(questionnaire.presentationDeclic ? 'Réponse : OUI' : 'Réponse : NON (non applicable)');

    addQuestionTitle('Q8.3', 'Fonds propres négatifs');
    addResponse(questionnaire.fondsPropresNegatifs ? 'Réponse : OUI ✗' : 'Réponse : NON ✓', !questionnaire.fondsPropresNegatifs);
    if (questionnaire.fondsPropresNegatifsCommentaire) {
        addParagraph(questionnaire.fondsPropresNegatifsCommentaire);
    }

    addQuestionTitle('Q8.4', 'Contrôles indispensables réalisés');
    addResponse(questionnaire.controlesIndispensablesRealises ? 'Réponse : Partiellement - À compléter' : 'Réponse : NON');

    checkPageBreak(80);
    const controlesData = [
        ['Contrôle', 'Statut', 'Commentaire'],
        ...questionnaire.checklistControles.map(c => [
            c.controle,
            c.statut === 'ok' ? '✓ OK' : c.statut === 'a_obtenir' ? '⚠️ À OBTENIR' : '❌ NON FAIT',
            c.commentaire || '',
        ]),
    ];

    autoTable(doc, {
        startY: y,
        head: [controlesData[0]],
        body: controlesData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 80 },
        },
    });
    y = getAutoTableFinalY(doc) + 10;

    if (!questionnaire.controlesIndispensablesRealises) {
        addAlert('DOCUMENTS MANQUANTS À COLLECTER AVANT FINALISATION', 'danger');
    }

    doc.addPage();
    y = margin;

    // ============= SECTION 9: SYNTHÈSE ET RECOMMANDATION =============

    addSectionTitle('SECTION 9 : SYNTHÈSE ET RECOMMANDATION');

    // Synthèse
    const syntheseLabel = questionnaire.syntheseCollaborateur === 'concluante' ? 'CONCLUANTE ✓' :
        questionnaire.syntheseCollaborateur === 'reservee' ? 'RÉSERVÉE ⚠️' : 'DÉFAVORABLE ✗';
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`SYNTHÈSE COLLABORATEUR : ${syntheseLabel}`, margin, y);
    y += 10;

    // Points d'attention
    doc.setFontSize(11);
    doc.text("Points d'attention identifiés :", margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    questionnaire.pointsAttention.forEach((point, idx) => {
        addBulletPoint(`${idx + 1}. ${point}`);
    });
    y += 5;

    // ============= ENCADRÉ RECOMMANDATION FINALE =============

    checkPageBreak(120);
    const decisionColor = getDecisionColor(recommandation.decision);
    const decisionLabel = getDecisionLabel(recommandation.decision);

    // Box title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...decisionColor.rgb);
    doc.text('RECOMMANDATION FINALE', margin, y);
    y += 10;

    // Decision box
    const boxStartY = y;
    const boxContent: string[] = [];

    boxContent.push(`**${decisionLabel}**`);
    boxContent.push('');
    boxContent.push(`Montant finançable recommandé : ${formatCurrency(recommandation.montantFinancable)}`);

    recommandation.financements.forEach(f => {
        boxContent.push(`• ${f.type} : ${formatCurrency(f.montant)} sur ${f.duree} ans à ${f.taux}% (mensualité ${formatCurrency(f.mensualite)})`);
    });

    boxContent.push('');
    boxContent.push('Garanties requises :');
    recommandation.garanties.forEach(g => {
        boxContent.push(`• ${g.type} - ${g.description}`);
    });

    boxContent.push('');
    boxContent.push('Conditions particulières :');
    recommandation.conditions.forEach((c, idx) => {
        boxContent.push(`${idx + 1}. ${c}`);
    });

    boxContent.push('');
    boxContent.push('Ratios de validation :');
    boxContent.push(`• Apport / Investissement : ${formatPercentage(recommandation.ratios.tauxApport)} ${recommandation.ratios.tauxApport >= 15 ? '✓' : '⚠️'}`);
    boxContent.push(`• Dettes / CAF : ${recommandation.ratios.dettesCAF.toFixed(1)} an ${recommandation.ratios.dettesCAF <= 3 ? '✓' : '⚠️'}`);
    boxContent.push(`• DSCR Année 1 : ${recommandation.ratios.dscrA1.toFixed(2)} ${getDSCRRating(recommandation.ratios.dscrA1).icon}`);
    boxContent.push(`• Autonomie financière : ${formatPercentage(recommandation.ratios.autonomieFinanciere)} ${recommandation.ratios.autonomieFinanciere >= 20 ? '✓' : '⚠️'}`);

    boxContent.push('');
    boxContent.push('Justification de la décision :');
    boxContent.push(recommandation.justification);

    // Calculate box height
    let textHeight = 0;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    boxContent.forEach(line => {
        if (line.startsWith('**')) {
            textHeight += 8;
        } else {
            const lines = doc.splitTextToSize(line, contentWidth - 20);
            textHeight += lines.length * 5;
        }
    });
    textHeight += 20; // Padding

    // Draw box background
    doc.setFillColor(230, 255, 230); // Light green
    if (recommandation.decision === 'refus') {
        doc.setFillColor(255, 230, 230); // Light red
    } else if (recommandation.decision === 'accord_conditions') {
        doc.setFillColor(255, 244, 230); // Light orange
    } else if (recommandation.decision === 'transmission_comite') {
        doc.setFillColor(230, 242, 255); // Light blue
    }

    doc.roundedRect(margin, y, contentWidth, textHeight, 3, 3, 'F');
    doc.setDrawColor(...decisionColor.rgb);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, textHeight, 3, 3, 'S');

    // Write content inside box
    y += 10;
    doc.setTextColor(...COLORS.black);

    boxContent.forEach(line => {
        if (line.startsWith('**')) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...decisionColor.rgb);
            doc.text(line.replace(/\*\*/g, ''), margin + 10, y);
            doc.setTextColor(...COLORS.black);
            y += 8;
        } else if (line === '') {
            y += 3;
        } else if (line.startsWith('•') || /^\d+\./.test(line)) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const textLines = doc.splitTextToSize(line, contentWidth - 25);
            textLines.forEach((tl: string) => {
                doc.text(tl, margin + 15, y);
                y += 5;
            });
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', line.includes(':') && !line.includes('Justification') ? 'bold' : 'normal');
            const textLines = doc.splitTextToSize(line, contentWidth - 20);
            textLines.forEach((tl: string) => {
                doc.text(tl, margin + 10, y);
                y += 5;
            });
        }
    });

    // ============= ADD FOOTERS TO ALL PAGES =============

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
    }

    // ============= SAVE PDF =============

    const siren = dossier.siren || 'unknown';
    const filename = `rapport_bnp_${siren}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

/**
 * Create a default BNP questionnaire data structure from analysis result
 */
export function createBNPQuestionnaireFromAnalysis(
    analysisResult: AnalysisResult,
    dossier: Partial<DossierRow>,
    projectType: BNPProjectType = 'creation'
): Partial<BNPQuestionnaireData> {
    const data = analysisResult.data;
    const finances = data?.finances;
    const entreprise = data?.entreprise;
    const dirigeant = data?.dirigeant;
    const financement = data?.financement;

    return {
        // Section 1
        detailDemande: `Le projet consiste en une ${projectType} d'entreprise dans le secteur ${entreprise?.secteurActivite || dossier.secteur_activite || 'non spécifié'}. ${financement?.objetFinancement || ''}`,
        zoneExploitationAdresse: entreprise?.adresseSiege || dossier.adresse_siege || '',
        zoneExploitationCodePostal: '',
        zoneExploitationCommune: '',
        commentaireZoneExploitation: '',

        // Section 2
        premiereExperienceEntrepreneuriale: true,
        exigencesAccesProfession: true,
        conjointRoleActivite: false,
        autresInfosPorteur: `${dirigeant?.prenom || dossier.dirigeant_prenom || ''} ${dirigeant?.nom || dossier.dirigeant_nom || ''}, formation et expérience à détailler.`,

        // Section 3
        commentaireEnvironnementLocal: 'Analyse de la zone de chalandise à compléter.',

        // Section 4
        commentaireBilansConsolides: projectType === 'creation'
            ? `Plan de financement initial : Investissement total ${formatCurrency(dossier.montant_demande)}.`
            : 'Analyse des bilans historiques à compléter.',
        syntheseCompteResultat: 'Synthèse du compte de résultat prévisionnel à compléter.',
        evenementsConjoncturels: false,
        autresInfosAnalyseFinanciere: 'Éléments complémentaires à analyser.',

        // Section 5
        chargesPrevisionnelles: {
            annee1: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
            annee2: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
            annee3: { chargesVariables: 0, chargesVariablesPct: 0, chargesFixesExploitation: 0, chargesPersonnel: 0 },
        },
        chargesBienReparties: true,
        commentaireChargesExternes: 'Analyse des charges externes à détailler.',
        commentaireMargeBrute: 'Analyse de la marge brute à détailler.',
        validationCafPrevisionnel: true,
        cafData: {
            annee1: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
            annee2: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
            annee3: { caf: 0, annuites: 0, solde: 0, dscr: 0 },
        },
        validationCafGlobal: true,
        validationCafJustification: 'Justification de la validation CAF à compléter.',

        // Section 6
        beneficieAidesEtat: false,
        revenusCautions: [],

        // Section 7
        commentaireChargesPersonnel: 'Analyse des charges de personnel à détailler.',

        // Section 8
        presenceFinancementsLies: false,
        presentationDeclic: false,
        fondsPropresNegatifs: false,
        controlesIndispensablesRealises: false,
        checklistControles: [
            { controle: 'Kbis / Extrait K', statut: 'a_obtenir' },
            { controle: 'Pièce identité dirigeant', statut: 'a_obtenir' },
            { controle: 'Business plan détaillé', statut: 'ok' },
            { controle: 'Avis d\'imposition N-1', statut: 'a_obtenir' },
        ],

        // Section 9
        syntheseCollaborateur: 'concluante',
        pointsAttention: [],
        decisionFinale: 'accord_conditions',
        conditionsParticulieres: [],
        recommandationJustification: 'Justification à compléter.',
    };
}
