import type { Question, SectionConfig } from '@/types/rapport-analyse.types';

export const SECTIONS: SectionConfig[] = [
    { code: 'projet', label: 'Projet', description: 'Informations sur le projet de financement' },
    { code: 'porteur_projet', label: 'Porteur de projet', description: 'Profil et expérience du porteur' },
    { code: 'cession', label: 'Cession', description: 'Analyse de la cession (si acquisition)' },
    { code: 'analyse_financiere', label: 'Analyse financière', description: 'Analyse des bilans historiques' },
    { code: 'previsionnel', label: 'Prévisionnel', description: 'Analyse prévisionnelle' },
    { code: 'endettement', label: 'Endettement', description: 'Endettement privé et cautions' },
    { code: 'commentaires_previsionnel', label: 'Commentaires', description: 'Commentaires supplémentaires' },
    { code: 'controles', label: 'Contrôles', description: 'Contrôles et vérifications' },
    { code: 'synthese', label: 'Synthèse', description: 'Synthèse et décision finale' },
];

export const QUESTIONS: Question[] = [
    // ============ SECTION 1 : PROJET ============
    {
        code: 'zone_exploitation_adresse',
        section: 'projet',
        libelle: "Zone d'exploitation du besoin financé - Adresse complète",
        type: 'texte',
        obligatoire: true,
        aide: 'Donnée indispensable pour affecter les données sectorielles',
        validations: { minLength: 10, maxLength: 500 }
    },
    {
        code: 'zone_exploitation_code_postal',
        section: 'projet',
        libelle: 'Code postal',
        type: 'texte',
        obligatoire: true,
        validations: { pattern: '^\\d{5}$', maxLength: 5 }
    },
    {
        code: 'zone_exploitation_commune',
        section: 'projet',
        libelle: 'Commune',
        type: 'texte',
        obligatoire: true,
        validations: { maxLength: 100 }
    },
    {
        code: 'detail_demande',
        section: 'projet',
        libelle: 'Présenter en détail la demande et donner une vision globale',
        type: 'textarea',
        obligatoire: true,
        aide: 'Minimum 500 caractères - Décrire projet, contexte, objectifs',
        validations: { minLength: 500, maxLength: 5000 }
    },
    {
        code: 'commentaire_zone_exploitation',
        section: 'projet',
        libelle: "Commentaire sur la zone d'exploitation",
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },

    // ============ SECTION 2 : PORTEUR PROJET ============
    {
        code: 'premiere_experience_entrepreneuriale',
        section: 'porteur_projet',
        libelle: "S'agit-il d'une première expérience entrepreneuriale ?",
        type: 'oui_non',
        obligatoire: true
    },
    {
        code: 'exigences_acces_profession',
        section: 'porteur_projet',
        libelle: "Le porteur de projet répond-il aux exigences d'accès à la profession ?",
        type: 'oui_non',
        obligatoire: true,
        sousQuestions: [
            {
                code: 'exigences_acces_commentaire',
                section: 'porteur_projet',
                libelle: 'Commentaire (si Non)',
                type: 'textarea',
                obligatoire: true,
                validations: { maxLength: 1000 },
                dependances: [{ questionCode: 'exigences_acces_profession', valeurCondition: false }]
            }
        ]
    },
    {
        code: 'liens_associes',
        section: 'porteur_projet',
        libelle: 'Si nécessaire, préciser les liens entre les associés',
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 500 }
    },
    {
        code: 'conjoint_role_activite',
        section: 'porteur_projet',
        libelle: "Le conjoint/concubin a-t-il un rôle dans l'activité ?",
        type: 'oui_non',
        obligatoire: true,
        sousQuestions: [
            {
                code: 'conjoint_role_detail',
                section: 'porteur_projet',
                libelle: 'Préciser le rôle',
                type: 'texte',
                obligatoire: true,
                validations: { maxLength: 200 },
                dependances: [{ questionCode: 'conjoint_role_activite', valeurCondition: true }]
            }
        ]
    },
    {
        code: 'autres_infos_porteur',
        section: 'porteur_projet',
        libelle: "Avez-vous d'autres informations à apporter sur le porteur de projet ?",
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },
    {
        code: 'emprunteur_multi_bancarise',
        section: 'porteur_projet',
        libelle: "L'emprunteur est-il multi bancarisé ?",
        type: 'oui_non',
        obligatoire: true
    },

    // ============ SECTION 3 : CESSION ============
    {
        code: 'presence_justificatif_cession',
        section: 'cession',
        libelle: "Présence de justificatif (compromis, protocole, lettre d'intention) ?",
        type: 'oui_non',
        obligatoire: false
    },
    {
        code: 'salaries_repris',
        section: 'cession',
        libelle: 'Les salariés du cédant sont-ils repris ?',
        type: 'select',
        obligatoire: false,
        options: ['oui', 'non', 'partiellement'],
        sousQuestions: [
            {
                code: 'salaries_repris_commentaire',
                section: 'cession',
                libelle: 'Commentaire',
                type: 'textarea',
                obligatoire: true,
                validations: { maxLength: 1000 },
                dependances: [
                    { questionCode: 'salaries_repris', valeurCondition: 'non' },
                    { questionCode: 'salaries_repris', valeurCondition: 'partiellement' }
                ]
            }
        ]
    },
    {
        code: 'raisons_cession',
        section: 'cession',
        libelle: 'Quelles sont les raisons de la cession ?',
        type: 'textarea',
        obligatoire: false,
        validations: { minLength: 100, maxLength: 1000 }
    },
    {
        code: 'commentaire_environnement_local',
        section: 'cession',
        libelle: "Commenter l'environnement local",
        type: 'textarea',
        obligatoire: true,
        aide: 'Concurrence, dynamisme secteur, potentiel développement',
        validations: { minLength: 200, maxLength: 2000 }
    },
    {
        code: 'autres_infos_projet',
        section: 'cession',
        libelle: 'Autres informations sur le projet',
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },

    // ============ SECTION 4 : ANALYSE FINANCIÈRE ============
    {
        code: 'commentaire_bilans_consolides',
        section: 'analyse_financiere',
        libelle: 'Commentaires sur les bilans consolidés et la structure financière',
        type: 'textarea',
        obligatoire: true,
        aide: 'Analyser capitaux propres, BFR, endettement, trésorerie sur 3 ans',
        validations: { minLength: 300, maxLength: 3000 }
    },
    {
        code: 'synthese_compte_resultat',
        section: 'analyse_financiere',
        libelle: 'Synthèse sur le compte de résultat',
        type: 'textarea',
        obligatoire: true,
        aide: 'CA, marge brute, EBE, résultat net - Tendances',
        validations: { minLength: 300, maxLength: 3000 }
    },
    {
        code: 'evenements_conjoncturels',
        section: 'analyse_financiere',
        libelle: "Des événements conjoncturels ont-ils impacté l'activité ?",
        type: 'oui_non',
        obligatoire: true,
        sousQuestions: [
            {
                code: 'evenements_conjoncturels_detail',
                section: 'analyse_financiere',
                libelle: 'Détailler les événements et leur impact',
                type: 'textarea',
                obligatoire: true,
                validations: { minLength: 100, maxLength: 1500 },
                dependances: [{ questionCode: 'evenements_conjoncturels', valeurCondition: true }]
            }
        ]
    },

    // ============ SECTION 5 : PRÉVISIONNEL ============
    {
        code: 'charges_previsionnelles',
        section: 'previsionnel',
        libelle: 'Détailler les charges prévisionnelles',
        type: 'tableau',
        obligatoire: false,
        aide: 'Tableau avec postes de charges, montants N/N+1/N+2, commentaires'
    },
    {
        code: 'commentaire_charges_externes',
        section: 'previsionnel',
        libelle: 'Commentaires sur les charges externes prévisionnelles',
        type: 'textarea',
        obligatoire: true,
        aide: 'Loyers, sous-traitance, honoraires, cohérence secteur',
        validations: { minLength: 200, maxLength: 2000 }
    },
    {
        code: 'commentaire_marge_brute',
        section: 'previsionnel',
        libelle: 'Commentaires sur la marge brute prévisionnelle',
        type: 'textarea',
        obligatoire: true,
        aide: 'Taux prévisionnel vs historique vs secteur',
        validations: { minLength: 200, maxLength: 2000 }
    },
    {
        code: 'validation_caf_previsionnel',
        section: 'previsionnel',
        libelle: "Validez-vous la capacité d'autofinancement prévisionnelle (3 ans) ?",
        type: 'oui_non',
        obligatoire: true
    },
    {
        code: 'commentaire_evolution_fonds_propres',
        section: 'previsionnel',
        libelle: "Commenter l'évolution des fonds propres et dettes",
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },
    {
        code: 'validation_caf_global',
        section: 'previsionnel',
        libelle: "Validez-vous la capacité d'autofinancement du prévisionnel ?",
        type: 'oui_non',
        obligatoire: true
    },
    {
        code: 'caf_couvre_annuites',
        section: 'previsionnel',
        libelle: 'La CAF couvre-t-elle les annuités pour les 3 prochaines années ?',
        type: 'oui_non',
        obligatoire: true
    },

    // ============ SECTION 6 : ENDETTEMENT ============
    {
        code: 'beneficie_aides_etat',
        section: 'endettement',
        libelle: "Le porteur bénéficie-t-il d'aides financières de l'État ?",
        type: 'oui_non',
        obligatoire: true
    },
    {
        code: 'revenus_cautions',
        section: 'endettement',
        libelle: 'Détailler les revenus actuels et futurs des cautions',
        type: 'tableau',
        obligatoire: false,
        aide: 'Tableau : Nom, Revenus actuels, Revenus futurs, Source'
    },
    {
        code: 'endettement_cautions',
        section: 'endettement',
        libelle: "Taux d'endettement et reste à vivre des cautions",
        type: 'tableau',
        obligatoire: false,
        aide: 'Calculé automatiquement - Seuils : 35% / RAV 800€'
    },

    // ============ SECTION 7 : COMMENTAIRES PRÉVISIONNEL ============
    {
        code: 'commentaire_charges_personnels',
        section: 'commentaires_previsionnel',
        libelle: 'Commentaires sur les charges de personnels',
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },
    {
        code: 'commentaire_charges_externes_previsionnel',
        section: 'commentaires_previsionnel',
        libelle: 'Commentaires supplémentaires sur les charges externes',
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },

    // ============ SECTION 8 : CONTRÔLES ============
    {
        code: 'presence_financements_lies',
        section: 'controles',
        libelle: 'Présence de financements liés ?',
        type: 'oui_non',
        obligatoire: true,
        sousQuestions: [
            {
                code: 'financements_lies_detail',
                section: 'controles',
                libelle: 'Préciser nature et montant',
                type: 'textarea',
                obligatoire: true,
                validations: { maxLength: 1000 },
                dependances: [{ questionCode: 'presence_financements_lies', valeurCondition: true }]
            }
        ]
    },
    {
        code: 'presentation_declic',
        section: 'controles',
        libelle: 'Présentation DECLIC effectuée ?',
        type: 'oui_non',
        obligatoire: true
    },
    {
        code: 'fonds_propres_negatifs',
        section: 'controles',
        libelle: 'Les fonds propres sont-ils négatifs ?',
        type: 'oui_non',
        obligatoire: true,
        sousQuestions: [
            {
                code: 'fonds_propres_negatifs_commentaire',
                section: 'controles',
                libelle: 'Commentaire obligatoire',
                type: 'textarea',
                obligatoire: true,
                validations: { minLength: 100, maxLength: 1500 },
                dependances: [{ questionCode: 'fonds_propres_negatifs', valeurCondition: true }]
            }
        ]
    },
    {
        code: 'controles_indispensables_realises',
        section: 'controles',
        libelle: 'Tous les contrôles indispensables sont réalisés ?',
        type: 'oui_non',
        obligatoire: true
    },

    // ============ SECTION 9 : SYNTHÈSE ============
    {
        code: 'synthese_collaborateur',
        section: 'synthese',
        libelle: 'Synthèse collaborateur',
        type: 'select',
        obligatoire: true,
        options: ['concluante', 'non_concluante'],
        sousQuestions: [
            {
                code: 'synthese_motif_non_concluant',
                section: 'synthese',
                libelle: 'Motif si non concluante',
                type: 'textarea',
                obligatoire: true,
                validations: { minLength: 100, maxLength: 1000 },
                dependances: [{ questionCode: 'synthese_collaborateur', valeurCondition: 'non_concluante' }]
            }
        ]
    },
    {
        code: 'point_attention',
        section: 'synthese',
        libelle: "Point d'attention",
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 1000 }
    },
    {
        code: 'ajout_point_texte',
        section: 'synthese',
        libelle: 'Ajouter un point texte',
        type: 'textarea',
        obligatoire: false,
        validations: { maxLength: 2000 }
    },
    {
        code: 'decision_finale',
        section: 'synthese',
        libelle: 'Décision finale',
        type: 'select',
        obligatoire: true,
        options: ['accord_favorable', 'accord_conditionne', 'refus', 'transmission_comite']
    }
];

