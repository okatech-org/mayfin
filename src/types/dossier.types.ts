export type DossierStatus = 'brouillon' | 'en_analyse' | 'valide' | 'refuse' | 'attente_documents';

export type TypeFinancement = 'investissement' | 'tresorerie' | 'credit_bail' | 'affacturage';

export type FormeJuridique = 'SARL' | 'SAS' | 'EURL' | 'EI' | 'AUTO' | 'SA' | 'SCI' | 'SASU';

export type TypeProcedure = 'conciliation' | 'sauvegarde' | 'redressement' | 'liquidation';

export type TypeDocument = 
  | 'kbis' 
  | 'bilan' 
  | 'compte_resultat' 
  | 'liasse_fiscale' 
  | 'previsionnel' 
  | 'statuts' 
  | 'piece_identite' 
  | 'justif_domicile' 
  | 'beneficiaires_effectifs' 
  | 'jugement' 
  | 'plan_continuation' 
  | 'rapport_administrateur' 
  | 'devis' 
  | 'autre';

export interface Dossier {
  id: string;
  userId: string;
  status: DossierStatus;
  
  // Informations entreprise
  raisonSociale: string;
  siren: string;
  siret?: string;
  formeJuridique: FormeJuridique;
  dateCreation?: Date;
  codeNaf?: string;
  secteurActivite?: string;
  nbSalaries?: number;
  adresseSiege?: string;
  
  // Procédure collective
  enProcedure: boolean;
  typeProcedure?: TypeProcedure;
  dateJugement?: Date;
  tribunal?: string;
  
  // Dirigeant
  dirigeantCivilite?: 'M.' | 'Mme';
  dirigeantNom: string;
  dirigeantPrenom: string;
  dirigeantDateNaissance?: Date;
  dirigeantAdresse?: string;
  dirigeantTelephone?: string;
  dirigeantEmail?: string;
  dirigeantExperience?: number;
  dirigeantFicheFicp?: boolean;
  
  // Financement
  typeFinancement: TypeFinancement;
  montantDemande: number;
  dureeMois?: number;
  objetFinancement?: string;
  natureBien?: string;
  descriptionBien?: string;
  
  // Score et recommandation
  scoreGlobal?: number;
  recommandation?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  dossierId: string;
  typeDocument: TypeDocument;
  nomFichier: string;
  cheminFichier: string;
  tailleOctets: number;
  mimeType: string;
  anneeExercice?: number;
  uploadedAt: Date;
}

export interface DonneesFinancieres {
  id: string;
  dossierId: string;
  anneeExercice: number;
  
  // Compte de résultat
  chiffreAffaires?: number;
  resultatNet?: number;
  ebitda?: number;
  
  // CAF
  capaciteAutofinancement?: number;
  
  // Bilan Actif
  totalActif?: number;
  actifCirculant?: number;
  stocks?: number;
  creancesClients?: number;
  tresorerie?: number;
  
  // Bilan Passif
  totalPassif?: number;
  capitauxPropres?: number;
  dettesFinancieres?: number;
  passifCirculant?: number;
  dettesFournisseurs?: number;
  
  createdAt: Date;
}

export interface RatioFinancier {
  nom: string;
  valeurN: number | null;
  valeurN1: number | null;
  valeurN2: number | null;
  seuil: string;
  statut: 'good' | 'warning' | 'bad';
  unite?: string;
}

export interface ScoreDetail {
  critere: string;
  poids: number;
  scoreObtenu: number;
  points: number;
  justification: string;
}

export interface Facteur {
  description: string;
  impact: number;
  type: 'positive' | 'negative';
}

export interface ScoringResult {
  scoreGlobal: number;
  statut: 'accord_favorable' | 'accord_conditionne' | 'etude_approfondie' | 'refus';
  details: ScoreDetail[];
  facteursPositifs: Facteur[];
  facteursNegatifs: Facteur[];
  recommandation: {
    montantFinancable: number;
    typeFinancement: string;
    duree: number;
    garantiesRequises: string[];
    conditionsParticulieres: string[];
    pointsVigilance: string[];
    decision: string;
  };
}
