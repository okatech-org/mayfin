---
description: Génération de rapport d'analyse bancaire BNP Paribas (35 questions)
---

# Workflow : Génération de Rapport Bancaire BNP Paribas

Ce workflow génère un rapport d'analyse bancaire professionnel au format BNP Paribas (35 questions, 20-30 pages PDF).

## Prérequis

- Dossier client avec données financières
- Résultat d'analyse IA (optionnel mais recommandé)

## Étapes

### 1. Préparation des données

Vérifiez que le dossier contient au minimum :

- Nom et profil du porteur de projet
- Nature du projet (création/reprise/franchise)
- Secteur d'activité
- Montant investissement total
- Montant apport personnel
- CA prévisionnel sur 3 ans

### 2. Import du générateur

```typescript
import { 
  generateBNPRapportPDF, 
  createBNPQuestionnaireFromAnalysis,
  type BNPReportInput 
} from '@/lib/bnp-rapport-generator';
import type { BNPQuestionnaireData, BNPRecommandationFinale } from '@/types/bnp-rapport.types';
```

### 3. Création du questionnaire depuis l'analyse IA

Si vous avez un résultat d'analyse IA :

```typescript
const partialQuestionnaire = createBNPQuestionnaireFromAnalysis(
  analysisResult,
  dossier,
  'creation' // ou 'acquisition', 'reprise', 'franchise'
);

// Compléter avec les données manquantes
const questionnaire: BNPQuestionnaireData = {
  ...partialQuestionnaire,
  // Complétez les champs manquants...
} as BNPQuestionnaireData;
```

### 4. Définition de la recommandation finale

```typescript
const recommandation: BNPRecommandationFinale = {
  decision: 'accord_favorable', // ou 'accord_conditions', 'refus', 'transmission_comite'
  montantFinancable: 150000,
  financements: [
    {
      type: 'Crédit investissement',
      montant: 100000,
      duree: 7,
      taux: 4.5,
      mensualite: 1380,
    },
    {
      type: 'Crédit-bail véhicule',
      montant: 50000,
      duree: 5,
      taux: 5.0,
      mensualite: 950,
    },
  ],
  garanties: [
    { type: 'Privilège sur matériel', description: 'Véhicules et équipements financés' },
    { type: 'Caution personnelle', description: 'Limitée à 50% du prêt' },
  ],
  conditions: [
    'Apport personnel confirmé',
    'Consultation FICP négative',
    'Ouverture compte professionnel BNP',
  ],
  ratios: {
    tauxApport: 25,
    dettesCAF: 2.5,
    dscrA1: 1.45,
    autonomieFinanciere: 35,
  },
  justification: 'Le dossier présente un profil favorable combinant...',
};
```

### 5. Génération du PDF

```typescript
const input: BNPReportInput = {
  questionnaire,
  dossier,
  analysisResult, // optionnel
  projectType: 'creation',
  recommandation,
};

generateBNPRapportPDF(input);
// Le PDF sera téléchargé automatiquement
```

// turbo

### 6. Vérification de la compilation

```bash
cd /Users/okatech/StudioProjects/mayfin && npx tsc --noEmit 2>&1 | head -30
```

## Structure du rapport généré

Le PDF généré contient :

| Section | Questions | Description |
|---------|-----------|-------------|
| 1 | Q1.1-Q1.3 | Informations projet |
| 2 | Q2.1-Q2.6 | Porteur de projet |
| 3 | Q3.1-Q3.5 | Cession (si applicable) |
| 4 | Q4.1-Q4.6 | Analyse financière |
| 5 | Q5.1-Q5.7 | Analyse prévisionnelle |
| 6 | Q6.1-Q6.3 | Endettement privé |
| 7 | Q7.1 | Commentaires personnel |
| 8 | Q8.1-Q8.4 | Contrôles et validations |
| 9 | Synthèse | Recommandation finale |

## Codes couleur recommandation

- 🟢 **Vert** : ACCORD FAVORABLE
- 🟠 **Orange** : ACCORD SOUS CONDITIONS  
- 🔴 **Rouge** : REFUS
- 🔵 **Bleu** : TRANSMISSION COMITÉ

## Fichiers concernés

- `src/lib/bnp-rapport-generator.ts` - Générateur PDF principal
- `src/types/bnp-rapport.types.ts` - Types TypeScript
- `docs/GUIDE_RAPPORT_BANCAIRE.md` - Documentation utilisateur