// Helper functions
export function getQuestionnaireStructure(): Question[] {
    return QUESTIONS;
}

export function getSectionByCode(code: string): SectionConfig | undefined {
    return SECTIONS.find(s => s.code === code);
}

export function getQuestionByCode(code: string): Question | undefined {
    const findQuestion = (questions: Question[]): Question | undefined => {
        for (const q of questions) {
            if (q.code === code) return q;
            if (q.sousQuestions) {
                const found = findQuestion(q.sousQuestions);
                if (found) return found;
            }
        }
        return undefined;
    };
    return findQuestion(QUESTIONS);
}

export function getQuestionsForSection(sectionCode: string): Question[] {
    return QUESTIONS.filter(q => q.section === sectionCode);
}

export function getRequiredQuestions(): Question[] {
    const required: Question[] = [];

    const collectRequired = (questions: Question[]) => {
        for (const q of questions) {
            if (q.obligatoire) {
                required.push(q);
            }
            if (q.sousQuestions) {
                collectRequired(q.sousQuestions);
            }
        }
    };

    collectRequired(QUESTIONS);
    return required;
}

// Decision labels for display
export const DECISION_LABELS: Record<string, string> = {
    accord_favorable: 'Accord favorable',
    accord_conditionne: 'Accord sous conditions',
    refus: 'Refus',
    transmission_comite: 'Transmission comité'
};

export const SYNTHESE_LABELS: Record<string, string> = {
    concluante: 'Concluante',
    non_concluante: 'Non concluante'
};

export const SALARIES_REPRIS_LABELS: Record<string, string> = {
    oui: 'Oui',
    non: 'Non',
    partiellement: 'Partiellement'
};

// Particular conditions options
export const CONDITIONS_PARTICULIERES_OPTIONS = [
    { value: 'apport_renforce', label: 'Apport personnel renforcé' },
    { value: 'garantie_bpi', label: 'Garantie BPI France obligatoire' },
    { value: 'caution_limitee', label: 'Caution personnelle limitée' },
    { value: 'suivi_trimestriel', label: 'Suivi trimestriel renforcé' },
    { value: 'attestation_ec', label: 'Attestation expert-comptable' },
    { value: 'plan_tresorerie', label: 'Plan de trésorerie mensuel' },
    { value: 'autre', label: 'Autre (préciser)' }
];
