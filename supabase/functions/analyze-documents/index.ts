// Supabase Edge Function: analyze-documents
// Multi-LLM Orchestration for Document Analysis
// Gemini (OCR) → OpenAI (Analysis) → Perplexity (Market) → Cohere (Synthesis)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============== CONFIGURATION LOVABLE AI ==============
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Models disponibles via Lovable AI (auto-provisionnés, pas besoin de clé API externe)
const MODELS = {
  OCR: "google/gemini-2.5-flash",           // Meilleur pour OCR multimodal
  FINANCIAL_ANALYSIS: "openai/gpt-5",       // Meilleur pour raisonnement complexe
  NEED_ANALYSIS: "openai/gpt-5",            // Analyse du besoin client
  SYNTHESIS: "openai/gpt-5-mini"            // Synthèse narrative (rapide et efficace)
};

// ============== DIAGNOSTIC & ERROR HANDLING ==============
interface ApiKeyStatus {
  name: string;
  configured: boolean;
  required: boolean;
  maskedValue?: string;
}

interface DiagnosticResult {
  timestamp: string;
  apiKeys: ApiKeyStatus[];
  allRequiredConfigured: boolean;
  warnings: string[];
}

function maskApiKey(key: string | undefined): string {
  if (!key) return "[NON CONFIGURÉE]";
  if (key.length <= 8) return "****";
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

function runDiagnostics(): DiagnosticResult {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

  const apiKeys: ApiKeyStatus[] = [
    {
      name: "LOVABLE_API_KEY",
      configured: !!lovableKey,
      required: true,
      maskedValue: maskApiKey(lovableKey)
    },
    {
      name: "PERPLEXITY_API_KEY",
      configured: !!perplexityKey,
      required: false,
      maskedValue: maskApiKey(perplexityKey)
    }
  ];

  const warnings: string[] = [];
  const requiredKeys = apiKeys.filter(k => k.required);
  const missingRequired = requiredKeys.filter(k => !k.configured);

  if (missingRequired.length > 0) {
    warnings.push(`⚠️ Clés API requises manquantes: ${missingRequired.map(k => k.name).join(", ")}`);
  }

  const optionalMissing = apiKeys.filter(k => !k.required && !k.configured);
  if (optionalMissing.length > 0) {
    warnings.push(`ℹ️ Clés API optionnelles non configurées: ${optionalMissing.map(k => k.name).join(", ")} (fonctionnalités réduites)`);
  }

  return {
    timestamp: new Date().toISOString(),
    apiKeys,
    allRequiredConfigured: missingRequired.length === 0,
    warnings
  };
}

// Log diagnostics at startup
console.log("🚀 Edge Function analyze-documents démarrée");
const startupDiagnostics = runDiagnostics();
console.log("📋 Diagnostic des clés API au démarrage:");
startupDiagnostics.apiKeys.forEach(key => {
  const status = key.configured ? "✅" : (key.required ? "❌" : "⚪");
  const requiredLabel = key.required ? "[REQUIS]" : "[OPTIONNEL]";
  console.log(`  ${status} ${key.name} ${requiredLabel}: ${key.maskedValue}`);
});
if (startupDiagnostics.warnings.length > 0) {
  startupDiagnostics.warnings.forEach(w => console.log(w));
}

class ApiError extends Error {
  public readonly apiName: string;
  public readonly statusCode?: number;
  public readonly details?: string;
  public readonly suggestion: string;

  constructor(apiName: string, message: string, options?: { statusCode?: number; details?: string; suggestion?: string }) {
    super(message);
    this.name = "ApiError";
    this.apiName = apiName;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.suggestion = options?.suggestion || "Vérifiez la configuration de la clé API";
  }

  toDetailedMessage(): string {
    let msg = `[${this.apiName}] ${this.message}`;
    if (this.statusCode) msg += ` (Code: ${this.statusCode})`;
    if (this.details) msg += ` - Détails: ${this.details}`;
    msg += ` | Suggestion: ${this.suggestion}`;
    return msg;
  }
}

// ============== TYPES ==============
interface ExtractedData {
  entreprise: {
    siren?: string;
    siret?: string;
    raisonSociale?: string;
    formeJuridique?: string;
    dateCreation?: string;
    codeNaf?: string;
    secteurActivite?: string;
    adresseSiege?: string;
    nbSalaries?: number;
  };
  dirigeant: {
    nom?: string;
    prenom?: string;
    fonction?: string;
    dateNaissance?: string;
    telephone?: string;
    email?: string;
  };
  finances: {
    annees: Array<{
      annee: number;
      chiffreAffaires?: number;
      resultatNet?: number;
      ebitda?: number;
      capitauxPropres?: number;
      dettesFinancieres?: number;
      tresorerie?: number;
      totalActif?: number;
      totalPassif?: number;
      creancesClients?: number;
      dettesFournisseurs?: number;
      stocks?: number;
    }>;
  };
  financement: {
    montantDemande?: number;
    objetFinancement?: string;
    dureeEnMois?: number;
    apportClient?: number;
    typeInvestissement?: string;
    descriptionBien?: string;
  };
  documentsDetectes: string[];
  confianceExtraction: number;
}

// Analyse du besoin et recommandations produit
interface BesoinAnalyse {
  typeInvestissement: string;
  categorieInvestissement: 'vehicule' | 'materiel' | 'immobilier' | 'bfr' | 'informatique' | 'autre';
  apportClient: number;
  tauxApport: number; // % du montant demandé
  montantFinance: number;
  mensualiteEstimee: number;
  capaciteRemboursement: number;
  adequationBesoin: number; // Score 0-100
  justificationAdequation: string;
  produitRecommande: {
    nom: string;
    type: string;
    avantages: string[];
    conditions: string[];
    alternative?: {
      nom: string;
      type: string;
      raison: string;
    };
  };
  alertes: string[];
  recommandationsStructuration: string[];
}

interface AnalysisResult {
  success: boolean;
  data?: ExtractedData;
  score?: {
    global: number;
    details: {
      solvabilite: number;
      rentabilite: number;
      structure: number;
      activite: number;
    };
    justifications?: {
      solvabilite: string;
      rentabilite: string;
      structure: string;
      activite: string;
    };
  };
  recommandation?: "FAVORABLE" | "RESERVES" | "DEFAVORABLE";
  seuilAccordable?: number;
  besoinAnalyse?: BesoinAnalyse;
  analyseSectorielle?: {
    contexteMarche: string;
    risquesSecteur: string[];
    opportunites: string[];
    benchmarkConcurrents: string;
    sources: string[];
  };
  syntheseNarrative?: {
    resumeExecutif: string;
    pointsForts: string[];
    pointsVigilance: string[];
    recommandationsConditions: string[];
    conclusionArgumentee: string;
  };
  modelsUsed: string[];
  erreur?: string;
}

// ============== PROMPTS ==============
const GEMINI_EXTRACTION_PROMPT = `Tu es un expert en analyse de documents d'entreprise française avec une spécialisation en OCR financier.

MISSION : Extraire avec précision maximale toutes les données des documents fournis.

DOCUMENTS À ANALYSER :
- Kbis / Extrait RCS
- Bilans comptables (actif/passif)
- Comptes de résultat
- Liasses fiscales (2050-2059)
- Statuts d'entreprise
- Pièces d'identité du dirigeant
- Demandes de financement

EXTRACTION REQUISE :

1. ENTREPRISE :
- SIREN (exactement 9 chiffres)
- SIRET (exactement 14 chiffres)
- Raison sociale complète
- Forme juridique (SARL, SAS, SASU, EURL, SA, SCI, etc.)
- Date de création (format YYYY-MM-DD)
- Code NAF/APE (format XXXX[A-Z])
- Secteur d'activité détaillé
- Adresse complète du siège
- Nombre de salariés

2. DIRIGEANT :
- Nom complet
- Prénom
- Fonction exacte (Gérant, Président, Directeur Général, etc.)
- Date de naissance (format YYYY-MM-DD)
- Téléphone
- Email

3. DONNÉES FINANCIÈRES (extraire TOUS les exercices disponibles, jusqu'à 5 ans) :
Pour chaque exercice comptable :
- Année de l'exercice
- Chiffre d'affaires HT (compte 70)
- Résultat net
- EBITDA / EBE (Excédent Brut d'Exploitation)
- Capitaux propres
- Dettes financières (court et long terme)
- Trésorerie nette
- Total actif
- Total passif
- Créances clients
- Dettes fournisseurs
- Stocks

4. FINANCEMENT ET BESOIN CLIENT (si mentionné) :
- Montant exact demandé
- Objet précis du financement (véhicule, matériel, immobilier, BFR, informatique, autre)
- Type d'investissement détaillé (ex: "Véhicule utilitaire Renault Master", "Machine CNC industrielle")
- Description précise du bien à financer
- Durée souhaitée en mois
- Apport du client (montant en euros si mentionné)
- Justification du besoin

5. DOCUMENTS DÉTECTÉS :
- Liste exhaustive des types de documents identifiés

RÈGLES IMPORTANTES :
- Convertir tous les montants en euros (nombre entier ou décimal, pas de formatage)
- Respecter scrupuleusement les formats de date
- En cas de doute, indiquer null plutôt qu'une valeur approximative
- Le champ confianceExtraction doit refléter la qualité de lecture (1.0 = parfait, 0.0 = illisible)
- IMPORTANT: Identifier précisément le type d'investissement pour orienter vers le bon produit

RÉPONDS UNIQUEMENT EN JSON avec cette structure :
{
  "entreprise": { ... },
  "dirigeant": { ... },
  "finances": { "annees": [...] },
  "financement": { 
    "montantDemande": number,
    "objetFinancement": string,
    "dureeEnMois": number,
    "apportClient": number ou null,
    "typeInvestissement": "vehicule" | "materiel" | "immobilier" | "bfr" | "informatique" | "autre",
    "descriptionBien": string ou null
  },
  "documentsDetectes": [...],
  "confianceExtraction": 0.0 à 1.0
}`;

const OPENAI_ANALYSIS_PROMPT = `Tu es un analyste crédit senior dans une banque française avec 20 ans d'expérience.

MISSION : Analyser en profondeur les données financières extraites et fournir une évaluation rigoureuse.

DONNÉES À ANALYSER :
{EXTRACTED_DATA}

ANALYSE REQUISE :

1. SCORING DÉTAILLÉ (sur 100 pour chaque critère) :

A) SOLVABILITÉ (30% du score global)
- Ratio d'autonomie financière (Capitaux propres / Total bilan)
- Capacité de remboursement (Dettes financières / EBITDA)
- Couverture des charges financières

B) RENTABILITÉ (30% du score global)
- Marge nette (Résultat net / CA)
- Marge d'EBITDA (EBITDA / CA)
- ROE (Résultat net / Capitaux propres)

C) STRUCTURE FINANCIÈRE (20% du score global)
- BFR et sa couverture
- Trésorerie nette
- Ratio de liquidité générale

D) ACTIVITÉ (20% du score global)
- Évolution du CA (tendance 3 ans)
- Régularité des résultats
- Ancienneté de l'entreprise

2. JUSTIFICATION DE CHAQUE SCORE :
Explique précisément pourquoi tu attribues chaque score avec les ratios calculés.

3. RECOMMANDATION FINALE :
- FAVORABLE : Score >= 70
- RESERVES : Score 45-69
- DEFAVORABLE : Score < 45

4. SEUIL ACCORDABLE :
Calcule le montant maximum de financement acceptable selon la règle :
- Seuil = EBITDA × facteur (2 à 4 selon le score)
- Plafonné à 25% du CA

RÉPONDS EN JSON :
{
  "score": {
    "global": number,
    "details": {
      "solvabilite": number,
      "rentabilite": number,
      "structure": number,
      "activite": number
    },
    "justifications": {
      "solvabilite": "Explication détaillée avec ratios...",
      "rentabilite": "Explication détaillée avec ratios...",
      "structure": "Explication détaillée avec ratios...",
      "activite": "Explication détaillée avec ratios..."
    }
  },
  "recommandation": "FAVORABLE" | "RESERVES" | "DEFAVORABLE",
  "seuilAccordable": number
}`;

// Enhanced Perplexity prompts for deeper sector analysis
const PERPLEXITY_MARKET_CONTEXT_PROMPT = `Tu es un analyste économique spécialisé dans le financement professionnel en France.

ENTREPRISE À ANALYSER:
- Secteur d'activité : {SECTEUR}
- Code NAF/APE : {CODE_NAF}
- Localisation : {LOCALISATION}
- Raison sociale : {RAISON_SOCIALE}

RECHERCHE APPROFONDIE - CONTEXTE DE MARCHÉ 2024-2026:

1. État actuel du secteur en France et dans la région
2. Indicateurs macroéconomiques impactants (PIB, emploi, consommation)
3. Évolutions réglementaires récentes et à venir
4. Investissements et financement dans le secteur
5. Taux de défaillance sectoriel si disponible
6. Perspectives économiques court et moyen terme

Réponds en JSON:
{
  "contexteMarche": "Analyse détaillée et chiffrée du contexte...",
  "indicateursClés": {
    "croissanceSecteur": "X%",
    "tauxDefaillance": "X%",
    "evolutionEmploi": "description"
  },
  "reglementation": ["évolution1", "évolution2", ...]
}`;

const PERPLEXITY_RISKS_PROMPT = `Tu es un analyste de risques pour le financement d'entreprises.

ENTREPRISE:
- Secteur : {SECTEUR}
- Code NAF : {CODE_NAF}
- Région : {LOCALISATION}

ANALYSE DES RISQUES SECTORIELS (6-8 risques détaillés):

Catégories à couvrir:
1. Risques économiques et conjoncturels
2. Risques réglementaires et conformité
3. Risques technologiques (disruption, obsolescence)
4. Risques de marché (concurrence, prix, demande)
5. Risques environnementaux et ESG
6. Risques opérationnels spécifiques au secteur
7. Risques liés aux coûts (énergie, matières premières, main d'œuvre)
8. Risques de dépendance (clients, fournisseurs)

Pour chaque risque: description précise + niveau d'impact (élevé/moyen/faible)

Réponds en JSON:
{
  "risquesSecteur": [
    {"description": "risque détaillé", "impact": "élevé/moyen/faible", "categorie": "type"},
    ...
  ],
  "risquePrincipal": "Le risque le plus critique à surveiller"
}`;

const PERPLEXITY_OPPORTUNITIES_PROMPT = `Tu es un conseiller en développement d'entreprise.

ENTREPRISE:
- Secteur : {SECTEUR}
- Code NAF : {CODE_NAF}
- Région : {LOCALISATION}

ANALYSE DES OPPORTUNITÉS (6-8 opportunités détaillées):

Axes à explorer:
1. Leviers de croissance identifiés dans le secteur
2. Innovations et nouvelles technologies applicables
3. Aides, subventions et financements publics disponibles (France 2030, BPI, régionales)
4. Tendances de consommation favorables
5. Partenariats stratégiques possibles
6. Diversification et nouveaux marchés
7. Transition écologique et RSE comme avantage compétitif
8. Digitalisation et optimisation des processus

Pour chaque opportunité: description + potentiel (fort/moyen/modéré)

Réponds en JSON:
{
  "opportunites": [
    {"description": "opportunité détaillée", "potentiel": "fort/moyen/modéré", "categorie": "type"},
    ...
  ],
  "opportunitePrincipale": "L'opportunité la plus prometteuse"
}`;

const PERPLEXITY_BENCHMARK_PROMPT = `Tu es un analyste concurrentiel spécialisé.

ENTREPRISE:
- Secteur : {SECTEUR}
- Code NAF : {CODE_NAF}
- Région : {LOCALISATION}

BENCHMARK CONCURRENTIEL APPROFONDI:

1. Structure du marché (fragmentation, acteurs majeurs)
2. Marges moyennes du secteur (marge brute, marge nette)
3. Ratios financiers types (BFR, endettement, CAF)
4. Barrières à l'entrée et facteurs clés de succès
5. Positionnement des leaders vs PME/TPE
6. Tendances de consolidation ou fragmentation
7. Stratégies gagnantes observées

Réponds en JSON:
{
  "structureMarche": "Description de la structure...",
  "margesMoyennes": {"brute": "X%", "nette": "X%"},
  "facteursSucces": ["facteur1", "facteur2", ...],
  "positionnementType": "Description du positionnement recommandé..."
}`;

// ============== ANALYSE BESOIN & PRODUIT ==============
const BESOIN_ANALYSIS_PROMPT = `Tu es un expert en structuration de financement professionnel avec une connaissance approfondie des produits bancaires et partenariats (Arval, Leaseplan, etc.).

DONNÉES CLIENT :
{EXTRACTED_DATA}

ANALYSE FINANCIÈRE :
{FINANCIAL_ANALYSIS}

MISSION : Analyser en profondeur le besoin du client et recommander le produit le plus adapté.

1. ANALYSE DU BESOIN :
- Identifier précisément le type d'investissement demandé
- Catégoriser : vehicule, materiel, immobilier, bfr, informatique, autre
- Évaluer la cohérence avec l'activité de l'entreprise
- Analyser l'apport client et son impact sur le financement

2. CAPACITÉ DE REMBOURSEMENT :
- Calculer la mensualité estimée (sur la durée demandée ou optimale)
- Comparer avec l'EBITDA mensuel (EBITDA / 12)
- Le ratio mensualité/EBITDA mensuel ne doit pas dépasser 25-30%
- Calculer le montant maximum finançable selon cette règle

3. RECOMMANDATION PRODUIT :

RÈGLES DE RECOMMANDATION :

A) Pour les VÉHICULES (voiture, utilitaire, camion, engin) :
   - Si le véhicule est neuf et usage professionnel régulier → Recommander ARVAL (LOA/LLD)
   - Avantages Arval : loyers fixes, entretien inclus, assurance, gestion de flotte
   - Si véhicule d'occasion ou besoin de propriété → Crédit-bail classique
   
B) Pour le MATÉRIEL INDUSTRIEL :
   - Si matériel standard → Crédit-bail mobilier
   - Si matériel spécifique → Prêt professionnel classique avec garantie sur le bien
   
C) Pour l'IMMOBILIER :
   - Crédit-bail immobilier si location avec option d'achat souhaitée
   - Prêt immobilier professionnel si propriété directe
   
D) Pour le BFR / TRÉSORERIE :
   - Ligne de crédit / Facilité de caisse si besoin ponctuel
   - Affacturage si créances clients importantes
   - Prêt court terme si besoin structurel
   
E) Pour l'INFORMATIQUE / DIGITAL :
   - Location financière évolutive (renouvellement facilité)
   - Ou crédit classique si propriété nécessaire

4. ALERTES ET VIGILANCES :
- Signaler si le montant demandé dépasse la capacité
- Signaler si la durée est inadaptée au type de bien
- Signaler si l'apport est insuffisant (< 10% pour véhicule, < 20% pour immobilier)

5. RECOMMANDATIONS DE STRUCTURATION :
- Proposer des ajustements si nécessaire (durée, montant, apport)
- Suggérer des garanties adaptées

RÉPONDS EN JSON :
{
  "typeInvestissement": "Description précise du bien",
  "categorieInvestissement": "vehicule" | "materiel" | "immobilier" | "bfr" | "informatique" | "autre",
  "apportClient": number (0 si non mentionné),
  "tauxApport": number (% du montant total),
  "montantFinance": number,
  "mensualiteEstimee": number,
  "capaciteRemboursement": number (mensualité max supportable),
  "adequationBesoin": number (0-100),
  "justificationAdequation": "Explication détaillée...",
  "produitRecommande": {
    "nom": "Nom du produit (ex: ARVAL - Location Longue Durée)",
    "type": "LOA" | "LLD" | "Credit-bail" | "Pret classique" | "Leasing" | "Affacturage" | "Ligne de credit",
    "avantages": ["avantage1", "avantage2", ...],
    "conditions": ["condition1", "condition2", ...],
    "alternative": {
      "nom": "Produit alternatif",
      "type": "...",
      "raison": "Pourquoi cette alternative..."
    }
  },
  "alertes": ["alerte1", "alerte2", ...],
  "recommandationsStructuration": ["recommandation1", "recommandation2", ...]
}`;
const COHERE_SYNTHESIS_PROMPT = `Tu es un rédacteur expert en rapports bancaires.

DONNÉES D'ENTRÉE :
- Données entreprise : {EXTRACTED_DATA}
- Analyse financière : {FINANCIAL_ANALYSIS}
- Analyse sectorielle : {SECTOR_ANALYSIS}

MISSION : Rédiger une synthèse narrative professionnelle et argumentée.

STRUCTURE ATTENDUE :

1. RÉSUMÉ EXÉCUTIF (3-4 phrases percutantes)
Présente l'entreprise, sa demande et la conclusion principale.

2. POINTS FORTS (3-5 éléments)
Liste les atouts majeurs de l'entreprise.

3. POINTS DE VIGILANCE (3-5 éléments)
Liste les risques et faiblesses identifiés.

4. RECOMMANDATIONS ET CONDITIONS (si accord)
Propose des conditions particulières appropriées.

5. CONCLUSION ARGUMENTÉE
Synthèse finale justifiant la recommandation.

STYLE : Professionnel, factuel, utilise des données chiffrées.

Format JSON :
{
  "resumeExecutif": "...",
  "pointsForts": ["...", "..."],
  "pointsVigilance": ["...", "..."],
  "recommandationsConditions": ["...", "..."],
  "conclusionArgumentee": "..."
}`;

// ============== API CALLS ==============

async function callLovableAI(
  model: string,
  systemPrompt: string,
  userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
  temperature: number = 0.2
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!apiKey) {
    throw new ApiError("Lovable AI", "LOVABLE_API_KEY non configurée", {
      suggestion: "La clé Lovable AI devrait être auto-provisionnée. Contactez le support."
    });
  }

  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    { role: "system", content: systemPrompt }
  ];

  if (typeof userContent === "string") {
    messages.push({ role: "user", content: userContent });
  } else {
    messages.push({ role: "user", content: userContent });
  }

  let response: Response;
  try {
    response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 8192
      })
    });
  } catch (networkError) {
    throw new ApiError("Lovable AI", "Erreur réseau lors de la connexion", {
      details: networkError instanceof Error ? networkError.message : "Erreur inconnue",
      suggestion: "Vérifiez la connectivité réseau ou réessayez"
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Lovable AI - ${model}] Erreur:`, response.status, errorText);
    
    if (response.status === 429) {
      throw new ApiError("Lovable AI", "Limite de requêtes atteinte", {
        statusCode: 429,
        suggestion: "Attendez quelques instants ou ajoutez des crédits à votre workspace"
      });
    }
    if (response.status === 402) {
      throw new ApiError("Lovable AI", "Crédits insuffisants", {
        statusCode: 402,
        suggestion: "Ajoutez des crédits dans Settings → Workspace → Usage"
      });
    }
    
    throw new ApiError("Lovable AI", `Erreur API (${response.status})`, {
      statusCode: response.status,
      details: errorText.substring(0, 200),
      suggestion: "Réessayez dans quelques instants"
    });
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

async function callGeminiOCR(files: Array<{ type: string; data: string }>): Promise<ExtractedData> {
  console.log(`[Gemini 2.5 Flash] Démarrage de l'extraction OCR pour ${files.length} fichier(s)...`);

  // Préparer les messages multimodaux pour Lovable AI
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: GEMINI_EXTRACTION_PROMPT }
  ];

  // Ajouter chaque fichier comme image
  for (const file of files) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${file.type};base64,${file.data}`
      }
    });
  }

  const text = await callLovableAI(
    MODELS.OCR,
    "Tu es un expert en analyse de documents d'entreprise française. Réponds uniquement en JSON valide.",
    userContent,
    0.1
  );

  if (!text) {
    throw new ApiError("Gemini 2.5 Flash", "Réponse vide", {
      details: "Aucun texte extrait des documents",
      suggestion: "Vérifiez que les documents sont lisibles"
    });
  }
  
  // Parse JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    const parsed = JSON.parse(jsonStr);
    console.log("[Gemini 2.5 Flash] ✅ Extraction OCR terminée avec succès");
    return parsed;
  } catch (parseError) {
    console.error("[Gemini 2.5 Flash] Erreur parsing JSON:", jsonStr.substring(0, 500));
    throw new ApiError("Gemini 2.5 Flash", "Impossible de parser la réponse JSON", {
      details: "La réponse n'est pas un JSON valide",
      suggestion: "Les documents peuvent être difficiles à lire"
    });
  }
}

async function callOpenAIAnalysis(extractedData: ExtractedData): Promise<{
  score: AnalysisResult["score"];
  recommandation: AnalysisResult["recommandation"];
  seuilAccordable: number;
}> {
  console.log("[GPT-5] Démarrage de l'analyse financière...");

  const prompt = OPENAI_ANALYSIS_PROMPT.replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2));

  const text = await callLovableAI(
    MODELS.FINANCIAL_ANALYSIS,
    "Tu es un analyste crédit expert avec 20 ans d'expérience. Réponds uniquement en JSON valide.",
    prompt,
    0.2
  );
  
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    const parsed = JSON.parse(jsonStr);
    console.log("[GPT-5] ✅ Analyse financière terminée avec succès");
    return parsed;
  } catch {
    console.error("[GPT-5] Erreur parsing JSON");
    throw new ApiError("GPT-5", "Impossible de parser la réponse JSON", {
      suggestion: "Réessayez l'analyse"
    });
  }
}

async function callPerplexityMarket(
  secteur: string,
  codeNaf: string,
  localisation: string,
  raisonSociale?: string
): Promise<AnalysisResult["analyseSectorielle"]> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.log("[Perplexity] API key not configured, skipping market analysis");
    return undefined;
  }

  console.log("[Perplexity] Starting enhanced multi-query market analysis...");

  const replacePlaceholders = (prompt: string) => prompt
    .replace("{SECTEUR}", secteur || "Non spécifié")
    .replace("{CODE_NAF}", codeNaf || "Non spécifié")
    .replace("{LOCALISATION}", localisation || "France")
    .replace("{RAISON_SOCIALE}", raisonSociale || "Non spécifié");

  // Helper function for Perplexity API calls
  const callPerplexity = async (prompt: string, queryName: string): Promise<{ content: string; sources: string[] }> => {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { 
              role: "system", 
              content: "Tu es un analyste économique expert. Fournis des analyses précises, chiffrées et sourcées. Réponds uniquement en JSON valide sans markdown." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          search_recency_filter: "month",
          return_citations: true
        })
      });

      if (!response.ok) {
        console.error(`[Perplexity ${queryName}] Error:`, response.status);
        return { content: "", sources: [] };
      }

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || "";
      const sources = result.citations || [];
      console.log(`[Perplexity ${queryName}] ✅ Received ${sources.length} sources`);
      return { content: text, sources };
    } catch (error) {
      console.error(`[Perplexity ${queryName}] Error:`, error);
      return { content: "", sources: [] };
    }
  };

  // Execute all queries in parallel for maximum efficiency
  console.log("[Perplexity] Launching 4 parallel deep research queries...");
  
  const [contextResult, risksResult, oppsResult, benchResult] = await Promise.all([
    callPerplexity(replacePlaceholders(PERPLEXITY_MARKET_CONTEXT_PROMPT), "Context"),
    callPerplexity(replacePlaceholders(PERPLEXITY_RISKS_PROMPT), "Risks"),
    callPerplexity(replacePlaceholders(PERPLEXITY_OPPORTUNITIES_PROMPT), "Opportunities"),
    callPerplexity(replacePlaceholders(PERPLEXITY_BENCHMARK_PROMPT), "Benchmark")
  ]);

  // Collect all unique sources
  const allSources = new Set<string>();
  [contextResult, risksResult, oppsResult, benchResult].forEach(r => {
    r.sources.forEach(s => allSources.add(s));
  });

  console.log(`[Perplexity] Total unique sources collected: ${allSources.size}`);

  // Parse JSON responses
  const parseJson = (text: string): Record<string, unknown> => {
    if (!text) return {};
    try {
      let jsonStr = text;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      jsonStr = jsonStr.replace(/^\s*```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  };

  const contextData = parseJson(contextResult.content);
  const risksData = parseJson(risksResult.content);
  const oppsData = parseJson(oppsResult.content);
  const benchData = parseJson(benchResult.content);

  // Build enriched context
  let contexteMarche = "";
  
  if (contextData.contexteMarche) {
    contexteMarche = String(contextData.contexteMarche);
  }
  
  // Add key indicators if available
  const indicateurs = contextData.indicateursClés as Record<string, string> | undefined;
  if (indicateurs) {
    const indicateursList = Object.entries(indicateurs)
      .filter(([_, v]) => v && v !== "N/A")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (indicateursList) {
      contexteMarche += ` Indicateurs clés: ${indicateursList}.`;
    }
  }
  
  // Add regulation info
  if (Array.isArray(contextData.reglementation) && contextData.reglementation.length > 0) {
    contexteMarche += ` Évolutions réglementaires: ${(contextData.reglementation as string[]).slice(0, 3).join("; ")}.`;
  }

  // Build risks array with detailed formatting
  let risquesSecteur: string[] = [];
  if (Array.isArray(risksData.risquesSecteur)) {
    risquesSecteur = (risksData.risquesSecteur as Array<{ description?: string; impact?: string; categorie?: string } | string>).map(r => {
      if (typeof r === 'string') return r;
      const desc = r.description || "";
      const impact = r.impact ? ` [Impact: ${r.impact}]` : "";
      return `${desc}${impact}`;
    }).filter(Boolean);
  }
  
  // Add principal risk if available
  if (risksData.risquePrincipal && typeof risksData.risquePrincipal === 'string') {
    if (!risquesSecteur.includes(risksData.risquePrincipal)) {
      risquesSecteur.unshift(`⚠️ ${risksData.risquePrincipal}`);
    }
  }

  // Build opportunities array with detailed formatting
  let opportunites: string[] = [];
  if (Array.isArray(oppsData.opportunites)) {
    opportunites = (oppsData.opportunites as Array<{ description?: string; potentiel?: string; categorie?: string } | string>).map(o => {
      if (typeof o === 'string') return o;
      const desc = o.description || "";
      const potentiel = o.potentiel ? ` [Potentiel: ${o.potentiel}]` : "";
      return `${desc}${potentiel}`;
    }).filter(Boolean);
  }
  
  // Add principal opportunity if available
  if (oppsData.opportunitePrincipale && typeof oppsData.opportunitePrincipale === 'string') {
    if (!opportunites.includes(oppsData.opportunitePrincipale)) {
      opportunites.unshift(`✨ ${oppsData.opportunitePrincipale}`);
    }
  }

  // Build enriched benchmark
  let benchmarkConcurrents = "";
  
  if (benchData.structureMarche) {
    benchmarkConcurrents = String(benchData.structureMarche);
  }
  
  // Add margins if available
  const marges = benchData.margesMoyennes as Record<string, string> | undefined;
  if (marges) {
    const margesList = Object.entries(marges)
      .filter(([_, v]) => v && v !== "N/A")
      .map(([k, v]) => `marge ${k}: ${v}`)
      .join(", ");
    if (margesList) {
      benchmarkConcurrents += ` Marges sectorielles moyennes: ${margesList}.`;
    }
  }
  
  // Add success factors
  if (Array.isArray(benchData.facteursSucces) && benchData.facteursSucces.length > 0) {
    benchmarkConcurrents += ` Facteurs clés de succès: ${(benchData.facteursSucces as string[]).slice(0, 4).join(", ")}.`;
  }
  
  if (benchData.positionnementType) {
    benchmarkConcurrents += ` ${benchData.positionnementType}`;
  }

  // If we got very little data, provide fallback
  if (!contexteMarche && !risquesSecteur.length && !opportunites.length) {
    console.log("[Perplexity] Insufficient data, analysis may be incomplete");
    return undefined;
  }

  console.log(`[Perplexity] ✅ Enhanced analysis complete: ${risquesSecteur.length} risks, ${opportunites.length} opportunities, ${allSources.size} sources`);

  return {
    contexteMarche: contexteMarche || `Analyse du secteur ${secteur} en cours d'enrichissement.`,
    risquesSecteur: risquesSecteur.length > 0 ? risquesSecteur : ["Données de risques en cours de collecte"],
    opportunites: opportunites.length > 0 ? opportunites : ["Données d'opportunités en cours de collecte"],
    benchmarkConcurrents: benchmarkConcurrents || "Benchmark concurrentiel en cours d'analyse.",
    sources: Array.from(allSources)
  };
}

