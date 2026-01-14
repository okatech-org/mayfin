/**
 * Questionnaire BNP Paribas - 35 Questions officielles
 * Extraction du formulaire d'analyse de financement bancaire
 */

import type { Question, QuestionnaireResponse, ValidationResult } from '@/types/questionnaire.types';

/**
 * MVP - Questions critiques pour le rapport d'analyse
 * Sous-ensemble des 35 questions, focalisé sur les éléments bloquants
 */
export const QUESTIONS_MVP: Question[] = [
    // === SECTION 1 : PROJET ===
    {
        code: 'S1_DETAIL_DEMANDE',
        label: 'Présenter en détail la demande, donner une vision globale en cas de dossiers liés',
        type: 'textarea',
        required: true,
        section: 1,
        validations: { minLength: 100, maxLength: 4000 },
        help: 'Décrire précisément le projet, son contexte, ses objectifs',
    },
    {
        code: 'S1_ZONE_CODE_POSTAL',
        label: 'Code postal de la zone d\'exploitation',
        type: 'texte',
        required: true,
        section: 1,
        validations: { pattern: '^\\d{5}$' },
        help: 'Donnée indispensable pour affecter les données sectorielles',
    },
    {
        code: 'S1_ZONE_COMMUNE',
        label: 'Commune',
        type: 'texte',
        required: true,
        section: 1,
    },

    // === SECTION 2 : PORTEUR PROJET ===
    {
        code: 'S2_PREMIERE_EXPERIENCE',
        label: 'S\'agit-il d\'une première expérience entrepreneuriale ?',
        type: 'oui_non',
        required: true,
        section: 2,
        alertIfYes: 'Vigilance renforcée nécessaire - Accompagnement recommandé',
    },
    {
        code: 'S2_EXIGENCES_PROFESSION',
        label: 'Le porteur de projet répond-il aux exigences d\'accès à la profession ?',
        type: 'oui_non',
        required: true,
        section: 2,
        subQuestions: [
            {
                code: 'S2_EXIGENCES_COMMENTAIRE',
                label: 'Si non, préciser les raisons',
                type: 'textarea',
                required: true,
                condition: { field: 'S2_EXIGENCES_PROFESSION', value: false },
                validations: { minLength: 50, maxLength: 1000 },
            },
        ],
    },
    {
        code: 'S2_MULTI_BANCARISE',
        label: 'L\'emprunteur est-il multi-bancarisé ?',
        type: 'oui_non',
        required: true,
        section: 2,
    },

    // === SECTION 3 : CESSION (Conditionnel) ===
    {
        code: 'S3_JUSTIFICATIF_CESSION',
        label: 'Présence de justificatif (compromis, protocole, lettre d\'intention) ?',
        type: 'oui_non',
        required: true,
        section: 3,
        condition: { typeFinancement: ['acquisition', 'reprise'] },
    },
    {
        code: 'S3_RAISONS_CESSION',
        label: 'Quelles sont les raisons de la cession ?',
        type: 'textarea',
        required: true,
        section: 3,
        condition: { typeFinancement: ['acquisition', 'reprise'] },
        validations: { minLength: 50, maxLength: 1500 },
        help: 'Retraite, reconversion, difficultés, opportunité...',
    },
    {
        code: 'S3_ENVIRONNEMENT_LOCAL',
        label: 'Commenter l\'environnement local',
        type: 'textarea',
        required: true,
        section: 3,
        validations: { minLength: 100, maxLength: 2000 },
        help: 'Réglementations secteur, concurrence locale, positionnement marché, clientèle',
    },

    // === SECTION 4 : ANALYSE FINANCIÈRE ===
    {
        code: 'S4_COMMENTAIRE_BILANS',
        label: 'Commentaires sur les bilans consolidés et la structure financière',
        type: 'textarea',
        required: true,
        section: 4,
        validations: { minLength: 200, maxLength: 4000 },
        help: 'Évolution capitaux propres, BFR, endettement, trésorerie sur 3 exercices',
    },
    {
        code: 'S4_SYNTHESE_CR',
        label: 'Synthèse sur le compte de résultat',
        type: 'textarea',
        required: true,
        section: 4,
        validations: { minLength: 200, maxLength: 2500 },
        help: 'Évolution CA, marge brute, EBE, résultat net. Identifier tendances et ruptures',
    },
    {
        code: 'S4_EVENEMENTS_CONJONCTURELS',
        label: 'Des événements conjoncturels ont-ils impacté l\'activité ?',
        type: 'oui_non',
        required: true,
        section: 4,
        subQuestions: [
            {
                code: 'S4_EVENEMENTS_DETAIL',
                label: 'Détailler la nature et l\'impact',
                type: 'textarea',
                required: true,
                condition: { field: 'S4_EVENEMENTS_CONJONCTURELS', value: true },
                validations: { minLength: 50, maxLength: 1500 },
            },
        ],
    },
    {
        code: 'S4_DETTES_FISCALES',
        label: 'Commentaires sur les dettes fiscales et sociales',
        type: 'textarea',
        required: false,
        section: 4,
        validations: { maxLength: 2000 },
    },

    // === SECTION 5 : PRÉVISIONNEL ===
    {
        code: 'S5_COMMENTAIRE_CHARGES_EXTERNES',
        label: 'Commentaires sur les charges externes',
        type: 'textarea',
        required: true,
        section: 5,
        validations: { minLength: 100, maxLength: 2000 },
        help: 'Loyers, sous-traitance, leasing, publicité, honoraires, téléphone, assurances...',
    },
    {
        code: 'S5_COMMENTAIRE_MARGE_BRUTE',
        label: 'Commentaires sur la marge brute (ou marge commerciale)',
        type: 'textarea',
        required: true,
        section: 5,
        validations: { minLength: 100, maxLength: 2000 },
        help: 'Analyser taux et revenus générés (tarifs, volume). Expliquer écarts historique',
    },
    {
        code: 'S5_CAF_COUVRE_ANNUITES',
        label: 'La CAF couvre-t-elle les annuités de crédits pour les 3 prochaines années ?',
        type: 'oui_non',
        required: true,
        section: 5,
        alertIfNo: 'ALERTE CRITIQUE - Capacité de remboursement insuffisante',
    },
    {
        code: 'S5_VALIDATION_CAF',
        label: 'Validez-vous la capacité d\'autofinancement prévisionnel ?',
        type: 'oui_non',
        required: true,
        section: 5,
        subQuestions: [
            {
                code: 'S5_VALIDATION_CAF_COMMENTAIRE',
                label: 'Si non, expliquer les raisons',
                type: 'textarea',
                required: true,
                condition: { field: 'S5_VALIDATION_CAF', value: false },
                validations: { minLength: 50, maxLength: 1500 },
            },
        ],
    },

    // === SECTION 6 : ENDETTEMENT PRIVÉ ===
    {
        code: 'S6_AIDES_ETAT',
        label: 'Le porteur de projet bénéficie-t-il d\'aides financières de l\'État ?',
        type: 'oui_non',
        required: true,
        section: 6,
        subQuestions: [
            {
                code: 'S6_AIDES_TYPE',
                label: 'Type d\'aide',
                type: 'select',
                required: true,
                condition: { field: 'S6_AIDES_ETAT', value: true },
                options: ['ACRE', 'ARCE', 'NACRE', 'Prêt d\'honneur', 'Autre'],
            },
            {
                code: 'S6_AIDES_MONTANT',
                label: 'Montant (€)',
                type: 'texte',
                required: true,
                condition: { field: 'S6_AIDES_ETAT', value: true },
            },
        ],
    },
    {
        code: 'S6_TAUX_ENDETTEMENT',
        label: 'Taux d\'endettement des cautions (%)',
        type: 'texte',
        required: true,
        section: 6,
        help: 'Charges mensuelles / Revenus mensuels x 100',
        alerts: [
            { condition: 'value > 35', level: 'warning', message: 'Taux d\'endettement supérieur à 35%' },
            { condition: 'value > 50', level: 'danger', message: 'Taux d\'endettement critique (>50%)' },
        ],
    },
    {
        code: 'S6_RESTE_A_VIVRE',
        label: 'Reste à vivre mensuel des cautions (€)',
        type: 'texte',
        required: true,
        section: 6,
        help: 'Revenus mensuels - Charges mensuelles - Nouvelle annuité',
        alerts: [
            { condition: 'value < 800', level: 'danger', message: 'Reste à vivre insuffisant (<800€)' },
            { condition: 'value < 500', level: 'blocking', message: 'Reste à vivre critique (<500€)' },
        ],
    },

    // === SECTION 8 : CONTRÔLES FINAUX ===
    {
        code: 'S8_FINANCEMENTS_LIES',
        label: 'Présence de financements liés ?',
        type: 'oui_non',
        required: true,
        section: 8,
        subQuestions: [
            {
                code: 'S8_FINANCEMENTS_LIES_DETAIL',
                label: 'Préciser la nature et le montant',
                type: 'textarea',
                required: true,
                condition: { field: 'S8_FINANCEMENTS_LIES', value: true },
                validations: { maxLength: 1000 },
            },
        ],
    },
    {
        code: 'S8_FONDS_PROPRES_NEGATIFS',
        label: 'Les fonds propres sont-ils négatifs ?',
        type: 'oui_non',
        required: true,
        section: 8,
        alertIfYes: 'ALERTE BLOQUANTE - Fonds propres négatifs',
        subQuestions: [
            {
                code: 'S8_FP_NEG_COMMENTAIRE',
                label: 'Commentaire justificatif obligatoire',
                type: 'textarea',
                required: true,
                condition: { field: 'S8_FONDS_PROPRES_NEGATIFS', value: true },
                validations: { minLength: 50, maxLength: 1500 },
            },
        ],
    },
    {
        code: 'S8_CONTROLES_REALISES',
        label: 'Avez-vous réalisé tous les contrôles indispensables à l\'analyse ?',
        type: 'oui_non',
        required: true,
        section: 8,
        alertIfNo: 'BLOQUANT - Vous devez réaliser tous les contrôles obligatoires',
    },
];

