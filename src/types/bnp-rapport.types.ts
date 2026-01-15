/**
 * Types for BNP Paribas 35-Question Bank Analysis Report
 * Format conforming to official BNP Paribas questionnaire structure
 */

// ============= SECTION DEFINITIONS =============

export interface BNPSection {
    id: number;
    label: string;
    description: string;
}

export const BNP_SECTIONS: BNPSection[] = [
    { id: 1, label: 'INFORMATIONS SUR LE PROJET', description: 'Présentation détaillée du projet' },
    { id: 2, label: 'PORTEUR DE PROJET', description: 'Profil et compétences du porteur' },
    { id: 3, label: 'CESSION', description: 'Analyse si acquisition/reprise' },
    { id: 4, label: 'ANALYSE FINANCIÈRE', description: 'Structure et historique financier' },
    { id: 5, label: 'ANALYSE PRÉVISIONNELLE', description: 'Charges et CAF prévisionnelles' },
    { id: 6, label: 'ENDETTEMENT PRIVÉ', description: 'Situation financière personnelle' },
    { id: 7, label: 'COMMENTAIRES', description: 'Charges de personnel' },
    { id: 8, label: 'CONTRÔLES', description: 'Checklist et validations' },
    { id: 9, label: 'RECOMMANDATION', description: 'Synthèse et décision finale' },
];

// ============= PROJECT TYPE =============

export type BNPProjectType = 'creation' | 'acquisition' | 'reprise' | 'developpement' | 'franchise';

// ============= QUESTIONNAIRE DATA STRUCTURE =============

export interface BNPQuestionnaireData {
    // === SECTION 1: INFORMATIONS PROJET ===
    // Q1.1 - Détail de la demande (min 500 caractères)
    detailDemande: string;
    // Q1.2 - Zone d'exploitation
    zoneExploitationAdresse: string;
    zoneExploitationCodePostal: string;
    zoneExploitationCommune: string;
    // Q1.3 - Comment l'exploitation
    commentaireZoneExploitation: string;

    // === SECTION 2: PORTEUR DE PROJET ===
    // Q2.1 - Première expérience entrepreneuriale
    premiereExperienceEntrepreneuriale: boolean;
    experienceEntrepreneurialeDetail?: string;
    // Q2.2 - Exigences accès profession
    exigencesAccesProfession: boolean;
    exigencesAccesCommentaire?: string;
    // Q2.3 - Liens entre associés
    liensAssocies?: string;
    // Q2.4 - Conjoint rôle
    conjointRoleActivite: boolean;
    conjointRoleDetail?: string;
    // Q2.5 - Autres infos porteur (profil complet)
    autresInfosPorteur: string;
    // Q2.6 - Multi-bancarisé
    emprunteurMultiBancarise?: boolean | null;

    // === SECTION 3: CESSION (si applicable) ===
    // Q3.1 - Présence justificatif cession
    presenceJustificatifCession?: boolean;
    // Q3.2 - Salariés repris
    salariesRepris?: 'oui' | 'non' | 'partiellement';
    salariesReprisCommentaire?: string;
    // Q3.3 - Raisons cession
    raisonsCession?: string;
    // Q3.4 - Environnement local (TOUJOURS rempli même en création)
    commentaireEnvironnementLocal: string;
    // Q3.5 - Autres infos projet
    autresInfosProjet?: string;

    // === SECTION 4: ANALYSE FINANCIÈRE ===
    // Q4.1 - Commentaires bilans (structure financière)
    commentaireBilansConsolides: string;
    // Q4.2 - Synthèse CR (avec tableau obligatoire)
    syntheseCompteResultat: string;
    // Q4.3 - Événements conjoncturels
    evenementsConjoncturels: boolean;
    evenementsConjoncturelsDetail?: string;
    // Q4.4 - Dettes fiscales et sociales
    commentaireDettesFS?: string;
    // Q4.5 - Multi-bancarisé (répété)
    // Q4.6 - Autres infos analyse financière (5 sous-sections)
    autresInfosAnalyseFinanciere: string;

    // === SECTION 5: ANALYSE PRÉVISIONNELLE ===
    // Q5.1 - Tableau charges
    chargesPrevisionnelles: BNPChargesPrevisionnelles;
    // Q5.2 - Charges bien réparties
    chargesBienReparties: boolean;
    chargesBienRepartiesCommentaire?: string;
    // Q5.3 - Commentaires charges externes (min 200 car)
    commentaireChargesExternes: string;
    // Q5.4 - Commentaires marge brute (min 200 car)
    commentaireMargeBrute: string;
    // Q5.5 - Évolution fonds propres et dettes
    commentaireEvolutionFondsPropres?: string;
    // Q5.6 - CAF couvre annuités (avec tableau)
    validationCafPrevisionnel: boolean;
    cafData: BNPCAFData;
    // Q5.7 - Validation CAF (min 400 caractères)
    validationCafGlobal: boolean;
    validationCafJustification: string;

    // === SECTION 6: ENDETTEMENT PRIVÉ ===
    // Q6.1 - Aides État
    beneficieAidesEtat: boolean;
    aidesEtatDetail?: BNPAideEtat;
    // Q6.2 - Revenus cautions
    revenusCautions: BNPRevenuCaution[];
    // Q6.3 - Taux endettement et reste à vivre
    endettementCautions?: BNPEndettementCaution[];
    commentaireEndettement?: string;