async function callSynthesis(
  extractedData: ExtractedData,
  financialAnalysis: { score: AnalysisResult["score"]; recommandation: string },
  sectorAnalysis: AnalysisResult["analyseSectorielle"]
): Promise<AnalysisResult["syntheseNarrative"]> {
  console.log("[GPT-5-mini] Démarrage de la synthèse narrative...");

  const prompt = COHERE_SYNTHESIS_PROMPT
    .replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2))
    .replace("{FINANCIAL_ANALYSIS}", JSON.stringify(financialAnalysis, null, 2))
    .replace("{SECTOR_ANALYSIS}", JSON.stringify(sectorAnalysis || {}, null, 2));

  try {
    const text = await callLovableAI(
      MODELS.SYNTHESIS,
      "Tu es un rédacteur expert en rapports bancaires. Réponds uniquement en JSON valide.",
      prompt,
      0.3
    );

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    console.log("[GPT-5-mini] ✅ Synthèse narrative terminée");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[GPT-5-mini] Erreur:", error);
    return undefined;
  }
}

// ============== ANALYSE BESOIN & PRODUIT ==============
async function analyzeClientNeed(
  extractedData: ExtractedData,
  financialAnalysis: { score: AnalysisResult["score"]; recommandation: string; seuilAccordable: number }
): Promise<BesoinAnalyse | undefined> {
  console.log("[GPT-5] Démarrage de l'analyse du besoin client...");

  const prompt = BESOIN_ANALYSIS_PROMPT
    .replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2))
    .replace("{FINANCIAL_ANALYSIS}", JSON.stringify(financialAnalysis, null, 2));

  try {
    const text = await callLovableAI(
      MODELS.NEED_ANALYSIS,
      "Tu es un expert en structuration de financement professionnel. Réponds uniquement en JSON valide.",
      prompt,
      0.2
    );

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    
    const parsed = JSON.parse(jsonStr);
    console.log("[GPT-5] ✅ Analyse du besoin client terminée");
    return parsed;
  } catch (error) {
    console.error("[GPT-5] Erreur analyse besoin, fallback:", error);
    return calculateFallbackBesoinAnalysis(extractedData, financialAnalysis);
  }
}

