import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoreGauge } from './ScoreGauge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  Banknote,
  Download
} from 'lucide-react';
import { calculerRatios, calculerScoring } from '@/lib/scoring';
import { exportScoringToPDF } from '@/lib/exportPDF';
import type { DonneesFinancieres, ScoringResult } from '@/types/dossier.types';
import type { DossierRow, DonneesFinancieresRow } from '@/hooks/useDossiers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ScoringViewProps {
  dossier: DossierRow;
  donneesFinancieres: DonneesFinancieresRow[];
}

export function ScoringView({ dossier, donneesFinancieres }: ScoringViewProps) {
  // Transform donnees financieres
  const financieresFormatted: DonneesFinancieres[] = useMemo(() => {
    return donneesFinancieres.map(df => ({
      id: df.id,
      dossierId: df.dossier_id,
      anneeExercice: df.annee_exercice,
      chiffreAffaires: df.chiffre_affaires ?? undefined,
      resultatNet: df.resultat_net ?? undefined,
      ebitda: df.ebitda ?? undefined,
      capaciteAutofinancement: df.capacite_autofinancement ?? undefined,
      totalActif: df.total_actif ?? undefined,
      actifCirculant: df.actif_circulant ?? undefined,
      stocks: df.stocks ?? undefined,
      creancesClients: df.creances_clients ?? undefined,
      tresorerie: df.tresorerie ?? undefined,
      totalPassif: df.total_passif ?? undefined,
      capitauxPropres: df.capitaux_propres ?? undefined,
      dettesFinancieres: df.dettes_financieres ?? undefined,
      passifCirculant: df.passif_circulant ?? undefined,
      dettesFournisseurs: df.dettes_fournisseurs ?? undefined,
      createdAt: new Date(df.created_at),
    }));
  }, [donneesFinancieres]);

  // Calculate scoring
  const scoring: ScoringResult | null = useMemo(() => {
    if (financieresFormatted.length === 0) return null;
    return calculerScoring(financieresFormatted, {
      dateCreation: dossier.date_creation ? new Date(dossier.date_creation) : undefined,
      dirigeantExperience: dossier.dirigeant_experience ?? undefined,
      dirigeantFicheFicp: dossier.dirigeant_fiche_ficp ?? false,
      enProcedure: dossier.en_procedure,
      secteurActivite: dossier.secteur_activite ?? undefined,
    });
  }, [financieresFormatted, dossier]);

  // Generate recommendation
  const recommendation = useMemo(() => {
    if (!scoring) return null;

    const lastFinanciere = financieresFormatted[0];
    const cafMoyenne = financieresFormatted.reduce((sum, f) => sum + (f.capaciteAutofinancement ?? 0), 0) / Math.max(financieresFormatted.length, 1);
    const dettesActuelles = lastFinanciere?.dettesFinancieres ?? 0;
    const endettementActuel = cafMoyenne > 0 ? dettesActuelles / cafMoyenne : 10;
    const capaciteResiduelle = Math.max(0, (3.5 - endettementActuel) * cafMoyenne);
    const montantFinancable = Math.min(
      dossier.montant_demande,
      capaciteResiduelle / 0.85
    );

    // Determine type de financement adapté
    let typeFinancement = dossier.type_financement.toUpperCase();
    if (scoring.scoreGlobal >= 60 && dossier.type_financement === 'investissement') {
      typeFinancement = 'CRÉDIT D\'INVESTISSEMENT avec garantie BPI France';
    }

    // Garanties requises
    const garanties: string[] = [];
    if (scoring.scoreGlobal < 80) {
      garanties.push('Garantie BPI Développement TPE (70% du prêt)');
    }
    garanties.push('Caution personnelle dirigeant (limitée à 50% du prêt conformément loi Dutreil)');
    if (dossier.type_financement === 'investissement' || dossier.type_financement === 'credit_bail') {
      garanties.push('Nantissement du bien financé');
    }

    // Conditions particulières
    const conditions: string[] = [];
    if (scoring.scoreGlobal < 70) {
      conditions.push('Apport personnel minimum 15%');
      conditions.push('Suivi trimestriel renforcé première année');
    }
    if (dossier.en_procedure) {
      conditions.push('Attestation de bonne exécution du plan');
    }
    conditions.push('Clause de revoyure si dégradation ratios');

    // Points de vigilance
    const vigilance: string[] = [];
    if (lastFinanciere?.ebitda && lastFinanciere.chiffreAffaires) {
      const margeEbe = (lastFinanciere.ebitda / lastFinanciere.chiffreAffaires) * 100;
      if (margeEbe < 5) {
        vigilance.push('Marge EBE faible nécessitant vigilance trésorerie');
      }
    }
    if (dossier.secteur_activite) {
      const secteurRisque = ['BTP', 'RESTAURATION', 'COMMERCE'].includes(dossier.secteur_activite.toUpperCase());
      if (secteurRisque) {
        vigilance.push(`Secteur ${dossier.secteur_activite} exposé aux cycles économiques`);
      }
    }
    vigilance.push('Prévoir assurance perte d\'exploitation');

    // Decision
    let decision: string;
    if (scoring.statut === 'accord_favorable') {
      decision = 'ACCORD FAVORABLE';
    } else if (scoring.statut === 'accord_conditionne') {
      decision = 'ACCORD FAVORABLE sous conditions garanties renforcées';
    } else if (scoring.statut === 'etude_approfondie') {
      decision = 'ÉTUDE APPROFONDIE NÉCESSAIRE';
    } else {
      decision = 'REFUS RECOMMANDÉ';
    }

    return {
      montantFinancable: Math.round(montantFinancable),
      typeFinancement,
      duree: dossier.duree_mois ?? 60,
      garanties,
      conditions,
      vigilance,
      decision,
      cafMoyenne: Math.round(cafMoyenne),
      endettementActuel: endettementActuel.toFixed(1),
      capaciteResiduelle: Math.round(capaciteResiduelle),
    };
  }, [scoring, financieresFormatted, dossier]);

  const handleExportPDF = () => {
    try {
      exportScoringToPDF({ dossier, donneesFinancieres });
      toast.success('Rapport PDF généré avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const getStatutBadge = (statut: ScoringResult['statut']) => {
    switch (statut) {
      case 'accord_favorable':
        return <Badge className="bg-success text-success-foreground">ACCORD FAVORABLE</Badge>;
      case 'accord_conditionne':
        return <Badge className="bg-warning text-warning-foreground">ACCORD SOUS CONDITIONS</Badge>;
      case 'etude_approfondie':
        return <Badge className="bg-amber-500 text-white">ÉTUDE APPROFONDIE</Badge>;
      case 'refus':
        return <Badge variant="destructive">REFUS RECOMMANDÉ</Badge>;
    }
  };

  if (!scoring) {
    return (
      <div className="text-center py-12">
        <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Scoring indisponible</h3>
        <p className="text-muted-foreground">
          Veuillez saisir les données financières pour calculer le score
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score principal */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Gauge */}
              <div className="flex-shrink-0">
                <ScoreGauge score={scoring.scoreGlobal} size="lg" />
              </div>

              {/* Status & Summary */}
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4">
                  {getStatutBadge(scoring.statut)}
                </div>
                <h2 className="text-2xl font-bold mb-2">{dossier.raison_sociale}</h2>
                <p className="text-muted-foreground mb-4">
                  Demande de {dossier.type_financement} : {dossier.montant_demande.toLocaleString('fr-FR')} €
                </p>
                {recommendation && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                      <Banknote className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Montant finançable : {recommendation.montantFinancable.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{recommendation.duree} mois</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Export button */}
              <div className="flex-shrink-0">
                <Button onClick={handleExportPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Détail du scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Détail du scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scoring.details.map((detail) => (
              <div key={detail.critere} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{detail.critere}</span>
                    <span className="text-sm text-muted-foreground">{detail.poids}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          detail.scoreObtenu >= 4 ? "bg-success" :
                          detail.scoreObtenu >= 3 ? "bg-warning" :
                          "bg-destructive"
                        )}
                        style={{ width: `${(detail.scoreObtenu / 5) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-[60px]">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            i <= detail.scoreObtenu 
                              ? detail.scoreObtenu >= 4 ? "bg-success" :
                                detail.scoreObtenu >= 3 ? "bg-warning" :
                                "bg-destructive"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-mono min-w-[45px] text-right">
                      {detail.points.toFixed(0)}/{detail.poids}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facteurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Facteurs positifs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-success">
              <TrendingUp className="h-5 w-5" />
              Facteurs positifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoring.facteursPositifs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun facteur positif majeur</p>
            ) : (
              <div className="space-y-2">
                {scoring.facteursPositifs.map((facteur, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-success/10 border border-success/30 rounded-lg"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{facteur.description}</p>
                      <p className="text-xs text-success font-medium">+{facteur.impact.toFixed(0)} points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facteurs négatifs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              Facteurs négatifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoring.facteursNegatifs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun facteur négatif majeur</p>
            ) : (
              <div className="space-y-2">
                {scoring.facteursNegatifs.map((facteur, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{facteur.description}</p>
                      <p className="text-xs text-destructive font-medium">{facteur.impact.toFixed(0)} points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommandation */}
      {recommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recommandation de financement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                  📊 ANALYSE DU DOSSIER
                </h4>
                <p className="mb-3">
                  <strong>Montant finançable recommandé :</strong> {recommendation.montantFinancable.toLocaleString('fr-FR')} € 
                  {recommendation.montantFinancable < dossier.montant_demande && (
                    <span className="text-muted-foreground"> (vs {dossier.montant_demande.toLocaleString('fr-FR')} € demandés)</span>
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">CAF moyenne</p>
                    <p className="font-semibold">{recommendation.cafMoyenne.toLocaleString('fr-FR')} €/an</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Endettement actuel</p>
                    <p className="font-semibold">{recommendation.endettementActuel} ans de CAF</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Capacité résiduelle</p>
                    <p className="font-semibold">{recommendation.capaciteResiduelle.toLocaleString('fr-FR')} €</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-base font-semibold mb-2">✅ Type de financement adapté</h4>
                <p className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  {recommendation.typeFinancement}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Durée : {recommendation.duree} mois • Mensualité estimée : {Math.round(recommendation.montantFinancable / recommendation.duree * 1.05).toLocaleString('fr-FR')} €
                  </span>
                </p>
              </div>

              <div className="mb-4">
                <h4 className="text-base font-semibold mb-2">🔒 Garanties requises</h4>
                <ul className="space-y-1">
                  {recommendation.garanties.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="text-base font-semibold mb-2">📋 Conditions particulières</h4>
                <ul className="space-y-1">
                  {recommendation.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="text-base font-semibold mb-2">⚠️ Points de vigilance</h4>
                <ul className="space-y-1">
                  {recommendation.vigilance.map((v, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cn(
                "p-4 rounded-lg border-2 text-center",
                scoring.statut === 'accord_favorable' ? "bg-success/10 border-success" :
                scoring.statut === 'accord_conditionne' ? "bg-warning/10 border-warning" :
                scoring.statut === 'etude_approfondie' ? "bg-amber-500/10 border-amber-500" :
                "bg-destructive/10 border-destructive"
              )}>
                <p className="text-lg font-bold">
                  💡 Recommandation finale : {recommendation.decision}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
