// Types for BNP Paribas Questionnaire
// Based on official BNP financing analysis form (35 questions, 9 sections)

export type QuestionType =
    | 'oui_non'
    | 'texte'
    | 'textarea'
    | 'select'
    | 'tableau'
    | 'tableau_dynamique'
    | 'groupe'
    | 'checklist';

export interface QuestionValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    required?: boolean;
}

export interface QuestionCondition {
    /** Field code that triggers this condition */
    field?: string;
    /** Value that must match */
    value?: boolean | string | string[];
    /** Type of financing that must match */
    typeFinancement?: ('acquisition' | 'reprise' | 'creation' | 'developpement')[];
}

export interface QuestionAlert {
    condition: string;
    level: 'info' | 'warning' | 'danger' | 'blocking';
    message: string;
}

export interface SubQuestion {
    code: string;
    label: string;
    type: QuestionType;
    required: boolean;
    condition?: QuestionCondition;
    validations?: QuestionValidation;
    options?: string[];
    help?: string;
}

export interface TableColumn {
    name: string;
    type: 'text' | 'number' | 'select';
    editable?: boolean;
    formula?: string;
    options?: string[];
}

export interface Question {
    code: string;
    label: string;
    type: QuestionType;
    required: boolean;
    section: number;
    validations?: QuestionValidation;
    condition?: QuestionCondition;
    options?: string[];
    help?: string;
    alertIfYes?: string;
    alertIfNo?: string;
    subQuestions?: SubQuestion[];
    columns?: TableColumn[];
    alerts?: QuestionAlert[];
}

export interface Section {
    id: number;
    code: string;
    label: string;
    description?: string;
    condition?: QuestionCondition;
}

export interface QuestionnaireResponse {
    dossierId: string;
    userId: string;
    status: 'draft' | 'completed' | 'validated';
    responses: Record<string, any>;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ValidationResult {
    isValid: boolean;
    completion: number; // 0-100
    missingRequired: string[];
    errors: { code: string; message: string }[];
    warnings: { code: string; message: string }[];
    blocking: { code: string; message: string }[];
}

// Section definitions
export const SECTIONS: Section[] = [
    { id: 1, code: 'S1', label: 'Informations Projet', description: 'Détails du projet et zone d\'exploitation' },
    { id: 2, code: 'S2', label: 'Porteur de Projet', description: 'Profil et expérience du dirigeant' },
    { id: 3, code: 'S3', label: 'Cession/Acquisition', description: 'Informations sur la cession', condition: { typeFinancement: ['acquisition', 'reprise'] } },
    { id: 4, code: 'S4', label: 'Analyse Financière', description: 'Bilans et compte de résultat' },
    { id: 5, code: 'S5', label: 'Analyse Prévisionnelle', description: 'Charges et CAF' },
    { id: 6, code: 'S6', label: 'Endettement Privé', description: 'Capacité contributive des cautions' },
    { id: 7, code: 'S7', label: 'Commentaires', description: 'Commentaires additionnels' },
    { id: 8, code: 'S8', label: 'Contrôles Finaux', description: 'Vérifications obligatoires' },
    { id: 9, code: 'S9', label: 'Synthèse', description: 'Validation finale' },
];
