// Supabase Edge Function: analyze-documents
// Multi-LLM Orchestration for Document Analysis
// Gemini (OCR) → OpenAI (Analysis) → Perplexity (Market) → Cohere (Synthesis)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  const cohereKey = Deno.env.get("COHERE_API_KEY");

  const apiKeys: ApiKeyStatus[] = [
    {
      name: "GEMINI_API_KEY",
      configured: !!geminiKey,
      required: true,
      maskedValue: maskApiKey(geminiKey)
    },
    {
      name: "OPENAI_API_KEY",
      configured: !!openaiKey,
      required: true,
      maskedValue: maskApiKey(openaiKey)
    },
    {
      name: "PERPLEXITY_API_KEY",
      configured: !!perplexityKey,
      required: false,
      maskedValue: maskApiKey(perplexityKey)
    },
    {
      name: "COHERE_API_KEY",
      configured: !!cohereKey,
      required: false,
      maskedValue: maskApiKey(cohereKey)
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

const PERPLEXITY_MARKET_PROMPT = `Analyse le contexte sectoriel pour une entreprise :
- Secteur : {SECTEUR}
- Code NAF : {CODE_NAF}
- Localisation : {LOCALISATION}

Fournis :
1. Contexte actuel du marché (tendances 2024-2025)
2. Risques sectoriels majeurs (3-5 risques)
3. Opportunités de croissance (3-5 opportunités)
4. Benchmark : positionnement par rapport aux concurrents type

Format JSON :
{
  "contexteMarche": "Analyse détaillée...",
  "risquesSecteur": ["risque1", "risque2", ...],
  "opportunites": ["opportunite1", "opportunite2", ...],
  "benchmarkConcurrents": "Analyse comparative..."
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

async function callGeminiOCR(files: Array<{ type: string; data: string }>): Promise<ExtractedData> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  
  console.log("[Gemini] Vérification de la clé API...");
  if (!apiKey) {
    throw new ApiError("Gemini", "Clé API GEMINI_API_KEY non configurée", {
      suggestion: "Ajoutez GEMINI_API_KEY dans les secrets du projet (Cloud → Secrets)"
    });
  }
  console.log(`[Gemini] Clé API présente: ${maskApiKey(apiKey)}`);
  console.log(`[Gemini] Démarrage de l'extraction OCR pour ${files.length} fichier(s)...`);

  const parts = [
    { text: GEMINI_EXTRACTION_PROMPT },
    ...files.map(f => ({
      inlineData: { mimeType: f.type, data: f.data }
    }))
  ];

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        })
      }
    );
  } catch (networkError) {
    throw new ApiError("Gemini", "Erreur réseau lors de la connexion à l'API Gemini", {
      details: networkError instanceof Error ? networkError.message : "Erreur inconnue",
      suggestion: "Vérifiez la connectivité réseau ou réessayez"
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Gemini] Erreur API:", response.status, errorText);
    
    let errorDetails = "";
    let suggestion = "Vérifiez que la clé API est valide";
    
    if (response.status === 400) {
      errorDetails = "Requête invalide - format de fichier non supporté ou données corrompues";
      suggestion = "Vérifiez que les fichiers sont des PDF ou images valides";
    } else if (response.status === 401 || response.status === 403) {
      errorDetails = "Authentification échouée - clé API invalide ou expirée";
      suggestion = "Vérifiez et mettez à jour la clé GEMINI_API_KEY dans les secrets";
    } else if (response.status === 429) {
      errorDetails = "Quota dépassé ou trop de requêtes";
      suggestion = "Attendez quelques minutes ou augmentez votre quota Gemini";
    } else if (response.status >= 500) {
      errorDetails = "Erreur serveur Gemini";
      suggestion = "Réessayez dans quelques instants";
    }
    
    throw new ApiError("Gemini", `Erreur API Gemini`, {
      statusCode: response.status,
      details: errorDetails || errorText.substring(0, 200),
      suggestion
    });
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  if (!text) {
    throw new ApiError("Gemini", "Réponse vide de l'API Gemini", {
      details: "Aucun texte extrait des documents",
      suggestion: "Vérifiez que les documents sont lisibles et contiennent du texte"
    });
  }
  
  // Parse JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    const parsed = JSON.parse(jsonStr);
    console.log("[Gemini] ✅ Extraction OCR terminée avec succès");
    return parsed;
  } catch (parseError) {
    console.error("[Gemini] Erreur parsing JSON:", jsonStr.substring(0, 500));
    throw new ApiError("Gemini", "Impossible de parser la réponse JSON de Gemini", {
      details: "La réponse n'est pas un JSON valide",
      suggestion: "Les documents peuvent être difficiles à lire, essayez avec des fichiers de meilleure qualité"
    });
  }
}