function calculateFallbackBesoinAnalysis(
  data: ExtractedData,
  financialAnalysis: { score: AnalysisResult["score"]; seuilAccordable: number }
): BesoinAnalyse {
  const financement = data.financement || {};
  const montantDemande = financement.montantDemande || 0;
  const apportClient = financement.apportClient || 0;
  const duree = financement.dureeEnMois || 60;
  const objetFinancement = financement.objetFinancement?.toLowerCase() || "";
  const typeInvest = financement.typeInvestissement || detectInvestmentType(objetFinancement);
  
  // Calculer taux d'apport
  const tauxApport = montantDemande > 0 ? (apportClient / montantDemande) * 100 : 0;
  const montantFinance = montantDemande - apportClient;
  
  // Calculer mensualité estimée (approximation avec taux à 5%)
  const tauxMensuel = 0.05 / 12;
  const mensualiteEstimee = montantFinance > 0 ? 
    Math.round(montantFinance * (tauxMensuel * Math.pow(1 + tauxMensuel, duree)) / (Math.pow(1 + tauxMensuel, duree) - 1)) : 0;
  
  // Calculer capacité de remboursement
  const dernierExercice = data.finances?.annees?.[data.finances.annees.length - 1];
  const ebitdaMensuel = (dernierExercice?.ebitda || dernierExercice?.resultatNet || 0) / 12;
  const capaciteRemboursement = Math.round(ebitdaMensuel * 0.25); // Max 25% de l'EBITDA mensuel
  
  // Adequation besoin
  let adequationBesoin = 70;
  const alertes: string[] = [];
  const recommandationsStructuration: string[] = [];
  
  if (mensualiteEstimee > capaciteRemboursement) {
    adequationBesoin -= 30;
    alertes.push(`Mensualité estimée (${mensualiteEstimee.toLocaleString('fr-FR')} €) supérieure à la capacité de remboursement (${capaciteRemboursement.toLocaleString('fr-FR')} €)`);
    recommandationsStructuration.push("Allonger la durée de financement pour réduire les mensualités");
    recommandationsStructuration.push("Augmenter l'apport personnel");
  }
  
  if (typeInvest === 'vehicule' && tauxApport < 10) {
    alertes.push("Apport insuffisant pour un véhicule (recommandé: minimum 10%)");
    recommandationsStructuration.push("Prévoir un apport minimum de 10% pour un véhicule");
  }
  
  if (typeInvest === 'immobilier' && tauxApport < 20) {
    alertes.push("Apport insuffisant pour un bien immobilier (recommandé: minimum 20%)");
    recommandationsStructuration.push("Prévoir un apport minimum de 20% pour l'immobilier");
  }
  
  if (montantDemande > financialAnalysis.seuilAccordable) {
    adequationBesoin -= 20;
    alertes.push(`Montant demandé (${montantDemande.toLocaleString('fr-FR')} €) supérieur au seuil accordable (${financialAnalysis.seuilAccordable.toLocaleString('fr-FR')} €)`);
    recommandationsStructuration.push(`Réduire le montant demandé à ${financialAnalysis.seuilAccordable.toLocaleString('fr-FR')} € maximum`);
  }
  
  // Recommandation produit selon le type d'investissement
  const produitRecommande = getProductRecommendation(typeInvest, montantFinance, duree);
  
  return {
    typeInvestissement: financement.descriptionBien || objetFinancement || "Non précisé",
    categorieInvestissement: typeInvest as BesoinAnalyse['categorieInvestissement'],
    apportClient,
    tauxApport: Math.round(tauxApport * 10) / 10,
    montantFinance,
    mensualiteEstimee,
    capaciteRemboursement,
    adequationBesoin: Math.max(0, Math.min(100, adequationBesoin)),
    justificationAdequation: alertes.length === 0 
      ? "Le besoin est cohérent avec la capacité financière de l'entreprise"
      : "Des ajustements sont recommandés pour optimiser le financement",
    produitRecommande,
    alertes,
    recommandationsStructuration
  };
}