    // === SECTION 7: COMMENTAIRES ===
    // Q7.1 - Charges personnel prévisionnelles
    commentaireChargesPersonnel: string;

    // === SECTION 8: CONTRÔLES ===
    // Q8.1 - Financements liés
    presenceFinancementsLies: boolean;
    financementsLiesDetail?: string;
    // Q8.2 - Présentation DECLIC
    presentationDeclic: boolean;
    // Q8.3 - Fonds propres négatifs
    fondsPropresNegatifs: boolean;
    fondsPropresNegatifsCommentaire?: string;
    // Q8.4 - Contrôles réalisés (checklist)
    controlesIndispensablesRealises: boolean;
    checklistControles: BNPControleItem[];

    // === SECTION 9: SYNTHÈSE ET RECOMMANDATION ===
    syntheseCollaborateur: 'concluante' | 'reservee' | 'defavorable';
    syntheseMotifNonConcluant?: string;
    pointsAttention: string[];
    decisionFinale: BNPDecisionFinale;
    conditionsParticulieres: string[];
    recommandationJustification: string;
}

// ============= SUB-TYPES =============

export interface BNPChargesPrevisionnelles {
    annee1: BNPChargesAnnee;
    annee2: BNPChargesAnnee;
    annee3: BNPChargesAnnee;
}

export interface BNPChargesAnnee {
    chargesVariables: number;
    chargesVariablesPct: number;
    redevances?: number;
    chargesFixesExploitation: number;
    chargesPersonnel: number;
    communicationPublicite?: number;
}

export interface BNPCAFData {
    annee1: BNPCAFAnnee;
    annee2: BNPCAFAnnee;
    annee3: BNPCAFAnnee;
}

export interface BNPCAFAnnee {
    caf: number; // Résultat + Amortissements
    annuites: number;
    solde: number; // CAF - Annuités
    dscr: number; // CAF / Annuités
}

export interface BNPAideEtat {
    type: string; // ARE, ACRE, ARCE, NACRE, Prêt d'honneur, etc.
    montant?: number;
    duree?: string;
    impact?: string;
}

export interface BNPRevenuCaution {
    nom: string;
    revenusActuels: string;
    revenusFuturs: string;
    source: string;
}

export interface BNPEndettementCaution {
    nom: string;
    chargesMensuelles: number;
    tauxEndettementActuel: number;
    resteAVivreActuel: number;
    tauxEndettementFutur: number;
    resteAVivreFutur: number;
}

export interface BNPControleItem {
    controle: string;
    statut: 'ok' | 'a_obtenir' | 'non_fait';
    commentaire?: string;
}

export type BNPDecisionFinale =
    | 'accord_favorable'
    | 'accord_conditions'
    | 'refus'
    | 'transmission_comite';

// ============= FINANCEMENT STRUCTURE =============

export interface BNPFinancementPropose {
    type: string; // Crédit investissement, Leasing, etc.
    montant: number;
    duree: number; // en années
    taux: number;
    mensualite: number;
}

export interface BNPGarantie {
    type: string;
    description: string;
}

export interface BNPRecommandationFinale {
    decision: BNPDecisionFinale;
    montantFinancable: number;
    financements: BNPFinancementPropose[];
    garanties: BNPGarantie[];
    conditions: string[];
    ratios: {
        tauxApport: number;
        dettesCAF: number;
        dscrA1: number;
        autonomieFinanciere: number;
    };
    justification: string;
}

// ============= HELPER FUNCTIONS =============

export function getDecisionLabel(decision: BNPDecisionFinale): string {
    const labels: Record<BNPDecisionFinale, string> = {
        accord_favorable: 'ACCORD FAVORABLE',
        accord_conditions: 'ACCORD SOUS CONDITIONS',
        refus: 'REFUS DE FINANCEMENT',
        transmission_comite: 'TRANSMISSION COMITÉ',
    };
    return labels[decision];
}

export function getDecisionColor(decision: BNPDecisionFinale): { background: string; border: string; rgb: [number, number, number] } {
    const colors: Record<BNPDecisionFinale, { background: string; border: string; rgb: [number, number, number] }> = {
        accord_favorable: { background: '#E6FFE6', border: '#006600', rgb: [0, 102, 0] },
        accord_conditions: { background: '#FFF4E6', border: '#FF8C00', rgb: [255, 140, 0] },
        refus: { background: '#FFE6E6', border: '#CC0000', rgb: [204, 0, 0] },
        transmission_comite: { background: '#E6F2FF', border: '#0066CC', rgb: [0, 102, 204] },
    };
    return colors[decision];
}

export function getDSCRRating(dscr: number): { status: string; icon: string } {
    if (dscr >= 1.5) return { status: 'Excellent', icon: '✓' };
    if (dscr >= 1.2) return { status: 'Acceptable (création)', icon: '✓' };
    if (dscr >= 1.0) return { status: 'Limite', icon: '⚠️' };
    return { status: 'Insuffisant', icon: '✗' };
}

export function isProjectTypeRequiringCession(type: BNPProjectType): boolean {
    return type === 'acquisition' || type === 'reprise';
}
