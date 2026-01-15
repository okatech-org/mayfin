/**
 * Test script for BNP Paribas Report PDF Generator
 * Run with: npx tsx src/test/test-bnp-generator.ts
 */

import { generateBNPRapportPDF, type BNPReportInput } from '../lib/bnp-rapport-generator';
import type { BNPQuestionnaireData, BNPRecommandationFinale } from '../types/bnp-rapport.types';
import type { DossierRow } from '../hooks/useDossiers';

// Sample dossier data
const sampleDossier: Partial<DossierRow> = {
    id: 'test-123',
    raison_sociale: 'Boulangerie Artisanale DUPONT',
    siren: '123456789',
    secteur_activite: 'Boulangerie-Pâtisserie',
    dirigeant_nom: 'DUPONT',
    dirigeant_prenom: 'Pierre',
    adresse_siege: '15 Rue de la République, 75001 Paris',
    type_financement: 'Création entreprise - Crédit investissement',
    montant_demande: 80000,
};

// Sample questionnaire data (35 questions)
const sampleQuestionnaire: BNPQuestionnaireData = {
    // Section 1: Informations Projet
    detailDemande: `Le projet consiste en la création d'une boulangerie artisanale traditionnelle à Paris 1er arrondissement.

**Contexte du projet :** Pierre DUPONT, boulanger expérimenté de 35 ans, souhaite créer sa propre boulangerie après 15 ans d'expérience dans le secteur. L'opportunité s'est présentée avec la disponibilité d'un local commercial idéalement situé rue de la République.

**Objectifs :** 
- Année 1 : Établir la notoriété locale, fidéliser une clientèle de quartier
- Année 2-3 : Développer l'offre traiteur et les commandes événementielles
- Long terme : Devenir une référence du quartier pour les produits artisanaux

**Stratégie commerciale :** Positionnement premium sur les produits artisanaux, pain au levain naturel, viennoiseries maison. Cible : habitants du quartier, bureaux environnants, touristes.

**Facteurs clés de succès :** 
1. Savoir-faire artisanal reconnu (CAP + 15 ans expérience)
2. Emplacement premium à fort passage
3. Différenciation par la qualité (levain naturel, farines bio)
4. Horaires adaptés aux bureaux (7h-19h)`,

    zoneExploitationAdresse: '15 Rue de la République',
    zoneExploitationCodePostal: '75001',
    zoneExploitationCommune: 'Paris 1er',
    commentaireZoneExploitation: `Local commercial de 85 m² comprenant un espace de vente de 35 m², un laboratoire de production de 40 m² et des espaces techniques de 10 m². Situé en rez-de-chaussée avec vitrine donnant sur rue piétonne très passante. L'exploitation sera fixe avec amplitude horaire de 7h à 19h, 6 jours sur 7.`,

    // Section 2: Porteur de Projet
    premiereExperienceEntrepreneuriale: true,
    experienceEntrepreneurialeDetail: 'Première création d\'entreprise mais 15 années d\'expérience salariée comme boulanger chef de production.',
    exigencesAccesProfession: true,
    exigencesAccesCommentaire: 'CAP Boulanger (2006), CAP Pâtissier (2008), Mention Complémentaire Boulangerie Spécialisée (2010)',
    liensAssocies: undefined, // Structure unipersonnelle
    conjointRoleActivite: false,
    conjointRoleDetail: 'L\'épouse de M. DUPONT est infirmière en CDI à l\'hôpital Necker. Elle n\'interviendra pas dans l\'activité.',
    autresInfosPorteur: `**Profil complet du porteur :**

• **Formation :** CAP Boulanger (Lycée Ferrandi, 2006), CAP Pâtissier (2008), MC Boulangerie Spécialisée (2010)
• **Âge :** 35 ans (né le 15/03/1991 à Lyon)
• **Situation familiale :** Marié, 2 enfants (6 et 8 ans), épouse infirmière CDI
• **Expérience professionnelle :**
  - Chef boulanger chez Maison Kayser (2015-2025) - 10 ans
  - Boulanger qualifié chez Paul (2010-2015) - 5 ans
  - Apprenti boulanger (2006-2010)

• **Points forts identifiés :**
  - Expertise technique reconnue (prix régional du meilleur pain 2022)
  - Connaissance approfondie de la gestion de production
  - Réseau professionnel établi (fournisseurs, formateurs)

• **Motivation :** Passion pour l'artisanat et désir d'indépendance professionnelle après 15 ans d'expérience salariée`,
    emprunteurMultiBancarise: false,

    // Section 3: Cession (Non applicable pour création)
    presenceJustificatifCession: undefined,
    salariesRepris: undefined,
    salariesReprisCommentaire: undefined,
    raisonsCession: undefined,
    commentaireEnvironnementLocal: `**Analyse de la zone de chalandise - Paris 1er arrondissement :**

**Démographie :**
• Territoire : Cœur historique de Paris, quartier mixte résidentiel et tertiaire
• Population résidente : ~17 000 habitants + 50 000 actifs quotidiens
• Profil : CSP+ majoritaires, revenus supérieurs à la moyenne nationale

**Concurrence :**
• 8 boulangeries identifiées dans un rayon de 500m
• Marché fragmenté avec mix enseignes et artisans
• Positionnement différenciant : pain au levain naturel, farines bio locales

**Réglementations sectorielles :**
• Normes HACCP obligatoires - formation réalisée
• Label "Artisan Boulanger" visé (production sur place)
• Pas d'avantages fiscaux spécifiques au secteur

**Risques sectoriels identifiés :**
• Hausse coûts matières premières → Mitigation : contrats fournisseurs annuels
• Concurrence grandes surfaces → Mitigation : positionnement premium artisanal
• Pénurie main d'œuvre qualifiée → Mitigation : réseau CFA pour recrutement

**Conclusion :** Zone de chalandise très favorable avec fort pouvoir d'achat et demande qualitative. Positionnement artisanal différenciant justifié.`,
    autresInfosProjet: undefined,

    // Section 4: Analyse Financière
    commentaireBilansConsolides: `**Plan de financement initial :**

**Structure du financement :**
• Actif immobilisé : 65 000 € (four 25K€, pétrin 12K€, chambre de pousse 8K€, agencement 15K€, divers 5K€)
• Actif circulant : 15 000 € (stock initial 5K€ + trésorerie 10K€)
• **TOTAL INVESTISSEMENT : 80 000 €**

**Ressources :**
• Capital social : 10 000 €
• Apport en compte courant : 10 000 €
• Emprunt bancaire : 60 000 € sur 7 ans à 4,5%

**Points d'attention :**
• BFR négatif de -5 000 € (paiement comptant clients, délai fournisseurs 30j)
• Trésorerie initiale de 10 000 € suffisante pour 2 mois d'activité

**Ratio clé :** Taux d'apport = 20 000 / 80 000 = 25% ✓ (> 20% excellent)`,

    syntheseCompteResultat: `**Analyse des tendances :**

• **Croissance :** Progression réaliste de +20% puis +11% conforme au développement type d'une boulangerie artisanale
• **Structure de marges :** Marge brute stable à 68-70%, conforme aux standards du secteur boulangerie artisanale
• **EBITDA :** Progression de 8% à 14% du CA, démontrant une bonne maîtrise des charges fixes
• **Résultat net :** Rentabilité dès année 1 (modeste) puis significative années 2-3

**Point d'attention :** Sensibilité au coût des matières premières (farine, beurre) - marge de sécurité de 5% intégrée.`,

    evenementsConjoncturels: true,
    evenementsConjoncturelsDetail: `**IMPACTS POSITIFS (Opportunités) :**

1. **Retour au "consommer local" post-Covid :**
   - Impact : Majeur
   - Avantage : Forte demande pour produits artisanaux de proximité

2. **Tendance "bien manger" :**
   - Impact : Moyen
   - Avantage : Valorisation des farines bio et levain naturel

**IMPACTS NÉGATIFS (Risques à gérer) :**

1. **Inflation matières premières (blé, beurre) :**
   - Impact : Élevé
   - Compensation : Contrats fournisseurs annualisés + ajustement prix vente

**Conclusion :** Opportunités > Risques sur le secteur boulangerie artisanale`,

    commentaireDettesFS: undefined, // Création
    autresInfosAnalyseFinanciere: `**1. Seuil de rentabilité et marges de sécurité :**
• Année 1 : SR = 128 000 € (atteint dès 85% du CA prévu) - Marge sécurité : 15%
• Année 2 : SR = 135 000 € (atteint dès 75% du CA prévu) - Marge sécurité : 25%
• Année 3 : SR = 140 000 € (atteint dès 70% du CA prévu) - Marge sécurité : 30%

**2. Cash flows et capacité d'autofinancement :**
• Année 1 : Cash flow = 20 000 € / CF disponible = 10 800 € (après service dette 9 200 €)
• Année 2 : Cash flow = 32 000 € / CF disponible = 22 800 €
• Année 3 : Cash flow = 42 000 € / CF disponible = 32 800 €
• **Cash flow cumulé fin A3 : 66 400 €** - Excellente capacité de remboursement

**3. Ratio d'endettement :**
• Dettes financières : 60 000 €
• CAF prévisionnelle moyenne A1-A3 : ~31 000 €
• **Ratio dettes/CAF = 1,9 an** ✓ excellent (<2)

**4. Trésorerie et BFR :**
• BFR négatif grâce au paiement comptant clients
• Pas de tension structurelle de trésorerie prévisible

**5. Rémunération dirigeant :**
• Année 1 : 18 000 € brut (ARE complémentaire)
• Année 2 : 28 000 € brut
• Année 3 : 36 000 € brut`,

    // Section 5: Analyse Prévisionnelle
    chargesPrevisionnelles: {
        annee1: { chargesVariables: 48000, chargesVariablesPct: 32, chargesFixesExploitation: 42000, chargesPersonnel: 30000 },
        annee2: { chargesVariables: 57600, chargesVariablesPct: 32, chargesFixesExploitation: 44000, chargesPersonnel: 42000 },
        annee3: { chargesVariables: 64000, chargesVariablesPct: 32, chargesFixesExploitation: 46000, chargesPersonnel: 52000 },
    },
    chargesBienReparties: true,
    chargesBienRepartiesCommentaire: 'La répartition des charges est cohérente avec le modèle économique d\'une boulangerie artisanale. Le ratio charges variables/CA de 32% correspond aux standards du secteur (achats matières premières 28-35%).',

    commentaireChargesExternes: `**Analyse des charges fixes d'exploitation :**
• **Loyer :** 24 000 €/an (2 000 €/mois pour 85 m² Paris 1er) - Cohérent avec zone premium
• **Assurances :** 4 000 €/an (RC Pro, locaux, matériel)
• **Énergie :** 8 000 €/an (fours, chambres froides)
• **Divers :** 6 000 €/an (eau, téléphonie, fournitures, entretien)

**Ratio charges fixes / CA :**
• Année 1 : 42 000 / 150 000 = 28%
• Année 2 : 44 000 / 180 000 = 24%
• Année 3 : 46 000 / 200 000 = 23%

L'évolution est cohérente : dilution des charges fixes avec croissance = amélioration de la rentabilité.`,

    commentaireMargeBrute: `**Analyse de la marge sur coûts variables :**
• Année 1 : 102 000 € (68% du CA)
• Année 2 : 122 400 € (68% du CA)
• Année 3 : 136 000 € (68% du CA)

**Cohérence sectorielle :** Les marges de 68% sont conformes aux standards du secteur boulangerie artisanale (typiquement 65-72%).

**Facteurs de performance :**
• Approvisionnement en direct minoterie (marge optimisée)
• Production 100% sur place (valeur ajoutée maximale)
• Positionnement premium justifiant prix de vente supérieurs`,

    commentaireEvolutionFondsPropres: `**CAPITAUX PROPRES :**
• Départ : 10 000 € (capital) + 10 000 € (CC) = 20 000 €
• Année 1 : 20 000 + 12 000 (RN) = 32 000 €
• Année 2 : 32 000 + 25 000 (RN) = 57 000 €
• Année 3 : 57 000 + 38 000 (RN) = **95 000 €**

**DETTES FINANCIÈRES :**
• Départ : 60 000 €
• Année 1 : ~52 000 € (remboursement capital ~8 000 €)
• Année 2 : ~44 000 €
• Année 3 : ~36 000 €

**RATIO D'AUTONOMIE FINANCIÈRE :**
• Année 1 : 32 000 / 84 000 = 38% ✓ excellent (>20%)
• Année 3 : 95 000 / 131 000 = 73% ✓ très solide`,

    validationCafPrevisionnel: true,
    cafData: {
        annee1: { caf: 20000, annuites: 9200, solde: 10800, dscr: 2.17 },
        annee2: { caf: 32000, annuites: 9200, solde: 22800, dscr: 3.48 },
        annee3: { caf: 42000, annuites: 9200, solde: 32800, dscr: 4.57 },
    },
    validationCafGlobal: true,
    validationCafJustification: `**VALIDATION CONFIRMÉE** sur la base des éléments suivants :

1. **Cohérence du modèle économique :**
   • Marges conformes aux standards sectoriels (68% vs benchmark 65-72%)
   • Hypothèses de croissance réalistes (+20%, +11%) basées sur développement type boulangerie artisanale
   • Structure de coûts maîtrisée grâce à l'expérience du porteur

2. **Robustesse financière :**
   • CAF couvrant largement annuités dès année 1 (ratio 2.17)
   • Cash flow cumulé positif de 66 400 € à fin A3
   • Trésorerie structurellement excédentaire (BFR négatif)

3. **Atouts spécifiques :**
   • Expertise technique reconnue (15 ans expérience, prix régional)
   • Emplacement premium avec fort passage
   • Tendance marché favorable (retour au local, artisanat)
   • Sécurité année 1 via ARE

4. **Profil porteur :**
   • Formation solide (CAP + MC)
   • Expérience significative en gestion de production
   • Stabilité personnelle (marié, épouse CDI)

**Points de vigilance identifiés :**
• Sensibilité coût matières premières (5% marge intégrée)
• Recrutement apprenti année 2 à anticiper

**Conclusion :** Capacité d'autofinancement prévisionnelle validée avec niveau de confiance élevé.`,

    // Section 6: Endettement Privé
    beneficieAidesEtat: true,
    aidesEtatDetail: {
        type: 'ARE (Allocation Retour Emploi)',
        montant: 1800,
        duree: '24 mois',
        impact: 'Sécurisation revenus personnels année 1, permettant réinvestissement intégral bénéfices dans activité.'
    },
    revenusCautions: [
        { nom: 'Pierre DUPONT (dirigeant)', revenusActuels: 'ARE 1 800 €/mois', revenusFuturs: 'A1: 1 500 € / A2: 2 300 € / A3: 3 000 €', source: 'ARE puis rémunération dirigeant' },
        { nom: 'Sophie DUPONT (épouse)', revenusActuels: '2 400 €/mois', revenusFuturs: '2 500 €/mois', source: 'Salaire CDI infirmière' },
    ],
    endettementCautions: [
        { nom: 'Foyer DUPONT', chargesMensuelles: 1200, tauxEndettementActuel: 28, resteAVivreActuel: 3000, tauxEndettementFutur: 32, resteAVivreFutur: 2800 },
    ],
    commentaireEndettement: `**Analyse endettement foyer :**
• Revenus foyer actuels : 4 200 €/mois (ARE 1 800 + salaire épouse 2 400)
• Charges actuelles : 1 200 €/mois (crédit immobilier RP)
• Taux d'endettement actuel : 28% ✓ conforme

**Après démarrage activité (année 2+) :**
• Revenus foyer prévisionnels : 4 800 €/mois (rémunération 2 300 + salaire épouse 2 500)
• Charges prévisionnelles : 1 200 €/mois (inchangé)
• Taux d'endettement futur : 25% ✓ amélioration

**Reste à vivre :** 2 800 €/mois pour 4 personnes = 700 €/personne - Légèrement sous seuil 800€ mais compensé par stabilité revenus épouse.`,

    // Section 7: Commentaires
    commentaireChargesPersonnel: `**Analyse de l'évolution des charges de personnel :**
• Année 1 : 30 000 € (20% du CA) - Dirigeant seul + 1 mi-temps
• Année 2 : 42 000 € (23% du CA) - Dirigeant + 1 apprenti + 1 mi-temps
• Année 3 : 52 000 € (26% du CA) - Dirigeant + 1 salarié + 1 apprenti

**Composition et hypothèses :**
• Année 1 : Dirigeant (18K€) + vendeuse mi-temps (12K€ charges comprises)
• Année 2 : Montée en charge avec apprenti boulanger
• Année 3 : Recrutement boulanger qualifié pour développement

**Cohérence sectorielle :** Ratios masse salariale/CA de 20-26% conformes aux standards boulangerie artisanale (typiquement 22-30% selon taille).`,

    // Section 8: Contrôles
    presenceFinancementsLies: false,
    financementsLiesDetail: undefined,
    presentationDeclic: false,
    fondsPropresNegatifs: false,
    fondsPropresNegatifsCommentaire: `Fonds propres positifs dès le départ (20 000 €) et en progression constante jusqu'à 95 000 € fin année 3.`,
    controlesIndispensablesRealises: false,
    checklistControles: [
        { controle: 'Kbis / Extrait K', statut: 'a_obtenir', commentaire: 'SASU à immatriculer' },
        { controle: 'Pièce identité dirigeant', statut: 'ok', commentaire: '' },
        { controle: 'Justificatif domicile', statut: 'ok', commentaire: '' },
        { controle: 'Statuts société', statut: 'a_obtenir', commentaire: 'Projet validé' },
        { controle: 'Business plan détaillé', statut: 'ok', commentaire: 'Dossier complet analysé' },
        { controle: 'Bail commercial', statut: 'a_obtenir', commentaire: 'Négociation en cours' },
        { controle: 'Devis équipements', statut: 'ok', commentaire: '3 devis comparatifs fournis' },
        { controle: 'Consultation FICP', statut: 'non_fait', commentaire: 'À réaliser avant décaissement' },
        { controle: 'Avis d\'imposition N-1', statut: 'a_obtenir', commentaire: 'Demandé au client' },
        { controle: 'Bulletins salaire conjoint', statut: 'a_obtenir', commentaire: '3 derniers mois' },
    ],

    // Section 9: Synthèse
    syntheseCollaborateur: 'concluante',
    syntheseMotifNonConcluant: undefined,
    pointsAttention: [
        'Première expérience entrepreneuriale - suivi renforcé année 1 recommandé',
        'Sensibilité aux coûts matières premières (marge 5% intégrée)',
        'Reste à vivre légèrement tendu (700€/pers vs seuil 800€) - compensé par stabilité épouse',
    ],
    decisionFinale: 'accord_favorable',
    conditionsParticulieres: [
        'Apport personnel confirmé : 20 000 € (capital 10K + CC 10K)',
        'Consultation FICP négative dirigeant',
        'Signature bail commercial avant déblocage',
        'Ouverture compte professionnel BNP Paribas',
        'Assurance décès-invalidité obligatoire',
        'Suivi trimestriel année 1 (CA + trésorerie)',
    ],
    recommandationJustification: `Le dossier présente un profil très favorable combinant :

• **Expertise technique reconnue** : 15 années d'expérience en boulangerie, dont 10 ans comme chef boulanger chez Maison Kayser. Prix régional du meilleur pain 2022. Formation complète (CAP + MC).

• **Solidité financière du projet** : 
  - Taux d'apport de 25% (supérieur aux 20% standards)
  - DSCR de 2.17 dès année 1, progressant à 4.57 en année 3
  - Cash flow cumulé de 66 400 € fin A3
  - Ratio dettes/CAF excellent à 1,9 an

• **Sécurité personnelle** : 
  - ARE 24 mois sécurisant revenus année 1
  - Épouse en CDI infirmière (revenus stables)
  - Endettement foyer maîtrisé (28%)

• **Marché porteur** : Tendance favorable au "consommer local" et à l'artisanat. Zone de chalandise premium avec fort pouvoir d'achat.

Le risque principal identifié concerne la sensibilité aux coûts matières premières, atténué par :
• Contrats fournisseurs annualisés négociés
• Marge de sécurité de 5% intégrée aux prévisionnels
• Positionnement premium permettant ajustement prix

**Recommandation : ACCORD FAVORABLE sous réserve des conditions particulières listées.**`,
};

