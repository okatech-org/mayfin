// Supabase Edge Function: sector-analysis
// Real-time sector analysis with Perplexity API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============== JWT AUTHENTICATION ==============
async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error("[Auth] Missing or invalid Authorization header");
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    console.error("[Auth] Token verification failed:", error?.message || "No user data");
    return null;
  }

  console.log(`[Auth] ✅ Authenticated user: ${data.user.id}`);
  return { userId: data.user.id };
}

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

const PERPLEXITY_PROMPT = `Tu es un analyste économique senior spécialisé dans l'analyse sectorielle pour l'octroi de crédits professionnels en FRANCE.

CONTEXTE IMPORTANT - MARCHÉ FRANÇAIS :
- Cette analyse est destinée à des BANQUES FRANÇAISES
- L'entreprise est située en FRANCE
- Applique uniquement la réglementation et législation FRANÇAISE
- Référence les statistiques INSEE, Banque de France, et sources françaises officielles

ENTREPRISE À ANALYSER:
- Secteur d'activité : {SECTEUR}
- Code NAF/APE : {CODE_NAF}
- Localisation : {LOCALISATION} (France)
- Raison sociale : {RAISON_SOCIALE}

MISSION : Fournir une analyse sectorielle détaillée et à jour pour évaluer le risque de financement bancaire EN FRANCE.

ANALYSE REQUISE (contexte 100% FRANÇAIS) :

1. CONTEXTE DE MARCHÉ FRANÇAIS (2024-2025)
- État actuel du secteur en France métropolitaine
- Impact des politiques économiques françaises
- Évolution récente sur le marché français (12 derniers mois)
- Données INSEE, Banque de France, OSEO/BPI France

2. RISQUES SECTORIELS EN FRANCE (4-6 risques)
- Risques économiques spécifiques au contexte français
- Risques réglementaires français (loi de finance, URSSAF, etc.)
- Risques technologiques (disruption du secteur en France)
- Risques de marché français (concurrence, demande domestique)
- Risques environnementaux/ESG selon normes françaises/UE

3. OPPORTUNITÉS EN FRANCE (4-6 opportunités)
- Aides et subventions françaises (BPI France, crédit d'impôt, etc.)
- Plans de relance français et européens applicables
- Évolutions législatives favorables
- Tendances de consommation en France

4. BENCHMARK CONCURRENTIEL FRANÇAIS
- Positionnement type des acteurs français du secteur
- Marges moyennes observées en France
- Taux de défaillance sectoriel français (Banque de France, Altares)
- Comparaison avec les normes du secteur en France

5. TENDANCES ACTUELLES EN FRANCE (3-5 tendances)
- Transition numérique des entreprises françaises
- RSE et développement durable selon normes françaises
- Évolutions des habitudes de consommation en France

6. PERSPECTIVES DE CROISSANCE EN FRANCE
- Prévisions court terme (6-12 mois) du marché français
- Prévisions moyen terme (2-3 ans) selon INSEE/Banque de France

SOURCES REQUISES :
Privilégie les sources françaises officielles : INSEE, Banque de France, BPI France, Ministères français, URSSAF, Chambre de Commerce, fédérations professionnelles françaises.

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte :
{
  "contexteMarche": "Analyse détaillée du contexte actuel EN FRANCE...",
  "risquesSecteur": ["risque1 (France)", "risque2 (France)", ...],
  "opportunites": ["opportunite1 (France)", "opportunite2 (France)", ...],
  "benchmarkConcurrents": "Analyse comparative des acteurs FRANÇAIS...",
  "tendancesActuelles": ["tendance1 en France", "tendance2 en France", ...],
  "perspectivesCroissance": "Prévisions de croissance du marché FRANÇAIS..."
}`;

// French domain whitelist for source filtering
const FRENCH_DOMAIN_PATTERNS = [
  '.fr',
  '.gouv.fr',
  'insee.',
  'banque-france.',
  'bpifrance.',
  'legifrance.',
  'service-public.',
  'economie.gouv.',
  'travail.gouv.',
  'urssaf.',
  'impots.gouv.',
  'infogreffe.',
  'societe.com',
  'pappers.',
  'altares.',
  'coface.fr',
  'lesechos.',
  'bfmtv.',
  'lefigaro.',
  'lemonde.',
  'latribune.',
  'challenges.',
  'capital.',
  'europa.eu',
  'eurostat.',
  'oecd.',
  'ocde.',
];

// Filter sources to keep only French/EU relevant ones
function filterFrenchSources(sources: string[]): string[] {
  if (!sources || !Array.isArray(sources)) return [];

  return sources.filter(source => {
    const lowerSource = source.toLowerCase();
    // Check if source matches any French pattern
    return FRENCH_DOMAIN_PATTERNS.some(pattern => lowerSource.includes(pattern));
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ============== JWT AUTHENTICATION CHECK ==============
  const auth = await verifyAuth(req);
  if (!auth) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Non autorisé. Veuillez vous connecter.",
        code: "UNAUTHORIZED"
      } as SectorAnalysisResponse),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    console.log(`[Sector Analysis] Request from user: ${auth.userId}`);
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
            content: "Tu es un analyste économique expert du marché FRANÇAIS. Tu fournis des analyses sectorielles précises, actuelles et 100% focalisées sur le contexte économique, réglementaire et bancaire FRANÇAIS. Utilise uniquement des sources françaises et européennes. Réponds uniquement en JSON valide sans markdown."
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
      // Filter sources to keep only French/EU relevant ones
      const filteredSources = filterFrenchSources(sources);
      parsed.sources = filteredSources;

      console.log(`[Sector Analysis] ✅ Analysis complete with ${sources.length} raw sources, ${filteredSources.length} French sources retained`);

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
