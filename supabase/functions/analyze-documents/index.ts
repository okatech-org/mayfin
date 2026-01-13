// Supabase Edge Function: analyze-documents
// Multi-LLM Orchestration for Document Analysis
// Gemini (OCR) → OpenAI (Analysis) → Perplexity (Market) → Cohere (Synthesis)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  };
  documentsDetectes: string[];
  confianceExtraction: number;
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

4. FINANCEMENT (si mentionné) :
- Montant exact demandé
- Objet précis du financement
- Durée souhaitée en mois

5. DOCUMENTS DÉTECTÉS :
- Liste exhaustive des types de documents identifiés

RÈGLES IMPORTANTES :
- Convertir tous les montants en euros (nombre entier ou décimal, pas de formatage)
- Respecter scrupuleusement les formats de date
- En cas de doute, indiquer null plutôt qu'une valeur approximative
- Le champ confianceExtraction doit refléter la qualité de lecture (1.0 = parfait, 0.0 = illisible)

RÉPONDS UNIQUEMENT EN JSON avec cette structure :
{
  "entreprise": { ... },
  "dirigeant": { ... },
  "finances": { "annees": [...] },
  "financement": { ... },
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
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");

  console.log("[Gemini] Starting OCR extraction...");

  const parts = [
    { text: GEMINI_EXTRACTION_PROMPT },
    ...files.map(f => ({
      inlineData: { mimeType: f.type, data: f.data }
    }))
  ];

  const response = await fetch(
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

  if (!response.ok) {
    const error = await response.text();
    console.error("[Gemini] Error:", error);
    throw new Error(`Gemini OCR failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  // Parse JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  console.log("[Gemini] Extraction complete");
  return JSON.parse(jsonStr);
}

async function callOpenAIAnalysis(extractedData: ExtractedData): Promise<{
  score: AnalysisResult["score"];
  recommandation: AnalysisResult["recommandation"];
  seuilAccordable: number;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY non configurée");

  console.log("[OpenAI] Starting financial analysis...");

  const prompt = OPENAI_ANALYSIS_PROMPT.replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

  if (!response.ok) {
    const error = await response.text();
    console.error("[OpenAI] Error:", error);
    throw new Error(`OpenAI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || "";
  
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  
  console.log("[OpenAI] Analysis complete");
  return JSON.parse(jsonStr);
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const files: { name: string; type: string; data: string }[] = [];
    let montantDemande: number | undefined;
    let siretManuel: string | undefined;

    for (const [key, value] of formData.entries()) {
      if (key === "montantDemande" && typeof value === "string") {
        montantDemande = parseFloat(value) || undefined;
      } else if (key === "siret" && typeof value === "string") {
        siretManuel = value || undefined;
      } else if (value instanceof File) {
        const buffer = await value.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        files.push({ name: value.name, type: value.type, data: base64 });
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, erreur: "Aucun document fourni" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const modelsUsed: string[] = [];

    // ====== PHASE 1: GEMINI OCR ======
    console.log("=== PHASE 1: Document Extraction (Gemini) ===");
    let extractedData: ExtractedData;
    try {
      extractedData = await callGeminiOCR(files);
      modelsUsed.push("Gemini 2.0 Flash (OCR)");
    } catch (error) {
      console.error("Gemini OCR failed, using fallback:", error);
      // Return error if we can't even extract data
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

    // ====== PHASE 3: PERPLEXITY MARKET (parallel) ======
    // ====== PHASE 4: COHERE SYNTHESIS (after market) ======
    console.log("=== PHASE 3 & 4: Market Analysis & Synthesis (parallel) ===");
    
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

    // Now run synthesis with all data
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
      analyseSectorielle,
      syntheseNarrative,
      modelsUsed
    };

    console.log("=== Analysis Complete ===");
    console.log("Models used:", modelsUsed.join(", "));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing documents:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'analyse";
    return new Response(
      JSON.stringify({ success: false, erreur: errorMessage, modelsUsed: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