/**
 * Get questions for a specific section
 */
export function getQuestionsBySection(sectionId: number): Question[] {
    return QUESTIONS_MVP.filter(q => q.section === sectionId);
}

/**
 * Get questions applicable to a financing type
 */
export function getApplicableQuestions(typeFinancement?: string): Question[] {
    return QUESTIONS_MVP.filter(q => {
        if (!q.condition?.typeFinancement) return true;
        if (!typeFinancement) return false;
        return q.condition.typeFinancement.includes(typeFinancement as any);
    });
}

/**
 * Validate a single question response
 */
export function validateQuestionResponse(
    question: Question,
    value: any,
    allResponses: Record<string, any>
): { isValid: boolean; error?: string } {
    // Check required
    if (question.required && (value === undefined || value === null || value === '')) {
        return { isValid: false, error: 'Ce champ est obligatoire' };
    }

    // Skip validation if not required and empty
    if (!value && !question.required) {
        return { isValid: true };
    }

    // Validate based on type
    if (question.type === 'textarea' || question.type === 'texte') {
        const strValue = String(value);

        if (question.validations?.minLength && strValue.length < question.validations.minLength) {
            return { isValid: false, error: `Minimum ${question.validations.minLength} caractères requis` };
        }

        if (question.validations?.maxLength && strValue.length > question.validations.maxLength) {
            return { isValid: false, error: `Maximum ${question.validations.maxLength} caractères` };
        }

        if (question.validations?.pattern) {
            const regex = new RegExp(question.validations.pattern);
            if (!regex.test(strValue)) {
                return { isValid: false, error: 'Format invalide' };
            }
        }
    }

    return { isValid: true };
}

