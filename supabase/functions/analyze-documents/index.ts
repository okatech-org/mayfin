// Supabase Edge Function: analyze-documents
// Analyse documents with Gemini 2.0 Flash for OCR and data extraction

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  };
  recommandation?: "FAVORABLE" | "RESERVES" | "DEFAVORABLE";
  seuilAccordable?: number;
  erreur?: string;
}

const EXTRACTION_PROMPT = `Tu es un expert en analyse de documents d'entreprise française. Analyse les documents fournis et extrait les informations suivantes de manière structurée.

DOCUMENTS À ANALYSER :
- Kbis / Extrait RCS
- Bilans comptables
- Liasses fiscales (2050-2059)
- Statuts d'entreprise
- Pièces d'identité du dirigeant
- Demandes de financement

INFORMATIONS À EXTRAIRE :

1. ENTREPRISE :
- SIREN (9 chiffres)
- SIRET (14 chiffres)
- Raison sociale
- Forme juridique (SARL, SAS, SASU, EURL, SA, etc.)
- Date de création
- Code NAF/APE
- Secteur d'activité
- Adresse du siège
- Nombre de salariés

2. DIRIGEANT :
- Nom
- Prénom
- Fonction (Gérant, Président, DG, etc.)
- Date de naissance
- Téléphone
- Email

3. DONNÉES FINANCIÈRES (sur 3 ans si disponible) :
Pour chaque exercice :
- Chiffre d'affaires (compte 70)
- Résultat net
- EBITDA / EBE
- Capitaux propres
- Dettes financières
- Trésorerie

4. FINANCEMENT (si mentionné) :
- Montant demandé
- Objet du financement
- Durée souhaitée

5. DOCUMENTS DÉTECTÉS :
Liste des types de documents identifiés dans les fichiers.

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte :
{
  "entreprise": { ... },
  "dirigeant": { ... },
  "finances": { "annees": [...] },
  "financement": { ... },
  "documentsDetectes": [...],
  "confianceExtraction": 0.0 à 1.0
}

Le champ confianceExtraction indique ta confiance dans l'extraction (1.0 = très confiant, 0.5 = moyennement confiant, etc.)`;

function calculateScore(data: ExtractedData): { global: number; details: { solvabilite: number; rentabilite: number; structure: number; activite: number } } {
  const details = {
    solvabilite: 50,
    rentabilite: 50,
    structure: 50,
    activite: 50,
  };

  const annees = data.finances?.annees || [];
  
  if (annees.length > 0) {
    const dernierExercice = annees[annees.length - 1];
    
    // Rentabilité : Résultat net / CA
    if (dernierExercice.chiffreAffaires && dernierExercice.resultatNet) {
      const margeNette = dernierExercice.resultatNet / dernierExercice.chiffreAffaires;
      if (margeNette > 0.1) details.rentabilite = 90;
      else if (margeNette > 0.05) details.rentabilite = 75;
      else if (margeNette > 0.02) details.rentabilite = 60;
      else if (margeNette > 0) details.rentabilite = 45;
      else details.rentabilite = 25;
    }

    // Solvabilité : Capitaux propres / Total bilan
    if (dernierExercice.capitauxPropres && dernierExercice.dettesFinancieres) {
      const ratio = dernierExercice.capitauxPropres / (dernierExercice.capitauxPropres + dernierExercice.dettesFinancieres);
      if (ratio > 0.5) details.solvabilite = 90;
      else if (ratio > 0.3) details.solvabilite = 70;
      else if (ratio > 0.15) details.solvabilite = 50;
      else details.solvabilite = 30;
    }

    // Structure : Trésorerie positive
    if (dernierExercice.tresorerie !== undefined) {
      if (dernierExercice.tresorerie > 100000) details.structure = 90;
      else if (dernierExercice.tresorerie > 50000) details.structure = 75;
      else if (dernierExercice.tresorerie > 10000) details.structure = 60;
      else if (dernierExercice.tresorerie > 0) details.structure = 45;
      else details.structure = 25;
    }

    // Croissance : Évolution CA sur 3 ans
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
      }
    }
  }

  // Score global pondéré
  const global = Math.round(
    details.solvabilite * 0.30 +
    details.rentabilite * 0.30 +
    details.structure * 0.20 +
    details.activite * 0.20
  );

  return { global, details };
}

function getRecommandation(score: number): "FAVORABLE" | "RESERVES" | "DEFAVORABLE" {
  if (score >= 70) return "FAVORABLE";
  if (score >= 45) return "RESERVES";
  return "DEFAVORABLE";
}

function calculateSeuilAccordable(data: ExtractedData, score: number): number {
  const annees = data.finances?.annees || [];
  if (annees.length === 0) return 0;

  const dernierExercice = annees[annees.length - 1];
  const ca = dernierExercice.chiffreAffaires || 0;
  const ebitda = dernierExercice.ebitda || dernierExercice.resultatNet || 0;

  // Règle simplifiée : Seuil = EBITDA * facteur basé sur score
  let facteur = 0;
  if (score >= 80) facteur = 4;
  else if (score >= 70) facteur = 3;
  else if (score >= 60) facteur = 2;
  else if (score >= 45) facteur = 1.5;
  else facteur = 1;

  // Plafonné à 25% du CA
  const seuilEbitda = ebitda * facteur;
  const plafondCa = ca * 0.25;

  return Math.min(seuilEbitda, plafondCa);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const formData = await req.formData();
    const files: { name: string; type: string; data: string }[] = [];
    let montantDemande: number | undefined;
    let siretManuel: string | undefined;

    // Process form data
    for (const [key, value] of formData.entries()) {
      if (key === "montantDemande" && typeof value === "string") {
        montantDemande = parseFloat(value) || undefined;
      } else if (key === "siret" && typeof value === "string") {
        siretManuel = value || undefined;
      } else if (value instanceof File) {
        const buffer = await value.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        files.push({
          name: value.name,
          type: value.type,
          data: base64,
        });
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ success: false, erreur: "Aucun document fourni" } as AnalysisResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Prepare content parts with images/PDFs
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: EXTRACTION_PROMPT },
    ];

    for (const file of files) {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: file.data,
        },
      });
    }

    // Call Gemini for extraction
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const extractedData: ExtractedData = JSON.parse(jsonStr);

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

    // Calculate score
    const score = calculateScore(extractedData);
    const recommandation = getRecommandation(score.global);
    const seuilAccordable = calculateSeuilAccordable(extractedData, score.global);

    const analysisResult: AnalysisResult = {
      success: true,
      data: extractedData,
      score,
      recommandation,
      seuilAccordable: Math.round(seuilAccordable),
    };

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing documents:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        erreur: error.message || "Erreur lors de l'analyse" 
      } as AnalysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
