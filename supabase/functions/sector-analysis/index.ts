// Supabase Edge Function: sector-analysis
// Real-time sector analysis with Perplexity API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SectorAnalysisRequest {
  secteur: string;
  codeNaf?: string;
  localisation?: string;
  raisonSociale?: string;
}

interface SectorAnalysisResponse {
  success: boolean;
  analyseSectorielle?: {
    contexteMarche: string;
    risquesSecteur: string[];
    opportunites: string[];
    benchmarkConcurrents: string;
    tendancesActuelles: string[];
    perspectivesCroissance: string;
    sources: string[];
  };
  error?: string;
}

const PERPLEXITY_PROMPT = `Tu es un analyste économique spécialisé dans l'analyse sectorielle pour l'octroi de crédits professionnels.

ENTREPRISE À ANALYSER:
- Secteur d'activité : {SECTEUR}
- Code NAF/APE : {CODE_NAF}
- Localisation : {LOCALISATION}
- Raison sociale : {RAISON_SOCIALE}

MISSION : Fournir une analyse sectorielle détaillée et à jour pour évaluer le risque de financement.

ANALYSE REQUISE :

1. CONTEXTE DE MARCHÉ (2024-2025)
- État actuel du secteur en France
- Tendances macroéconomiques impactantes
- Évolution récente (12 derniers mois)

2. RISQUES SECTORIELS (4-6 risques)
- Risques économiques spécifiques
- Risques réglementaires
- Risques technologiques (disruption)
- Risques de marché (concurrence, demande)
- Risques environnementaux/ESG

3. OPPORTUNITÉS (4-6 opportunités)
- Leviers de croissance identifiés
- Innovations sectorielles
- Aides et subventions disponibles
- Tendances favorables

4. BENCHMARK CONCURRENTIEL
- Positionnement type des acteurs
- Marges moyennes du secteur
- Taux de défaillance sectoriel si disponible

5. TENDANCES ACTUELLES (3-5 tendances)
- Digitalisation
- RSE/Développement durable
- Évolutions consommateurs

6. PERSPECTIVES DE CROISSANCE
- Prévisions court terme (6-12 mois)
- Prévisions moyen terme (2-3 ans)

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte :
{
  "contexteMarche": "Analyse détaillée du contexte actuel...",
  "risquesSecteur": ["risque1", "risque2", ...],
  "opportunites": ["opportunite1", "opportunite2", ...],
  "benchmarkConcurrents": "Analyse comparative détaillée...",
  "tendancesActuelles": ["tendance1", "tendance2", ...],
  "perspectivesCroissance": "Prévisions de croissance..."
}`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!apiKey) {
      console.error("[Sector Analysis] PERPLEXITY_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "API Perplexity non configurée. Ajoutez PERPLEXITY_API_KEY dans les secrets."
        } as SectorAnalysisResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SectorAnalysisRequest = await req.json();
    const { secteur, codeNaf, localisation, raisonSociale } = body;

    if (!secteur) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Le secteur d'activité est requis"
        } as SectorAnalysisResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Sector Analysis] Starting analysis for sector: ${secteur}, NAF: ${codeNaf || 'N/A'}`);

    // Build the prompt
    const prompt = PERPLEXITY_PROMPT
      .replace("{SECTEUR}", secteur)
      .replace("{CODE_NAF}", codeNaf || "Non spécifié")
      .replace("{LOCALISATION}", localisation || "France")
      .replace("{RAISON_SOCIALE}", raisonSociale || "Non spécifié");

    // Call Perplexity API with enhanced parameters
    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: "Tu es un analyste économique expert. Tu fournis des analyses sectorielles précises et à jour pour l'évaluation du risque de crédit. Réponds uniquement en JSON valide sans markdown." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4096,
        search_recency_filter: "month",
        return_citations: true
      })
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error("[Sector Analysis] Perplexity API error:", perplexityResponse.status, errorText);
      
      let errorMessage = "Erreur lors de l'appel à l'API Perplexity";
      if (perplexityResponse.status === 401) {
        errorMessage = "Clé API Perplexity invalide";
      } else if (perplexityResponse.status === 429) {
        errorMessage = "Quota Perplexity dépassé, réessayez plus tard";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
        } as SectorAnalysisResponse),
        { status: perplexityResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await perplexityResponse.json();
    const text = result.choices?.[0]?.message?.content || "";
    const sources = result.citations || [];

    console.log("[Sector Analysis] Received response, parsing JSON...");

    // Parse JSON from response
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Clean potential issues
    jsonStr = jsonStr.replace(/^\s*```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      parsed.sources = sources;

      console.log("[Sector Analysis] ✅ Analysis complete with", sources.length, "sources");

      return new Response(
        JSON.stringify({
          success: true,
          analyseSectorielle: parsed
        } as SectorAnalysisResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("[Sector Analysis] JSON parse error:", parseError);
      console.log("[Sector Analysis] Raw response:", jsonStr.substring(0, 500));

      // Try to extract useful info even if JSON is malformed
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur de parsing de la réponse Perplexity. Veuillez réessayer."
        } as SectorAnalysisResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("[Sector Analysis] Unexpected error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inattendue"
      } as SectorAnalysisResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