function detectInvestmentType(objet: string): string {
  const vehiculeKeywords = ['véhicule', 'vehicule', 'voiture', 'camion', 'utilitaire', 'auto', 'moto', 'engin', 'chariot', 'tracteur', 'remorque'];
  const materielKeywords = ['machine', 'matériel', 'materiel', 'équipement', 'equipement', 'outillage', 'outil'];
  const immobilierKeywords = ['immobilier', 'local', 'bureau', 'entrepôt', 'entrepot', 'terrain', 'bâtiment', 'batiment'];
  const bfrKeywords = ['bfr', 'trésorerie', 'tresorerie', 'stock', 'fonds de roulement'];
  const infoKeywords = ['informatique', 'ordinateur', 'serveur', 'logiciel', 'digital', 'numérique', 'numerique'];
  
  if (vehiculeKeywords.some(k => objet.includes(k))) return 'vehicule';
  if (materielKeywords.some(k => objet.includes(k))) return 'materiel';
  if (immobilierKeywords.some(k => objet.includes(k))) return 'immobilier';
  if (bfrKeywords.some(k => objet.includes(k))) return 'bfr';
  if (infoKeywords.some(k => objet.includes(k))) return 'informatique';
  return 'autre';
}

function getProductRecommendation(type: string, montant: number, duree: number): BesoinAnalyse['produitRecommande'] {
  switch (type) {
    case 'vehicule':
      return {
        nom: "ARVAL - Location Longue Durée (LLD)",
        type: "LLD",
        avantages: [
          "Loyers fixes et prévisibles sur toute la durée",
          "Entretien et maintenance inclus",
          "Assurance et assistance intégrées",
          "Gestion de flotte simplifiée",
          "Pas d'immobilisation de trésorerie",
          "TVA récupérable sur les loyers"
        ],
        conditions: [
          "Durée recommandée: 36 à 48 mois",
          "Kilométrage à définir précisément",
          "Option d'achat possible en fin de contrat"
        ],
        alternative: {
          nom: "Crédit-bail véhicule",
          type: "Credit-bail",
          raison: "Si le client souhaite être propriétaire à terme ou pour un véhicule d'occasion"
        }
      };
      
    case 'materiel':
      return {
        nom: "Crédit-bail mobilier",
        type: "Credit-bail",
        avantages: [
          "Financement jusqu'à 100% du bien",
          "Loyers déductibles fiscalement",
          "Option d'achat en fin de contrat",
          "Préservation de la trésorerie"
        ],
        conditions: [
          "Durée alignée sur la durée d'amortissement",
          "Garantie sur le bien financé",
          "Premier loyer majoré possible (10-30%)"
        ],
        alternative: {
          nom: "Prêt professionnel classique",
          type: "Pret classique",
          raison: "Pour un matériel très spécifique ou si la propriété immédiate est requise"
        }
      };
      
    case 'immobilier':
      return {
        nom: "Crédit-bail immobilier",
        type: "Credit-bail",
        avantages: [
          "Financement sur 12 à 15 ans",
          "Loyers déductibles du résultat",
          "Option d'achat à terme",
          "Pas d'apport minimum obligatoire"
        ],
        conditions: [
          "Apport recommandé de 20% minimum",
          "Garanties réelles sur le bien",
          "Durée adaptée à l'amortissement fiscal"
        ],
        alternative: {
          nom: "Prêt immobilier professionnel",
          type: "Pret classique",
          raison: "Si le client veut être propriétaire directement avec des taux potentiellement plus bas"
        }
      };
      
    case 'bfr':
      return {
        nom: "Ligne de crédit / Facilité de caisse",
        type: "Ligne de credit",
        avantages: [
          "Souplesse d'utilisation",
          "Intérêts uniquement sur le montant utilisé",
          "Renouvellement annuel",
          "Déblocage rapide des fonds"
        ],
        conditions: [
          "Plafond selon la capacité financière",
          "Révision annuelle du plafond",
          "Garanties personnelles possibles"
        ],
        alternative: {
          nom: "Affacturage",
          type: "Affacturage",
          raison: "Si l'entreprise a un poste clients important, l'affacturage permet de financer le BFR sur les créances"
        }
      };
      
    case 'informatique':
      return {
        nom: "Location financière évolutive",
        type: "Leasing",
        avantages: [
          "Renouvellement facilité du parc",
          "Obsolescence technologique gérée",
          "Loyers déductibles",
          "Services associés possibles (maintenance)"
        ],
        conditions: [
          "Durée 24 à 48 mois recommandée",
          "Option de renouvellement anticipé",
          "Clause de mise à niveau technologique"
        ],
        alternative: {
          nom: "Prêt classique",
          type: "Pret classique",
          raison: "Si l'entreprise souhaite amortir le matériel sur une longue période"
        }
      };
      
    default:
      return {
        nom: "Prêt professionnel",
        type: "Pret classique",
        avantages: [
          "Propriété immédiate du bien",
          "Taux fixes ou variables disponibles",
          "Durée adaptable",
          "Possibilité de différé de remboursement"
        ],
        conditions: [
          "Apport personnel recommandé (10-20%)",
          "Garanties adaptées au montant",
          "Assurance emprunteur"
        ]
      };
  }
}