async function callOpenAIAnalysis(extractedData: ExtractedData): Promise<{
  score: AnalysisResult["score"];
  recommandation: AnalysisResult["recommandation"];
  seuilAccordable: number;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  
  console.log("[OpenAI] Vérification de la clé API...");
  if (!apiKey) {
    throw new ApiError("OpenAI", "Clé API OPENAI_API_KEY non configurée", {
      suggestion: "Ajoutez OPENAI_API_KEY dans les secrets du projet (Cloud → Secrets)"
    });
  }
  console.log(`[OpenAI] Clé API présente: ${maskApiKey(apiKey)}`);
  console.log("[OpenAI] Démarrage de l'analyse financière...");

  const prompt = OPENAI_ANALYSIS_PROMPT.replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2));

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es un analyste crédit expert. Réponds uniquement en JSON valide." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4096
      })
    });
  } catch (networkError) {
    throw new ApiError("OpenAI", "Erreur réseau lors de la connexion à l'API OpenAI", {
      details: networkError instanceof Error ? networkError.message : "Erreur inconnue",
      suggestion: "Vérifiez la connectivité réseau ou réessayez"
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OpenAI] Erreur API:", response.status, errorText);
    
    let suggestion = "Vérifiez que la clé API est valide";
    if (response.status === 401) {
      suggestion = "Clé API invalide - vérifiez OPENAI_API_KEY dans les secrets";
    } else if (response.status === 429) {
      suggestion = "Quota dépassé - vérifiez votre compte OpenAI ou attendez";
    } else if (response.status === 500 || response.status === 503) {
      suggestion = "Erreur serveur OpenAI - réessayez dans quelques instants";
    }
    
    throw new ApiError("OpenAI", "Erreur API OpenAI", {
      statusCode: response.status,
      details: errorText.substring(0, 200),
      suggestion
    });
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    const parsed = JSON.parse(jsonStr);
    console.log("[OpenAI] ✅ Analyse financière terminée avec succès");
    return parsed;
  } catch {
    console.error("[OpenAI] Erreur parsing JSON");
    throw new ApiError("OpenAI", "Impossible de parser la réponse JSON d'OpenAI", {
      suggestion: "Réessayez l'analyse"
    });
  }
}

async function callPerplexityMarket(
  secteur: string,
  codeNaf: string,
  localisation: string
): Promise<AnalysisResult["analyseSectorielle"]> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.log("[Perplexity] API key not configured, skipping market analysis");
    return undefined;
  }

  console.log("[Perplexity] Starting market analysis...");

  const prompt = PERPLEXITY_MARKET_PROMPT
    .replace("{SECTEUR}", secteur || "Non spécifié")
    .replace("{CODE_NAF}", codeNaf || "Non spécifié")
    .replace("{LOCALISATION}", localisation || "France");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: "Tu es un analyste de marché. Réponds en JSON." },
        { role: "user", content: prompt }
      ],
      search_recency_filter: "month"
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Perplexity] Error:", error);
    return undefined;
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  const sources = result.citations || [];
  
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    const parsed = JSON.parse(jsonStr);
    parsed.sources = sources;
    console.log("[Perplexity] Market analysis complete");
    return parsed;
  } catch {
    console.log("[Perplexity] Failed to parse response");
    return undefined;
  }
}