// Recommandation finale
const sampleRecommandation: BNPRecommandationFinale = {
    decision: 'accord_favorable',
    montantFinancable: 60000,
    financements: [
        {
            type: 'Crédit investissement professionnel',
            montant: 60000,
            duree: 7,
            taux: 4.5,
            mensualite: 767,
        },
    ],
    garanties: [
        { type: 'Privilège sur matériel', description: 'Four, pétrin, équipements financés' },
        { type: 'Nantissement fonds de commerce', description: 'Une fois créé' },
        { type: 'Caution personnelle', description: 'Limitée à 50% du prêt (30 000 €)' },
    ],
    conditions: [
        'Apport personnel confirmé : 20 000 €',
        'Consultation FICP négative',
        'Signature bail commercial',
        'Ouverture compte BNP Paribas',
        'Assurance décès-invalidité',
        'Suivi trimestriel année 1',
    ],
    ratios: {
        tauxApport: 25,
        dettesCAF: 1.9,
        dscrA1: 2.17,
        autonomieFinanciere: 38,
    },
    justification: `Dossier solide avec expertise reconnue, financement équilibré, et perspectives de rentabilité confirmées. Accord favorable recommandé sous conditions standard de suivi.`,
};

// Generate the PDF
console.log('🚀 Generating BNP Paribas test report...');
console.log('📋 Dossier:', sampleDossier.raison_sociale);
console.log('👤 Porteur:', sampleDossier.dirigeant_prenom, sampleDossier.dirigeant_nom);
console.log('💰 Montant demandé:', sampleDossier.montant_demande, '€');

const input: BNPReportInput = {
    questionnaire: sampleQuestionnaire,
    dossier: sampleDossier,
    projectType: 'creation',
    recommandation: sampleRecommandation,
};

try {
    generateBNPRapportPDF(input);
    console.log('✅ PDF generated successfully!');
    console.log('📁 Check your downloads folder for: rapport_bnp_123456789_[date].pdf');
} catch (error) {
    console.error('❌ Error generating PDF:', error);
}