/**
 * Validate entire questionnaire
 */
export function validateQuestionnaire(
    responses: Record<string, any>,
    typeFinancement?: string
): ValidationResult {
    const applicableQuestions = getApplicableQuestions(typeFinancement);
    const missingRequired: string[] = [];
    const errors: { code: string; message: string }[] = [];
    const warnings: { code: string; message: string }[] = [];
    const blocking: { code: string; message: string }[] = [];

    let answeredRequired = 0;
    let totalRequired = 0;

    for (const question of applicableQuestions) {
        const value = responses[question.code];

        if (question.required) {
            totalRequired++;
            if (value !== undefined && value !== null && value !== '') {
                answeredRequired++;
            } else {
                missingRequired.push(question.label);
            }
        }

        // Validate response
        const validation = validateQuestionResponse(question, value, responses);
        if (!validation.isValid && validation.error) {
            errors.push({ code: question.code, message: validation.error });
        }

        // Check alerts
        if (question.alertIfYes && value === true) {
            if (question.alertIfYes.includes('BLOQUANT')) {
                blocking.push({ code: question.code, message: question.alertIfYes });
            } else {
                warnings.push({ code: question.code, message: question.alertIfYes });
            }
        }

        if (question.alertIfNo && value === false) {
            if (question.alertIfNo.includes('BLOQUANT') || question.alertIfNo.includes('CRITIQUE')) {
                blocking.push({ code: question.code, message: question.alertIfNo });
            } else {
                warnings.push({ code: question.code, message: question.alertIfNo });
            }
        }

        // Check numeric alerts (taux endettement, reste à vivre)
        if (question.alerts && typeof value === 'number') {
            for (const alert of question.alerts) {
                let triggered = false;
                if (alert.condition.includes('>')) {
                    const threshold = parseFloat(alert.condition.split('>')[1].trim());
                    triggered = value > threshold;
                } else if (alert.condition.includes('<')) {
                    const threshold = parseFloat(alert.condition.split('<')[1].trim());
                    triggered = value < threshold;
                }

                if (triggered) {
                    if (alert.level === 'blocking') {
                        blocking.push({ code: question.code, message: alert.message });
                    } else if (alert.level === 'danger') {
                        warnings.push({ code: question.code, message: alert.message });
                    } else {
                        warnings.push({ code: question.code, message: alert.message });
                    }
                }
            }
        }

        // Validate sub-questions
        if (question.subQuestions) {
            for (const sq of question.subQuestions) {
                const shouldShow = sq.condition?.field
                    ? responses[sq.condition.field] === sq.condition.value
                    : true;

                if (shouldShow && sq.required) {
                    totalRequired++;
                    const sqValue = responses[sq.code];
                    if (sqValue !== undefined && sqValue !== null && sqValue !== '') {
                        answeredRequired++;
                    } else {
                        missingRequired.push(sq.label);
                    }
                }
            }
        }
    }

    const completion = totalRequired > 0
        ? Math.round((answeredRequired / totalRequired) * 100)
        : 0;

    return {
        isValid: missingRequired.length === 0 && errors.length === 0 && blocking.length === 0,
        completion,
        missingRequired,
        errors,
        warnings,
        blocking,
    };
}

/**
 * Generate questionnaire summary for report
 */
export function generateQuestionnaireSummary(
    responses: Record<string, any>,
    typeFinancement?: string
): string {
    const lines: string[] = [];
    const applicableQuestions = getApplicableQuestions(typeFinancement);

    let currentSection = 0;

    for (const question of applicableQuestions) {
        // Section header
        if (question.section !== currentSection) {
            currentSection = question.section;
            lines.push('');
            lines.push(`### Section ${currentSection}`);
            lines.push('');
        }

        const value = responses[question.code];

        if (value === undefined || value === null || value === '') {
            continue; // Skip unanswered
        }

        let displayValue = value;
        if (typeof value === 'boolean') {
            displayValue = value ? 'Oui' : 'Non';
        }

        lines.push(`**${question.label}**`);
        lines.push(`${displayValue}`);
        lines.push('');
    }

    return lines.join('\n');
}