// ============== FALLBACK SCORING ==============
function calculateFallbackScore(data: ExtractedData): {
  score: AnalysisResult["score"];
  recommandation: AnalysisResult["recommandation"];
  seuilAccordable: number;
} {
  const details = {
    solvabilite: 50,
    rentabilite: 50,
    structure: 50,
    activite: 50,
  };
  const justifications = {
    solvabilite: "Analyse basée sur les ratios disponibles",
    rentabilite: "Analyse basée sur les marges observées",
    structure: "Analyse de la structure financière",
    activite: "Analyse de l'évolution de l'activité"
  };

  const annees = data.finances?.annees || [];
  
  if (annees.length > 0) {
    const dernierExercice = annees[annees.length - 1];
    
    // Rentabilité
    if (dernierExercice.chiffreAffaires && dernierExercice.resultatNet) {
      const margeNette = dernierExercice.resultatNet / dernierExercice.chiffreAffaires;
      if (margeNette > 0.1) details.rentabilite = 90;
      else if (margeNette > 0.05) details.rentabilite = 75;
      else if (margeNette > 0.02) details.rentabilite = 60;
      else if (margeNette > 0) details.rentabilite = 45;
      else details.rentabilite = 25;
      justifications.rentabilite = `Marge nette de ${(margeNette * 100).toFixed(1)}%`;
    }

    // Solvabilité
    if (dernierExercice.capitauxPropres && dernierExercice.dettesFinancieres) {
      const ratio = dernierExercice.capitauxPropres / (dernierExercice.capitauxPropres + dernierExercice.dettesFinancieres);
      if (ratio > 0.5) details.solvabilite = 90;
      else if (ratio > 0.3) details.solvabilite = 70;
      else if (ratio > 0.15) details.solvabilite = 50;
      else details.solvabilite = 30;
      justifications.solvabilite = `Ratio d'autonomie financière de ${(ratio * 100).toFixed(1)}%`;
    }

    // Structure
    if (dernierExercice.tresorerie !== undefined) {
      if (dernierExercice.tresorerie > 100000) details.structure = 90;
      else if (dernierExercice.tresorerie > 50000) details.structure = 75;
      else if (dernierExercice.tresorerie > 10000) details.structure = 60;
      else if (dernierExercice.tresorerie > 0) details.structure = 45;
      else details.structure = 25;
      justifications.structure = `Trésorerie de ${dernierExercice.tresorerie.toLocaleString("fr-FR")} €`;
    }

    // Croissance
    if (annees.length >= 2) {
      const caActuel = annees[annees.length - 1].chiffreAffaires || 0;
      const caPrecedent = annees[annees.length - 2].chiffreAffaires || 0;
      if (caPrecedent > 0) {
        const croissance = (caActuel - caPrecedent) / caPrecedent;
        if (croissance > 0.15) details.activite = 90;
        else if (croissance > 0.05) details.activite = 75;
        else if (croissance > 0) details.activite = 60;
        else if (croissance > -0.1) details.activite = 40;
        else details.activite = 20;
        justifications.activite = `Croissance CA de ${(croissance * 100).toFixed(1)}%`;
      }
    }
  }

  const global = Math.round(
    details.solvabilite * 0.30 +
    details.rentabilite * 0.30 +
    details.structure * 0.20 +
    details.activite * 0.20
  );

  const recommandation: AnalysisResult["recommandation"] = 
    global >= 70 ? "FAVORABLE" : global >= 45 ? "RESERVES" : "DEFAVORABLE";

  // Calculate threshold
  const dernierExercice = annees[annees.length - 1] || {};
  const ca = dernierExercice.chiffreAffaires || 0;
  const ebitda = dernierExercice.ebitda || dernierExercice.resultatNet || 0;
  
  let facteur = global >= 80 ? 4 : global >= 70 ? 3 : global >= 60 ? 2 : global >= 45 ? 1.5 : 1;
  const seuilEbitda = ebitda * facteur;
  const plafondCa = ca * 0.25;

  return {
    score: { global, details, justifications },
    recommandation,
    seuilAccordable: Math.round(Math.min(seuilEbitda, plafondCa))
  };
}

