// Types for Bank Analysis Report (Rapport d'Analyse)

export type RapportStatut = 'brouillon' | 'finalise' | 'valide';

export type SalariesRepris = 'oui' | 'non' | 'partiellement';

export type SyntheseCollaborateur = 'concluante' | 'non_concluante';

export type DecisionFinale = 'accord_favorable' | 'accord_conditionne' | 'refus' | 'transmission_comite';

export type QuestionType = 'oui_non' | 'texte' | 'textarea' | 'select' | 'tableau';

export interface ChargePrevisionnelle {
    poste: string;
    montant_n: number | null;
    montant_n1: number | null;
    montant_n2: number | null;
    commentaire: string;
}

export interface AideEtat {
    type: string;
    montant: number | null;
}

export interface RevenuCaution {
    nom: string;
    revenus_actuels: number | null;
    revenus_futurs: number | null;
    source: string;
}

export interface EndettementCaution {
    nom: string;
    charges_mensuelles: number | null;
    taux_endettement_actuel: number | null;
    reste_a_vivre_actuel: number | null;
    taux_endettement_futur: number | null;
    reste_a_vivre_futur: number | null;
}

export interface RapportAnalyse {
    id: string;
    dossier_id: string;
    user_id: string;

    // Section 1 : Projet
    zone_exploitation_adresse: string | null;
    zone_exploitation_code_postal: string | null;
    zone_exploitation_commune: string | null;
    detail_demande: string | null;
    commentaire_zone_exploitation: string | null;

    // Section 2 : Porteur projet
    premiere_experience_entrepreneuriale: boolean | null;
    exigences_acces_profession: boolean | null;
    exigences_acces_commentaire: string | null;
    liens_associes: string | null;
    conjoint_role_activite: boolean | null;
    conjoint_role_detail: string | null;
    autres_infos_porteur: string | null;
    emprunteur_multi_bancarise: boolean | null;

    // Section 3 : Cession
    presence_justificatif_cession: boolean | null;
    salaries_repris: SalariesRepris | null;
    salaries_repris_commentaire: string | null;
    raisons_cession: string | null;
    commentaire_environnement_local: string | null;
    autres_infos_projet: string | null;

    // Section 4 : Analyse financière
    commentaire_bilans_consolides: string | null;
    synthese_compte_resultat: string | null;
    evenements_conjoncturels: boolean | null;
    evenements_conjoncturels_detail: string | null;

    // Section 5 : Prévisionnel
    charges_previsionnelles: ChargePrevisionnelle[] | null;
    commentaire_charges_externes: string | null;
    commentaire_marge_brute: string | null;
    validation_caf_previsionnel: boolean | null;
    commentaire_evolution_fonds_propres: string | null;
    validation_caf_global: boolean | null;
    caf_couvre_annuites: boolean | null;

    // Section 6 : Endettement
    beneficie_aides_etat: boolean | null;
    aides_etat_detail: AideEtat | null;
    revenus_cautions: RevenuCaution[] | null;
    endettement_cautions: EndettementCaution[] | null;

    // Section 7 : Commentaires prévisionnel
    commentaire_charges_personnels: string | null;
    commentaire_charges_externes_previsionnel: string | null;

    // Section 8 : Contrôles
    presence_financements_lies: boolean | null;
    financements_lies_detail: string | null;
    presentation_declic: boolean | null;
    fonds_propres_negatifs: boolean | null;
    fonds_propres_negatifs_commentaire: string | null;
    controles_indispensables_realises: boolean | null;

    // Section 9 : Synthèse
    synthese_collaborateur: SyntheseCollaborateur | null;
    synthese_motif_non_concluant: string | null;
    point_attention: string | null;
    ajout_point_texte: string | null;
    decision_finale: DecisionFinale | null;
    conditions_particulieres: string[] | null;

    // Métadonnées
    statut: RapportStatut;
    created_at: string;
    updated_at: string;
    finalized_at: string | null;
}

export interface QuestionValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
}

export interface QuestionDependance {
    questionCode: string;
    valeurCondition: boolean | string;
}

export interface Question {
    code: string;
    section: string;
    libelle: string;
    type: QuestionType;
    obligatoire: boolean;
    aide?: string;
    options?: string[];
    validations?: QuestionValidation;
    dependances?: QuestionDependance[];
    sousQuestions?: Question[];
}

export interface SectionConfig {
    code: string;
    label: string;
    description?: string;
}

// Mapping from DB column names to form field names
export type RapportFormData = Partial<Omit<RapportAnalyse, 'id' | 'dossier_id' | 'user_id' | 'created_at' | 'updated_at' | 'finalized_at'>>;

// Validation result type
export interface ValidationResult {
    isComplete: boolean;
    missingQuestions: string[];
    errors: string[];
    completion: number;
}