async function callCohereSynthesis(
  extractedData: ExtractedData,
  financialAnalysis: { score: AnalysisResult["score"]; recommandation: string },
  sectorAnalysis: AnalysisResult["analyseSectorielle"]
): Promise<AnalysisResult["syntheseNarrative"]> {
  const apiKey = Deno.env.get("COHERE_API_KEY");
  if (!apiKey) {
    console.log("[Cohere] API key not configured, skipping synthesis");
    return undefined;
  }

  console.log("[Cohere] Starting narrative synthesis...");

  const prompt = COHERE_SYNTHESIS_PROMPT
    .replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2))
    .replace("{FINANCIAL_ANALYSIS}", JSON.stringify(financialAnalysis, null, 2))
    .replace("{SECTOR_ANALYSIS}", JSON.stringify(sectorAnalysis || {}, null, 2));

  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "command-r-plus",
      message: prompt,
      temperature: 0.3,
      preamble: "Tu es un rédacteur expert en rapports bancaires. Réponds uniquement en JSON valide."
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Cohere] Error:", error);
    return undefined;
  }

  const result = await response.json();
  const text = result.text || "";
  
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  try {
    console.log("[Cohere] Synthesis complete");
    return JSON.parse(jsonStr);
  } catch {
    console.log("[Cohere] Failed to parse response");
    return undefined;
  }
}

// ============== ANALYSE BESOIN & PRODUIT ==============
async function analyzeClientNeed(
  extractedData: ExtractedData,
  financialAnalysis: { score: AnalysisResult["score"]; recommandation: string; seuilAccordable: number }
): Promise<BesoinAnalyse | undefined> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("[Besoin] OpenAI API key not configured, using fallback");
    return calculateFallbackBesoinAnalysis(extractedData, financialAnalysis);
  }

  console.log("[Besoin] Starting client need analysis...");

  const prompt = BESOIN_ANALYSIS_PROMPT
    .replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2))
    .replace("{FINANCIAL_ANALYSIS}", JSON.stringify(financialAnalysis, null, 2));

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es un expert en structuration de financement professionnel. Réponds uniquement en JSON valide." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      console.error("[Besoin] OpenAI error, using fallback");
      return calculateFallbackBesoinAnalysis(extractedData, financialAnalysis);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || "";
    
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    
    const parsed = JSON.parse(jsonStr);
    console.log("[Besoin] ✅ Client need analysis complete");
    return parsed;
  } catch (error) {
    console.error("[Besoin] Error:", error);
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
    let typeBien: string | undefined;

    for (const [key, value] of formData.entries()) {
      if (key === "montantDemande" && typeof value === "string") {
        montantDemande = parseFloat(value) || undefined;
      } else if (key === "siret" && typeof value === "string") {
        siretManuel = value || undefined;
      } else if (key === "apportClient" && typeof value === "string") {
        apportClient = parseFloat(value) || undefined;
      } else if (key === "typeBien" && typeof value === "string") {
        typeBien = value || undefined;
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
    if (typeBien) console.log(`📦 Type de bien: ${typeBien}`);

    const modelsUsed: string[] = [];

    // ====== PHASE 1: GEMINI OCR ======
    console.log("\n" + "─".repeat(40));
    console.log("🔍 PHASE 1: Extraction OCR (Gemini)");
    console.log("─".repeat(40));
    
    let extractedData: ExtractedData;
    try {
      extractedData = await callGeminiOCR(files);
      modelsUsed.push("Gemini 2.0 Flash (OCR)");
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
    if (typeBien) {
      extractedData.financement = extractedData.financement || {};
      extractedData.financement.typeInvestissement = typeBien;
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
      modelsUsed.push("GPT-4o (Analyse financière)");
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
        modelsUsed.push("GPT-4o (Analyse besoin & produit)");
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
      syntheseNarrative = await callCohereSynthesis(
        extractedData,
        { score: financialAnalysis.score, recommandation: financialAnalysis.recommandation || "RESERVES" },
        analyseSectorielle
      );
      if (syntheseNarrative) {
        modelsUsed.push("Cohere Command R+ (Synthèse narrative)");
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