// ============== MAIN HANDLER ==============
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle diagnostic endpoint
  const url = new URL(req.url);
  if (url.searchParams.get("diagnostic") === "true") {
    console.log("📋 Requête de diagnostic reçue");
    const diagnostic = runDiagnostics();
    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnostic,
        message: diagnostic.allRequiredConfigured 
          ? "✅ Toutes les clés API requises sont configurées"
          : "❌ Des clés API requises sont manquantes"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("📥 Nouvelle requête d'analyse de documents");
  console.log("=".repeat(60));

  // Pre-check required API keys before processing
  const preCheckDiagnostic = runDiagnostics();
  if (!preCheckDiagnostic.allRequiredConfigured) {
    const missingKeys = preCheckDiagnostic.apiKeys
      .filter(k => k.required && !k.configured)
      .map(k => k.name);
    
    console.error("❌ Clés API requises manquantes:", missingKeys.join(", "));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        erreur: `Configuration incomplète: clés API manquantes (${missingKeys.join(", ")})`,
        diagnostic: preCheckDiagnostic,
        suggestion: "Ajoutez les clés API manquantes dans Cloud → Secrets",
        modelsUsed: [] 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const files: { name: string; type: string; data: string }[] = [];
    let montantDemande: number | undefined;
    let siretManuel: string | undefined;
    let apportClient: number | undefined;
    let typesBien: { type: string; montant?: number }[] = [];
    let contextesDossier: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === "montantDemande" && typeof value === "string") {
        montantDemande = parseFloat(value) || undefined;
      } else if (key === "siret" && typeof value === "string") {
        siretManuel = value || undefined;
      } else if (key === "apportClient" && typeof value === "string") {
        apportClient = parseFloat(value) || undefined;
      } else if (key === "typesBien" && typeof value === "string") {
        try {
          typesBien = JSON.parse(value) || [];
        } catch {
          console.warn("Impossible de parser typesBien:", value);
        }
      } else if (key === "contextesDossier" && typeof value === "string") {
        try {
          contextesDossier = JSON.parse(value) || [];
        } catch {
          console.warn("Impossible de parser contextesDossier:", value);
        }
      } else if (value instanceof File) {
        console.log(`📎 Fichier reçu: ${value.name} (${value.type}, ${(value.size / 1024).toFixed(1)} Ko)`);
        const buffer = await value.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Convert to base64 in chunks to avoid stack overflow for large files
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        const base64 = btoa(binary);
        files.push({ name: value.name, type: value.type, data: base64 });
      }
    }

    if (files.length === 0) {
      console.error("❌ Aucun document fourni");
      return new Response(
        JSON.stringify({ success: false, erreur: "Aucun document fourni", modelsUsed: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`📄 ${files.length} fichier(s) à analyser`);
    if (siretManuel) console.log(`🏢 SIRET fourni: ${siretManuel}`);
    if (montantDemande) console.log(`💰 Montant demandé: ${montantDemande.toLocaleString("fr-FR")} €`);
    if (apportClient) console.log(`💵 Apport client: ${apportClient.toLocaleString("fr-FR")} €`);
    if (typesBien.length > 0) {
      console.log(`📦 Types de bien financé:`);
      typesBien.forEach(t => {
        console.log(`   - ${t.type}${t.montant ? ` : ${t.montant.toLocaleString("fr-FR")} €` : ''}`);
      });
    }
    if (contextesDossier.length > 0) {
      console.log(`📋 Contextes dossier: ${contextesDossier.join(", ")}`);
    }

    const modelsUsed: string[] = [];

    // ====== PHASE 1: GEMINI OCR ======
    console.log("\n" + "─".repeat(40));
    console.log("🔍 PHASE 1: Extraction OCR (Gemini)");
    console.log("─".repeat(40));
    
    let extractedData: ExtractedData;
    try {
      extractedData = await callGeminiOCR(files);
      modelsUsed.push("Gemini 2.5 Flash (OCR)");
      console.log("✅ Phase 1 terminée avec succès");
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`❌ Erreur Gemini: ${error.toDetailedMessage()}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            erreur: error.message,
            details: error.details,
            suggestion: error.suggestion,
            apiName: error.apiName,
            statusCode: error.statusCode,
            modelsUsed: [] 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      console.error("❌ Erreur inattendue lors de l'extraction:", error);
      throw new Error("Impossible d'extraire les données des documents. Vérifiez que les fichiers sont lisibles.");
    }

    // Apply manual overrides
    if (siretManuel) {
      extractedData.entreprise.siret = siretManuel;
      if (!extractedData.entreprise.siren && siretManuel.length === 14) {
        extractedData.entreprise.siren = siretManuel.substring(0, 9);
      }
    }
    if (montantDemande) {
      extractedData.financement = extractedData.financement || {};
      extractedData.financement.montantDemande = montantDemande;
    }
    if (apportClient !== undefined) {
      extractedData.financement = extractedData.financement || {};
      extractedData.financement.apportClient = apportClient;
    }
    // Apply types de bien avec montants
    if (typesBien.length > 0) {
      extractedData.financement = extractedData.financement || {};
      // Prendre le type principal (premier) comme typeInvestissement
      extractedData.financement.typeInvestissement = typesBien[0].type;
      // Créer une description avec tous les types et montants
      const typesBienDescription = typesBien.map(t => 
        `${t.type}${t.montant ? ` (${t.montant.toLocaleString("fr-FR")} €)` : ''}`
      ).join(', ');
      if (extractedData.financement.descriptionBien) {
        extractedData.financement.descriptionBien += ` - Types demandés: ${typesBienDescription}`;
      } else {
        extractedData.financement.descriptionBien = `Types demandés: ${typesBienDescription}`;
      }
      // Stocker les types détaillés pour l'analyse (utiliser as any pour ajouter propriété dynamique)
      // deno-lint-ignore no-explicit-any
      (extractedData.financement as any).typesBienDetailles = typesBien;
    }
    // Stocker contextes dossier (utiliser as any pour ajouter propriété dynamique)
    if (contextesDossier.length > 0) {
      // deno-lint-ignore no-explicit-any
      (extractedData as any).contextesDossier = contextesDossier;
    }

    // ====== PHASE 2: OPENAI ANALYSIS ======
    console.log("=== PHASE 2: Financial Analysis (OpenAI) ===");
    let financialAnalysis: {
      score: AnalysisResult["score"];
      recommandation: AnalysisResult["recommandation"];
      seuilAccordable: number;
    };
    
    try {
      financialAnalysis = await callOpenAIAnalysis(extractedData);
      modelsUsed.push("GPT-5 (Analyse financière)");
    } catch (error) {
      console.error("OpenAI analysis failed, using fallback:", error);
      financialAnalysis = calculateFallbackScore(extractedData);
      modelsUsed.push("Scoring algorithmique (fallback)");
    }

    // ====== PHASE 3: ANALYSE BESOIN CLIENT ======
    console.log("\n" + "─".repeat(40));
    console.log("📊 PHASE 3: Analyse du besoin client");
    console.log("─".repeat(40));
    
    let besoinAnalyse: BesoinAnalyse | undefined;
    try {
      besoinAnalyse = await analyzeClientNeed(extractedData, {
        score: financialAnalysis.score,
        recommandation: financialAnalysis.recommandation || "RESERVES",
        seuilAccordable: financialAnalysis.seuilAccordable
      });
      if (besoinAnalyse) {
        modelsUsed.push("GPT-5 (Analyse besoin & produit)");
        console.log(`✅ Produit recommandé: ${besoinAnalyse.produitRecommande.nom}`);
      }
    } catch (error) {
      console.error("Besoin analysis failed:", error);
      besoinAnalyse = calculateFallbackBesoinAnalysis(extractedData, financialAnalysis);
    }

    // ====== PHASE 4: PERPLEXITY MARKET (parallel) ======
    // ====== PHASE 5: COHERE SYNTHESIS (after market) ======
    console.log("=== PHASE 4 & 5: Market Analysis & Synthesis (parallel) ===");
    
    let analyseSectorielle: AnalysisResult["analyseSectorielle"];
    let syntheseNarrative: AnalysisResult["syntheseNarrative"];

    // Start market analysis
    const marketPromise = callPerplexityMarket(
      extractedData.entreprise.secteurActivite || "",
      extractedData.entreprise.codeNaf || "",
      extractedData.entreprise.adresseSiege || ""
    );

    try {
      analyseSectorielle = await marketPromise;
      if (analyseSectorielle) {
        modelsUsed.push("Perplexity Sonar Pro (Analyse sectorielle)");
      }
    } catch (error) {
      console.error("Perplexity failed:", error);
    }

    // Now run synthesis with all data including besoin analysis
    try {
      syntheseNarrative = await callSynthesis(
        extractedData,
        { score: financialAnalysis.score, recommandation: financialAnalysis.recommandation || "RESERVES" },
        analyseSectorielle
      );
      if (syntheseNarrative) {
        modelsUsed.push("GPT-5-mini (Synthèse narrative)");
      }
    } catch (error) {
      console.error("Cohere failed:", error);
    }

    // ====== BUILD FINAL RESULT ======
    const result: AnalysisResult = {
      success: true,
      data: extractedData,
      score: financialAnalysis.score,
      recommandation: financialAnalysis.recommandation,
      seuilAccordable: financialAnalysis.seuilAccordable,
      besoinAnalyse,
      analyseSectorielle,
      syntheseNarrative,
      modelsUsed
    };

    console.log("\n" + "=".repeat(60));
    console.log("✅ ANALYSE COMPLÈTE");
    console.log("=".repeat(60));
    console.log("Models used:", modelsUsed.join(", "));
    if (besoinAnalyse) {
      console.log(`📦 Produit recommandé: ${besoinAnalyse.produitRecommande.nom}`);
      console.log(`📈 Adéquation besoin: ${besoinAnalyse.adequationBesoin}/100`);
      if (besoinAnalyse.alertes.length > 0) {
        console.log(`⚠️ Alertes: ${besoinAnalyse.alertes.join(", ")}`);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ ERREUR LORS DE L'ANALYSE");
    console.error("=".repeat(60));
    
    if (error instanceof ApiError) {
      console.error(`API: ${error.apiName}`);
      console.error(`Message: ${error.message}`);
      console.error(`Code: ${error.statusCode || "N/A"}`);
      console.error(`Détails: ${error.details || "N/A"}`);
      console.error(`Suggestion: ${error.suggestion}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          erreur: error.message,
          details: error.details,
          suggestion: error.suggestion,
          apiName: error.apiName,
          statusCode: error.statusCode,
          modelsUsed: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de l'analyse";
    console.error(`Message: ${errorMessage}`);
    console.error(`Stack: ${error instanceof Error ? error.stack : "N/A"}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        erreur: errorMessage,
        suggestion: "Vérifiez les logs pour plus de détails ou réessayez",
        modelsUsed: [] 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
